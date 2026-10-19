import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ApiQuestion } from '../src/questions/types';
import {
  BookDraftValidationError,
  canEditBookDraft,
  freezeApprovedQuestion,
  prepareBookDraft,
  revisionMatches,
  type BookDraftInput
} from '../src/publishing/book-draft-contract';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const migration = readFileSync(new URL('../prisma/migrations/20261018221000_publishing_book_chapters_v2/migration.sql', import.meta.url), 'utf8');

function question(id: number, change: Partial<ApiQuestion> = {}): ApiQuestion {
  return {
    id,
    content: 'Verilen bilgilerden hangisi doğrudur?',
    imageUrl: '/brand/example.png',
    objectiveCode: 'M.9.1', grade: '9. Sınıf', difficulty: 'Orta',
    options: ['Bir', 'İki', 'Üç', 'Dört'], correctAnswer: 'B',
    questionType: 'MULTIPLE_CHOICE', optionCount: 4,
    booleanAnswer: null, modelAnswer: null, scoringRubric: null, evaluationCriteria: null,
    explanation: 'Doğru yanıt B.',
    status: 'ONAYLANDI', editorNote: null, projectId: 5,
    project: { id: 5, code: 'B5', title: 'Örnek Kitap Projesi' },
    author: { id: 7, fullName: 'Örnek Yazar' },
    assets: [{ id: 21, placement: 'OPTION_A', assetType: 'IMAGE', url: 'https://example.org/a.png', title: null, altText: 'Şekil A' }],
    isArchived: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...change
  };
}

function request(change: Partial<BookDraftInput> = {}): BookDraftInput {
  return {
    projectId: 5, title: '  İlk Soru Kitabım  ', layoutColumns: 2, expectedRevision: null,
    chapters: [{ title: ' Matematik ', questionIds: [1, 2] }],
    ...change
  };
}

const assertInvalid = (fn: () => unknown, snippet: string) => {
  expect(fn).toThrowError(BookDraftValidationError);
  expect(fn).toThrow(snippet);
};

