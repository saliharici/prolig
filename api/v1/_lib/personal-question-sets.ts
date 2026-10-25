import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { DocxExportError, exportBookDocx } from './book-docx.js';
import { isQuestionArchived } from './question-archive.js';
import type { DocxBook } from './book-docx.js';
import type { FrozenBookQuestionV1 } from '../../../src/publishing/book-draft-contract.js';

class PersonalSetError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}
const intId = (x: unknown): number | null => {
  const v = typeof x === 'string' && /^[1-9]\d*$/.test(x) ? Number(x) : x;
  return typeof v === 'number' && Number.isSafeInteger(v) && v > 0 ? v : null;
};

export function personalLibraryPreviewEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'test') return true;
  if (env.VERCEL_ENV !== 'preview' ||
      env.VERCEL_GIT_COMMIT_REF !== 'feat/core01a-private-question-library-20261025' ||
      env.PROLIG_CORE01A_ENABLED !== 'true') return false;
  try {
    const url = new URL(env.DATABASE_URL || '');
    return ['postgres:', 'postgresql:'].includes(url.protocol) &&
      url.hostname.endsWith('.neon.tech') &&
      url.pathname === '/ux02_test' &&
      env.PROLIG_CORE01A_TEST_DB_NAME === 'ux02_test';
  } catch { return false; }
}

export function validPersonalQuestionIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 80 ||
      !value.every(v => intId(v) === v) || new Set(value).size !== value.length) {
    throw new PersonalSetError(400, 'Set, 1–80 ayrı ve geçerli soru içermelidir.');
  }
  return value as number[];
}

function validatedSetBody(body: any): { title: string; questionIds: number[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(k => !['title','questionIds','expectedRevision'].includes(k))) {
    throw new PersonalSetError(400, 'Beklenmeyen set alanı.');
  }
  const title = body.title;
  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
    throw new PersonalSetError(400, 'Başlık 3–120 karakter olmalıdır.');
  }
  return { title: title.trim(), questionIds: validPersonalQuestionIds(body.questionIds) };
}

export function canUsePersonalQuestion(question: {
  authorUserId: number; projectId: number | null; status: string;
}, ownerId: number): boolean {
  return question.authorUserId === ownerId && question.projectId === null &&
    question.status === 'TASLAK';
}

async function requirePersonalQuestions(tx: any, ownerId: number, ids: number[]) {
  const questions = await tx.question.findMany({
    where: { id: { in: ids }, authorUserId: ownerId, projectId: null, status: 'TASLAK' },
    select: { id: true }
  });
  if (questions.length !== ids.length) {
    // Same response for unknown and other-user IDs to prevent enumeration.
    throw new PersonalSetError(404, 'Kişisel soruların tamamına erişilemiyor.');
  }
}

const setInclude = {
  items: { orderBy: { sortOrder: 'asc' as const },
    select: { questionId: true, sortOrder: true } }
};
async function ownerSet(id: number, userId: number) {
  return prisma.questionSet.findFirst({
    where: { id, ownerUserId: userId }, include: setInclude
  });
}
function dto(record: any) {
  return {
    id: record.id, title: record.title, revision: record.revision,
    questionIds: record.items.map((i: any) => i.questionId),
    createdAt: record.createdAt, updatedAt: record.updatedAt
  };
}

async function writeSet(req: VercelRequest, res: VercelResponse, owner: any, id: number | null) {
  const body = validatedSetBody(req.body);
  const expected = id === null ? null : intId(req.body?.expectedRevision);
  if (id !== null && !expected) throw new PersonalSetError(428, 'Güncel set revizyonu gerekli.');
  if (id === null && req.body?.expectedRevision !== undefined && req.body.expectedRevision !== null)
    throw new PersonalSetError(400, 'Yeni sette revizyon null olmalı.');
  const saved = await prisma.$transaction(async (tx: any) => {
    await requirePersonalQuestions(tx, owner.id, body.questionIds);
    let set: any;
    if (id === null) {
      const total = await tx.questionSet.count({ where: { ownerUserId: owner.id } });
      if (total >= 50) throw new PersonalSetError(409, 'En fazla 50 kişisel set kaydedilebilir.');
      set = await tx.questionSet.create({
        data: { ownerUserId: owner.id, title: body.title }
      });
    } else {
      const updated = await tx.questionSet.updateMany({
        where: { id, ownerUserId: owner.id, revision: expected! },
        data: { title: body.title, revision: { increment: 1 } }
      });
      if (updated.count !== 1) throw new PersonalSetError(409, 'Set sürümü değişti veya set bulunamadı.');
      // Replace items atomically with a freshly validated ordered list.
      await tx.questionSetItem.deleteMany({ where: { setId: id } });
      set = await tx.questionSet.findUnique({ where: { id } });
    }
    await tx.questionSetItem.createMany({
      data: body.questionIds.map((questionId, sortOrder) => ({ setId: set.id, questionId, sortOrder }))
    });
    const refreshed = await tx.questionSet.findUnique({
      where: { id: set.id }, include: setInclude
    });
    return refreshed;
  }, { isolationLevel: 'Serializable', timeout: 15000 });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(id === null ? 201 : 200).json({ set: dto(saved) });
}

