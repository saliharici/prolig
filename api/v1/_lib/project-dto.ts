import type { Prisma } from '../../../generated/prisma/client.js';

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
          user: { select: { id: true, fullName: true } },
          province: { select: { id: true, name: true, region: true } }
        }
      }
    }
  }
} satisfies Prisma.ProjectSelect;

type SelectedProject = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

export function formatProjectDto(project: SelectedProject, canManage = false) {
  return {
    id: project.id,
    title: project.title,
    code: project.code,
    projectType: project.projectType,
    coordinatorId: project.coordinatorId,
    canManage,
    progress: project.progress,
    deadline: project.deadline,
    status: project.status,
    priority: project.priority,
    targetGrade: project.targetGrade,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    taskCount: project._count.tasks,
    branch: project.branch,
    authors: project.projectAuthors.map(assignment => ({
      id: assignment.authorProfile.user.id,
      fullName: assignment.authorProfile.user.fullName,
      authorProfileId: assignment.authorProfileId,
      province: assignment.authorProfile.province
    }))
  };
}
