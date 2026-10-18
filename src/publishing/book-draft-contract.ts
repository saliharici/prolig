import type { ApiQuestion } from '../questions/types';
import type { Role } from '../demo/model';

/**
 * V2 server-side contract candidate — pure validation/snapshot creation only.
 * There are deliberately no HTTP endpoints, Prisma calls, or writes in V2-0.
 * A future server handler MUST load authorized questions inside its transaction,
 * then call this function with those server-fetched records.
 */

export const MAX_BOOK_CHAPTERS = 30;
export const MAX_BOOK_QUESTIONS = 300;

export interface BookDraftChapterInput {
  title: string;
  questionIds: number[];
}

export interface BookDraftInput {
  projectId: number;
  title: string;
  layoutColumns: 1 | 2;
  expectedRevision: number | null;
  chapters: BookDraftChapterInput[];
}

export interface FrozenBookQuestionV1 {
  schemaVersion: 1;
  sourceQuestionId: number;
  sourceQuestionUpdatedAt: string;
  content: string;
  grade: string | null;
  objectiveCode: string | null;
  difficulty: string | null;
  questionType: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'OPEN_ENDED';
  options: string[];
  correctAnswer: string | null;
  booleanAnswer: boolean | null;
  modelAnswer: string | null;
  explanation: string | null;
  scoringRubric: string | null;
  evaluationCriteria: string | null;
  authorName: string | null;
  assets: Array<{
    placement: string;
    assetType: string;
    url: string;
    title: string | null;
    altText: string | null;
    sortOrder: number;
  }>;
}

export interface PreparedBookDraft {
  projectId: number;
  title: string;
  layoutColumns: 1 | 2;
  expectedRevision: number | null;
  chapters: Array<{
    title: string;
    sortOrder: number;
    questions: Array<{
      questionId: number;
      sortOrder: number;
      sourceQuestionUpdatedAt: Date;
      snapshot: FrozenBookQuestionV1;
    }>;
  }>;
}

export class BookDraftValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BookDraftValidationError';
  }
}

export function canEditBookDraft(role: Role | string | null | undefined): boolean {
  return role === 'GENEL_KOORDINATOR';
}

function validId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function validatedDate(value: string): Date {
  const date = new Date(value);
  if (!value || !Number.isFinite(date.getTime())) throw new BookDraftValidationError('Sorunun kaynak sürüm tarihi geçersiz.');
  return date;
}

export function freezeApprovedQuestion(question: ApiQuestion, bookProjectId: number): FrozenBookQuestionV1 {
  if (question.status !== 'ONAYLANDI' || question.isArchived) {
    throw new BookDraftValidationError('Kitaba yalnızca onaylı ve arşiv dışı sorular eklenebilir.');
  }
  if (!validId(question.id) || question.projectId !== bookProjectId) {
    throw new BookDraftValidationError('Soru seçilen kitap projesine ait olmalıdır.');
  }
  const updated = validatedDate(question.updatedAt);
  const type = question.questionType ?? 'MULTIPLE_CHOICE';
  if (!['MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ENDED'].includes(type)) {
    throw new BookDraftValidationError('Soru türü desteklenmiyor.');
  }
  if (!question.content.trim()) {
    throw new BookDraftValidationError('Boş soru içeriği kitaba alınamaz.');
  }
  const options = [...(question.options ?? [])];
  if (type === 'MULTIPLE_CHOICE' && (options.length < 4 || options.length > 5 ||
      !options.every(text => text.trim()) ||
      !['A', 'B', 'C', 'D', 'E'].slice(0, options.length).includes(question.correctAnswer ?? ''))) {
    throw new BookDraftValidationError('Çoktan seçmeli sorunun seçenek veya cevap anahtarı eksik.');
  }
  if (type === 'TRUE_FALSE' && typeof question.booleanAnswer !== 'boolean') {
    throw new BookDraftValidationError('Doğru/Yanlış cevabı eksik.');
  }
  if (type === 'OPEN_ENDED' && !question.modelAnswer?.trim()) {
    throw new BookDraftValidationError('Açık uçlu soru için model cevap eksik.');
  }

  return {
    schemaVersion: 1,
    sourceQuestionId: question.id,
    sourceQuestionUpdatedAt: updated.toISOString(),
    content: question.content,
    grade: question.grade,
    objectiveCode: question.objectiveCode,
    difficulty: question.difficulty,
    questionType: type,
    options: type === 'MULTIPLE_CHOICE' ? options : [],
    correctAnswer: type === 'MULTIPLE_CHOICE' ? question.correctAnswer : null,
    booleanAnswer: type === 'TRUE_FALSE' ? question.booleanAnswer ?? null : null,
    modelAnswer: type === 'OPEN_ENDED' ? question.modelAnswer ?? null : null,
    explanation: question.explanation,
    scoringRubric: type === 'OPEN_ENDED' ? question.scoringRubric ?? null : null,
    evaluationCriteria: type === 'OPEN_ENDED' ? question.evaluationCriteria ?? null : null,
    authorName: question.author?.fullName ?? null,
    assets: (question.assets ?? []).slice(0, 40).map(asset => ({
      placement: asset.placement,
      assetType: asset.assetType,
      url: asset.url,
      title: asset.title ?? null,
      altText: asset.altText ?? null,
      sortOrder: asset.sortOrder ?? 0
    }))
  };
}

