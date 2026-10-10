import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { buildProjectReadScope, canManageProject } from '../_lib/project-access.js';
import { formatProjectDto, projectSelect } from '../_lib/project-dto.js';
import {
  EDITABLE_PROJECT_STATUSES,
  PROJECT_GRADES,
  PROJECT_PRIORITIES,
  blockedRemovedProjectAuthors,
  canDeleteProject,
  cleanOptionalText,
  cleanProjectCode,
  cleanRequiredText,
  hasProtectedProjectHistory,
  parseAuthorProfileIds,
  parseDeadline,
  positiveInt,
  protectedProjectHistory,
  validateProjectAuthors
} from '../_lib/project-management.js';
import { accrueProjectCoordinatorCompletion } from '../_lib/compensation-engine.js';

const patchFields = new Set([
  'title', 'code', 'projectType', 'deadline', 'priority', 'targetGrade',
  'branchId', 'description', 'authorProfileIds', 'progress', 'status'
]);

function parseId(req: VercelRequest) {
  const rawId = req.query.id;
  if (Array.isArray(rawId) || typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) return null;
  return Number(rawId);
}

async function findReadableProject(id: number, user: any) {
  const scope = buildProjectReadScope(user);
  if (scope === null) return null;
  return prisma.project.findFirst({
    where: { AND: [scope, { id }] },
    select: projectSelect
  });
}

async function findManageableProject(id: number, user: any) {
  const project = await prisma.project.findUnique({
    where: { id },
    select: projectSelect
  });
  if (!project || !canManageProject(user, project)) return null;
  return project;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const id = parseId(req);
    if (!id) return res.status(400).json({ error: 'Invalid project id' });

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') return await handleGet(id, user, res);
    if (req.method === 'PATCH') return await handlePatch(id, user, req, res);
    if (req.method === 'POST') return await handleLifecycle(id, user, req, res);
    if (req.method === 'DELETE') return await handleDelete(id, user, res);

    res.setHeader('Allow', ['GET', 'PATCH', 'POST', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(id: number, user: any, res: VercelResponse) {
  const project = await findReadableProject(id, user);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  return res.status(200).json(formatProjectDto(project, canManageProject(user, project)));
}

async function handlePatch(id: number, user: any, req: VercelRequest, res: VercelResponse) {
  const project = await findManageableProject(id, user);
  if (!project) return res.status(404).json({ error: 'Project not found or outside management scope' });
  if (project.status === 'Arsiv') {
    return res.status(409).json({ error: 'Archived project must be restored before editing' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const keys = Object.keys(body);
  if (keys.length === 0) return res.status(400).json({ error: 'No editable fields provided' });
  if (keys.some((key) => !patchFields.has(key))) {
    return res.status(400).json({ error: 'Unsupported project field' });
  }

  const data: any = {};
  let requestedAuthors: number[] | undefined;

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const value = cleanRequiredText(body.title, 3, 200);
    if (!value) return res.status(400).json({ error: 'Invalid title' });
    data.title = value;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'code')) {
    const value = cleanProjectCode(body.code);
    if (!value) return res.status(400).json({ error: 'Invalid project code' });
    const duplicate = await prisma.project.findFirst({
      where: { code: value, NOT: { id } },
      select: { id: true }
    });
    if (duplicate) return res.status(409).json({ error: 'Project code already exists' });
    data.code = value;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'projectType')) {
    const value = cleanRequiredText(body.projectType, 2, 100);
    if (!value) return res.status(400).json({ error: 'Invalid project type' });
    data.projectType = value;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'deadline')) {
    const value = parseDeadline(body.deadline);
    if (!value) return res.status(400).json({ error: 'Invalid deadline' });
    data.deadline = value;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'priority')) {
    if (typeof body.priority !== 'string' || !PROJECT_PRIORITIES.includes(body.priority as any)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }
    data.priority = body.priority;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'targetGrade')) {
    if (typeof body.targetGrade !== 'string' || !PROJECT_GRADES.includes(body.targetGrade as any)) {
      return res.status(400).json({ error: 'Invalid target grade' });
    }
    data.targetGrade = body.targetGrade;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'branchId')) {
    const branchId = positiveInt(body.branchId);
    if (!branchId) return res.status(400).json({ error: 'Invalid branchId' });
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
    if (!branch) return res.status(400).json({ error: 'Unknown branch' });
    data.branchId = branchId;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    const value = cleanOptionalText(body.description, 2000);
    if (value === undefined) return res.status(400).json({ error: 'Invalid description' });
    data.description = value;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'progress')) {
    if (typeof body.progress !== 'number' || !Number.isSafeInteger(body.progress) || body.progress < 0 || body.progress > 100) {
      return res.status(400).json({ error: 'Invalid progress' });
    }
    data.progress = body.progress;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (typeof body.status !== 'string' || !EDITABLE_PROJECT_STATUSES.includes(body.status as any)) {
      return res.status(400).json({ error: 'Invalid project status' });
    }
    data.status = body.status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'authorProfileIds')) {
    const ids = parseAuthorProfileIds(body.authorProfileIds);
    if (ids === null) return res.status(400).json({ error: 'Invalid authorProfileIds' });
    requestedAuthors = ids;
  }

  const effectiveBranchId = data.branchId ?? project.branch.id;
  const branchChanged = data.branchId !== undefined && data.branchId !== project.branch.id;
  const gradeChanged = data.targetGrade !== undefined && data.targetGrade !== project.targetGrade;

  if (branchChanged || gradeChanged) {
    const linkedQuestions = await prisma.question.count({ where: { projectId: id } });
    if (linkedQuestions > 0) {
      return res.status(409).json({
        error: 'Project branch or target grade cannot change after questions are linked',
        linkedQuestions
      });
    }
  }

  if (requestedAuthors !== undefined) {
    const validation = await validateProjectAuthors(prisma, user, requestedAuthors, effectiveBranchId);
    if ('error' in validation) return res.status(403).json({ error: validation.error });

    const requestedSet = new Set(requestedAuthors);
    const removed = project.projectAuthors
      .filter((assignment) => !requestedSet.has(assignment.authorProfileId))
      .map((assignment) => ({
        id: assignment.authorProfileId,
        userId: assignment.authorProfile.user.id
      }));

    if (removed.length > 0) {
      const blocked = await blockedRemovedProjectAuthors(prisma, id, removed);
      if (blocked.length > 0) {
        return res.status(409).json({
          error: 'Authors with project history cannot be removed',
          blockedAuthors: blocked
        });
      }
    }
  } else if (branchChanged) {
    const currentAuthorIds = project.projectAuthors.map((assignment) => assignment.authorProfileId);
    const validation = await validateProjectAuthors(prisma, user, currentAuthorIds, effectiveBranchId);
    if ('error' in validation) {
      return res.status(409).json({ error: 'Existing project authors do not match the new branch' });
    }
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    if (Object.keys(data).length > 0) {
      await tx.project.update({ where: { id }, data });
    }

    if (requestedAuthors !== undefined) {
      const currentAuthorIds = new Set(project.projectAuthors.map((assignment) => assignment.authorProfileId));
      const requestedSet = new Set(requestedAuthors);
      const removedIds = [...currentAuthorIds].filter((authorProfileId) => !requestedSet.has(authorProfileId));
      const addedIds = requestedAuthors.filter((authorProfileId) => !currentAuthorIds.has(authorProfileId));

      if (removedIds.length > 0) {
        await tx.projectAuthor.deleteMany({
          where: { projectId: id, authorProfileId: { in: removedIds } }
        });
      }
      if (addedIds.length > 0) {
        await tx.projectAuthor.createMany({
          data: addedIds.map((authorProfileId) => ({ projectId: id, authorProfileId })),
          skipDuplicates: true
        });
      }
    }

    if (data.status === 'Tamamlandi' && project.status !== 'Tamamlandi') {
      await accrueProjectCoordinatorCompletion(tx, {
        id: project.id,
        coordinatorId: project.coordinatorId
      });
    }

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'PROJECT_UPDATED',
        entityType: 'Project',
        entityId: id,
        details: JSON.stringify({
          fields: [...Object.keys(data), ...(requestedAuthors !== undefined ? ['authorProfileIds'] : [])]
        })
      }
    });

    return tx.project.findUnique({ where: { id }, select: projectSelect });
  });

  if (!updated) return res.status(404).json({ error: 'Project not found' });
  return res.status(200).json(formatProjectDto(updated, true));
}

