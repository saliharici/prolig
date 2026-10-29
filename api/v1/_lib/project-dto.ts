import type { Prisma } from '../../../generated/prisma/client.js';
import type { ProductionMetrics } from './production-progress.js';

export const projectSelect = {
  id: true,
  title: true,
  code: true,
  projectType: true,
  coordinatorId: true,
  progress: true,
  deadline: true,
  status: true,
  priority: true,
  targetGrade: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: { id: true, name: true }
  },
  _count: { select: { tasks: true } },
  projectAuthors: {
    select: {
      authorProfileId: true,
      authorProfile: {
        select: {
          branchId: true,
          user: { select: { id: true, fullName: true } },
          province: { select: { id: true, name: true, region: true } }
        }
      }
    }
  }
} satisfies Prisma.ProjectSelect;

type SelectedProject = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

export function formatProjectDto(project: SelectedProject, canManage = false, production?: ProductionMetrics) {
  return {
    id: project.id,
    title: project.title,
    code: project.code,
    projectType: project.projectType,
    coordinatorId: project.coordinatorId,
    canManage,
    progress: production?.completionPercent ?? project.progress,
    progressSource: production?.completionPercent !== null && production?.completionPercent !== undefined ? 'automatic' : 'manual',
    production: production ?? null,
    deadline: project.deadline,
    status: project.status,
    priority: project.priority,
    targetGrade: project.targetGrade,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    taskCount: project._count?.tasks ?? 0,
    branch: project.branch,
    authors: project.projectAuthors.map(assignment => ({
      id: assignment.authorProfile.user.id,
      fullName: assignment.authorProfile.user.fullName,
      authorProfileId: assignment.authorProfileId,
      province: assignment.authorProfile.province
    }))
  };
}
