import type { QuestionType, QuestionTypeFields } from '../../shared/question-contract';

export interface QuestionTypeDraft {
  questionType: QuestionType;
  optionCount: number;
  booleanAnswer: boolean | null;
  modelAnswer: string;
  scoringRubric: string;
  evaluationCriteria: string;
  objectiveCode: string;
  difficulty: string;
}

export function questionTypeDraft(source: QuestionTypeFields & { objectiveCode?: string | null; difficulty?: string | null } = {}): QuestionTypeDraft {
  return {
    questionType: source.questionType ?? 'MULTIPLE_CHOICE', optionCount: source.optionCount ?? 4,
    booleanAnswer: source.booleanAnswer ?? null, modelAnswer: source.modelAnswer ?? '',
    scoringRubric: source.scoringRubric ?? '', evaluationCriteria: source.evaluationCriteria ?? '',
    objectiveCode: source.objectiveCode ?? '', difficulty: source.difficulty ?? ''
  };
}

/** Change only the discriminator. Inactive answers stay in the local/encrypted draft. */
export function switchQuestionType<T extends Partial<QuestionTypeDraft>>(draft: T, questionType: QuestionType): T {
  return { ...draft, questionType };
}

export function serializeTypedAnswers(draft: QuestionTypeFields & { options: string[]; correctAnswer: string }) {
  const mc = draft.questionType === 'MULTIPLE_CHOICE';
  const open = draft.questionType === 'OPEN_ENDED';
  return {
    questionType: draft.questionType,
    optionCount: mc ? draft.optionCount ?? 4 : null,
    options: mc ? draft.options.slice(0, draft.optionCount ?? 4).map(x => x.trim()) : [],
    correctAnswer: mc ? draft.correctAnswer : null,
    booleanAnswer: draft.questionType === 'TRUE_FALSE' ? draft.booleanAnswer ?? null : null,
    modelAnswer: open ? draft.modelAnswer?.trim() || null : null,
    scoringRubric: open ? draft.scoringRubric?.trim() || null : null,
    evaluationCriteria: open ? draft.evaluationCriteria?.trim() || null : null
  };
}
