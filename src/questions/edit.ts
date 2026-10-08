import type { ApiQuestion, PatchQuestionInput } from './types';

const answerKeys = new Set(['A', 'B', 'C', 'D']);

export class QuestionFormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionFormValidationError';
  }
}

export interface QuestionEditDraft {
  content: string;
  grade: string;
  explanation: string;
  projectId: number | null;
  options: string[];
  correctAnswer: string;
}

export function normalizeQuestionOptions(options: unknown): string[] {
  const existing = Array.isArray(options) ? options : [];
  return [
    typeof existing[0] === 'string' ? existing[0] : '',
    typeof existing[1] === 'string' ? existing[1] : '',
    typeof existing[2] === 'string' ? existing[2] : '',
    typeof existing[3] === 'string' ? existing[3] : ''
  ];
}

export function hasFourValidQuestionOptions(options: unknown): boolean {
  return Array.isArray(options) && options.length === 4 && options.every(option => typeof option === 'string' && option.trim().length > 0);
}

export function isValidCorrectAnswer(value: unknown): value is string {
  return typeof value === 'string' && answerKeys.has(value);
}

export function requireCompleteQuestionAnswers(options: string[], correctAnswer: string) {
  const normalized = normalizeQuestionOptions(options).map(option => option.trim());
  if (!hasFourValidQuestionOptions(normalized)) {
    throw new QuestionFormValidationError('Dört cevap seçeneğini de doldurun.');
  }
  if (!isValidCorrectAnswer(correctAnswer)) {
    throw new QuestionFormValidationError('Doğru cevap seçimini yapın.');
  }
  return { options: normalized, correctAnswer };
}

export function buildQuestionEditPatch(question: ApiQuestion, draft: QuestionEditDraft): PatchQuestionInput {
  const input: PatchQuestionInput = {};
  const content = draft.content.trim();
  if (content !== question.content.trim()) input.content = content;

  const grade = draft.grade.trim();
  if (grade !== (question.grade?.trim() || '')) input.grade = grade;

  const explanation = draft.explanation.trim() || null;
  if (explanation !== (question.explanation?.trim() || null)) input.explanation = explanation;
  if (draft.projectId !== question.projectId) input.projectId = draft.projectId;

  const originalOptions = normalizeQuestionOptions(question.options).map(option => option.trim());
  const draftOptions = normalizeQuestionOptions(draft.options).map(option => option.trim());
  const optionsChanged = draftOptions.some((option, index) => option !== originalOptions[index]);
  const answerChanged = draft.correctAnswer !== (question.correctAnswer || '');
  const originalOptionsAreComplete = hasFourValidQuestionOptions(question.options);

  if (optionsChanged) {
    if (!hasFourValidQuestionOptions(draftOptions)) {
      throw new QuestionFormValidationError('Cevap seçeneklerini düzenlemek için dört alanı da doldurun.');
    }
    input.options = draftOptions;
  }

  if (originalOptionsAreComplete) {
    if (answerChanged) {
      if (!isValidCorrectAnswer(draft.correctAnswer)) {
        throw new QuestionFormValidationError('Doğru cevap seçimini yapın.');
      }
      input.correctAnswer = draft.correctAnswer;
    }
  } else if (optionsChanged || answerChanged) {
    if (!hasFourValidQuestionOptions(draftOptions)) {
      throw new QuestionFormValidationError('Cevap seçeneklerini düzenlemek için dört alanı da doldurun.');
    }
    if (!isValidCorrectAnswer(draft.correctAnswer)) {
      throw new QuestionFormValidationError('Doğru cevap seçimini yapın.');
    }
    input.options = draftOptions;
    input.correctAnswer = draft.correctAnswer;
  }

  if (Object.keys(input).length === 0) {
    throw new QuestionFormValidationError('Kaydedilecek bir değişiklik bulunamadı.');
  }
  return input;
}
