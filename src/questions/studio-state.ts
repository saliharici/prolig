import type { QuestionAssetInput, QuestionAssetPlacement, QuestionAssetType } from './types';
import { normalizeQuestionAssets } from './edit';
import type { QuestionTypeDraft } from './question-type-state';

/** Only compares local form values; does not persist user-authored content. */
export interface QuestionStudioFormValues extends Partial<QuestionTypeDraft> {
  content: string;
  level: string;
  grade: string;
  projectId: number | null;
  options: string[];
  correctAnswer: string;
  explanation: string;
  assets: QuestionAssetInput[];
  assetPlacement: QuestionAssetPlacement;
  assetType: QuestionAssetType;
  assetUrl: string;
  assetTitle: string;
  assetAltText: string;
}

export function questionStudioFingerprint(values: QuestionStudioFormValues): string {
  return JSON.stringify({
    content: values.content,
    level: values.level,
    grade: values.grade,
    projectId: values.projectId,
    options: [...values.options],
    correctAnswer: values.correctAnswer,
    explanation: values.explanation,
    ...(values.questionType ? {
      questionType: values.questionType, optionCount: values.optionCount, booleanAnswer: values.booleanAnswer,
      modelAnswer: values.modelAnswer, scoringRubric: values.scoringRubric, evaluationCriteria: values.evaluationCriteria,
      objectiveCode: values.objectiveCode, difficulty: values.difficulty
    } : {}),
    assets: normalizeQuestionAssets(values.assets),
    assetPlacement: values.assetPlacement,
    assetType: values.assetType,
    assetUrl: values.assetUrl,
    assetTitle: values.assetTitle,
    assetAltText: values.assetAltText
  });
}

/**
 * Ephemeral resume cache contract. No localStorage, sessionStorage or backend writes.
 * A draft is available only while the current React application instance remains mounted.
 */
export interface QuestionStudioPausedDraft<TQuestion> {
  values: QuestionStudioFormValues;
  baseline: string;
  originalProjectId: number | null;
  originalQuestion: TQuestion | null;
  /** A recovered draft from a stale server revision must never be submitted automatically. */
  conflicted?: boolean;
}

export function pausedQuestionDraftKey(ownerId: number, questionId: number | null): string {
  return `${ownerId}:${questionId === null ? 'new' : `question:${questionId}`}`;
}

export function copyQuestionStudioValues(values: QuestionStudioFormValues): QuestionStudioFormValues {
  return {
    ...values,
    options: [...values.options],
    assets: values.assets.map(asset => ({ ...asset }))
  };
}

export function copyPausedQuestionDraft<TQuestion>(
  draft: QuestionStudioPausedDraft<TQuestion>
): QuestionStudioPausedDraft<TQuestion> {
  return {
    ...draft,
    values: copyQuestionStudioValues(draft.values)
  };
}
