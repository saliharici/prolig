import { describe, expect, it } from 'vitest';
import { buildGradeDetail, levelForGrade, projectQuestionStats, questionEffectiveGrade } from '../src/projects/integration';
import type { ApiProject } from '../src/projects/types';
import type { ApiQuestion } from '../src/questions/types';

const project = (id: number, targetGrade: string, authorId = 10): ApiProject => ({
  id,
  title: `Proje ${id}`,
  code: `P-${id}`,
  projectType: 'Soru Bankası',
  progress: 50,
  deadline: '2027-01-01',
  status: 'Devam_Ediyor',
  priority: 'Normal',
  targetGrade,
  description: null,
  createdAt: '2026-10-10',
  updatedAt: '2026-10-10',
  branch: { id: 1, name: 'Matematik' },
  authors: [{
    id: authorId,
    fullName: `Yazar ${authorId}`,
    authorProfileId: authorId,
    province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' }
  }]
});

const question = (
  id: number,
  grade: string,
  projectId: number | null,
  status: ApiQuestion['status'] = 'TASLAK',
  authorId = 10
): ApiQuestion => ({
  id,
  content: `Soru ${id} içeriği`,
  imageUrl: null,
  objectiveCode: null,
  grade,
  difficulty: null,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A',
  explanation: null,
  status,
  editorNote: null,
  projectId,
  createdAt: '2026-10-10',
  updatedAt: '2026-10-10',
  isArchived: false,
  author: { id: authorId, fullName: `Yazar ${authorId}`, branchName: 'Matematik' },
  project: projectId ? { id: projectId, title: `Proje ${projectId}`, code: `P-${projectId}` } : null
});

describe('project-grade integration', () => {
  it('maps all canonical school levels', () => {
    expect(levelForGrade('1. Sınıf')).toBe('İlkokul');
    expect(levelForGrade('8. Sınıf')).toBe('Ortaokul');
    expect(levelForGrade('12. Sınıf')).toBe('Lise');
    expect(levelForGrade('Mezun')).toBe('Mezun');
  });

  it('uses project target grade as the canonical effective grade', () => {
    const projects = [project(1, '11. Sınıf')];
    const byId = new Map(projects.map(item => [item.id, item]));
    expect(questionEffectiveGrade(question(1, '8. Sınıf', 1), byId)).toBe('11. Sınıf');
    expect(questionEffectiveGrade(question(2, '8. Sınıf', null), byId)).toBe('8. Sınıf');
  });

  it('builds project question production counts', () => {
    const questions = [
      question(1, '8. Sınıf', 7, 'TASLAK'),
      question(2, '8. Sınıf', 7, 'INCELEMEDE'),
      question(3, '8. Sınıf', 7, 'ONAYLANDI'),
      question(4, '8. Sınıf', 8, 'ONAYLANDI')
    ];
    expect(projectQuestionStats(7, questions)).toEqual({
      total: 3,
      draft: 1,
      review: 1,
      revision: 0,
      approved: 1,
      rejected: 0
    });
  });

  it('drills a grade into its projects, authors and effective questions', () => {
    const projects = [project(1, '8. Sınıf', 10), project(2, '11. Sınıf', 20)];
    const questions = [
      question(1, '8. Sınıf', 1, 'ONAYLANDI', 10),
      question(2, '8. Sınıf', null, 'INCELEMEDE', 30),
      question(3, '8. Sınıf', 2, 'ONAYLANDI', 20)
    ];

    const detail = buildGradeDetail('8. Sınıf', projects, questions);
    expect(detail.projects.map(item => item.id)).toEqual([1]);
    expect(detail.questions.map(item => item.id)).toEqual([1, 2]);
    expect(detail.authors.map(item => item.id).sort()).toEqual([10, 30]);
    expect(detail.approvedQuestions).toBe(1);
    expect(detail.reviewQuestions).toBe(1);
    expect(detail.unassignedQuestions).toBe(1);
  });
});
