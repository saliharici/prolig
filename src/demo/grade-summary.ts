import type { ApiAuthor } from '../authors/types';
import type { ApiProject } from '../projects/types';
import type { ApiQuestion } from '../questions/types';

export type GradeLevelSummary = {
  authorsCount: number;
  activeProjectsCount: number;
  questionsCount: number;
  unassignedQuestionsCount: number;
};

const inactiveProjectStatuses = new Set(['Tamamlandi', 'Arsiv']);

export function buildGradeLevelSummary(
  levelGrades: readonly string[],
  authors: ApiAuthor[],
  projects: ApiProject[],
  questions: ApiQuestion[],
): GradeLevelSummary {
  const levelGradeSet = new Set(levelGrades);
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const levelProjects = projects.filter((project) => levelGradeSet.has(project.targetGrade));

  const levelQuestions = questions.filter((question) => {
    const linkedProject = question.projectId ? projectById.get(question.projectId) : null;
    const effectiveGrade = linkedProject?.targetGrade ?? question.grade ?? '';
    return levelGradeSet.has(effectiveGrade);
  });

  const authorUserIds = new Set<number>();

  authors.forEach((author) => {
    if (author.projectGrades.some((grade) => levelGradeSet.has(grade))) {
      authorUserIds.add(author.userId);
    }
  });

  levelQuestions.forEach((question) => {
    if (question.author?.id) {
      authorUserIds.add(question.author.id);
    }
  });

  return {
    authorsCount: authorUserIds.size,
    activeProjectsCount: levelProjects.filter((project) => !inactiveProjectStatuses.has(project.status)).length,
    questionsCount: levelQuestions.length,
    unassignedQuestionsCount: levelQuestions.filter((question) => question.projectId === null).length,
  };
}
