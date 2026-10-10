import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { buildProjectReadScope, canCreateProject, canManageProject } from '../_lib/project-access.js';
import { formatProjectDto, projectSelect } from '../_lib/project-dto.js';
import {
  PROJECT_GRADES,
  PROJECT_PRIORITIES,
  cleanOptionalText,
  cleanProjectCode,
  cleanRequiredText,
  parseAuthorProfileIds,
  parseDeadline,
  positiveInt,
  validateProjectAuthors
} from '../_lib/project-management.js';

const createFields = new Set([
  'title', 'code', 'projectType', 'deadline', 'priority',
  'targetGrade', 'branchId', 'description', 'authorProfileIds'
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') return await handleGet(req, res);
    if (req.method === 'POST') return await handlePost(req, res);

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const where = buildProjectReadScope(user);
  if (where === null) return res.status(403).json({ error: 'Forbidden' });

  const projects = await prisma.project.findMany({
    where,
    select: projectSelect,
    orderBy: [{ deadline: 'asc' }, { id: 'asc' }]
  });

  return res.status(200).json(
    projects.map((project) => formatProjectDto(project, canManageProject(user, project)))
  );
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!canCreateProject(user)) return res.status(403).json({ error: 'Only coordinators can create projects' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (Object.keys(body).some((key) => !createFields.has(key))) {
    return res.status(400).json({ error: 'Unsupported project field' });
  }

  const title = cleanRequiredText(body.title, 3, 200);
  const code = cleanProjectCode(body.code);
  const projectType = cleanRequiredText(body.projectType ?? 'Soru Bankası', 2, 100);
  const deadline = parseDeadline(body.deadline);
  const priority = typeof body.priority === 'string' && PROJECT_PRIORITIES.includes(body.priority as any)
    ? body.priority
    : null;
  const targetGrade = typeof body.targetGrade === 'string' && PROJECT_GRADES.includes(body.targetGrade as any)
    ? body.targetGrade
    : null;
  const branchId = positiveInt(body.branchId);
  const description = cleanOptionalText(body.description, 2000);
  const authorProfileIds = parseAuthorProfileIds(body.authorProfileIds);

  if (!title || !code || !projectType || !deadline || !priority || !targetGrade || !branchId || description === undefined || authorProfileIds === null) {
    return res.status(400).json({ error: 'Invalid project fields' });
  }

  const [branch, duplicate] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } }),
    prisma.project.findUnique({ where: { code }, select: { id: true } })
  ]);
  if (!branch) return res.status(400).json({ error: 'Unknown branch' });
  if (duplicate) return res.status(409).json({ error: 'Project code already exists' });

  const authorValidation = await validateProjectAuthors(prisma, user, authorProfileIds, branchId);
  if ('error' in authorValidation) return res.status(403).json({ error: authorValidation.error });

  const project = await prisma.$transaction(async (tx: any) => {
    const created = await tx.project.create({
      data: {
        title,
        code,
        projectType,
        coordinatorId: user.id,
        progress: 0,
        deadline,
        status: 'Taslak',
        priority,
        targetGrade,
        branchId,
        description
      },
      select: { id: true }
    });

    if (authorProfileIds.length > 0) {
      await tx.projectAuthor.createMany({
        data: authorProfileIds.map((authorProfileId) => ({
          projectId: created.id,
          authorProfileId
        })),
        skipDuplicates: true
      });
    }

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'PROJECT_CREATED',
        entityType: 'Project',
        entityId: created.id,
        details: JSON.stringify({
          code,
          branchId,
          targetGrade,
          authorProfileIds
        })
      }
    });

    return tx.project.findUnique({
      where: { id: created.id },
      select: projectSelect
    });
  });

  if (!project) return res.status(500).json({ error: 'Project creation failed' });
  return res.status(201).json(formatProjectDto(project, true));
}