async function handleLifecycle(id: number, user: any, req: VercelRequest, res: VercelResponse) {
  const project = await findManageableProject(id, user);
  if (!project) return res.status(404).json({ error: 'Project not found or outside management scope' });

  const action = req.body?.action;
  if (!['archive', 'restore'].includes(action)) {
    return res.status(400).json({ error: 'Invalid project lifecycle action' });
  }

  if (action === 'archive' && project.status === 'Arsiv') {
    return res.status(200).json(formatProjectDto(project, true));
  }
  if (action === 'restore' && project.status !== 'Arsiv') {
    return res.status(200).json(formatProjectDto(project, true));
  }

  const status = action === 'archive' ? 'Arsiv' : 'Planlama';
  const updated = await prisma.$transaction(async (tx: any) => {
    await tx.project.update({ where: { id }, data: { status } });
    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: action === 'archive' ? 'PROJECT_ARCHIVED' : 'PROJECT_RESTORED',
        entityType: 'Project',
        entityId: id,
        details: JSON.stringify({ previousStatus: project.status, status })
      }
    });
    return tx.project.findUnique({ where: { id }, select: projectSelect });
  });

  if (!updated) return res.status(404).json({ error: 'Project not found' });
  return res.status(200).json(formatProjectDto(updated, true));
}

async function handleDelete(id: number, user: any, res: VercelResponse) {
  const project = await findManageableProject(id, user);
  if (!project) return res.status(404).json({ error: 'Project not found or outside management scope' });
  if (!canDeleteProject(project, user)) {
    return res.status(409).json({ error: 'Only draft or archived projects can be permanently deleted' });
  }

  const history = await protectedProjectHistory(prisma, id);
  if (hasProtectedProjectHistory(history)) {
    return res.status(409).json({
      error: 'Project has historical records. Archive it instead of deleting.',
      protectedRelations: history
    });
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.project.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'PROJECT_DELETED',
        entityType: 'Project',
        entityId: id,
        details: JSON.stringify({
          code: project.code,
          title: project.title,
          status: project.status
        })
      }
    });
  });

  return res.status(200).json({ deleted: true, id });
}
