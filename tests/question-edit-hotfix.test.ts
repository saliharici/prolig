import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildQuestionEditPatch,
  normalizeQuestionOptions,
  QuestionFormValidationError,
  requireCompleteQuestionAnswers
} from '../src/questions/edit';
import type { ApiQuestion } from '../src/questions/types';

const makeQuestion = (overrides: Partial<ApiQuestion> = {}): ApiQuestion => ({
  id: 1,
  content: 'Mevcut soru metni',
  imageUrl: null,
  objectiveCode: null,
  grade: '8. Sınıf',
  difficulty: null,
  options: ['Bir', 'İki', 'Üç', 'Dört'],
  correctAnswer: 'A',
  explanation: null,
  status: 'TASLAK',
  editorNote: null,
  projectId: null,
  createdAt: '2026-10-08T00:00:00.000Z',
  updatedAt: '2026-10-08T00:00:00.000Z',
  isArchived: false,
  author: null,
  project: null,
  ...overrides
});

const editDraft = (question: ApiQuestion) => ({
  content: question.content,
  grade: question.grade || '',
  explanation: question.explanation || '',
  projectId: question.projectId,
  options: normalizeQuestionOptions(question.options),
  correctAnswer: question.correctAnswer || ''
});

describe('Question edit hotfix', () => {
  it.each(['TASLAK', 'REVIZYON'] as const)('edits an existing %s question with four options', status => {
    const question = makeQuestion({ status });
    const patch = buildQuestionEditPatch(question, { ...editDraft(question), content: 'Güncellenmiş soru metni' });
    expect(patch).toEqual({ content: 'Güncellenmiş soru metni' });
  });

  it.each(['TASLAK', 'REVIZYON'] as const)('allows a content-only edit for legacy %s with empty options', status => {
    const question = makeQuestion({ status, options: [], correctAnswer: null });
    const patch = buildQuestionEditPatch(question, { ...editDraft(question), content: 'Güncellenmiş eski soru metni' });
    expect(patch).toEqual({ content: 'Güncellenmiş eski soru metni' });
    expect(patch).not.toHaveProperty('options');
    expect(patch).not.toHaveProperty('correctAnswer');
  });

  it('never sends options: [] in a PATCH', () => {
    const question = makeQuestion({ options: [], correctAnswer: null });
    const patch = buildQuestionEditPatch(question, { ...editDraft(question), explanation: 'Yeni açıklama' });
    expect(patch.options).toBeUndefined();
  });

  it('does not silently convert a legacy null correctAnswer to A', () => {
    const question = makeQuestion({ options: [], correctAnswer: null });
    const patch = buildQuestionEditPatch(question, { ...editDraft(question), grade: '7. Sınıf' });
    expect(patch).toEqual({ grade: '7. Sınıf' });
    expect(patch.correctAnswer).toBeUndefined();
  });

  it('sends four completed legacy options with the explicitly selected answer', () => {
    const question = makeQuestion({ options: [], correctAnswer: null });
    const patch = buildQuestionEditPatch(question, {
      ...editDraft(question),
      options: [' A ', 'B', 'C', 'D'],
      correctAnswer: 'C'
    });
    expect(patch).toEqual({ options: ['A', 'B', 'C', 'D'], correctAnswer: 'C' });
  });

  it('shows controlled validation for partially completed legacy options', () => {
    const question = makeQuestion({ options: [], correctAnswer: null });
    expect(() => buildQuestionEditPatch(question, {
      ...editDraft(question),
      options: ['A', 'B', '', ''],
      correctAnswer: 'A'
    })).toThrowError(new QuestionFormValidationError('Cevap seçeneklerini düzenlemek için dört alanı da doldurun.'));
  });

  it('keeps new-question creation strict about four complete options', () => {
    expect(() => requireCompleteQuestionAnswers(['A', 'B', 'C'], 'A')).toThrow('Dört cevap seçeneğini de doldurun.');
    expect(requireCompleteQuestionAnswers([' A ', 'B', 'C', 'D'], 'B')).toEqual({
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'B'
    });
  });

  it('preserves author/editor modal isolation and guarded backdrop close', () => {
    const source = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf8');
    expect(source).toContain('const [editingQuestion, setEditingQuestion] = useState<ApiQuestion | null>(null)');
    expect(source).toContain('const [reviewingQuestion, setReviewingQuestion] = useState<ApiQuestion | null>(null)');
    expect(source).toContain('if (event.target === event.currentTarget) { setShowQuestionForm(false); setEditingQuestion(null); }');

    const editorModalStart = source.indexOf('<form className="question-modal editor-review-modal"');
    const editorModalEnd = source.indexOf('</form></div>}', editorModalStart);
    const editorModal = source.slice(editorModalStart, editorModalEnd);
    expect(editorModal).toContain('setReviewingQuestion(null)');
    expect(editorModal).not.toContain('setEditingQuestion(null)');
  });
});
