/**
 * Cross-project AUTHOR productivity reporting.
 * Only aggregate data leaves this endpoint. Project and author scopes are
 * checked server-side; no question content, banking or personal contact data.
 */
import { prisma } from './prisma.js';
import { assignedBranchIds } from './member-access.js';
import { buildProjectReadScope } from './project-access.js';
import { buildQuestionReadScope } from './question-access.js';
import { projectSelect } from './project-dto.js';
import { getQuestionArchiveStateMap } from './question-archive.js';
import { sumMoney } from './settlement-money.js';

export function canReadAuthorPerformanceReport(role: string | undefined): boolean {
  return ['GENEL_KOORDINATOR', 'MUHASEBE', 'BOLGE_KOORDINATORU', 'BRANS_KOORDINATORU'].includes(role || '');
}

export type ReportCounts = {
  total: number;
  draft: number;
  review: number;
  revision: number;
  approved: number;
  rejected: number;
};

export type ReportRoyalties = {
  total: string;
  waiting: string;
  inProcess: string;
  paid: string;
};

export interface AuthorPerformanceReportRow {
  projectId: number;
  projectCode: string;
  projectTitle: string;
  branchId: number;
  branchName: string;
  grade: string;
  userId: number;
  authorName: string;
  provinceId: number;
  provinceName: string;
  counts: ReportCounts;
  /** Only returned for GENEL_KOORDINATOR and MUHASEBE. */
  earnings?: ReportRoyalties;
}

const zeroCounts = (): ReportCounts => ({
  total: 0, draft: 0, review: 0, revision: 0, approved: 0, rejected: 0
});
const zeroRoyalties = (): ReportRoyalties => ({
  total: '0.00', waiting: '0.00', inProcess: '0.00', paid: '0.00'
});
const statusKeys = {
  TASLAK: 'draft', INCELEMEDE: 'review', REVIZYON: 'revision',
  ONAYLANDI: 'approved', REDDEDILDI: 'rejected'
} as const;

function authorInGeography(user: any, province: { id: number; region: string }, branchId: number): boolean {
  switch (user?.role?.code) {
    case 'GENEL_KOORDINATOR':
    case 'MUHASEBE':
      return true;
    case 'BRANS_KOORDINATORU':
      return assignedBranchIds(user).includes(branchId);
    case 'BOLGE_KOORDINATORU':
      return typeof user.assignedRegion === 'string' &&
        Boolean(user.assignedRegion) && user.assignedRegion === province.region;
    default:
      return false;
  }
}

export async function getAuthorPerformanceReport(user: any): Promise<{
  financeVisible: boolean;
  rows: AuthorPerformanceReportRow[];
}> {
  if (!canReadAuthorPerformanceReport(user?.role?.code)) {
    throw new Error('AUTHOR_REPORT_FORBIDDEN');
  }

  const projectScope = buildProjectReadScope(user);
  if (projectScope === null) throw new Error('AUTHOR_REPORT_FORBIDDEN');
  const financeVisible = ['GENEL_KOORDINATOR', 'MUHASEBE'].includes(user.role.code);

  const projects = await prisma.project.findMany({
    where: projectScope,
    select: projectSelect,
    orderBy: { id: 'asc' }
  });

  const rows: AuthorPerformanceReportRow[] = [];
  for (const project of projects) {
    for (const assignment of project.projectAuthors) {
      const profile = assignment.authorProfile;
      if (!authorInGeography(user, profile.province, profile.branchId)) continue;
      rows.push({
        projectId: project.id, projectCode: project.code, projectTitle: project.title,
        branchId: project.branch.id, branchName: project.branch.name,
        grade: project.targetGrade,
        userId: profile.user.id, authorName: profile.user.fullName,
        provinceId: profile.province.id, provinceName: profile.province.name,
        counts: zeroCounts(),
        ...(financeVisible ? { earnings: zeroRoyalties() } : {})
      });
    }
  }
  if (!rows.length) return { financeVisible, rows: [] };

  // Bail out instead of sending a partial or misleading financial report.
  if (rows.length > 5000) throw new Error('AUTHOR_REPORT_TOO_LARGE');
  rows.sort((a, b) => a.projectId - b.projectId || a.userId - b.userId);
  const rowByKey = new Map(rows.map(row => [`${row.projectId}:${row.userId}`, row]));
  const projectIds = [...new Set(rows.map(row => row.projectId))].sort((a, b) => a - b);
  const authorIds = [...new Set(rows.map(row => row.userId))].sort((a, b) => a - b);
  const baseQuestionFilter = {
    projectId: { in: projectIds },
    authorUserId: { in: authorIds }
  };
  const where = user.role.code === 'MUHASEBE'
    ? baseQuestionFilter
    : { AND: [baseQuestionFilter, buildQuestionReadScope(user)] };

  const questions = await prisma.question.findMany({
    where,
    select: { id: true, projectId: true, authorUserId: true, status: true }
  });
  const archived = await getQuestionArchiveStateMap(questions.map(q => q.id));

  for (const question of questions) {
    if (archived.get(question.id) === true || question.projectId === null) continue;
    const row = rowByKey.get(`${question.projectId}:${question.authorUserId}`);
    if (!row) continue;
    const key = statusKeys[question.status as keyof typeof statusKeys];
    if (!key) continue;
    row.counts.total++;
    row.counts[key]++;
  }

  if (financeVisible) {
    const groups = await prisma.compensationEntry.groupBy({
      by: ['projectId', 'userId', 'status'],
      where: {
        projectId: { in: projectIds },
        userId: { in: authorIds },
        roleCode: 'YAZAR'
      },
      _sum: { amount: true }
    });
    const byAuthor = new Map<string, typeof groups>();
    for (const group of groups) {
      if (group.projectId === null || group.status === 'IPTAL') continue;
      const key = `${group.projectId}:${group.userId}`;
      if (!rowByKey.has(key)) continue;
      const previous = byAuthor.get(key) || [];
      previous.push(group);
      byAuthor.set(key, previous);
    }

    for (const row of rows) {
      const own = byAuthor.get(`${row.projectId}:${row.userId}`) || [];
      const sum = (predicate: (item: typeof own[number]) => boolean) =>
        sumMoney(own.filter(predicate).map(item => item._sum.amount ?? '0'));
      row.earnings = {
        total: sum(() => true),
        waiting: sum(item => item.status === 'HAK_EDILDI' || item.status === 'ODEME_BEKLIYOR'),
        inProcess: sum(item => item.status === 'ODEMEYE_ALINDI'),
        paid: sum(item => item.status === 'ODENDI')
      };
    }
  }
  return { financeVisible, rows };
}