/** A caller MUST supply questions freshly fetched by the authorized server. */
export function prepareBookDraft(
  role: Role | string,
  input: BookDraftInput,
  serverQuestions: ReadonlyArray<ApiQuestion>
): PreparedBookDraft {
  if (!canEditBookDraft(role)) throw new BookDraftValidationError('Kitap taslağını yalnız Genel Koordinatör düzenleyebilir.');
  if (!validId(input.projectId)) throw new BookDraftValidationError('Geçerli bir kitap projesi seçin.');
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) throw new BookDraftValidationError('Kitap adı 3–120 karakter olmalı.');
  if (input.layoutColumns !== 1 && input.layoutColumns !== 2) throw new BookDraftValidationError('Yalnız tek veya çift sütun desteklenir.');
  if (input.expectedRevision !== null && !validId(input.expectedRevision)) {
    throw new BookDraftValidationError('Beklenen kitap sürümü geçersiz.');
  }
  if (input.chapters.length < 1 || input.chapters.length > MAX_BOOK_CHAPTERS) {
    throw new BookDraftValidationError('Kitapta 1–30 bölüm bulunmalı.');
  }
  const byId = new Map(serverQuestions.map(question => [question.id, question]));
  const usedIds = new Set<number>();
  let count = 0;
  const chapters = input.chapters.map((chapter, chapterIndex) => {
    const chapterTitle = chapter.title.trim();
    if (!chapterTitle || chapterTitle.length > 120) {
      throw new BookDraftValidationError('Bölüm başlığı 1–120 karakter olmalı.');
    }
    if (!chapter.questionIds.length) throw new BookDraftValidationError('Bölümler boş bırakılamaz.');
    const questions = chapter.questionIds.map((id, index) => {
      if (!validId(id) || usedIds.has(id)) throw new BookDraftValidationError('Geçersiz veya tekrar eden soru seçimi.');
      usedIds.add(id);
      const question = byId.get(id);
      if (!question) throw new BookDraftValidationError('Soru sunucu kapsamınızda bulunamadı.');
      const snapshot = freezeApprovedQuestion(question, input.projectId);
      count++;
      if (count > MAX_BOOK_QUESTIONS) throw new BookDraftValidationError('Kitap en fazla 300 soru içerebilir.');
      return {
        questionId: id,
        sortOrder: index,
        sourceQuestionUpdatedAt: new Date(snapshot.sourceQuestionUpdatedAt),
        snapshot
      };
    });
    return { title: chapterTitle, sortOrder: chapterIndex, questions };
  });
  return {
    projectId: input.projectId,
    title,
    layoutColumns: input.layoutColumns,
    expectedRevision: input.expectedRevision,
    chapters
  };
}

export function revisionMatches(expected: number, actual: number): boolean {
  return validId(expected) && expected === actual;
}
