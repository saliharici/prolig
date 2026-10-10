import { canAssignProjectAuthor, canManageProject } from './project-access.js';

export const PROJECT_STATUSES = ['Taslak', 'Planlama', 'Devam_Ediyor', 'Kontrol', 'Tamamlandi', 'Arsiv'] as const;
export const EDITABLE_PROJECT_STATUSES = ['Taslak', 'Planlama', 'Devam_Ediyor', 'Kontrol', 'Tamamlandi'] as const;
export const PROJECT_PRIORITIES = ['Dusuk', 'Normal', 'Yuksek', 'Acil'] as const;
export const PROJECT_GRADES = [
  '1. Sınıf','2. Sınıf','3. Sınıf','4. Sınıf',
  '5. Sınıf','6. Sınıf','7. Sınıf','8. Sınıf',
  '9. Sınıf','10. Sınıf','11. Sınıf','12. Sınıf','Mezun'
] as const;

export function positiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function cleanProjectCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  if (code.length < 3 || code.length > 60 || !/^[A-Z0-9._-]+$/.test(code)) return null;
  return code;
}

export function cleanRequiredText(value: unknown, min: number, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

export function cleanOptionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (text.length > max) return undefined;
  return text || null;
}

export function parseDeadline(value: unknown): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAuthorProfileIds(value: unknown): number[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids: number[] = [];
  for (const raw of value) {
    const id = positiveInt(raw);
    if (!id) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

export async function validateProjectAuthors(
  prismaClient: any,
  actor: any,
  authorProfileIds: number[],
  branchId: number
) {
  if (authorProfileIds.length === 0) return { authors: [] as any[] };

  const authors = await prismaClient.authorProfile.findMany({
    where: { id: { in: authorProfileIds } },
    include: {
      province: true,
      branch: true,
      user: { include: { role: true } }
    }
  });

  if (authors.length !== authorProfileIds.length) {
    return { error: 'Unknown project author' } as const;
  }

  for (const author of authors) {
    if (!canAssignProjectAuthor(actor, author)) {
      return { error: 'Project author is outside your scope' } as const;
    }
    if (author.branchId !== branchId) {
      return { error: 'All project authors must match the project branch' } as const;
    }
  }

  return { authors } as const;
}

export async function protectedProjectHistory(prismaClient: any, projectId: number) {
  const [questions, tasks, files, payments, books] = await Promise.all([
    prismaClient.question.count({ where: { projectId } }),
    prismaClient.task.count({ where: { projectId } }),
    prismaClient.fileRecord.count({ where: { projectId } }),
    prismaClient.payment.count({ where: { projectId } }),
    prismaClient.book.count({ where: { projectId } })
  ]);
  return { questions, tasks, files, payments, books };
}

export function hasProtectedProjectHistory(history: Record<string, number>) {
  return Object.values(history).some((count) => count > 0);
}

export async function blockedRemovedProjectAuthors(
  prismaClient: any,
  projectId: number,
  removedAuthorProfiles: Array<{ id: number; userId: number }>
) {
  const blocked: Array<{ authorProfileId: number; reasons: Record<string, number> }> = [];

  for (const author of removedAuthorProfiles) {
    const [questions, tasks, files, payments] = await Promise.all([
      prismaClient.question.count({ where: { projectId, authorUserId: author.userId } }),
      prismaClient.task.count({ where: { projectId, assignedAuthorProfileId: author.id } }),
      prismaClient.fileRecord.count({ where: { projectId, authorProfileId: author.id } }),
      prismaClient.payment.count({ where: { projectId, authorUserId: author.userId } })
    ]);
    const reasons = { questions, tasks, files, payments };
    if (Object.values(reasons).some((count) => count > 0)) {
      blocked.push({ authorProfileId: author.id, reasons });
    }
  }

  return blocked;
}

export function canDeleteProject(project: any, actor: any) {
  return canManageProject(actor, project) && ['Taslak', 'Arsiv'].includes(project.status);
}
