/**
 * Read-only production and author-royalty snapshot for a project.
 * The caller MUST validate project read scope before invoking this function.
 * No payment status is inferred from question approval alone.
 */
import { prisma } from './prisma.js';
import { buildQuestionReadScope } from './question-access.js';
import { getQuestionArchiveStateMap } from './question-archive.js';
import { sumMoney } from './settlement-money.js';

const statuses = ['TASLAK', 'INCELEMEDE', 'REVIZYON', 'ONAYLANDI', 'REDDEDILDI'] as const;
type Status = typeof statuses[number];

export function canReadProjectAuthorPerformance(role: string | undefined) {
  return ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU', 'MUHASEBE'].includes(role || '');
}

function isAuthorInScope(actor: any, assignment: any) {
  const role = actor?.role?.code;
  const province = assignment?.authorProfile?.province;
  if (role === 'GENEL_KOORDINATOR' || role === 'MUHASEBE') return true;
  if (role === 'IL_KOORDINATORU') {
    return Number.isSafeInteger(actor.provinceId) && province?.id === actor.provinceId;
  }
  if (role === 'BOLGE_KOORDINATORU') {
    return Boolean(actor.assignedRegion) && province?.region === actor.assignedRegion;
  }
  return false;
}

const zeroMoney = () => ({ total: '0.00', waiting: '0.00', inProcess: '0.00', paid: '0.00' });
const zeroCounts = () => ({
  total: 0, draft: 0, review: 0, revision: 0, approved: 0, rejected: 0
});

export interface ProjectAuthorPerformanceRow {
  userId: number;
  fullName: string;
  provinceName: string;
  counts: ReturnType<typeof zeroCounts>;
  earnings?: ReturnType<typeof zeroMoney>;
}

export interface ProjectAuthorPerformanceResponse {
  projectId: number;
  financeVisible: boolean;
  authors: ProjectAuthorPerformanceRow[];
}

export async function getProjectAuthorPerformance(project: any, actor: any): Promise<ProjectAuthorPerformanceResponse> {
  const role = actor?.role?.code;
  if (!canReadProjectAuthorPerformance(role)) {
    throw new Error('PROJECT_AUTHOR_PERFORMANCE_FORBIDDEN');
  }
  const financeVisible = role === 'GENEL_KOORDINATOR' || role === 'MUHASEBE';
  const assignments = (project.projectAuthors || []).filter((a: any) => isAuthorInScope(actor, a));
  const authors: ProjectAuthorPerformanceRow[] = assignments
    .map((assignment: any) => ({
      userId: assignment.authorProfile.user.id as number,
      fullName: assignment.authorProfile.user.fullName as string,
      provinceName: assignment.authorProfile.province.name as string,
      counts: zeroCounts(),
      ...(financeVisible ? { earnings: zeroMoney() } : {})
    }))
    .sort((a: any, b: any) => a.fullName.localeCompare(b.fullName, 'tr-TR') || a.userId - b.userId);
  const byId = new Map<number, typeof authors[number]>(authors.map((author: any) => [author.userId, author]));
  const ids = authors.map(author => author.userId).sort((left, right) => left - right);
  if (!ids.length) return { projectId: project.id as number, financeVisible, authors };

  // The finance role cannot GET question content. Permit aggregated project
  // metrics only, restricted to authors assigned to this project.
  const visibleQuestionWhere = role === 'MUHASEBE'
    ? { projectId: project.id, authorUserId: { in: ids } }
    : { AND: [{ projectId: project.id, authorUserId: { in: ids } }, buildQuestionReadScope(actor)] };

  const questions = await prisma.question.findMany({
    where: visibleQuestionWhere,
    select: { id: true, authorUserId: true, status: true }
  });
  // Match the app's default ACTIVE question list: archived questions
  // are not included in ongoing author productivity.
  const archiveState = await getQuestionArchiveStateMap(questions.map(q => q.id));
  for (const q of questions) {
    if (archiveState.get(q.id) === true) continue;
    const author = byId.get(q.authorUserId);
    if (!author) continue;
    const index: Record<Status, keyof ReturnType<typeof zeroCounts>> = {
      TASLAK: 'draft', INCELEMEDE: 'review', REVIZYON: 'revision',
      ONAYLANDI: 'approved', REDDEDILDI: 'rejected'
    };
    const key = index[q.status as Status];
    if (!key) continue;
    author.counts.total++;
    author.counts[key]++;
  }

  if (financeVisible) {
    const groups = await prisma.compensationEntry.groupBy({
      by: ['userId', 'status'],
      where: {
        projectId: project.id,
        userId: { in: ids },
        roleCode: 'YAZAR'
      },
      _sum: { amount: true }
    });
    for (const author of authors) {
      const own = groups.filter(group => group.userId === author.userId && group.status !== 'IPTAL');
      const earn = (predicate: (item: typeof groups[number]) => boolean) =>
        sumMoney(own.filter(predicate).map(group => group._sum.amount ?? '0'));
      author.earnings = {
        total: earn(() => true),
        waiting: earn(item => item.status === 'HAK_EDILDI' || item.status === 'ODEME_BEKLIYOR'),
        inProcess: earn(item => item.status === 'ODEMEYE_ALINDI'),
        paid: earn(item => item.status === 'ODENDI')
      };
    }
  }

  return { projectId: project.id as number, financeVisible, authors };
}
