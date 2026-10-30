import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { formatQuestionDto } from './question-dto.js';
import { DocxExportError, exportBookDocxWithVerifiedPrivateGeometry } from './book-docx.js';
import { isP3IsolatedPngUploadEnvironment } from './p3-png-upload-environment.js';
import { isRelease03BookPreviewAllowed } from '../../../server/release03-book-preview.js';
import { RELEASE03_REF } from '../../../server/release03-db-policy.js';
import { privateGeometryPngKey, readVerifiedPrivatePng } from './p3-png-s3.js';
import {
  BookDraftValidationError, canEditBookDraft, prepareBookDraft,
  type BookDraftInput, type PreparedBookDraft
} from '../../../src/publishing/book-draft-contract.js';

export type BookAction = 'books' | 'book' | 'bookDocx';

/**
 * Fail-closed release gate. Preview remains isolated. Production requires
 * separately configured approval plus an exact database host/name match.
 * Enabling this gate does not run migrations or create database objects.
 */
export function bookApiPreviewEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.PROLIG_BOOKS_V2_ENABLED !== 'true') return false;
  if (env.VERCEL_ENV === 'production') {
    if (env.PROLIG_BOOKS_V2_PRODUCTION_ENABLED !== 'true' ||
        env.PROLIG_BOOKS_V2_RELEASE_APPROVED !== 'true') return false;
    try {
      const db = new URL(env.DATABASE_URL || '');
      const expectedHost = env.PROLIG_BOOKS_V2_PRODUCTION_DB_HOST;
      const expectedName = env.PROLIG_BOOKS_V2_PRODUCTION_DB_NAME;
      return db.protocol === 'postgresql:' &&
        typeof expectedHost === 'string' && expectedHost.length > 0 &&
        typeof expectedName === 'string' && expectedName.length > 0 &&
        db.hostname === expectedHost &&
        db.pathname === '/' + expectedName &&
        db.hostname.endsWith('.neon.tech');
    } catch { return false; }
  }
  // Release-03 must pass its own strict identity policy, even in test mode.
  if (env.VERCEL_GIT_COMMIT_REF === RELEASE03_REF) {
    return isRelease03BookPreviewAllowed(env);
  }
  if (env.NODE_ENV === 'test') return true;
  // P3 private geometry books may run only on the dedicated isolated Preview DB.
  if (env.PROLIG_P3_BOOK_EXPORT_ENABLED === 'true' && isP3IsolatedPngUploadEnvironment(env)) return true;
  if (env.VERCEL_ENV !== 'preview') return false;
  try {
    const db = new URL(env.DATABASE_URL || '');
    return db.protocol === 'postgresql:' &&
      db.hostname.endsWith('.neon.tech') &&
      db.pathname === '/prolig_v2_uat' &&
      env.PROLIG_BOOKS_V2_DB_NAME === 'prolig_v2_uat';
  } catch {
    return false;
  }
}

function positiveId(value: unknown): number | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** No extra fields such as status, answer key or serialized snapshots are accepted. */
export function parseBookBody(body: unknown): BookDraftInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BookDraftValidationError('Kitap verileri geçersiz.');
  const row = body as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.some(key => !['projectId', 'title', 'layoutColumns', 'expectedRevision', 'chapters'].includes(key))) {
    throw new BookDraftValidationError('Kitap taslağında izin verilmeyen alan var.');
  }
  if (typeof row.projectId !== 'number' || !positiveId(row.projectId) ||
      typeof row.title !== 'string' || typeof row.layoutColumns !== 'number' ||
      (row.expectedRevision !== null && (typeof row.expectedRevision !== 'number' || !positiveId(row.expectedRevision))) ||
      !Array.isArray(row.chapters) || row.chapters.length > 30) {
    throw new BookDraftValidationError('Kitap, proje, revizyon veya bölümler geçersiz.');
  }
  const chapters = row.chapters.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BookDraftValidationError('Bölüm geçersiz.');
    const chapter = value as Record<string, unknown>;
    if (Object.keys(chapter).some(key => !['title', 'questionIds'].includes(key)) ||
        typeof chapter.title !== 'string' || !Array.isArray(chapter.questionIds) ||
        chapter.questionIds.length > 300 || !chapter.questionIds.every(id => typeof id === 'number' && positiveId(id))) {
      throw new BookDraftValidationError('Bölüm veya soru seçimi geçersiz.');
    }
    return { title: chapter.title, questionIds: chapter.questionIds as number[] };
  });
  return { projectId: row.projectId, title: row.title, layoutColumns: row.layoutColumns as 1 | 2,
    expectedRevision: row.expectedRevision as number | null, chapters };
}

