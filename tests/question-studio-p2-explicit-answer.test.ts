import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateQuestionAnswerStructure } from '../shared/question-contract';
import { buildQuestionCreateInput, QuestionFormValidationError } from '../src/questions/edit';
import { questionTypeDraft, switchQuestionType } from '../src/questions/question-type-state';
import { guidedQuestionIssues } from '../src/questions/GuidedQuestionStudio';
import type { QuestionStudioFormValues } from '../src/questions/studio-state';

const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');

const newGuidedQuestion = (): QuestionStudioFormValues => ({
  ...questionTypeDraft(),
  content: 'Aşağıdakilerden hangisi geçerli cevaptır?',
  level: 'Lise', grade: '10. Sınıf', projectId: null,
  options: ['Bir', 'İki', 'Üç', 'Dört'],
  correctAnswer: '', explanation: '', assets: [],
  assetPlacement: 'STEM', assetType: 'IMAGE', assetUrl: '',
  assetTitle: '', assetAltText: ''
});

describe('P2 guided explicit answer-key selection — no API or database writes', () => {
  it('never silently selects A on new P2 questions, but keeps the legacy editor default', () => {
    expect(app).toContain("useState(questionStudioReleaseFlags.guidedP2 ? '' : 'A')");
    expect(app).toContain("correctAnswer: guidedStudioOn ? '' : 'A'");
    expect(app).toContain("setQuestionCorrectAnswer(guidedStudioOn ? '' : 'A')");
    expect(app).toContain('setQuestionCorrectAnswer(restoredQuestionCorrectAnswer(question))');
  });

  it('identifies missing answer on a four-choice question before review, and refuses an invalid draft payload', () => {
    const draft = newGuidedQuestion();
    expect(guidedQuestionIssues(draft)).toContainEqual({ step: 3, message: 'Doğru cevabı seçin.' });
    expect(() => buildQuestionCreateInput(draft))
      .toThrowError(new QuestionFormValidationError('Geçerli doğru cevabı seçin.'));
    const payload = buildQuestionCreateInput({ ...draft, correctAnswer: 'A' });
    expect(validateQuestionAnswerStructure(payload as unknown as Record<string, unknown>, true)).toBeNull();
  });

  it('retains five-choice E answers on eligible grades and rejects middle-school five-choice', () => {
    const draft = { ...newGuidedQuestion(), optionCount: 5, options: ['A','B','C','D','E'], correctAnswer: 'E' };
    const valid = buildQuestionCreateInput(draft);
    expect(valid.correctAnswer).toBe('E');
    expect(valid.options).toHaveLength(5);
    expect(validateQuestionAnswerStructure(valid as unknown as Record<string, unknown>, true)).toBeNull();
    expect(guidedQuestionIssues({ ...draft, grade: '8. Sınıf' }).some(x => x.step === 1)).toBe(true);
    expect(() => buildQuestionCreateInput({ ...draft, grade: '8. Sınıf' })).toThrow('Beş seçenek yalnızca lise');
  });

  it('does not impose MCQ answer keys on TRUE_FALSE and OPEN_ENDED drafts', () => {
    const base = newGuidedQuestion();
    const dy = { ...switchQuestionType(base, 'TRUE_FALSE'), booleanAnswer: false };
    const booleanPayload = buildQuestionCreateInput(dy);
    expect(booleanPayload.correctAnswer).toBeNull();
    expect(booleanPayload.booleanAnswer).toBe(false);
    expect(validateQuestionAnswerStructure(booleanPayload as unknown as Record<string, unknown>, true)).toBeNull();

    const open = { ...switchQuestionType(base, 'OPEN_ENDED'), modelAnswer: 'Gerekçeli örnek cevap' };
    const openPayload = buildQuestionCreateInput(open);
    expect(openPayload.options).toEqual([]);
    expect(openPayload.correctAnswer).toBeNull();
    expect(validateQuestionAnswerStructure(openPayload as unknown as Record<string, unknown>, true)).toBeNull();
    const missing = buildQuestionCreateInput({ ...open, modelAnswer: '' });
    expect(validateQuestionAnswerStructure(missing as unknown as Record<string, unknown>, false)).toBeNull();
    expect(validateQuestionAnswerStructure(missing as unknown as Record<string, unknown>, true)).toMatch(/model cevabı/);
  });
});
