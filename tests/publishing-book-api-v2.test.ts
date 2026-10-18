import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleBookAction, bookApiPreviewEnabled, parseBookBody } from '../api/v1/_lib/book-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => {
  const book = { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() };
  const question = { findMany: vi.fn() };
  const project = { findUnique: vi.fn() };
  const activityLog = { findMany: vi.fn(), create: vi.fn() };
  const bookChapter = { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() };
  const bookQuestion = { createMany: vi.fn(), deleteMany: vi.fn() };
  const tx = { book, question, project, activityLog, bookChapter, bookQuestion };
  return { prisma: { ...tx, $transaction: vi.fn(async (cb: (value: typeof tx) => Promise<unknown>) => cb(tx)) } };
});

const general = { id: 11, fullName: 'Genel', role: { code: 'GENEL_KOORDINATOR' } };
const author = { id: 22, fullName: 'Yazar', role: { code: 'YAZAR' } };

function reqRes(method: string, body: unknown = null, id?: string) {
  const req = { method, body, query: id === undefined ? {} : { id } } as VercelRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(),
    setHeader: vi.fn() } as unknown as VercelResponse;
  return { req, res };
}
function draft() {
  return { projectId: 5, title: 'Kitap 2026', layoutColumns: 2, expectedRevision: null,
    chapters: [{ title: 'Bölüm 1', questionIds: [2, 1] }] };
}
function source(id: number, extra: Record<string, unknown> = {}) {
  return {
    id, projectId: 5, status: 'ONAYLANDI', updatedAt: new Date('2026-10-18T12:00:00Z'),
    content: 'Aşağıdaki seçeneklerden hangisi doğrudur?', imageUrl: null,
    grade: '9. Sınıf', objectiveCode: null, difficulty: null,
    questionType: 'MULTIPLE_CHOICE', options: ['Bir','İki','Üç','Dört'], correctAnswer: 'B',
    explanation: null, booleanAnswer: null, modelAnswer: null,
    scoringRubric: null, evaluationCriteria: null, editorNote: null,
    authorUser: { id: 30, fullName: 'Örnek Yazar' },
    assets: [], project: { id: 5, code: 'BK5', title: 'Kitap Projesi' },
    ...extra
  };
}

