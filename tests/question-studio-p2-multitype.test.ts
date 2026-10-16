import { describe, expect, it } from 'vitest';
import { allowsFiveOptions, validateQuestionAnswerStructure } from '../shared/question-contract';
import { questionTypeDraft, serializeTypedAnswers, switchQuestionType } from '../src/questions/question-type-state';
import { buildQuestionCreateInput, restoredQuestionCorrectAnswer, isValidCorrectAnswer } from '../src/questions/edit';
import { guidedQuestionIssues } from '../src/questions/GuidedQuestionStudio';
import type { QuestionStudioFormValues } from '../src/questions/studio-state';

const fixture = (): QuestionStudioFormValues => ({
  ...questionTypeDraft(), content: 'Türkiye’nin başkenti hangi şehirdir?', level: 'Lise', grade: '10. Sınıf',
  projectId: null, options: ['İstanbul', 'İzmir', 'Ankara', 'Bursa', 'Erzurum'],
  correctAnswer: 'C', explanation: 'Ankara başkenttir.', assets: [],
  assetPlacement: 'STEM', assetType: 'IMAGE', assetUrl: '', assetTitle: '', assetAltText: ''
});

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
