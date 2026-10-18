import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../api/v1/_lib/prisma.js';
import { handleBookAction } from '../../api/v1/_lib/book-handler.js';

const url = (() => { try { return new URL(process.env.DATABASE_URL || ''); } catch { return null; } })();
if (process.env.PROLIG_BOOKS_V2_CI_ISOLATED_DB !== 'true' ||
    !url || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '5432' || url.pathname !== '/prolig_book_ci' ||
    process.env.VERCEL_ENV === 'production') {
  throw new Error('BOOK V2 isolation gate: requires explicit localhost:5432/prolig_book_ci PostgreSQL');
}

type Reply = { statusCode: number; data: any; status: (code: number) => Reply; json: (body: unknown) => Reply;
  setHeader: (key: string, value: string) => Reply };
function reply(): Reply {
  return {
    statusCode: 200, data: null,
    status(code: number) { this.statusCode = code; return this; },
    json(data: unknown) { this.data = data; return this; },
    setHeader() { return this; }
  };
}
const request = (method: string, body: unknown = undefined, id?: number) =>
  ({ method, body, query: id ? { id: String(id) } : {} }) as any;

let actor: any;
let other: any;
let projectId = 0;
let firstId = 0;
let secondId = 0;
let bookId = 0;
const body = (order = [firstId, secondId], revision: number | null = null) => ({
  projectId, title: 'Test Matematik Kitabı', layoutColumns: 2, expectedRevision: revision,
  chapters: [{ title: 'Sayılar', questionIds: order }]
});

