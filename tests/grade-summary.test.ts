import { describe, expect, it } from 'vitest';
import { buildGradeLevelSummary } from '../src/demo/grade-summary';
import type { ApiAuthor } from '../src/authors/types';
import type { ApiProject } from '../src/projects/types';
import type { ApiQuestion } from '../src/questions/types';

const author = (userId: number, projectGrades: string[] = []): ApiAuthor => ({
  id: userId,
  userId,
  fullName: `Yazar ${userId}`,
  title: 'Yazar',
  experienceYears: 1,
  status: 'Aktif',
  branch: { id: 1, name: 'Matematik' },
  province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' },
  district: null,
  institution: null,
  activeProjectCount: projectGrades.length,
  projectGrades,
});

const project = (id: number, targetGrade: string, status: ApiProject['status'] = 'Devam_Ediyor'): ApiProject => ({
  id,
  title: `Proje ${id}`,
  code: `P-${id}`,
  projectType: 'Soru Bankası',
  progress: 0,
  deadline: '2027-01-01',
  status,
  priority: 'Normal',
  targetGrade,
  description: null,
  createdAt: '2026-10-10',
  updatedAt: '2026-10-10',
  branch: { id: 1, name: 'Matematik' },
  authors: [],
});

const question = (id: number, userId: number, grade: string, projectId: number | null): ApiQuestion => ({
  id,
  content: `Soru ${id}`,
  imageUrl: null,
  objectiveCode: null,
  grade,
  difficulty: null,
  options: null,
  correctAnswer: null,
  explanation: null,
  status: 'TASLAK',
  editorNote: null,
  projectId,
  createdAt: '2026-10-10',
  updatedAt: '2026-10-10',
  author: { id: userId, fullName: `Yazar ${userId}`, branchName: 'Matematik' },
  project: projectId ? { id: projectId, title: `Proje ${projectId}`, code: `P-${projectId}` } : null,
});

describe('education level summaries', () => {
  it('counts standalone pool-question authors in the relevant level', () => {
    const summary = buildGradeLevelSummary(
      ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'],
      [],
      [],
      [question(1, 77, '11. Sınıf', null)],
    );

    expect(summary).toEqual({
      authorsCount: 1,
      activeProjectsCount: 0,
      questionsCount: 1,
      unassignedQuestionsCount: 1,
    });
  });

  it('uses the linked project grade as canonical when a question is assigned to a project', () => {
    const projects = [project(10, '8. Sınıf')];
    const questions = [question(2, 88, '11. Sınıf', 10)];

    const middle = buildGradeLevelSummary(['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'], [], projects, questions);
    const high = buildGradeLevelSummary(['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'], [], projects, questions);

    expect(middle.questionsCount).toBe(1);
    expect(middle.authorsCount).toBe(1);
    expect(high.questionsCount).toBe(0);
  });

  it('deduplicates authors across project assignment and question authorship and counts only active projects', () => {
    const authors = [author(11, ['8. Sınıf'])];
    const projects = [
      project(1, '8. Sınıf', 'Devam_Ediyor'),
      project(2, '8. Sınıf', 'Tamamlandi'),
    ];
    const questions = [question(1, 11, '8. Sınıf', null)];

    const summary = buildGradeLevelSummary(['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'], authors, projects, questions);

    expect(summary.authorsCount).toBe(1);
    expect(summary.activeProjectsCount).toBe(1);
    expect(summary.questionsCount).toBe(1);
    expect(summary.unassignedQuestionsCount).toBe(1);
  });
});
