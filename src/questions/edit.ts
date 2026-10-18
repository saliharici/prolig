import type { ApiQuestion, CreateQuestionInput, PatchQuestionInput, QuestionAssetInput, QuestionAssetPlacement, QuestionAssetType } from './types';
import { validateQuestionAnswerStructure, type QuestionTypeFields } from '../../shared/question-contract';
import { serializeTypedAnswers } from './question-type-state';

const answerKeys = new Set(['A', 'B', 'C', 'D']);
const fiveOptionAnswerKeys = new Set(['A', 'B', 'C', 'D', 'E']);
const assetPlacements = new Set<QuestionAssetPlacement>(['STEM', 'OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D', 'OPTION_E', 'EXPLANATION']);
const assetTypes = new Set<QuestionAssetType>(['IMAGE', 'VIDEO_URL', 'LINK']);

export class QuestionFormValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuestionFormValidationError';
  }
}

export interface QuestionEditDraft extends QuestionTypeFields {
  objectiveCode?: string | null;
  difficulty?: string | null;
  content: string;
  grade: string;
  explanation: string;
  projectId: number | null;
  options: string[];
  correctAnswer: string;
  assets?: QuestionAssetInput[];
}

export function normalizeQuestionOptions(options: unknown): string[] {
  const existing = Array.isArray(options) ? options : [];
  return Array.from({ length: existing.length === 5 ? 5 : 4 }, (_, i) => typeof existing[i] === 'string' ? existing[i] : '');
}

export function hasFourValidQuestionOptions(options: unknown): boolean {
  return Array.isArray(options) && options.length === 4 && options.every(option => typeof option === 'string' && option.trim().length > 0);
}

export function isValidCorrectAnswer(value: unknown, optionCount: 4 | 5 = 4): value is string {
  return typeof value === 'string' && (optionCount === 5 ? fiveOptionAnswerKeys : answerKeys).has(value);
}

/** Restore the saved answer without dropping E from five-choice questions. */
export function restoredQuestionCorrectAnswer(question: Pick<ApiQuestion, 'correctAnswer' | 'optionCount'>): string {
  return isValidCorrectAnswer(question.correctAnswer, question.optionCount === 5 ? 5 : 4)
    ? question.correctAnswer
    : '';
}

export function normalizeQuestionAssets(assets: unknown): QuestionAssetInput[] {
  if (!Array.isArray(assets)) return [];

  const normalized = assets
    .map<QuestionAssetInput | null>((asset, index) => {
      if (!asset || typeof asset !== 'object') return null;
      const candidate = asset as Partial<QuestionAssetInput>;
      if (!assetPlacements.has(candidate.placement as QuestionAssetPlacement)) return null;
      if (!assetTypes.has(candidate.assetType as QuestionAssetType)) return null;
      const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
      if (!url) return null;
      const sortOrder = typeof candidate.sortOrder === 'number' && Number.isSafeInteger(candidate.sortOrder)
        ? candidate.sortOrder
        : index;

      return {
        ...(typeof candidate.id === 'number' ? { id: candidate.id } : {}),
        placement: candidate.placement as QuestionAssetPlacement,
        assetType: candidate.assetType as QuestionAssetType,
        url,
        title: typeof candidate.title === 'string' && candidate.title.trim() ? candidate.title.trim() : null,
        altText: typeof candidate.altText === 'string' && candidate.altText.trim() ? candidate.altText.trim() : null,
        sortOrder
      };
    });

  return normalized
    .filter((asset): asset is QuestionAssetInput => asset !== null)
    .slice(0, 12);
}

export function areQuestionAssetsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalizeQuestionAssets(left)) === JSON.stringify(normalizeQuestionAssets(right));
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

/** Adapt the guided wizard to the strictly guarded legacy sandbox contract (MCQ, A-D). */
export function toP2SandboxLegacyDraft(draft: QuestionEditDraft): QuestionEditDraft {
  if ((draft.questionType ?? 'MULTIPLE_CHOICE') !== 'MULTIPLE_CHOICE' ||
      (draft.optionCount ?? 4) !== 4 || draft.options.length !== 4) {
    throw new QuestionFormValidationError('Sandbox kayıt modunda yalnızca dört seçenekli çoktan seçmeli soru kullanılabilir.');
  }
  return {
    content: draft.content, grade: draft.grade, projectId: draft.projectId,
    options: [...draft.options], correctAnswer: draft.correctAnswer,
    explanation: draft.explanation, assets: draft.assets,
    objectiveCode: draft.objectiveCode, difficulty: draft.difficulty
  };
}

