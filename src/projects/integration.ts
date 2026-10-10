import type { ApiProject } from './types';
import type { ApiQuestion } from '../questions/types';

export const GRADES_BY_LEVEL = {
  İlkokul: ['1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf'],
  Ortaokul: ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'],
  Lise: ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'],
  Mezun: ['Mezun'],
} as const;

export const ALL_GRADES = Object.values(GRADES_BY_LEVEL).flat();

export function levelForGrade(grade: string | null | undefined): keyof typeof GRADES_BY_LEVEL | null {
  if (!grade) return null;
  for (const [level, grades] of Object.entries(GRADES_BY_LEVEL)) {
    if ((grades as readonly string[]).includes(grade)) return level as keyof typeof GRADES_BY_LEVEL;
  }
  return null;
}

export function questionEffectiveGrade(question: ApiQuestion, projectById: Map<number, ApiProject>) {
  if (question.projectId) {
    return projectById.get(question.projectId)?.targetGrade ?? question.grade ?? '';
  }
  return question.grade ?? '';
}

export function projectQuestionStats(projectId: number, questions: ApiQuestion[]) {
  const projectQuestions = questions.filter((question) => question.projectId === projectId);
  return {
    total: projectQuestions.length,
    draft: projectQuestions.filter((question) => question.status === 'TASLAK').length,
    review: projectQuestions.filter((question) => question.status === 'INCELEMEDE').length,
    revision: projectQuestions.filter((question) => question.status === 'REVIZYON').length,
    approved: projectQuestions.filter((question) => question.status === 'ONAYLANDI').length,
    rejected: projectQuestions.filter((question) => question.status === 'REDDEDILDI').length,
  };
}

export function buildGradeDetail(grade: string, projects: ApiProject[], questions: ApiQuestion[]) {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const gradeProjects = projects.filter((project) => project.targetGrade === grade);
  const gradeQuestions = questions.filter((question) => questionEffectiveGrade(question, projectById) === grade);

  const authors = new Map<number, { id: number; fullName: string; provinceName: string }>();
  for (const project of gradeProjects) {
    for (const author of project.authors) {
      authors.set(author.id, {
        id: author.id,
        fullName: author.fullName,
        provinceName: author.province.name,
      });
    }
  }
  for (const question of gradeQuestions) {
    if (question.author?.id && !authors.has(question.author.id)) {
      authors.set(question.author.id, {
        id: question.author.id,
        fullName: question.author.fullName,
        provinceName: '',
      });
    }
  }

  return {
    grade,
    level: levelForGrade(grade),
    projects: gradeProjects,
    activeProjects: gradeProjects.filter((project) => !['Tamamlandi', 'Arsiv'].includes(project.status)),
    questions: gradeQuestions,
    authors: [...authors.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'tr-TR')),
    approvedQuestions: gradeQuestions.filter((question) => question.status === 'ONAYLANDI').length,
    reviewQuestions: gradeQuestions.filter((question) => question.status === 'INCELEMEDE').length,
    unassignedQuestions: gradeQuestions.filter((question) => question.projectId === null).length,
  };
}
