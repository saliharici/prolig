import { describe, expect, it } from 'vitest';
import { allowsFiveOptions, validateQuestionAnswerStructure } from '../shared/question-contract';
import { questionTypeDraft, serializeTypedAnswers, switchQuestionType } from '../src/questions/question-type-state';
import { buildQuestionCreateInput, buildQuestionEditPatch, normalizeQuestionAssets, normalizeQuestionOptions, QuestionFormValidationError, restoredQuestionCorrectAnswer, isValidCorrectAnswer } from '../src/questions/edit';
import { guidedQuestionIssues } from '../src/questions/GuidedQuestionStudio';
import type { QuestionStudioFormValues } from '../src/questions/studio-state';
import type { ApiQuestion } from '../src/questions/types';

const fixture = (): QuestionStudioFormValues => ({
  ...questionTypeDraft(), content: 'Türkiye’nin başkenti hangi şehirdir?', level: 'Lise', grade: '10. Sınıf',
  projectId: null, options: ['İstanbul', 'İzmir', 'Ankara', 'Bursa', 'Erzurum'],
  correctAnswer: 'C', explanation: 'Ankara başkenttir.', assets: [],
  assetPlacement: 'STEM', assetType: 'IMAGE', assetUrl: '', assetTitle: '', assetAltText: ''
});

/** Simulate an API DTO and the form hydration used when an author reopens a saved question. */
function savedTypedQuestion(draft: QuestionStudioFormValues): ApiQuestion {
  const payload = buildQuestionCreateInput(draft);
  return {
    id: 100, imageUrl: null, status: 'TASLAK', editorNote: null,
    createdAt: '2026-10-17T00:00:00.000Z', updatedAt: '2026-10-17T00:00:00.000Z',
    isArchived: false, author: null, project: null,
    ...payload,
    assets: [], // API DTO assets have persisted numeric IDs; this fixture has no media.
    questionType: payload.questionType,
    optionCount: payload.optionCount ?? null,
    booleanAnswer: payload.booleanAnswer ?? null,
    modelAnswer: payload.modelAnswer ?? null,
    scoringRubric: payload.scoringRubric ?? null,
    evaluationCriteria: payload.evaluationCriteria ?? null,
    objectiveCode: payload.objectiveCode ?? null,
    difficulty: payload.difficulty ?? null,
    explanation: payload.explanation ?? null
  };
}

function reopenTypedDraft(question: ApiQuestion): QuestionStudioFormValues {
  return {
    ...fixture(), ...questionTypeDraft(question),
    content: question.content, grade: question.grade || '',
    explanation: question.explanation || '', projectId: question.projectId,
    options: normalizeQuestionOptions(question.options),
    correctAnswer: restoredQuestionCorrectAnswer(question),
    assets: normalizeQuestionAssets(question.assets)
  };
}