export function buildQuestionCreateInput(draft: QuestionEditDraft, p2GuardedWrites = false): CreateQuestionInput {
  const answers = draft.questionType ? serializeTypedAnswers(draft) : requireCompleteQuestionAnswers(draft.options, draft.correctAnswer);
  if (draft.questionType) {
    const error = validateQuestionAnswerStructure({ ...draft, ...answers });
    if (error) throw new QuestionFormValidationError(error);
  }
  const objectiveCode = draft.objectiveCode?.trim() || '';
  return {
    content: draft.content.trim(),
    grade: draft.grade,
    ...answers,
    explanation: draft.explanation.trim() || null,
    projectId: draft.projectId,
    assets: normalizeQuestionAssets(draft.assets),
    ...(draft.questionType || p2GuardedWrites ? { objectiveCode: objectiveCode || null, difficulty: draft.difficulty?.trim() || null } : {}),
    ...(p2GuardedWrites ? { objectiveCode: objectiveCode.includes('P2-UAT') ? objectiveCode : ['P2-UAT', objectiveCode].filter(Boolean).join(' ') } : {})
  };
}

export function buildQuestionEditPatch(question: ApiQuestion, draft: QuestionEditDraft): PatchQuestionInput {
  if (draft.questionType) {
    const next = buildQuestionCreateInput(draft);
    if (next.questionType !== (question.questionType ?? 'MULTIPLE_CHOICE') ||
        next.optionCount !== ((question.questionType ?? 'MULTIPLE_CHOICE') === 'MULTIPLE_CHOICE' ? question.optionCount ?? 4 : null)) {
      throw new QuestionFormValidationError('Kaydedilmiş sorunun türü ve seçenek sayısı değiştirilemez.');
    }
    // Typed questions should update only the fields actually edited. Sending the
    // entire serialized question can unnecessarily rewrite answers and media.
    const input: PatchQuestionInput = { expectedUpdatedAt: question.updatedAt };
    if (next.content !== question.content.trim()) input.content = next.content;
    if (next.grade.trim() !== (question.grade?.trim() || '')) input.grade = next.grade.trim();
    if (next.explanation !== (question.explanation?.trim() || null)) input.explanation = next.explanation;
    if (next.projectId !== question.projectId) input.projectId = next.projectId;
    if (next.objectiveCode !== (question.objectiveCode?.trim() || null)) input.objectiveCode = next.objectiveCode;
    if (next.difficulty !== (question.difficulty?.trim() || null)) input.difficulty = next.difficulty;

    const savedOptions = Array.isArray(question.options) ? question.options.map(option => option.trim()) : [];
    if (JSON.stringify(next.options) !== JSON.stringify(savedOptions)) input.options = next.options;
    if (next.correctAnswer !== (question.correctAnswer ?? null)) input.correctAnswer = next.correctAnswer;
    if (next.booleanAnswer !== (question.booleanAnswer ?? null)) input.booleanAnswer = next.booleanAnswer;
    if (next.modelAnswer !== (question.modelAnswer?.trim() || null)) input.modelAnswer = next.modelAnswer;
    if (next.scoringRubric !== (question.scoringRubric?.trim() || null)) input.scoringRubric = next.scoringRubric;
    if (next.evaluationCriteria !== (question.evaluationCriteria?.trim() || null)) input.evaluationCriteria = next.evaluationCriteria;
    if (!areQuestionAssetsEqual(question.assets, next.assets)) input.assets = next.assets;

    if (Object.keys(input).length === 1) {
      throw new QuestionFormValidationError('Kaydedilecek bir değişiklik bulunamadı.');
    }
    return input;
  }
  const input: PatchQuestionInput = { expectedUpdatedAt: question.updatedAt };
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

  const draftAssets = normalizeQuestionAssets(draft.assets);
  if (!areQuestionAssetsEqual(question.assets, draftAssets)) {
    input.assets = draftAssets;
  }

  if (Object.keys(input).length === 1) {
    throw new QuestionFormValidationError('Kaydedilecek bir değişiklik bulunamadı.');
  }
  return input;
}
