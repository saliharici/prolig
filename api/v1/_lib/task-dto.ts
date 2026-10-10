import type { Prisma } from '../../../generated/prisma/client.js';
import { projectSelect } from './project-dto.js';
import { canManageTask, canUpdateTaskStatus } from './task-access.js';

export const taskSelect = {
  id: true,
  title: true,
  description: true,
  assignedAuthorProfileId: true,
  assignedCoordinatorId: true,
  priority: true,
  status: true,
  startDate: true,
  dueDate: true,
  completionDate: true,
  createdAt: true,
  updatedAt: true,
  project: { select: projectSelect },
  assignedAuthorProfile: {
    select: {
      id: true,
      user: { select: { id: true, fullName: true } },
      province: { select: { id: true, name: true, region: true } },
      branch: { select: { id: true, name: true } }
    }
  },
  assignedCoordinator: {
    select: {
      id: true,
      fullName: true,
      status: true,
      assignedRegion: true,
      provinceId: true,
      role: { select: { code: true, name: true } },
      province: { select: { id: true, name: true, region: true } }
    }
  }
} satisfies Prisma.TaskSelect;

export type SelectedTask = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export function formatTaskDto(task: SelectedTask, user: any) {
  const now = Date.now();
  const isCompleted = task.status === 'Tamamlandi';
  const isOverdue = !isCompleted && task.dueDate.getTime() < now;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    status: task.status,
    isOverdue,
    startDate: task.startDate,
    dueDate: task.dueDate,
    completionDate: task.completionDate,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    project: {
      id: task.project.id,
      title: task.project.title,
      code: task.project.code,
      targetGrade: task.project.targetGrade,
      branch: task.project.branch
    },
    assignedAuthor: task.assignedAuthorProfile ? {
      id: task.assignedAuthorProfile.user.id,
      authorProfileId: task.assignedAuthorProfile.id,
      fullName: task.assignedAuthorProfile.user.fullName,
      province: task.assignedAuthorProfile.province,
      branch: task.assignedAuthorProfile.branch
    } : null,
    assignedUser: task.assignedCoordinator ? {
      id: task.assignedCoordinator.id,
      fullName: task.assignedCoordinator.fullName,
      role: task.assignedCoordinator.role,
      province: task.assignedCoordinator.province,
      assignedRegion: task.assignedCoordinator.assignedRegion
    } : null,
    canManage: canManageTask(user, task),
    canUpdateStatus: canUpdateTaskStatus(user, task)
  };
}
