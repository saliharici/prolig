import type { Prisma } from '../../../generated/prisma/client.js';

export const authorSelect = {
  id: true,
  userId: true,
  title: true,
  experienceYears: true,
  status: true,
  createdAt: true,
  user: { select: { fullName: true } },
  branch: { select: { id: true, name: true } },
  province: { select: { id: true, name: true, region: true } },
  district: { select: { id: true, name: true } },
  institution: { select: { id: true, name: true, type: true } },
  projectAuthors: {
    select: {
      project: { select: { status: true, targetGrade: true } }
    }
  }
} satisfies Prisma.AuthorProfileSelect;

type SelectedAuthor = Prisma.AuthorProfileGetPayload<{ select: typeof authorSelect }>;

export function formatAuthorDto(author: SelectedAuthor) {
  const projectGrades = [...new Set(author.projectAuthors.map(assignment => assignment.project.targetGrade))].sort((a, b) => a.localeCompare(b, 'tr-TR'));
  const activeProjectCount = author.projectAuthors.filter(assignment => !['Tamamlandi', 'Arsiv'].includes(assignment.project.status)).length;

  return {
    id: author.id,
    userId: author.userId,
    fullName: author.user.fullName,
    title: author.title,
    experienceYears: author.experienceYears,
    status: author.status,
    createdAt: author.createdAt.toISOString(),
    branch: author.branch,
    province: author.province,
    district: author.district,
    institution: author.institution,
    activeProjectCount,
    projectGrades
  };
}
