import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { prisma } from './_lib/prisma.js';
import { getCurrentUser } from './_lib/current-user.js';
import { buildApplicationReadScope, buildUserReadScope, canAssignRole, canViewProvince, coordinatorRoles } from './_lib/member-access.js';

const canonicalRoles = new Set(['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE']);
const openStatuses = ['ALINDI','INCELEMEDE','UYGUN'];

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
  AuthorProfile: { select: { id: true, branchId: true, provinceId: true } }
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
  const assignedRegion = payload.assignedRegion == null ? null : clean(payload.assignedRegion, 100, true);
  const editorGrade = payload.editorGrade == null ? null : clean(payload.editorGrade, 50, true);
  const branchIds = [...new Set((Array.isArray(payload.branchIds) ? payload.branchIds : []).map(positiveInt).filter((x): x is number => x !== null))];
  const province = provinceId ? await prisma.province.findUnique({ where: { id: provinceId } }) : null;
  if (provinceId && !province) return { error: 'Unknown province' } as const;
  if (province && actor.role.code !== 'GENEL_KOORDINATOR' && !canViewProvince(actor, province)) return { error: 'Province is outside your scope' } as const;
  if (actor.role.code === 'BOLGE_KOORDINATORU' && assignedRegion && assignedRegion !== actor.assignedRegion) return { error: 'Region is outside your scope' } as const;
  if (roleCode === 'BOLGE_KOORDINATORU' && !assignedRegion) return { error: 'Region is required' } as const;
  if (roleCode === 'IL_KOORDINATORU' && !province) return { error: 'Province is required' } as const;
  if (roleCode === 'EDITOR' && (branchIds.length === 0 || (!province && !assignedRegion) || (province && assignedRegion))) {
    return { error: 'Editor requires branches and exactly one geographic scope' } as const;
  }
  if (roleCode === 'YAZAR' && (!province || branchIds.length !== 1)) return { error: 'Author province and exactly one branch are required' } as const;
  if (branchIds.length) {
    const count = await prisma.branch.count({ where: { id: { in: branchIds } } });
    if (count !== branchIds.length) return { error: 'Unknown branch' } as const;
  }
  return { roleCode, provinceId, assignedRegion, editorGrade, branchIds } as const;
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
    if (existingAuthor) {
      await tx.authorProfile.update({
        where: { userId },
        data: { provinceId: v.provinceId, branchId: v.branchIds[0], status: 'Aktif' }
      });
    } else {
      await tx.authorProfile.create({
        data: { userId, provinceId: v.provinceId, branchId: v.branchIds[0], experienceYears: 0, status: 'Aktif' }
      });
    }
  } else if (existingAuthor) {
    // Preserve historical relations but remove the former writer from the active author network.
    await tx.authorProfile.update({ where: { userId }, data: { status: 'Pasif' } });
  }
}
async function targetInActorScope(actor: any, target: any) {
  if (actor.role.code === 'GENEL_KOORDINATOR') return true;
  if (actor.role.code !== 'BOLGE_KOORDINATORU' || !['IL_KOORDINATORU','EDITOR','YAZAR'].includes(target.role.code)) return false;
  if (target.assignedRegion) return target.assignedRegion === actor.assignedRegion;
  const provinceId = target.province?.id ?? target.AuthorProfile?.provinceId;
  if (!provinceId) return false;
  const province = target.province ?? await prisma.province.findUnique({ where: { id: provinceId } });
  return canViewProvince(actor, province);
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
      const requestedRole = clean(req.body?.requestedRole,50);
      if (!fullName || !email || !email.includes('@') || !provinceId || (requestedRole && !['YAZAR','EDITOR'].includes(requestedRole))) return res.status(400).json({ error: 'Invalid application' });
      const province = await prisma.province.findUnique({ where: { id: provinceId } });
      if (!province) return res.status(400).json({ error: 'Unknown province' });
      const existing = await prisma.membershipApplication.findFirst({ where: { email, status: { in: openStatuses as any } } });
      if (existing) return res.status(409).json({ error: 'An active application already exists' });
      const application = await prisma.membershipApplication.create({ data: {
        fullName, email, provinceId,
        phone: clean(req.body?.phone,40) || null,
        districtName: clean(req.body?.districtName,120) || null,
        institutionName: clean(req.body?.institutionName,200) || null,
        requestedRole: requestedRole || null,
        requestedBranch: clean(req.body?.requestedBranch,120) || null,
        motivation: clean(req.body?.motivation,1000) || null
      }, include: { province: true }});
      return res.status(201).json({ application });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!coordinatorRoles.has(user.role.code)) return res.status(403).json({ error: 'Forbidden' });

    if (action === 'metadata' && req.method === 'GET') {
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
      if (!['GENEL_KOORDINATOR','BOLGE_KOORDINATORU'].includes(user.role.code)) return res.status(403).json({ error: 'Forbidden' });
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
        await tx.activityLog.create({ data: { userName: user.fullName, action: 'USER_CREATED_AND_ASSIGNED', entityType: 'User', entityId: base.id, details: JSON.stringify({ role: v.roleCode, provinceId: v.provinceId, assignedRegion: v.assignedRegion, branchIds: v.branchIds }) } });
        return tx.user.findUnique({ where: { id: base.id }, include: userInclude });
      });
      return res.status(201).json({ user: userDto(created) });
    }
    if (action === 'user' && req.method === 'PATCH') {
      if (!['GENEL_KOORDINATOR','BOLGE_KOORDINATORU'].includes(user.role.code)) return res.status(403).json({ error: 'Forbidden' });
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
        await tx.activityLog.create({ data: { userName: user.fullName, action: 'USER_ROLE_SCOPE_UPDATED', entityType: 'User', entityId: id, details: JSON.stringify({ fromRole: target.role.code, toRole: v.roleCode, provinceId: v.provinceId, assignedRegion: v.assignedRegion, branchIds: v.branchIds, status }) } });
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