describe('P2 guided multi-type question authoring', () => {
  it('allows 4/5 options at lise but not ortaokul', () => {
    const draft = fixture();
    draft.optionCount = 5;
    const payload = buildQuestionCreateInput(draft);
    expect(payload.options).toHaveLength(5);
    expect(payload.correctAnswer).toBe('C');
    expect(validateQuestionAnswerStructure(payload as any)).toBeNull();
    expect(allowsFiveOptions('8. Sınıf')).toBe(false);
    expect(validateQuestionAnswerStructure({ ...payload, grade: '8. Sınıf' } as any)).not.toBeNull();
    expect(validateQuestionAnswerStructure({ ...payload, correctAnswer: 'E' } as any)).toBeNull();
  });

  it('stores Doğru/Yanlış as boolean without fake options', () => {
    const draft = { ...switchQuestionType(fixture(), 'TRUE_FALSE'), booleanAnswer: false };
    const payload = buildQuestionCreateInput(draft);
    expect(payload.options).toEqual([]);
    expect(payload.correctAnswer).toBeNull();
    expect(payload.booleanAnswer).toBe(false);
    expect(validateQuestionAnswerStructure(payload as any)).toBeNull();
    expect(guidedQuestionIssues(draft).some(x => x.step === 3)).toBe(false);
  });

  it('sends model answer and rubric separately for open-ended questions', () => {
    const draft = { ...switchQuestionType(fixture(), 'OPEN_ENDED'), modelAnswer: 'Gerekçeli açıklama', scoringRubric: '5+5 puan', evaluationCriteria: 'İşlem gösterimi' };
    const payload = buildQuestionCreateInput(draft);
    expect(payload.options).toEqual([]);
    expect(payload.correctAnswer).toBeNull();
    expect(payload.modelAnswer).toBe('Gerekçeli açıklama');
    expect(payload.scoringRubric).toBe('5+5 puan');
    expect(validateQuestionAnswerStructure(payload as any)).toBeNull();
  });

  it.each([4, 5] as const)('restores the saved correct answer for %i-choice questions', optionCount => {
    const correctAnswer = optionCount === 5 ? 'E' : 'D';
    const initial = { ...fixture(), optionCount, correctAnswer };
    const created = buildQuestionCreateInput(initial);
    const reopenedAnswer = restoredQuestionCorrectAnswer({
      correctAnswer: created.correctAnswer,
      optionCount: created.optionCount
    });
    expect(reopenedAnswer).toBe(correctAnswer);
    const edited = buildQuestionCreateInput({ ...initial, correctAnswer: reopenedAnswer, content: 'Düzenlenmiş soru metni' });
    expect(edited.correctAnswer).toBe(correctAnswer);
    expect(edited.options).toHaveLength(optionCount);
  });

  it('rejects E for four-choice questions and clears non-MCQ answer keys', () => {
    expect(isValidCorrectAnswer('E')).toBe(false);
    expect(restoredQuestionCorrectAnswer({ correctAnswer: 'E', optionCount: 4 })).toBe('');
    expect(restoredQuestionCorrectAnswer({ correctAnswer: null, optionCount: null })).toBe('');
  });

  it('reopens TRUE_FALSE false safely and edits only the boolean answer', () => {
    const original = savedTypedQuestion({
      ...switchQuestionType(fixture(), 'TRUE_FALSE'), booleanAnswer: false
    });
    const reloaded = reopenTypedDraft(original);
    expect(reloaded.booleanAnswer).toBe(false);
    expect(reloaded.options).toEqual(['', '', '', '']);
    expect(buildQuestionCreateInput(reloaded).options).toEqual([]);
    expect(() => buildQuestionEditPatch(original, reloaded))
      .toThrowError(new QuestionFormValidationError('Kaydedilecek bir değişiklik bulunamadı.'));
    expect(buildQuestionEditPatch(original, { ...reloaded, booleanAnswer: true }))
      .toEqual({ expectedUpdatedAt: original.updatedAt, booleanAnswer: true });
  });

  it('reopens OPEN_ENDED and patches only changed model answer, rubric, and criteria', () => {
    const original = savedTypedQuestion({
      ...switchQuestionType(fixture(), 'OPEN_ENDED'),
      modelAnswer: 'Eski model cevap',
      scoringRubric: 'Eski puanlama',
      evaluationCriteria: 'Eski ölçütler'
    });
    const reloaded = reopenTypedDraft(original);
    expect(reloaded.modelAnswer).toBe('Eski model cevap');
    expect(reloaded.scoringRubric).toBe('Eski puanlama');
    expect(reloaded.evaluationCriteria).toBe('Eski ölçütler');
    expect(() => buildQuestionEditPatch(original, reloaded))
      .toThrowError('Kaydedilecek bir değişiklik bulunamadı.');
    expect(buildQuestionEditPatch(original, {
      ...reloaded, modelAnswer: 'Yeni model cevap', scoringRubric: 'Yeni puanlama',
      evaluationCriteria: 'Yeni ölçütler'
    })).toEqual({
      expectedUpdatedAt: original.updatedAt, modelAnswer: 'Yeni model cevap',
      scoringRubric: 'Yeni puanlama', evaluationCriteria: 'Yeni ölçütler'
    });
  });

  it('keeps five-choice E and all other answers intact when only question text changes', () => {
    const original = savedTypedQuestion({ ...fixture(), optionCount: 5, correctAnswer: 'E' });
    const reloaded = reopenTypedDraft(original);
    expect(reloaded.correctAnswer).toBe('E');
    expect(buildQuestionEditPatch(original, { ...reloaded, content: 'Başkent sorusunun düzenlenmiş metni' }))
      .toEqual({ expectedUpdatedAt: original.updatedAt, content: 'Başkent sorusunun düzenlenmiş metni' });
  });

  it('rejects a saved question type change without modifying the original', () => {
    const original = savedTypedQuestion({ ...switchQuestionType(fixture(), 'TRUE_FALSE'), booleanAnswer: true });
    expect(() => buildQuestionEditPatch(original, {
      ...reopenTypedDraft(original), questionType: 'OPEN_ENDED'
    })).toThrow('Kaydedilmiş sorunun türü ve seçenek sayısı değiştirilemez.');
  });

  it('keeps inactive answer data locally across type switching', () => {
    const draft = fixture();
    const dy = switchQuestionType(draft, 'TRUE_FALSE');
    const again = switchQuestionType(dy, 'MULTIPLE_CHOICE');
    expect(again.options).toEqual(draft.options);
    expect(again.correctAnswer).toBe('C');
    const serialized = serializeTypedAnswers({ ...dy, booleanAnswer: true });
    expect(serialized.options).toEqual([]);
  });

  it('does not send typed fields for legacy P1 input', () => {
    const draft = fixture();
    delete draft.questionType;
    draft.options = draft.options.slice(0, 4);
    const payload = buildQuestionCreateInput(draft);
    expect(payload).not.toHaveProperty('questionType');
    expect(payload.options).toHaveLength(4);
  });
});
