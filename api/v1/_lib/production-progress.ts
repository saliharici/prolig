import { prisma } from './prisma.js';
import { getQuestionArchiveStateMap } from './question-archive.js';
export type ProductionMetrics = {
  target: number; written: number; inReview: number; revision: number;
  approved: number; rejected: number; overdueTasks: number; completionPercent: number | null;
};
export async function productionTotalsForProjects(projectIds: number[]): Promise<Map<number, ProductionMetrics>> {
  const output = new Map<number, ProductionMetrics>();
  if (!projectIds.length) return output;
  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds }, targetQuestionCount: { gt: 0 } },
    select: { projectId: true, dueDate: true, status: true, targetQuestionCount: true,
      questions: { select: { id: true, status: true } } }
  });
  const archiveState=await getQuestionArchiveStateMap(tasks.flatMap(t=>t.questions.map(q=>q.id)));
  const now = Date.now();
  for (const task of tasks) {
    const activeQuestions=task.questions.filter(q=>archiveState.get(q.id)!==true);
    const item = output.get(task.projectId) ?? {
      target: 0, written: 0, inReview: 0, revision: 0, approved: 0, rejected: 0,
      overdueTasks: 0, completionPercent: null
    };
    const approved = activeQuestions.filter(q => q.status === 'ONAYLANDI').length;
    item.target += task.targetQuestionCount;
    item.written += activeQuestions.length;
    item.inReview += activeQuestions.filter(q => q.status === 'INCELEMEDE').length;
    item.revision += activeQuestions.filter(q => q.status === 'REVIZYON').length;
    item.approved += approved;
    item.rejected += activeQuestions.filter(q => q.status === 'REDDEDILDI').length;
    if (task.status !== 'Tamamlandi' && task.dueDate.getTime() < now && approved < task.targetQuestionCount)
      item.overdueTasks++;
    output.set(task.projectId, item);
  }
  for (const item of output.values())
    item.completionPercent = item.target ? Math.min(100, Math.round(item.approved / item.target * 100)) : null;
  return output;
}