const bookInclude = {
  project: { select: { id: true, code: true, title: true } },
  chapters: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
    include: { questions: {
      orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
      select: {
        id: true, questionId: true, sortOrder: true, sourceQuestionUpdatedAt: true, snapshot: true, createdAt: true
      }
    } }
  }
};

function bookDto(book: any) {
  return {
    id: book.id, projectId: book.projectId, project: book.project,
    title: book.title, status: book.status, revision: book.revision,
    layoutColumns: book.layoutColumns, createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    chapters: book.chapters.map((c: any) => ({
      id: c.id, title: c.title, sortOrder: c.sortOrder,
      questions: c.questions.map((q: any) => ({
        id: q.id, questionId: q.questionId, sortOrder: q.sortOrder,
        sourceQuestionUpdatedAt: q.sourceQuestionUpdatedAt,
        snapshot: q.snapshot
      }))
    }))
  };
}

class BookApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'BookApiError';
  }
}

async function ensureProject(tx: any, projectId: number) {
  const project = await tx.project.findUnique({ where: { id: projectId }, select: { id: true, status: true } });
  if (!project || project.status === 'Arsiv') throw new BookApiError(404, 'Kitap için aktif proje bulunamadı.');
}

async function prepareServerDraft(tx: any, body: BookDraftInput, user: any): Promise<PreparedBookDraft> {
  await ensureProject(tx, body.projectId);
  const questionIds = [...new Set(body.chapters.flatMap(chapter => chapter.questionIds))];
  const isolatedGeometry = isP3IsolatedPngUploadEnvironment(process.env) &&
    process.env.PROLIG_P3_BOOK_EXPORT_ENABLED === 'true';
  // Source content and answer keys are ALWAYS re-fetched from the database.
  const questions = await tx.question.findMany({
    where: { id: { in: questionIds }, projectId: body.projectId, status: 'ONAYLANDI' },
    include: {
      authorUser: { select: { id: true, fullName: true } },
      project: { select: { id: true, code: true, title: true } },
      assets: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      ...(isolatedGeometry ? { privateGeometryAssets: { select: {
        id: true, sha256: true, width: true, height: true, placement: true
      } } } : {})
    }
  });
  const logs = await tx.activityLog.findMany({
    where: { entityType: 'Question', entityId: { in: questionIds },
      action: { in: ['QUESTION_ARCHIVED', 'QUESTION_RESTORED'] } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
  });
  const archiveState = new Map<number, boolean>();
  for (const log of logs) {
    if (log.entityId != null && !archiveState.has(log.entityId)) {
      archiveState.set(log.entityId, log.action === 'QUESTION_ARCHIVED');
    }
  }
  const dtoQuestions = questions.map((q: any) => formatQuestionDto(q, archiveState.get(q.id) === true));
  const draft = prepareBookDraft(user.role.code, body, dtoQuestions);
  if (isolatedGeometry) {
    const byQuestion = new Map<number, any[]>(questions.map((question: any) =>
      [question.id, question.privateGeometryAssets ?? []]));
    let imageCount = 0;
    for (const chapter of draft.chapters) for (const item of chapter.questions) {
      const images = byQuestion.get(item.questionId) ?? [];
      if (images.some((image: any) => image.placement !== 'STEM')) {
        throw new BookDraftValidationError('Word yalnız soru kökündeki özel çizimleri destekliyor.');
      }
      imageCount += images.length;
      if (images.length) {
        item.snapshot.privateGeometryAssets = images.map((image: any) => ({
          assetId: image.id, sha256: image.sha256, width: image.width,
          height: image.height, placement: 'STEM' as const
        }));
      }
    }
    if (imageCount > 30) throw new BookDraftValidationError('Word için en fazla 30 özel çizim kullanılabilir.');
  }
  return draft;
}

/**
 * Load only frozen private drawings belonging to this owner-scoped book,
 * with a fresh approved-question version and metadata/object checksum check.
 * Nothing in the browser request controls a storage object key.
 */
async function loadFrozenP3DocxImages(book: any) {
  const references = book.chapters.flatMap((chapter: any) =>
    chapter.questions.flatMap((entry: any) =>
      (entry.snapshot.privateGeometryAssets ?? []).map((item: any) => ({
        sourceQuestionId: entry.snapshot.sourceQuestionId,
        frozenUpdatedAt: entry.snapshot.sourceQuestionUpdatedAt,
        ...item
      }))
    )
  ) as Array<{
    sourceQuestionId: number; frozenUpdatedAt: string; assetId: number;
    sha256: string; width: number; height: number; placement: string;
  }>;
  if (!references.length) return [];
  if (!isP3IsolatedPngUploadEnvironment(process.env) ||
      process.env.PROLIG_P3_BOOK_EXPORT_ENABLED !== 'true') {
    throw new DocxExportError('Özel çizimler yalnızca izole P3 Word ortamında kullanılabilir.');
  }
  if (references.length > 30) throw new DocxExportError('Word için çok fazla özel çizim var.');
  const ids = [...new Set(references.map(x => x.sourceQuestionId))];
  const assetIds = [...new Set(references.map(x => x.assetId))];
  const [questions, assets] = await Promise.all([
    prisma.question.findMany({
      where: { id: { in: ids }, projectId: book.projectId, status: 'ONAYLANDI' },
      select: { id: true, authorUserId: true, updatedAt: true }
    }),
    prisma.privateGeometryAsset.findMany({
      where: { id: { in: assetIds } },
      select: {
        id: true, questionId: true, ownerUserId: true, sha256: true,
        objectKey: true, width: true, height: true, placement: true
      }
    })
  ]);
  const questionById = new Map(questions.map(q => [q.id, q]));
  const assetById = new Map(assets.map(a => [a.id, a]));
  const images = [];
  for (const ref of references) {
    const question = questionById.get(ref.sourceQuestionId);
    const asset = assetById.get(ref.assetId);
    if (!question || !asset || question.updatedAt.toISOString() !== ref.frozenUpdatedAt ||
        asset.questionId !== ref.sourceQuestionId || asset.ownerUserId !== question.authorUserId ||
        asset.sha256 !== ref.sha256 || asset.width !== ref.width || asset.height !== ref.height ||
        asset.placement !== 'STEM' || ref.placement !== 'STEM' ||
        asset.objectKey !== privateGeometryPngKey(question.authorUserId, question.id, asset.sha256)) {
      throw new DocxExportError('Dondurulmuş özel çizim güncel onaylı soru veya özel depolamayla uyuşmuyor.');
    }
    let png;
    try {
      png = await readVerifiedPrivatePng(asset.objectKey, asset.sha256, {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      });
    } catch {
      throw new BookApiError(503, 'Özel çizim doğrulanamadı. Word aktarımı durduruldu.');
    }
    if (png.width !== asset.width || png.height !== asset.height) {
      throw new DocxExportError('Özel çizim boyutu kitap kaydıyla eşleşmiyor.');
    }
    images.push({
      sourceQuestionId: ref.sourceQuestionId, assetId: asset.id,
      sha256: png.sha256, width: png.width, height: png.height, bytes: png.bytes
    });
  }
  return images;
}

async function writeChapters(tx: any, bookId: number, draft: PreparedBookDraft) {
  for (const chapter of draft.chapters) {
    const created = await tx.bookChapter.create({ data: { bookId, title: chapter.title, sortOrder: chapter.sortOrder } });
    await tx.bookQuestion.createMany({ data: chapter.questions.map(q => ({
      chapterId: created.id, questionId: q.questionId, sortOrder: q.sortOrder,
      sourceQuestionUpdatedAt: q.sourceQuestionUpdatedAt, snapshot: q.snapshot
    })) });
  }
}

async function audit(tx: any, user: any, action: string, bookId: number, revision: number) {
  await tx.activityLog.create({ data: {
    userName: user.fullName, action, entityType: 'Book', entityId: bookId,
    details: JSON.stringify({ revision })
  } });
}

export async function handleBookAction(req: VercelRequest, res: VercelResponse, user: any, action: BookAction) {
  res.setHeader('Cache-Control', 'no-store');
  // Preview functionality must fail closed in Production before any DB operation.
  if (!bookApiPreviewEnabled()) return res.status(404).json({ error: 'Not found' });
  if (!canEditBookDraft(user?.role?.code)) return res.status(403).json({ error: 'Forbidden' });

  const isDocx = action === 'bookDocx';
  const isDetail = action === 'book' || isDocx;
  const id = isDetail ? positiveId(req.query.id) : null;
  if (isDetail && !id) return res.status(400).json({ error: 'Geçersiz kitap ID.' });

  if (!['GET', 'POST', 'PATCH'].includes(req.method || '') ||
      (isDocx && req.method !== 'GET') ||
      (isDetail && req.method === 'POST') || (!isDetail && req.method === 'PATCH')) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (isDocx) {
      // Export never accepts a caller-supplied snapshot: load owner-scoped
      // immutable question content directly from the same read-only Book query.
      const book = await prisma.book.findFirst({
        where: { id: id!, createdByUserId: user.id }, include: bookInclude
      });
      if (!book) return res.status(404).json({ error: 'Kitap taslağı bulunamadı.' });
      const answers = req.query.answers;
      if (answers !== undefined && answers !== '0' && answers !== '1') {
        return res.status(400).json({ error: 'Word çıktı türü geçersiz.' });
      }
      const privateImages = await loadFrozenP3DocxImages(book);
      const buffer = exportBookDocxWithVerifiedPrivateGeometry(book, answers === '1', privateImages);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="prolig-book-' + id + (answers === '1' ? '-cevapli' : '-ogrenci') + '.docx"');
      res.setHeader('Content-Length', String(buffer.length));
      return res.status(200).send(buffer);
    }
    if (req.method === 'GET' && !isDetail) {
      const books = await prisma.book.findMany({
        where: { createdByUserId: user.id },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 100,
        select: { id: true, projectId: true, title: true, status: true,
          revision: true, layoutColumns: true, updatedAt: true }
      });
      return res.status(200).json({ books });
    }
    if (req.method === 'GET') {
      const book = await prisma.book.findFirst({
        where: { id: id!, createdByUserId: user.id },
        include: bookInclude
      });
      return book ? res.status(200).json({ book: bookDto(book) }) :
        res.status(404).json({ error: 'Kitap taslağı bulunamadı.' });
    }

    const input = parseBookBody(req.body);
    if (!isDetail && input.expectedRevision !== null) throw new BookApiError(400, 'Yeni kitap için revizyon null olmalı.');
    if (isDetail && input.expectedRevision === null) throw new BookApiError(428, 'Kitap revizyon numarası gerekli.');

    const result = await prisma.$transaction(async (tx: any) => {
      if (!isDetail) {
        const draft = await prepareServerDraft(tx, input, user);
        const book = await tx.book.create({ data: {
          projectId: draft.projectId, title: draft.title, layoutColumns: draft.layoutColumns,
          createdByUserId: user.id, revision: 1, pageCount: 0, status: 'Dizgi Aşamasında'
        } });
        await writeChapters(tx, book.id, draft);
        await audit(tx, user, 'BOOK_DRAFT_CREATED', book.id, 1);
        return { id: book.id, revision: 1 };
      }

      const existing = await tx.book.findFirst({
        where: { id: id!, createdByUserId: user.id },
        select: { id: true, projectId: true, status: true, revision: true }
      });
      if (!existing) throw new BookApiError(404, 'Kitap taslağı bulunamadı.');
      if (existing.status !== 'Dizgi Aşamasında') throw new BookApiError(409, 'Yayına alınmış kitap bu yolla değiştirilemez.');
      if (existing.projectId !== input.projectId) throw new BookApiError(409, 'Kitap projesi değiştirilemez.');
      if (existing.revision !== input.expectedRevision) throw new BookApiError(409, 'Kitap başka bir işlemde güncellendi.');
      const draft = await prepareServerDraft(tx, input, user);
      const updated = await tx.book.updateMany({ where: {
        id: id!, createdByUserId: user.id, projectId: draft.projectId,
        status: 'Dizgi Aşamasında', revision: input.expectedRevision!
      }, data: {
        title: draft.title, layoutColumns: draft.layoutColumns, revision: { increment: 1 }
      } });
      if (updated.count !== 1) throw new BookApiError(409, 'Kitap başka bir işlemde güncellendi.');
      const chapters = await tx.bookChapter.findMany({ where: { bookId: id! }, select: { id: true } });
      const chapterIds = chapters.map((chapter: any) => chapter.id);
      if (chapterIds.length) await tx.bookQuestion.deleteMany({ where: { chapterId: { in: chapterIds } } });
      await tx.bookChapter.deleteMany({ where: { bookId: id! } });
      await writeChapters(tx, id!, draft);
      await audit(tx, user, 'BOOK_DRAFT_UPDATED', id!, existing.revision + 1);
      return { id: id!, revision: existing.revision + 1 };
    }, { isolationLevel: 'Serializable', timeout: 30000 });

    return res.status(isDetail ? 200 : 201).json({ book: result });
  } catch (error: any) {
    if (error instanceof BookApiError) return res.status(error.status).json({ error: error.message });
    if (error instanceof BookDraftValidationError) return res.status(400).json({ error: error.message });
    if (error instanceof DocxExportError) return res.status(422).json({ error: error.message });
    if (['P2034', 'P2002', 'P2025'].includes(error?.code)) {
      return res.status(409).json({ error: 'Kitap veya soru başka bir işlemde değişti. Listeyi yenileyin.' });
    }
    console.error('Book draft V2 preview operation failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