function frozenPrivateQuestion(question: any): FrozenBookQuestionV1 {
  const type = question.questionType ?? 'MULTIPLE_CHOICE';
  if (!['MULTIPLE_CHOICE','TRUE_FALSE','OPEN_ENDED'].includes(type)) {
    throw new PersonalSetError(422, 'Bu soru türü Word aktarımında desteklenmiyor.');
  }
  if (question.privateGeometryAssets.length) {
    throw new PersonalSetError(422, 'Özel PNG görselleri kişisel Word çıktısına aktarılmaz.');
  }
  return {
    schemaVersion: 1,
    sourceQuestionId: question.id, sourceQuestionUpdatedAt: question.updatedAt.toISOString(),
    content: question.content, imageUrl: question.imageUrl,
    grade: question.grade, objectiveCode: question.objectiveCode, difficulty: question.difficulty,
    questionType: type, options: type === 'MULTIPLE_CHOICE' ? question.options : [],
    correctAnswer: type === 'MULTIPLE_CHOICE' ? question.correctAnswer : null,
    booleanAnswer: type === 'TRUE_FALSE' ? question.booleanAnswer : null,
    modelAnswer: type === 'OPEN_ENDED' ? question.modelAnswer : null,
    explanation: question.explanation, scoringRubric: question.scoringRubric,
    evaluationCriteria: question.evaluationCriteria,
    authorName: question.authorUser.fullName,
    assets: question.assets.map((asset: any) => ({
      placement: asset.placement, assetType: asset.assetType, url: asset.url,
      title: asset.title, altText: asset.altText, sortOrder: asset.sortOrder
    }))
  };
}

async function exportPersonalWord(req: VercelRequest, res: VercelResponse, id: number, user: any) {
  if (!['0','1'].includes(String(req.query.answers ?? '0'))) {
    throw new PersonalSetError(400, 'Cevap anahtarı tercihi geçersiz.');
  }
  const set = await ownerSet(id, user.id);
  if (!set) throw new PersonalSetError(404, 'Set bulunamadı.');
  const ids = set.items.map((i: any) => i.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: ids }, authorUserId: user.id, projectId: null, status: 'TASLAK' },
    include: { assets: { orderBy: { sortOrder: 'asc' } },
      authorUser: { select: { fullName: true } },
      privateGeometryAssets: { select: { id: true } } }
  });
  if (questions.length !== ids.length) throw new PersonalSetError(409, 'Sette artık kişisel olmayan soru var.');
  const byId = new Map(questions.map(q => [q.id, q]));
  const snapshots = ids.map((questionId: number, sortOrder: number) => ({
    sortOrder,
    snapshot: frozenPrivateQuestion(byId.get(questionId)!)
  }));
  // This is a transient in-memory DOCX input: never creates Book/BookQuestion or financial records.
  const book: DocxBook = {
    id: set.id, personal: true, title: set.title, layoutColumns: 1,
    chapters: [{ title: 'Sorular', sortOrder: 0, questions: snapshots }]
  };
  const bytes = exportBookDocx(book, req.query.answers === '1');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition',
    'attachment; filename="kisisel-set-' + id + (req.query.answers === '1' ? '-cevap-anahtari' : '-ogrenci') + '.docx"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Length', String(bytes.length));
  return res.status(200).send(bytes);
}

