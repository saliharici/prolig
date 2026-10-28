import { prisma } from './prisma.js';
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
      questions: { select: { status: true } } }
  });
  const now = Date.now();
  for (const task of tasks) {
    const item = output.get(task.projectId) ?? {
      target: 0, written: 0, inReview: 0, revision: 0, approved: 0, rejected: 0,
      overdueTasks: 0, completionPercent: null
    };
    const approved = task.questions.filter(q => q.status === 'ONAYLANDI').length;
    item.target += task.targetQuestionCount;
    item.written += task.questions.length;
    item.inReview += task.questions.filter(q => q.status === 'INCELEMEDE').length;
    item.revision += task.questions.filter(q => q.status === 'REVIZYON').length;
    item.approved += approved;
    item.rejected += task.questions.filter(q => q.status === 'REDDEDILDI').length;
    if (task.status !== 'Tamamlandi' && task.dueDate.getTime() < now && approved < task.targetQuestionCount)
      item.overdueTasks++;
    output.set(task.projectId, item);
  }
  for (const item of output.values())
    item.completionPercent = item.target ? Math.min(100, Math.round(item.approved / item.target * 100)) : null;
  return output;
}
