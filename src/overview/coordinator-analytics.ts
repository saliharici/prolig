import type { ApiProject } from '../projects/types';
import type { ApiQuestion } from '../questions/types';
import type { AuthorPerformanceReportRow } from '../reports/author-performance';

export interface OverdueProject {
  project: ApiProject;
  overdueDays: number;
}

function dateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function validDatePart(deadline: string): string | null {
  const value = deadline.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + 'T12:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return value;
}

/** Deadline dates are calendar dates; do not flag projects late at midnight UTC. */
export function overdueProjects(projects: ApiProject[], now = new Date()): OverdueProject[] {
  const today = dateKey(now);
  const todayUtc = Date.parse(today + 'T00:00:00Z');
  return projects.flatMap(project => {
    if (project.status === 'Tamamlandi' || project.status === 'Arsiv') return [];
    const end = validDatePart(project.deadline);
    if (!end || end >= today) return [];
    return [{ project, overdueDays: Math.round((todayUtc - Date.parse(end + 'T00:00:00Z')) / 86400000) }];
  }).sort((a, b) => b.overdueDays - a.overdueDays ||
    a.project.title.localeCompare(b.project.title, 'tr-TR') || a.project.id - b.project.id);
}

export function reviewQueue(questions: ApiQuestion[]): ApiQuestion[] {
  return questions.filter(question => question.status === 'INCELEMEDE' && !question.isArchived)
    .sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt) || a.id - b.id);
}

export interface AuthorProductivity {
  userId: number;
  name: string;
  approved: number;
  total: number;
  review: number;
  revision: number;
  projectCount: number;
}

/** Project–author rows are distinct, but an author can participate in multiple projects. */
export function topAuthorProductivity(rows: AuthorPerformanceReportRow[]): AuthorProductivity[] {
  const grouped = new Map<number, AuthorProductivity & { projectIds: Set<number> }>();
  for (const row of rows) {
    let author = grouped.get(row.userId);
    if (!author) {
      author = { userId: row.userId, name: row.authorName, approved: 0, total: 0,
        review: 0, revision: 0, projectCount: 0, projectIds: new Set<number>() };
      grouped.set(row.userId, author);
    }
    if (author.projectIds.has(row.projectId)) continue;
    author.projectIds.add(row.projectId);
    author.total += row.counts.total;
    author.approved += row.counts.approved;
    author.review += row.counts.review;
    author.revision += row.counts.revision;
  }
  return [...grouped.values()].map(({ projectIds, ...rest }) => ({
    ...rest, projectCount: projectIds.size
  })).sort((a, b) => b.approved - a.approved || b.total - a.total ||
    a.name.localeCompare(b.name, 'tr-TR') || a.userId - b.userId);
}