describe('Books V2 preview gate, no external DB', () => {
  const savedFlag = process.env.PROLIG_BOOKS_V2_ENABLED;
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PROLIG_BOOKS_V2_ENABLED = 'true';
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma as any));
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: 5, status: 'Devam_Ediyor' } as any);
    vi.mocked(prisma.question.findMany).mockResolvedValue([source(1), source(2)] as any);
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.book.create).mockResolvedValue({ id: 10 } as any);
    vi.mocked(prisma.bookChapter.create).mockResolvedValue({ id: 99 } as any);
    vi.mocked(prisma.bookQuestion.createMany).mockResolvedValue({ count: 2 } as any);
    vi.mocked(prisma.book.findFirst).mockResolvedValue({ id: 10, projectId: 5,
      status: 'Dizgi Aşamasında', revision: 1 } as any);
    vi.mocked(prisma.book.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.bookChapter.findMany).mockResolvedValue([{ id: 44 }] as any);
    vi.mocked(prisma.bookQuestion.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.bookChapter.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.activityLog.create).mockResolvedValue({} as any);
  });
  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PROLIG_BOOKS_V2_ENABLED;
    else process.env.PROLIG_BOOKS_V2_ENABLED = savedFlag;
  });

  it('always rejects Production and normal preview environments, including with the flag enabled', () => {
    expect(bookApiPreviewEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'production', PROLIG_BOOKS_V2_ENABLED: 'true' })).toBe(false);
    expect(bookApiPreviewEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview', PROLIG_BOOKS_V2_ENABLED: 'true',
      DATABASE_URL: 'postgresql://user:pass@ep-example.neon.tech/neondb' })).toBe(false);
    expect(bookApiPreviewEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview', PROLIG_BOOKS_V2_ENABLED: 'true',
      DATABASE_URL: 'postgresql://u:p@ep-preview.neon.tech/prolig_v2_uat', PROLIG_BOOKS_V2_DB_NAME: 'prolig_v2_uat' })).toBe(true);
    expect(bookApiPreviewEnabled({ NODE_ENV: 'test', VERCEL_ENV: 'test', PROLIG_BOOKS_V2_ENABLED: 'true' })).toBe(true);
  });

  it('denies noncoordinators before attempting any book database read/write', async () => {
    const { req, res } = reqRes('POST', draft());
    await handleBookAction(req, res, author, 'books');
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.book.findMany).not.toHaveBeenCalled();
    expect(prisma.book.create).not.toHaveBeenCalled();
  });

  it('rejects forged snapshots, status overrides, wrong IDs and malformed body', () => {
    expect(() => parseBookBody({ ...draft(), status: 'Basıldı' })).toThrow('izin verilmeyen alan');
    expect(() => parseBookBody({ ...draft(), chapters: [{ title: 'A', questionIds: [1], snapshot: { content: 'spoof' } }] })).toThrow('Bölüm');
    expect(() => parseBookBody({ ...draft(), projectId: '5' })).toThrow('geçersiz');
    expect(() => parseBookBody({ ...draft(), chapters: [{ title: 'A', questionIds: ['1'] }] })).toThrow('Bölüm');
    expect(() => parseBookBody({ ...draft(), expectedRevision: undefined })).toThrow('geçersiz');
  });

  it('atomically creates a book and preserves incoming question order from freshly fetched sources', async () => {
    const { req, res } = reqRes('POST', draft());
    await handleBookAction(req, res, general, 'books');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ book: { id: 10, revision: 1 } });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function),
      { isolationLevel: 'Serializable', timeout: 30000 });
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [2, 1] }, projectId: 5, status: 'ONAYLANDI' }
    }));
    expect(prisma.bookChapter.create).toHaveBeenCalledWith({ data: {
      bookId: 10, title: 'Bölüm 1', sortOrder: 0
    } });
    expect(prisma.bookQuestion.createMany).toHaveBeenCalledWith({ data: [
      expect.objectContaining({ questionId: 2, sortOrder: 0, sourceQuestionUpdatedAt: expect.any(Date),
        snapshot: expect.objectContaining({ correctAnswer: 'B', sourceQuestionId: 2 }) }),
      expect.objectContaining({ questionId: 1, sortOrder: 1 })
    ] });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'BOOK_DRAFT_CREATED', entityType: 'Book'
    }) });
  });

  it('blocks another project, archived questions and deleted/missing source selections', async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([source(1)] as any);
    const missing = reqRes('POST', draft());
    await handleBookAction(missing.req, missing.res, general, 'books');
    expect(missing.res.status).toHaveBeenCalledWith(400);
    expect(prisma.book.create).not.toHaveBeenCalled();

    vi.mocked(prisma.question.findMany).mockResolvedValueOnce([source(1), source(2, { projectId: 8 })] as any);
    const crossProject = reqRes('POST', draft());
    await handleBookAction(crossProject.req, crossProject.res, general, 'books');
    expect(crossProject.res.status).toHaveBeenCalledWith(400);

    vi.mocked(prisma.activityLog.findMany).mockResolvedValueOnce([
      { entityId: 1, action: 'QUESTION_ARCHIVED' }
    ] as any);
    const archive = reqRes('POST', draft());
    await handleBookAction(archive.req, archive.res, general, 'books');
    expect(archive.res.status).toHaveBeenCalledWith(400);
    expect(prisma.book.create).not.toHaveBeenCalled();
  });

  it('checks owned draft and optimistic version before replacing children in a single transaction', async () => {
    const body = { ...draft(), expectedRevision: 1 };
    const { req, res } = reqRes('PATCH', body, '10');
    await handleBookAction(req, res, general, 'book');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ book: { id: 10, revision: 2 } });
    expect(prisma.book.findFirst).toHaveBeenCalledWith({
      where: { id: 10, createdByUserId: general.id },
      select: { id: true, projectId: true, status: true, revision: true }
    });
    expect(prisma.book.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ revision: 1, createdByUserId: general.id }),
      data: expect.objectContaining({ revision: { increment: 1 } })
    }));
    expect(prisma.bookQuestion.deleteMany).toHaveBeenCalledWith({ where: { chapterId: { in: [44] } } });
    expect(prisma.bookChapter.deleteMany).toHaveBeenCalledWith({ where: { bookId: 10 } });
    expect(vi.mocked(prisma.bookQuestion.deleteMany).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(prisma.bookChapter.deleteMany).mock.invocationCallOrder[0]);
  });

  it('returns 409 on revision mismatch and does not touch the existing chapters', async () => {
    vi.mocked(prisma.book.findFirst).mockResolvedValueOnce({
      id: 10, projectId: 5, status: 'Dizgi Aşamasında', revision: 2
    } as any);
    const { req, res } = reqRes('PATCH', { ...draft(), expectedRevision: 1 }, '10');
    await handleBookAction(req, res, general, 'book');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.bookQuestion.deleteMany).not.toHaveBeenCalled();
  });

  it('translates Serializable/unique conflicts into 409 and never retries writes automatically', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(Object.assign(new Error('serialization'), { code: 'P2034' }));
    const { req, res } = reqRes('POST', draft());
    await handleBookAction(req, res, general, 'books');
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('lists and reopens only drafts owned by the authenticated general coordinator', async () => {
    vi.mocked(prisma.book.findMany).mockResolvedValueOnce([]);
    const list = reqRes('GET');
    await handleBookAction(list.req, list.res, general, 'books');
    expect(prisma.book.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { createdByUserId: general.id }, take: 100
    }));
    expect(list.res.status).toHaveBeenCalledWith(200);
    vi.mocked(prisma.book.findFirst).mockResolvedValueOnce(null);
    const detail = reqRes('GET', undefined, '10');
    await handleBookAction(detail.req, detail.res, general, 'book');
    expect(prisma.book.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10, createdByUserId: general.id }
    }));
    expect(detail.res.status).toHaveBeenCalledWith(404);
  });
});
