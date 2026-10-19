import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleBookAction } from '../api/v1/_lib/book-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: { book: { findFirst: vi.fn() } }
}));
function res() {
  return {
    code: 200, headers: {} as Record<string,string>, data: null as unknown,
    status(code: number) { this.code = code; return this; },
    json(value: unknown) { this.data = value; return this; },
    send(value: unknown) { this.data = value; return this; },
    setHeader(key: string, value: string) { this.headers[key.toLowerCase()] = value; return this; }
  };
}
const actor = { id: 17, role: { code: 'GENEL_KOORDINATOR' } };
const q = {
  schemaVersion: 1, sourceQuestionId: 77, sourceQuestionUpdatedAt: '2026-10-19T12:00:00Z',
  content: 'Kaçtır?', imageUrl: null, grade: '9. Sınıf', objectiveCode: null, difficulty: null,
  questionType: 'MULTIPLE_CHOICE', options: ['1','2','3','4'], correctAnswer: 'C',
  booleanAnswer: null, modelAnswer: null, explanation: null, scoringRubric: null,
  evaluationCriteria: null, authorName: null, assets: []
};
const savedBook = {
  id: 1, title: 'Sahibine ait test kitabı', layoutColumns: 1,
  chapters: [{ id: 33, title: 'Birinci Bölüm', sortOrder: 0,
    questions: [{ id: 5, sortOrder: 0, snapshot: q }] }]
};
const request = (answers = '0', method = 'GET') => ({
  method, query: { id: '1', answers }
}) as any;

describe('DOCX export route — authenticated owner-scoped and read-only', () => {
  const originalFlag = process.env.PROLIG_BOOKS_V2_ENABLED;
  const originalVercel = process.env.VERCEL_ENV;
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PROLIG_BOOKS_V2_ENABLED = 'true';
    process.env.VERCEL_ENV = 'test';
    vi.mocked(prisma.book.findFirst).mockResolvedValue(savedBook as any);
  });
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.PROLIG_BOOKS_V2_ENABLED;
    else process.env.PROLIG_BOOKS_V2_ENABLED = originalFlag;
    if (originalVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercel;
  });

  it('denies writer and editor roles before any DB read', async () => {
    for (const role of ['YAZAR', 'EDITOR', 'MUHASEBE']) {
      const response = res();
      await handleBookAction(request(), response as any, { id: 9, role: { code: role } }, 'bookDocx');
      expect(response.code).toBe(403);
      expect(prisma.book.findFirst).not.toHaveBeenCalled();
    }
  });

  it('cannot enable DOCX on Production even if NODE_ENV is test and flag true', async () => {
    process.env.VERCEL_ENV = 'production';
    const response = res();
    await handleBookAction(request(), response as any, actor, 'bookDocx');
    expect(response.code).toBe(404);
    expect(prisma.book.findFirst).not.toHaveBeenCalled();
  });

  it('only GET, only owned book, no caller snapshot and separately requested answer key', async () => {
    const response = res();
    await handleBookAction(request('0'), response as any, actor, 'bookDocx');
    expect(response.code).toBe(200);
    expect(prisma.book.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1, createdByUserId: 17 }
    }));
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(response.headers['content-disposition']).toContain('-ogrenci.docx');
    expect(Buffer.isBuffer(response.data)).toBe(true);
    expect((response.data as Buffer).subarray(0, 4).toString('hex')).toBe('504b0304');

    const answers = res();
    await handleBookAction(request('1'), answers as any, actor, 'bookDocx');
    expect(answers.code).toBe(200);
    expect(answers.headers['content-disposition']).toContain('-cevapli.docx');

    const denied = res();
    vi.mocked(prisma.book.findFirst).mockResolvedValueOnce(null);
    await handleBookAction(request(), denied as any, actor, 'bookDocx');
    expect(denied.code).toBe(404);

    const patch = res();
    await handleBookAction(request('1','PATCH'), patch as any, actor, 'bookDocx');
    expect(patch.code).toBe(405);
  });

  it('returns explicit 422 if image content cannot be preserved in Word', async () => {
    vi.mocked(prisma.book.findFirst).mockResolvedValueOnce({
      ...savedBook, chapters: [{ ...savedBook.chapters[0],
        questions: [{ ...savedBook.chapters[0].questions[0],
          snapshot: { ...q, imageUrl: '/media/image.png' } }] }]
    } as any);
    const response = res();
    await handleBookAction(request(), response as any, actor, 'bookDocx');
    expect(response.code).toBe(422);
    expect(response.data).toMatchObject({ error: expect.stringContaining('Görsel') });
    expect(response.headers['content-type']).toBeUndefined();
  });
});
