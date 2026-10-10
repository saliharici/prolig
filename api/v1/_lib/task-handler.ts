import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { projectSelect } from './project-dto.js';
import {
  buildTaskReadScope,
  canAdvanceOwnTask,
  canAssignTaskUser,
  canCreateTask,
  canManageTask,
  isTaskAssignee
} from './task-access.js';
import { formatTaskDto, taskSelect } from './task-dto.js';

const priorities = new Set(['Dusuk', 'Normal', 'Yuksek', 'Acil']);
const workflowStatuses = new Set(['Bekliyor', 'Devam_Ediyor', 'Kontrol_Bekliyor', 'Tamamlandi']);
const createFields = new Set([
  'title', 'description', 'projectId', 'priority', 'startDate', 'dueDate',
  'assignedAuthorProfileId', 'assignedUserId'
]);
const patchFields = new Set([
  'title', 'description', 'priority', 'startDate', 'dueDate',
  'assignedAuthorProfileId', 'assignedUserId', 'status'
]);

function positiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) return Number(value);
  return null;
}

function cleanRequired(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

function cleanOptional(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length > max) return undefined;
  return text || null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function loadManageableProject(projectId: number, user: any) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: projectSelect
  });
  if (!project) return null;
  return canManageTask(user, { project }) ? project : null;
}

async function validateAssignee(
  project: any,
  actor: any,
  assignedAuthorProfileId: number | null,
  assignedUserId: number | null
) {
  if ((assignedAuthorProfileId ? 1 : 0) + (assignedUserId ? 1 : 0) !== 1) {
    return { error: 'Task must have exactly one assignee' } as const;
  }

  if (assignedAuthorProfileId) {
    const assignment = project.projectAuthors.find(
      (item: any) => item.authorProfileId === assignedAuthorProfileId
    );
    if (!assignment) return { error: 'Author must be assigned to the selected project' } as const;

    const author = await prisma.authorProfile.findUnique({
      where: { id: assignedAuthorProfileId },
      select: {
        id: true,
        status: true,
        user: { select: { id: true, status: true, role: { select: { code: true } } } }
      }
    });
    if (!author || author.status !== 'Aktif' || author.user.status?.toUpperCase?.() !== 'AKTIF' || author.user.role.code !== 'YAZAR') {
      return { error: 'Selected author is not active' } as const;
    }
    return { assignedAuthorProfileId, assignedCoordinatorId: null } as const;
  }

  const target = await prisma.user.findUnique({
    where: { id: assignedUserId! },
    select: {
      id: true,
      fullName: true,
      status: true,
      assignedRegion: true,
      provinceId: true,
      role: { select: { code: true } },
      province: { select: { id: true, name: true, region: true } }
    }
  });
  if (!target || !canAssignTaskUser(actor, target)) {
    return { error: 'Selected coordinator/editor is outside your task assignment scope' } as const;
  }

  return { assignedAuthorProfileId: null, assignedCoordinatorId: target.id } as const;
}

export async function handleTaskAction(
  req: VercelRequest,
  res: VercelResponse,
  user: any,
  action: 'tasks' | 'task'
) {
  if (action === 'tasks') {
    if (req.method === 'GET') return listTasks(user, req, res);
    if (req.method === 'POST') return createTask(user, req, res);
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = positiveInt(req.query.id);
  if (!id) return res.status(400).json({ error: 'Invalid task id' });
  if (req.method === 'GET') return getTask(id, user, res);
  if (req.method === 'PATCH') return updateTask(id, user, req, res);
  if (req.method === 'DELETE') return deleteTask(id, user, res);
  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
  return res.status(405).json({ error: 'Method not allowed' });
}

async function listTasks(user: any, req: VercelRequest, res: VercelResponse) {
  const scope = buildTaskReadScope(user);
  if (scope === null) return res.status(403).json({ error: 'Forbidden' });

  const projectId = req.query.projectId === undefined ? null : positiveInt(req.query.projectId);
  if (req.query.projectId !== undefined && !projectId) {
    return res.status(400).json({ error: 'Invalid projectId' });
  }

  const where = projectId ? { AND: [scope, { projectId }] } : scope;
  const tasks = await prisma.task.findMany({
    where,
    select: taskSelect,
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { id: 'asc' }]
  });

  return res.status(200).json(tasks.map((task) => formatTaskDto(task, user)));
}

async function getTask(id: number, user: any, res: VercelResponse) {
  const scope = buildTaskReadScope(user);
  if (scope === null) return res.status(403).json({ error: 'Forbidden' });

  const task = await prisma.task.findFirst({
    where: { AND: [scope, { id }] },
    select: taskSelect
  });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  return res.status(200).json(formatTaskDto(task, user));
}

