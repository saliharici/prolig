import type { ApiQuestion, PatchQuestionInput, QuestionAssetInput, QuestionAssetPlacement, QuestionAssetType } from './types';

const answerKeys = new Set(['A', 'B', 'C', 'D']);
const assetPlacements = new Set<QuestionAssetPlacement>(['STEM', 'OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D', 'EXPLANATION']);
const assetTypes = new Set<QuestionAssetType>(['IMAGE', 'VIDEO_URL', 'LINK']);

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
  assets?: QuestionAssetInput[];
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

export function buildQuestionEditPatch(question: ApiQuestion, draft: QuestionEditDraft): PatchQuestionInput {
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

  if (Object.keys(input).length === 0) {
    throw new QuestionFormValidationError('Kaydedilecek bir değişiklik bulunamadı.');
  }
  return input;
}
