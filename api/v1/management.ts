import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { prisma } from './_lib/prisma.js';
import { getCurrentUser } from './_lib/current-user.js';
import { buildApplicationReadScope, buildUserReadScope, canAssignRole, canManageUserLifecycle, canViewProvince, coordinatorRoles } from './_lib/member-access.js';
import { MEB_TEACHING_BRANCHES, isMebTeachingBranch } from '../../shared/branch-catalog.js';
import { isDistrictInProvince } from '../../shared/district-catalog.js';
import { handleTaskAction } from './_lib/task-handler.js';

const canonicalRoles = new Set(['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE']);
const openStatuses = ['ALINDI','INCELEMEDE','UYGUN'];

async function ensureCanonicalBranches() {
  await prisma.branch.createMany({
    data: MEB_TEACHING_BRANCHES.map((name) => ({ name, category: 'MEB' })),
    skipDuplicates: true
  });
}

function positiveInt(value: any): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}
function clean(value: any, max: number, required = false): string | null {
  if (value === undefined || value === null) return required ? null : '';
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if ((required && !s) || s.length > max) return null;
  return s;
}
const userInclude = {
  role: true,
  province: true,
  branchAssignments: { select: { branchId: true } },
  AuthorProfile: { select: { id: true, branchId: true, provinceId: true, districtId: true, district: { select: { id: true, name: true } } } }
};
function userDto(user: any) {
  return {
    id: user.id, email: user.email, fullName: user.fullName, status: user.status,
    role: user.role?.code, assignedRegion: user.assignedRegion,
    province: user.province ? { id: user.province.id, name: user.province.name, region: user.province.region } : null,
    editorGrade: user.editorGrade,
    branchIds: user.branchAssignments?.map((x: any) => x.branchId) ?? [],
    authorProfile: user.AuthorProfile ?? null
  };
}
async function validateAssignment(actor: any, payload: any) {
  const roleCode = clean(payload.role, 50, true);
  if (!roleCode || !canonicalRoles.has(roleCode) || !canAssignRole(actor, roleCode)) return { error: 'Role assignment is not allowed' } as const;
  const provinceId = payload.provinceId == null ? null : positiveInt(payload.provinceId);
  const districtName = payload.districtName == null ? null : clean(payload.districtName, 120, true);
  const assignedRegion = payload.assignedRegion == null ? null : clean(payload.assignedRegion, 100, true);
  const editorGrade = payload.editorGrade == null ? null : clean(payload.editorGrade, 50, true);
  const branchIds: number[] = [];
  if (Array.isArray(payload.branchIds)) {
    for (const rawBranchId of payload.branchIds) {
      const branchId = positiveInt(rawBranchId);
      if (branchId !== null && !branchIds.includes(branchId)) branchIds.push(branchId);
    }
  }
  const province = provinceId ? await prisma.province.findUnique({ where: { id: provinceId } }) : null;
  if (provinceId && !province) return { error: 'Unknown province' } as const;
  if (province && actor.role.code !== 'GENEL_KOORDINATOR' && !canViewProvince(actor, province)) return { error: 'Province is outside your scope' } as const;
  if (actor.role.code === 'BOLGE_KOORDINATORU' && assignedRegion && assignedRegion !== actor.assignedRegion) return { error: 'Region is outside your scope' } as const;
  if (actor.role.code === 'IL_KOORDINATORU' && assignedRegion) return { error: 'Province coordinator cannot assign a region-wide scope' } as const;
  if (roleCode === 'BOLGE_KOORDINATORU' && !assignedRegion) return { error: 'Region is required' } as const;
  if (roleCode === 'IL_KOORDINATORU' && !province) return { error: 'Province is required' } as const;
  if (roleCode === 'EDITOR' && (branchIds.length === 0 || (!province && !assignedRegion) || (province && assignedRegion))) {
    return { error: 'Editor requires branches and exactly one geographic scope' } as const;
  }
  if (roleCode === 'YAZAR' && (!province || branchIds.length !== 1 || !districtName)) return { error: 'Author province, district and exactly one branch are required' } as const;
  if (roleCode === 'YAZAR' && districtName && !isDistrictInProvince(provinceId, districtName)) return { error: 'District does not belong to selected province' } as const;
  if (branchIds.length) {
    const count = await prisma.branch.count({ where: { id: { in: branchIds } } });
    if (count !== branchIds.length) return { error: 'Unknown branch' } as const;
  }
  return { roleCode, provinceId, districtName: roleCode === 'YAZAR' ? districtName : null, assignedRegion, editorGrade, branchIds } as const;
}
async function applyAssignment(tx: any, userId: number, v: any, status: string) {
  const role = await tx.role.findUnique({ where: { code: v.roleCode } });
  if (!role) throw new Error('ROLE_NOT_FOUND');
  await tx.user.update({ where: { id: userId }, data: {
    roleId: role.id, status,
    assignedRegion: v.roleCode === 'BOLGE_KOORDINATORU' || (v.roleCode === 'EDITOR' && v.assignedRegion) ? v.assignedRegion : null,
    provinceId: ['IL_KOORDINATORU','YAZAR','EDITOR'].includes(v.roleCode) && v.provinceId ? v.provinceId : null,
    editorBranchId: v.roleCode === 'EDITOR' ? (v.branchIds[0] ?? null) : null,
    editorGrade: v.roleCode === 'EDITOR' ? v.editorGrade : null
  }});
  await tx.userBranchAssignment.deleteMany({ where: { userId } });
  if (v.roleCode === 'EDITOR' && v.branchIds.length) {
    await tx.userBranchAssignment.createMany({ data: v.branchIds.map((branchId: number) => ({ userId, branchId })) });
  }
  const existingAuthor = await tx.authorProfile.findUnique({ where: { userId } });
  if (v.roleCode === 'YAZAR') {
    let district = await tx.district.findFirst({ where: { provinceId: v.provinceId, name: v.districtName } });
    if (!district) district = await tx.district.create({ data: { provinceId: v.provinceId, name: v.districtName } });
    if (existingAuthor) {
      await tx.authorProfile.update({
        where: { userId },
        data: { provinceId: v.provinceId, districtId: district.id, branchId: v.branchIds[0], status: 'Aktif' }
      });
    } else {
      await tx.authorProfile.create({
        data: { userId, provinceId: v.provinceId, districtId: district.id, branchId: v.branchIds[0], experienceYears: 0, status: 'Aktif' }
      });
    }
  } else if (existingAuthor) {
    // Preserve historical relations but remove the former writer from the active author network.
    await tx.authorProfile.update({ where: { userId }, data: { status: 'Pasif' } });
  }
}
async function targetInActorScope(actor: any, target: any) {
  if (actor.role.code === 'GENEL_KOORDINATOR') return true;
  const actorRole = actor.role.code;
  if (!['BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(actorRole)) return false;
  const allowedTargetRoles = actorRole === 'BOLGE_KOORDINATORU'
    ? ['IL_KOORDINATORU','EDITOR','YAZAR']
    : ['EDITOR','YAZAR'];
  if (!allowedTargetRoles.includes(target.role.code)) return false;
  if (target.assignedRegion) return actorRole === 'BOLGE_KOORDINATORU' && target.assignedRegion === actor.assignedRegion;
  const provinceId = target.province?.id ?? target.AuthorProfile?.provinceId;
  if (!provinceId) return false;
  const province = target.province ?? await prisma.province.findUnique({ where: { id: provinceId } });
  return canViewProvince(actor, province);
}


async function protectedUserHistory(userId: number, authorProfileId?: number | null) {
  const [
    questions,
    payments,
    sentMessages,
    receivedMessages,
    coordinatedTasks,
    projectMemberships,
    authoredTasks,
    files
  ] = await Promise.all([
    prisma.question.count({ where: { authorUserId: userId } }),
    prisma.payment.count({ where: { authorUserId: userId } }),
    prisma.message.count({ where: { senderId: userId } }),
    prisma.message.count({ where: { receiverId: userId } }),
    prisma.task.count({ where: { assignedCoordinatorId: userId } }),
    authorProfileId ? prisma.projectAuthor.count({ where: { authorProfileId } }) : Promise.resolve(0),
    authorProfileId ? prisma.task.count({ where: { assignedAuthorProfileId: authorProfileId } }) : Promise.resolve(0),
    authorProfileId ? prisma.fileRecord.count({ where: { authorProfileId } }) : Promise.resolve(0)
  ]);

  return {
    questions,
    payments,
    messages: sentMessages + receivedMessages,
    coordinatedTasks,
    projectMemberships,
    authoredTasks,
    files
  };
}

function hasProtectedUserHistory(history: Record<string, number>) {
  return Object.values(history).some((count) => count > 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const action = typeof req.query.action === 'string' ? req.query.action : '';
    if (action === 'health') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json({ ok: true, service: 'prolig' });
    }
    if (action === 'applications' && req.method === 'POST') {
      const fullName = clean(req.body?.fullName,120,true);
      const email = clean(req.body?.email,200,true)?.toLowerCase() || null;
      const provinceId = positiveInt(req.body?.provinceId);
      const districtName = clean(req.body?.districtName,120,true);
      const requestedRole = clean(req.body?.requestedRole,50);
      const requestedBranch = clean(req.body?.requestedBranch,120,true);
      if (!fullName || !email || !email.includes('@') || !provinceId || !districtName || !isDistrictInProvince(provinceId, districtName) || !requestedBranch || !isMebTeachingBranch(requestedBranch) || (requestedRole && !['YAZAR','EDITOR'].includes(requestedRole))) return res.status(400).json({ error: 'Invalid application' });
      const province = await prisma.province.findUnique({ where: { id: provinceId } });
      if (!province) return res.status(400).json({ error: 'Unknown province' });
      const existing = await prisma.membershipApplication.findFirst({ where: { email, status: { in: openStatuses as any } } });
      if (existing) return res.status(409).json({ error: 'An active application already exists' });
      const application = await prisma.membershipApplication.create({ data: {
        fullName, email, provinceId,
        phone: clean(req.body?.phone,40) || null,
        districtName,
        institutionName: clean(req.body?.institutionName,200) || null,
        requestedRole: requestedRole || null,
        requestedBranch,
        motivation: clean(req.body?.motivation,1000) || null
      }, include: { province: true }});
      return res.status(201).json({ application });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (action === 'tasks' || action === 'task') {
      return handleTaskAction(req, res, user, action);
    }
    if (!coordinatorRoles.has(user.role.code)) return res.status(403).json({ error: 'Forbidden' });

    if (action === 'metadata' && req.method === 'GET') {
      await ensureCanonicalBranches();
      const where = user.role.code === 'GENEL_KOORDINATOR' ? {} : user.role.code === 'BOLGE_KOORDINATORU' ? { region: user.assignedRegion || '__NONE__' } : { id: user.provinceId || -1 };
      const [provinces, branches] = await Promise.all([
        prisma.province.findMany({ where, orderBy: { name: 'asc' } }),
        prisma.branch.findMany({ orderBy: { name: 'asc' } })
      ]);
      return res.status(200).json({ provinces, branches });
    }
    if (action === 'applications' && req.method === 'GET') {
      const where = buildApplicationReadScope(user);
      if (!where) return res.status(403).json({ error: 'Forbidden' });
      const applications = await prisma.membershipApplication.findMany({ where, include: { province: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      return res.status(200).json({ applications });
    }
    if (action === 'application' && req.method === 'PATCH') {
      const id = positiveInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'Invalid ID' });
      const application = await prisma.membershipApplication.findUnique({ where: { id }, include: { province: true } });
      if (!application || !canViewProvince(user, application.province)) return res.status(404).json({ error: 'Not found' });
      const status = clean(req.body?.status,30,true);
      if (!status || !['INCELEMEDE','UYGUN','REDDEDILDI'].includes(status)) return res.status(400).json({ error: 'Invalid application status' });
      const reviewNote = clean(req.body?.reviewNote,600);
      const updated = await prisma.$transaction(async (tx: any) => {
        const app = await tx.membershipApplication.update({ where: { id }, data: { status, reviewNote: reviewNote || null, reviewedByName: user.fullName }, include: { province: true } });
        await tx.activityLog.create({ data: { userName: user.fullName, action: 'MEMBERSHIP_APPLICATION_REVIEWED', entityType: 'MembershipApplication', entityId: id, details: JSON.stringify({ status }) } });
        return app;
      });
      return res.status(200).json({ application: updated });
    }
    if (action === 'users' && req.method === 'GET') {
      const where = buildUserReadScope(user);
      if (!where) return res.status(403).json({ error: 'Forbidden' });
      const users = await prisma.user.findMany({ where, include: userInclude, orderBy: [{ fullName: 'asc' }, { id: 'asc' }] });
      return res.status(200).json({ users: users.map(userDto) });
    }
    if (action === 'users' && req.method === 'POST') {
      if (!['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(user.role.code)) return res.status(403).json({ error: 'Forbidden' });
      const fullName = clean(req.body?.fullName,120,true);
      const email = clean(req.body?.email,200,true)?.toLowerCase() || null;
      const password = clean(req.body?.password,200,true);
      if (!fullName || !email || !email.includes('@') || !password || password.length < 8) return res.status(400).json({ error: 'Invalid user data' });
      const v = await validateAssignment(user, req.body || {});
      if ('error' in v) return res.status(403).json({ error: v.error });
      if (await prisma.user.findUnique({ where: { email } })) return res.status(409).json({ error: 'Email already in use' });
      const applicationId = req.body?.applicationId == null ? null : positiveInt(req.body.applicationId);
      if (applicationId) {
        const app = await prisma.membershipApplication.findUnique({ where: { id: applicationId }, include: { province: true } });
        if (!app || !canViewProvince(user, app.province) || app.email.toLowerCase() !== email) return res.status(409).json({ error: 'Application mismatch' });
      }
      const passwordHash = await bcrypt.hash(password,10);
      const created = await prisma.$transaction(async (tx: any) => {
        const role = await tx.role.findUnique({ where: { code: v.roleCode } });
        if (!role) throw new Error('ROLE_NOT_FOUND');
        const base = await tx.user.create({ data: { username: email, email, passwordHash, fullName, roleId: role.id, status: 'Aktif' } });
        await applyAssignment(tx, base.id, v, 'Aktif');
        if (applicationId) await tx.membershipApplication.update({ where: { id: applicationId }, data: { status: 'ONAYLANDI', reviewedByName: user.fullName } });
        await tx.activityLog.create({ data: { userName: user.fullName, action: 'USER_CREATED_AND_ASSIGNED', entityType: 'User', entityId: base.id, details: JSON.stringify({ role: v.roleCode, provinceId: v.provinceId, districtName: v.districtName, assignedRegion: v.assignedRegion, branchIds: v.branchIds }) } });
        return tx.user.findUnique({ where: { id: base.id }, include: userInclude });
      });
      return res.status(201).json({ user: userDto(created) });
    }
    if (action === 'user' && req.method === 'POST') {
      const id = positiveInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'Invalid ID' });
      if (id === user.id) return res.status(409).json({ error: 'Self lifecycle changes are not allowed' });

      const target = await prisma.user.findUnique({ where: { id }, include: userInclude });
      if (!target || !(await targetInActorScope(user, target)) || !canManageUserLifecycle(user, target)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const lifecycleAction = clean(req.body?.action, 30, true);
      if (!lifecycleAction || !['activate', 'deactivate'].includes(lifecycleAction)) {
        return res.status(400).json({ error: 'Invalid lifecycle action' });
      }

      const nextStatus = lifecycleAction === 'activate' ? 'Aktif' : 'Pasif';
      const updated = await prisma.$transaction(async (tx: any) => {
        const changed = await tx.user.update({
          where: { id },
          data: { status: nextStatus },
          include: userInclude
        });

        if (target.role.code === 'YAZAR' && target.AuthorProfile) {
          await tx.authorProfile.update({
            where: { userId: id },
            data: { status: lifecycleAction === 'activate' ? 'Aktif' : 'Pasif' }
          });
        }

        await tx.activityLog.create({
          data: {
            userName: user.fullName,
            action: lifecycleAction === 'activate' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
            entityType: 'User',
            entityId: id,
            details: JSON.stringify({ targetRole: target.role.code, previousStatus: target.status, nextStatus })
          }
        });

        return changed;
      });

      return res.status(200).json({ user: userDto(updated) });
    }

    if (action === 'user' && req.method === 'DELETE') {
      const id = positiveInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'Invalid ID' });
      if (id === user.id) return res.status(409).json({ error: 'Self deletion is not allowed' });

      const target = await prisma.user.findUnique({ where: { id }, include: userInclude });
      if (!target || !(await targetInActorScope(user, target)) || !canManageUserLifecycle(user, target)) {
        return res.status(404).json({ error: 'Not found' });
      }

      const history = await protectedUserHistory(id, target.AuthorProfile?.id);
      if (hasProtectedUserHistory(history)) {
        return res.status(409).json({
          error: 'Historical records exist. Deactivate this user instead of deleting.',
          protectedRelations: history
        });
      }

      await prisma.$transaction(async (tx: any) => {
        await tx.user.delete({ where: { id } });
        await tx.activityLog.create({
          data: {
            userName: user.fullName,
            action: 'USER_DELETED',
            entityType: 'User',
            entityId: id,
            details: JSON.stringify({
              fullName: target.fullName,
              email: target.email,
              role: target.role.code,
              provinceId: target.province?.id ?? target.AuthorProfile?.provinceId ?? null,
              assignedRegion: target.assignedRegion ?? null
            })
          }
        });
      });

      return res.status(200).json({ deleted: true, id });
    }

    if (action === 'user' && req.method === 'PATCH') {
      if (!['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(user.role.code)) return res.status(403).json({ error: 'Forbidden' });
      const id = positiveInt(req.query.id);
      if (!id) return res.status(400).json({ error: 'Invalid ID' });
      if (id === user.id) return res.status(409).json({ error: 'Self role changes are not allowed here' });
      const target = await prisma.user.findUnique({ where: { id }, include: userInclude });
      if (!target || !(await targetInActorScope(user,target))) return res.status(404).json({ error: 'Not found' });
      const v = await validateAssignment(user, req.body || {});
      if ('error' in v) return res.status(403).json({ error: v.error });
      const status = req.body?.status === undefined ? target.status : clean(req.body.status,30,true);
      if (!status || !['Aktif','Pasif'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      const updated = await prisma.$transaction(async (tx: any) => {
        await applyAssignment(tx,id,v,status);
        await tx.activityLog.create({ data: { userName: user.fullName, action: 'USER_ROLE_SCOPE_UPDATED', entityType: 'User', entityId: id, details: JSON.stringify({ fromRole: target.role.code, toRole: v.roleCode, provinceId: v.provinceId, districtName: v.districtName, assignedRegion: v.assignedRegion, branchIds: v.branchIds, status }) } });
        return tx.user.findUnique({ where: { id }, include: userInclude });
      });
      return res.status(200).json({ user: userDto(updated) });
    }
    return res.status(404).json({ error: 'Unknown management action' });
  } catch (error) {
    console.error('Management API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