async function createTask(user: any, req: VercelRequest, res: VercelResponse) {
  if (!canCreateTask(user)) return res.status(403).json({ error: 'Only coordinators can create tasks' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (Object.keys(body).some((key) => !createFields.has(key))) {
    return res.status(400).json({ error: 'Unsupported task field' });
  }

  const title = cleanRequired(body.title, 3, 160);
  const description = body.description === undefined ? null : cleanOptional(body.description, 1500);
  const projectId = positiveInt(body.projectId);
  const priority = typeof body.priority === 'string' && priorities.has(body.priority) ? body.priority : null;
  const startDate = parseDate(body.startDate);
  const dueDate = parseDate(body.dueDate);
  const assignedAuthorProfileId = body.assignedAuthorProfileId == null ? null : positiveInt(body.assignedAuthorProfileId);
  const assignedUserId = body.assignedUserId == null ? null : positiveInt(body.assignedUserId);

  if (!title || description === undefined || !projectId || !priority || !startDate || !dueDate) {
    return res.status(400).json({ error: 'Invalid task fields' });
  }
  if (dueDate.getTime() < startDate.getTime()) {
    return res.status(400).json({ error: 'Due date cannot be before start date' });
  }

  const project = await loadManageableProject(projectId, user);
  if (!project) return res.status(404).json({ error: 'Project not found or outside management scope' });
  if (project.status === 'Arsiv' || project.status === 'Tamamlandi') {
    return res.status(409).json({ error: 'Tasks cannot be created for archived or completed projects' });
  }

  const assignee = await validateAssignee(project, user, assignedAuthorProfileId, assignedUserId);
  if ('error' in assignee) return res.status(403).json({ error: assignee.error });

  const task = await prisma.$transaction(async (tx: any) => {
    const created = await tx.task.create({
      data: {
        title,
        description,
        projectId,
        priority,
        status: 'Bekliyor',
        startDate,
        dueDate,
        assignedAuthorProfileId: assignee.assignedAuthorProfileId,
        assignedCoordinatorId: assignee.assignedCoordinatorId
      },
      select: { id: true }
    });

    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'TASK_CREATED',
        entityType: 'Task',
        entityId: created.id,
        details: JSON.stringify({
          projectId,
          priority,
          assignedAuthorProfileId: assignee.assignedAuthorProfileId,
          assignedCoordinatorId: assignee.assignedCoordinatorId
        })
      }
    });

    return tx.task.findUnique({ where: { id: created.id }, select: taskSelect });
  });

  if (!task) return res.status(500).json({ error: 'Task creation failed' });
  return res.status(201).json(formatTaskDto(task, user));
}

async function updateTask(id: number, user: any, req: VercelRequest, res: VercelResponse) {
  const task = await prisma.task.findUnique({ where: { id }, select: taskSelect });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const manager = canManageTask(user, task);
  const assignee = isTaskAssignee(user, task);
  if (!manager && !assignee) return res.status(404).json({ error: 'Task not found' });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !patchFields.has(key))) {
    return res.status(400).json({ error: 'Invalid task update' });
  }

  if (!manager) {
    if (keys.length !== 1 || keys[0] !== 'status' || typeof body.status !== 'string' || !workflowStatuses.has(body.status)) {
      return res.status(403).json({ error: 'Assignees can only advance task status' });
    }
    if (!canAdvanceOwnTask(task.status, body.status)) {
      return res.status(409).json({ error: 'Invalid assignee task transition' });
    }
  }

  const data: any = {};

  if (Object.prototype.hasOwnProperty.call(body, 'title')) {
    const value = cleanRequired(body.title, 3, 160);
    if (!value) return res.status(400).json({ error: 'Invalid title' });
    data.title = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    const value = cleanOptional(body.description, 1500);
    if (value === undefined) return res.status(400).json({ error: 'Invalid description' });
    data.description = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'priority')) {
    if (typeof body.priority !== 'string' || !priorities.has(body.priority)) return res.status(400).json({ error: 'Invalid priority' });
    data.priority = body.priority;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'startDate')) {
    const value = parseDate(body.startDate);
    if (!value) return res.status(400).json({ error: 'Invalid start date' });
    data.startDate = value;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'dueDate')) {
    const value = parseDate(body.dueDate);
    if (!value) return res.status(400).json({ error: 'Invalid due date' });
    data.dueDate = value;
  }

  const nextStart = data.startDate ?? task.startDate;
  const nextDue = data.dueDate ?? task.dueDate;
  if (nextDue.getTime() < nextStart.getTime()) {
    return res.status(400).json({ error: 'Due date cannot be before start date' });
  }

  const assigneeFieldsTouched =
    Object.prototype.hasOwnProperty.call(body, 'assignedAuthorProfileId') ||
    Object.prototype.hasOwnProperty.call(body, 'assignedUserId');

  if (assigneeFieldsTouched) {
    if (!manager) return res.status(403).json({ error: 'Only coordinators can reassign tasks' });
    const authorId = body.assignedAuthorProfileId == null ? null : positiveInt(body.assignedAuthorProfileId);
    const userId = body.assignedUserId == null ? null : positiveInt(body.assignedUserId);
    const checked = await validateAssignee(task.project, user, authorId, userId);
    if ('error' in checked) return res.status(403).json({ error: checked.error });
    data.assignedAuthorProfileId = checked.assignedAuthorProfileId;
    data.assignedCoordinatorId = checked.assignedCoordinatorId;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    if (typeof body.status !== 'string' || !workflowStatuses.has(body.status)) {
      return res.status(400).json({ error: 'Invalid task status' });
    }
    data.status = body.status;
    data.completionDate = body.status === 'Tamamlandi' ? new Date() : null;
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    await tx.task.update({ where: { id }, data });
    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'TASK_UPDATED',
        entityType: 'Task',
        entityId: id,
        details: JSON.stringify({ fields: Object.keys(data) })
      }
    });
    return tx.task.findUnique({ where: { id }, select: taskSelect });
  });

  if (!updated) return res.status(404).json({ error: 'Task not found' });
  return res.status(200).json(formatTaskDto(updated, user));
}

async function deleteTask(id: number, user: any, res: VercelResponse) {
  const task = await prisma.task.findUnique({ where: { id }, select: taskSelect });
  if (!task || !canManageTask(user, task)) {
    return res.status(404).json({ error: 'Task not found or outside management scope' });
  }
  if (task.status !== 'Bekliyor') {
    return res.status(409).json({ error: 'Only waiting tasks can be permanently deleted' });
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.task.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'TASK_DELETED',
        entityType: 'Task',
        entityId: id,
        details: JSON.stringify({ projectId: task.project.id, title: task.title })
      }
    });
  });

  return res.status(200).json({ deleted: true, id });
}