async function publishCopy(req: VercelRequest, res: VercelResponse, sourceId: number, user: any) {
  const projectId = intId(req.body?.projectId);
  if (!projectId || Object.keys(req.body || {}).some(k => k !== 'projectId')) {
    throw new PersonalSetError(400, 'Hedef proje zorunlu.');
  }
  const source = await prisma.question.findFirst({
    where: { id: sourceId, authorUserId: user.id, projectId: null, status: 'TASLAK' },
    include: { assets: true, privateGeometryAssets: true }
  });
  if (!source || await isQuestionArchived(sourceId)) throw new PersonalSetError(404, 'Kişisel soru bulunamadı.');
  if (source.privateGeometryAssets.length) {
    throw new PersonalSetError(422, 'Özel PNG içeren soru bu yolla gönderilemez.');
  }
  const member = await prisma.projectAuthor.findUnique({
    where: { projectId_authorProfileId: { projectId, authorProfileId: user.AuthorProfile.id } },
    include: { project: { select: { branchId: true, targetGrade: true } } }
  });
  if (!member || member.project.branchId !== user.AuthorProfile.branchId)
    throw new PersonalSetError(403, 'Bu projeye soru göndermeye yetkiniz yok.');
  if (source.grade !== member.project.targetGrade)
    throw new PersonalSetError(409, 'Projenin hedef sınıfı soruyla uyuşmuyor.');
  const target = await prisma.$transaction(async (tx: any) => {
    // A separate publisher draft, never mutate/transfer the original private record.
    const copy = await tx.question.create({
      data: {
        content: source.content, imageUrl: source.imageUrl, authorUserId: user.id,
        projectId, grade: source.grade, objectiveCode: source.objectiveCode,
        difficulty: source.difficulty, options: source.options,
        correctAnswer: source.correctAnswer, explanation: source.explanation,
        questionType: source.questionType, optionCount: source.optionCount,
        booleanAnswer: source.booleanAnswer, modelAnswer: source.modelAnswer,
        scoringRubric: source.scoringRubric, evaluationCriteria: source.evaluationCriteria,
        status: 'TASLAK',
        assets: source.assets.length ? { create: source.assets.map((asset: any) => ({
          placement: asset.placement, assetType: asset.assetType, url: asset.url,
          title: asset.title, altText: asset.altText, sortOrder: asset.sortOrder
        })) } : undefined
      }
    });
    await tx.activityLog.create({ data: {
      userName: user.fullName, action: 'PERSONAL_QUESTION_PUBLISHER_COPY',
      entityType: 'Question', entityId: copy.id,
      details: JSON.stringify({ originalQuestionId: sourceId, targetProjectId: projectId })
    } });
    return copy;
  });
  return res.status(201).json({ questionId: target.id, status: 'TASLAK',
    sourceQuestionId: sourceId, submittedForReview: false, royaltiesAccrued: false });
}

export async function handlePersonalQuestionSets(
  req: VercelRequest, res: VercelResponse, user: any, action: string
) {
  res.setHeader('Cache-Control', 'no-store');
  if (!personalLibraryPreviewEnabled()) return res.status(404).json({ error: 'Not found' });
  if (user?.role?.code !== 'YAZAR' || !user?.AuthorProfile)
    return res.status(403).json({ error: 'Only authorized authors may use personal sets' });
  const id = intId(req.query.id);
  try {
    if (action === 'personalQuestionPublishCopy') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      if (!id) throw new PersonalSetError(400, 'Soru kimliği geçersiz.');
      return await publishCopy(req, res, id, user);
    }
    if (action === 'personalQuestionSets') {
      if (req.method === 'GET') {
        const records = await prisma.questionSet.findMany({
          where: { ownerUserId: user.id }, include: setInclude,
          orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 50
        });
        return res.status(200).json({ sets: records.map(dto) });
      }
      if (req.method === 'POST') return await writeSet(req, res, user, null);
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!id) throw new PersonalSetError(400, 'Set kimliği geçersiz.');
    if (action === 'personalQuestionSetDocx') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      return await exportPersonalWord(req, res, id, user);
    }
    if (action === 'personalQuestionSet') {
      if (req.method === 'PATCH') return await writeSet(req, res, user, id);
      if (req.method === 'GET') {
        const set = await ownerSet(id, user.id);
        return set ? res.status(200).json({ set: dto(set) }) :
          res.status(404).json({ error: 'Set bulunamadı.' });
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    if (error instanceof PersonalSetError || error instanceof DocxExportError) {
      return res.status(error instanceof PersonalSetError ? error.status : 422)
        .json({ error: error.message });
    }
    // Avoid exposing storage/Prisma/SQL details to the client.
    return res.status(503).json({ error: 'Kişisel set işlemi tamamlanamadı.' });
  }
}