describe('Publishing Book V2 contract — no API or DB mutations', () => {
  it('fails closed for every role other than General Coordinator', () => {
    expect(canEditBookDraft('GENEL_KOORDINATOR')).toBe(true);
    for (const role of ['YAZAR', 'EDITOR', 'MUHASEBE', 'IL_KOORDINATORU', 'BOLGE_KOORDINATORU', '', undefined]) {
      expect(canEditBookDraft(role)).toBe(false);
      assertInvalid(() => prepareBookDraft(role ?? '', request(), [question(1), question(2)]), 'yalnız Genel Koordinatör');
    }
  });

  it('normalizes chapter/book headings, preserves manual order and freezes source content', () => {
    const data = prepareBookDraft('GENEL_KOORDINATOR', request(), [question(1), question(2)]);
    expect(data.title).toBe('İlk Soru Kitabım');
    expect(data.layoutColumns).toBe(2);
    expect(data.chapters[0].title).toBe('Matematik');
    expect(data.chapters[0].sortOrder).toBe(0);
    expect(data.chapters[0].questions.map(x => [x.questionId, x.sortOrder])).toEqual([[1, 0], [2, 1]]);
    expect(data.chapters[0].questions[0].sourceQuestionUpdatedAt.toISOString()).toBe('2026-10-02T10:00:00.000Z');
    const snapshot = data.chapters[0].questions[0].snapshot;
    expect(snapshot).toMatchObject({
      schemaVersion: 1, sourceQuestionId: 1,
      sourceQuestionUpdatedAt: '2026-10-02T10:00:00.000Z',
      imageUrl: '/brand/example.png',
      correctAnswer: 'B', authorName: 'Örnek Yazar'
    });
    expect(snapshot.assets).toEqual([expect.objectContaining({ altText: 'Şekil A' })]);
    const source = question(1);
    const copy = freezeApprovedQuestion(source, 5);
    source.options![0] = 'Sonradan değiştirilen seçenek';
    source.assets![0].url = 'https://example.org/new.png';
    expect(copy.options[0]).toBe('Bir');
    expect(copy.assets[0].url).toBe('https://example.org/a.png');
  });

  it('never trusts input IDs for missing, archived, unapproved or foreign-project questions', () => {
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request(), [question(1)]), 'sunucu kapsamınızda bulunamadı');
    for (const state of ['TASLAK', 'INCELEMEDE', 'REVIZYON', 'REDDEDILDI'] as const) {
      assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request(), [question(1, { status: state }), question(2)]), 'onaylı');
    }
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request(), [question(1, { isArchived: true }), question(2)]), 'onaylı');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request(), [question(1, { projectId: 7 }), question(2)]), 'seçilen kitap projesine');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ chapters: [{ title: 'A', questionIds: [1, 1] }] }), [question(1)]), 'tekrar eden');
  });

  it('rejects missing or nonsensical book layout, titles, revision and chapter structure', () => {
    const source = [question(1), question(2)];
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ layoutColumns: 3 as 1 }), source), 'sütun');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ projectId: 0 }), source), 'projesi');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ title: '' }), source), 'Kitap adı');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ expectedRevision: 0 }), source), 'sürümü');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ chapters: [] }), source), '1–30');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ chapters: [{ title: '', questionIds: [1] }] }), source), 'Bölüm başlığı');
    assertInvalid(() => prepareBookDraft('GENEL_KOORDINATOR', request({ chapters: [{ title: 'Boş', questionIds: [] }] }), source), 'Bölümler');
  });

  it('freezes legacy MCQ, five-choice, true/false and open-ended answer types without leaking a fake choice', () => {
    const legacy = freezeApprovedQuestion(question(1, { questionType: undefined }), 5);
    expect(legacy.questionType).toBe('MULTIPLE_CHOICE');
    expect(legacy.correctAnswer).toBe('B');
    const five = freezeApprovedQuestion(question(2, {
      optionCount: 5, options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'E'
    }), 5);
    expect(five.options).toHaveLength(5);
    const tf = freezeApprovedQuestion(question(3, {
      questionType: 'TRUE_FALSE', options: [], correctAnswer: null, booleanAnswer: false
    }), 5);
    expect(tf.booleanAnswer).toBe(false);
    expect(tf.options).toEqual([]);
    expect(tf.correctAnswer).toBeNull();
    const open = freezeApprovedQuestion(question(4, {
      questionType: 'OPEN_ENDED', options: [], correctAnswer: null, modelAnswer: 'Gerekçeli cevap',
      scoringRubric: 'Anahtar kavramlar'
    }), 5);
    expect(open.modelAnswer).toBe('Gerekçeli cevap');
    expect(open.scoringRubric).toBe('Anahtar kavramlar');
    expect(open.correctAnswer).toBeNull();
  });

  it('rejects truncated media and invalid question revisions rather than silently reducing print fidelity', () => {
    const assets = Array.from({ length: 41 }, (_, i) => ({
      id: i + 1, placement: 'STEM' as const, assetType: 'IMAGE' as const, url: 'https://example.org/' + i
    }));
    assertInvalid(() => freezeApprovedQuestion(question(1, { assets }), 5), '40 medya');
    assertInvalid(() => freezeApprovedQuestion(question(1, { updatedAt: 'not-a-date' }), 5), 'kaynak sürüm');
    assertInvalid(() => freezeApprovedQuestion(question(1, { correctAnswer: null }), 5), 'cevap anahtarı');
    assertInvalid(() => freezeApprovedQuestion(question(1, {
      questionType: 'TRUE_FALSE', options: [], correctAnswer: null, booleanAnswer: null
    }), 5), 'Doğru/Yanlış');
    assertInvalid(() => freezeApprovedQuestion(question(1, {
      questionType: 'OPEN_ENDED', options: [], correctAnswer: null, modelAnswer: ''
    }), 5), 'model cevap');
  });

  it('defines optimistic revision conflict detection for future atomic book writes', () => {
    expect(revisionMatches(3, 3)).toBe(true);
    expect(revisionMatches(3, 4)).toBe(false);
    expect(revisionMatches(0, 0)).toBe(false);
    expect(prepareBookDraft('GENEL_KOORDINATOR', request({ expectedRevision: 4 }), [question(1), question(2)]).expectedRevision).toBe(4);
  });
});

describe('Publishing V2 migration draft is additive, not executed', () => {
  it('preserves existing Book fields and introduces the project→chapter→snapshot relations', () => {
    expect(schema).toContain('model Book {');
    expect(schema).toContain('model BookChapter {');
    expect(schema).toContain('model BookQuestion {');
    expect(schema).toContain('chapters        BookChapter[]');
    expect(schema).toContain('bookQuestions BookQuestion[]');
    expect(schema).toContain('sourceQuestionUpdatedAt DateTime');
    expect(schema).toContain('snapshot                Json');
    expect(schema).toContain('@@unique([bookId, sortOrder])');
    expect(schema).toContain('@@unique([chapterId, sortOrder])');
    expect(migration).toContain('ALTER TABLE "Book"');
    expect(migration).toContain('CREATE TABLE "BookChapter"');
    expect(migration).toContain('CREATE TABLE "BookQuestion"');
    expect(migration).toContain('JSONB NOT NULL');
    expect(migration).toContain('ON DELETE SET NULL');
    expect(migration).toContain('ON DELETE RESTRICT');
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE)\s+(?:TABLE|COLUMN)\b/i);
  });
});