describe('Book V2 PostgreSQL acceptance: isolated disposable CI database ONLY', () => {
  beforeAll(async () => {
    process.env.PROLIG_BOOKS_V2_ENABLED = 'true';
    const role = await prisma.role.create({ data: { code: 'GENEL_KOORDINATOR', name: 'Book CI General' } });
    const writerRole = await prisma.role.create({ data: { code: 'YAZAR', name: 'Book CI Writer' } });
    const general = await prisma.user.create({ data: { username: 'book-ci-gk', email: 'book-ci-gk@example.test',
      fullName: 'Book CI General', roleId: role.id, status: 'Aktif' } });
    const otherGeneral = await prisma.user.create({ data: { username: 'book-ci-other', email: 'book-ci-other@example.test',
      fullName: 'Other GK', roleId: role.id, status: 'Aktif' } });
    const writer = await prisma.user.create({ data: { username: 'book-ci-writer', email: 'book-ci-writer@example.test',
      fullName: 'Book CI Writer', roleId: writerRole.id, status: 'Aktif' } });
    actor = { id: general.id, fullName: general.fullName, role: { code: 'GENEL_KOORDINATOR' } };
    other = { id: otherGeneral.id, fullName: otherGeneral.fullName, role: { code: 'GENEL_KOORDINATOR' } };
    const branch = await prisma.branch.create({ data: { name: 'Book CI Mathematics', category: 'CI' } });
    const project = await prisma.project.create({ data: {
      title: 'Book CI Project', code: 'CI-BOOK-01', branchId: branch.id,
      deadline: new Date('2027-03-01T00:00:00Z')
    } });
    projectId = project.id;
    const first = await prisma.question.create({ data: {
      authorUserId: writer.id, projectId, content: 'İlk kitabın onaylı test sorusu?',
      status: 'ONAYLANDI', options: ['Bir','İki','Üç','Dört'], correctAnswer: 'C',
      grade: '9. Sınıf'
    } });
    const second = await prisma.question.create({ data: {
      authorUserId: writer.id, projectId, content: 'İkinci onaylı test sorusunun cevabı?',
      status: 'ONAYLANDI', options: ['Bir','İki','Üç','Dört'], correctAnswer: 'A',
      grade: '9. Sınıf'
    } });
    firstId = first.id; secondId = second.id;
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('creates a book/chapter/question snapshot in serializable transaction', async () => {
    const res = reply();
    await handleBookAction(request('POST', body()), res as any, actor, 'books');
    expect(res.statusCode, JSON.stringify(res.data)).toBe(201);
    bookId = res.data.book.id;
    const rows = await prisma.bookQuestion.findMany({ where: { chapter: { bookId } },
      orderBy: { sortOrder: 'asc' } });
    expect(rows.map(row => row.questionId)).toEqual([firstId, secondId]);
    expect(rows[0].snapshot).toMatchObject({ correctAnswer: 'C', sourceQuestionId: firstId });
    expect(rows[1].snapshot).toMatchObject({ correctAnswer: 'A', sourceQuestionId: secondId });
    expect((await prisma.book.findUniqueOrThrow({ where: { id: bookId } })).revision).toBe(1);
  });

  it('reopens book only for owner; other GK and non-GK cannot read its snapshots', async () => {
    const res = reply();
    await handleBookAction(request('GET', undefined, bookId), res as any, actor, 'book');
    expect(res.statusCode, JSON.stringify(res.data)).toBe(200);
    expect(res.data.book.chapters[0].questions[0].snapshot.correctAnswer).toBe('C');
    const otherRes = reply();
    await handleBookAction(request('GET', undefined, bookId), otherRes as any, other, 'book');
    expect(otherRes.statusCode).toBe(404);
    const denied = reply();
    await handleBookAction(request('GET', undefined, bookId), denied as any,
      { id: 9, role: { code: 'YAZAR' } }, 'book');
    expect(denied.statusCode).toBe(403);
  });

  it('updates chapter order atomically and rejects a second stale simultaneous revision', async () => {
    const requestBody = body([secondId, firstId], 1);
    const [a, b] = await Promise.all([
      (async () => { const res = reply(); await handleBookAction(request('PATCH', requestBody, bookId), res as any, actor, 'book'); return res; })(),
      (async () => { const res = reply(); await handleBookAction(request('PATCH', requestBody, bookId), res as any, actor, 'book'); return res; })()
    ]);
    expect([a.statusCode, b.statusCode].sort((x, y) => x - y)).toEqual([200, 409]);
    const book = await prisma.book.findUniqueOrThrow({ where: { id: bookId } });
    expect(book.revision).toBe(2);
    const snapshots = await prisma.bookQuestion.findMany({ where: { chapter: { bookId } }, orderBy: { sortOrder: 'asc' } });
    expect(snapshots.map(r => r.questionId)).toEqual([secondId, firstId]);
    expect(snapshots).toHaveLength(2);
  });

  it('rejects now-archived question without modifying existing book or its revision', async () => {
    await prisma.activityLog.create({ data: {
      userName: actor.fullName, action: 'QUESTION_ARCHIVED',
      entityType: 'Question', entityId: firstId
    } });
    const res = reply();
    await handleBookAction(request('PATCH', body([firstId, secondId], 2), bookId), res as any, actor, 'book');
    expect(res.statusCode).toBe(400);
    expect((await prisma.book.findUniqueOrThrow({ where: { id: bookId } })).revision).toBe(2);
    expect(await prisma.bookQuestion.count({ where: { chapter: { bookId } } })).toBe(2);
  });

  it('preserves snapshot on physical question deletion via SET NULL', async () => {
    const saved = await prisma.bookQuestion.findFirstOrThrow({ where: { chapter: { bookId }, questionId: firstId } });
    await prisma.question.delete({ where: { id: firstId } });
    const after = await prisma.bookQuestion.findUniqueOrThrow({ where: { id: saved.id } });
    expect(after.questionId).toBeNull();
    expect(after.snapshot).toEqual(saved.snapshot);
  });

  it('keeps audit events and refuses updates when a book moves out of draft status', async () => {
    const logs = await prisma.activityLog.findMany({
      where: { entityType: 'Book', entityId: bookId }, orderBy: { id: 'asc' }
    });
    expect(logs.map(x => x.action)).toEqual(['BOOK_DRAFT_CREATED', 'BOOK_DRAFT_UPDATED']);
    await prisma.book.update({ where: { id: bookId }, data: { status: 'Basıldı' } });
    const res = reply();
    await handleBookAction(request('PATCH', body([secondId], 2), bookId), res as any, actor, 'book');
    expect(res.statusCode).toBe(409);
  });
});
