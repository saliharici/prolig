import { prisma } from './prisma.js';

const ARCHIVE_ACTIONS = ['QUESTION_ARCHIVED', 'QUESTION_RESTORED'] as const;

export async function getQuestionArchiveStateMap(questionIds: number[]) {
  const uniqueIds = Array.from(new Set(questionIds.filter((id) => Number.isSafeInteger(id) && id > 0)));
  const state = new Map<number, boolean>();
  if (uniqueIds.length === 0) return state;

  const logs = await prisma.activityLog.findMany({
    where: {
      entityType: 'Question',
      entityId: { in: uniqueIds },
      action: { in: [...ARCHIVE_ACTIONS] }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });

  for (const log of logs) {
    if (log.entityId == null || state.has(log.entityId)) continue;
    state.set(log.entityId, log.action === 'QUESTION_ARCHIVED');
  }

  return state;
}

export async function isQuestionArchived(questionId: number) {
  const latest = await prisma.activityLog.findFirst({
    where: {
      entityType: 'Question',
      entityId: questionId,
      action: { in: [...ARCHIVE_ACTIONS] }
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });

  return latest?.action === 'QUESTION_ARCHIVED';
}
