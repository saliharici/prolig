import type { VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { exportBookDocx, DocxExportError, type DocxBook } from './book-docx.js';
import type { FrozenBookQuestionV1 } from '../../../src/publishing/book-draft-contract.js';

const LIMIT = 300;

export function parsePersonalSetInput(input: any): { title: string; questionIds: number[] } {
  if (!input || typeof input.title !== 'string' || input.title.trim().length < 3 ||
      input.title.trim().length > 120) throw new Error('SET_TITLE_INVALID');
  if (!Array.isArray(input.questionIds) || input.questionIds.length < 1 ||
      input.questionIds.length > LIMIT || input.questionIds.some((id: unknown) =>
        !Number.isSafeInteger(id) || (id as number) <= 0) ||
      new Set(input.questionIds).size !== input.questionIds.length) {
    throw new Error('SET_QUESTIONS_INVALID');
  }
  return { title: input.title.trim(), questionIds: input.questionIds };
}

function setId(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ? value as number : null;
}

export function safePersonalDocxName(title: string): string {
  const basename = title.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g,'').slice(0,70);
  return (basename || 'yazar-masasi') + '.docx';
}

export function privateQuestionSnapshot(question: any): FrozenBookQuestionV1 {
  // These checks are server-side and do not rely on client-supplied content.
  if (question.isPersonal !== true || question.status !== 'TASLAK' ||
      !question.content?.trim() || question.projectId != null || question.taskId != null)
    throw new DocxExportError('Set yalnız kişisel taslak sorulardan oluşturulabilir.');
  return {
    schemaVersion: 1,
    sourceQuestionId: question.id,
    sourceQuestionUpdatedAt: question.updatedAt.toISOString(),
    content: question.content,
    imageUrl: question.imageUrl ?? null,
    grade: question.grade ?? null,
    objectiveCode: question.objectiveCode ?? null,
    difficulty: question.difficulty ?? null,
    questionType: question.questionType ?? 'MULTIPLE_CHOICE',
    options: question.questionType && question.questionType !== 'MULTIPLE_CHOICE' ? [] : question.options,
    correctAnswer: question.correctAnswer ?? null,
    booleanAnswer: question.booleanAnswer ?? null,
    modelAnswer: question.modelAnswer ?? null,
    explanation: question.explanation ?? null,
    scoringRubric: question.scoringRubric ?? null,
    evaluationCriteria: question.evaluationCriteria ?? null,
    authorName: null,
    // P3 private PNG is intentionally never queried, fetched or embedded.
    privateGeometryAssets: [],
    assets: Array.isArray(question.assets) ? question.assets.map((a: any) => ({
      placement: a.placement, assetType: a.assetType, url: a.url,
      title: a.title ?? null, altText: a.altText ?? null, sortOrder: a.sortOrder
    })) : []
  };
}

async function ownedSet(id: number, authorUserId: number) {
  return prisma.personalQuestionSet.findFirst({
    where: { id, authorUserId },
    include: {
      items: { orderBy: { sortOrder: 'asc' }, include: {
        question: { include: { assets: { orderBy: { sortOrder: 'asc' } } } }
      } }
    }
  });
}

async function ensurePrivateOwnership(questionIds: number[], authorUserId: number) {
  const count = await prisma.question.count({
    where: { id: { in: questionIds }, authorUserId, isPersonal: true,
      projectId: null, taskId: null, status: 'TASLAK' }
  });
  if (count !== questionIds.length) throw new Error('SET_OWNERSHIP_FAILURE');
}

function publicSet(set: any) {
  return {
    id: set.id, title: set.title, createdAt: set.createdAt,
    updatedAt: set.updatedAt,
    questionIds: set.items.map((item: any) => item.questionId)
  };
}

/**
 * Handles only YAZAR actions; existing /api/v1/questions function is reused
 * to avoid exceeding Vercel Hobby function count. No publisher approval,
 * payment or royalty handler is reachable from this router.
 */
export async function handlePersonalSetAction(
  action: string, input: any, user: any, res: VercelResponse
) {
  if (user.role?.code !== 'YAZAR' || !user.AuthorProfile) {
    return res.status(403).json({ error: 'Yalnız oturum açmış yazar kendi setlerini yönetebilir.' });
  }
  const ownerId = user.id;
  try {
    if (action === 'listPersonalSets') {
      const sets = await prisma.personalQuestionSet.findMany({
        where: { authorUserId: ownerId },
        include: { items: { orderBy: { sortOrder: 'asc' }, select: { questionId: true, sortOrder: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100
      });
      return res.status(200).json(sets.map(publicSet));
    }

    if (action === 'createPersonalSet' || action === 'updatePersonalSet') {
      const value = parsePersonalSetInput(input);
      const id = action === 'updatePersonalSet' ? setId(input?.setId) : null;
      if (action === 'updatePersonalSet' && !id) return res.status(400).json({ error: 'Geçersiz soru seti kimliği.' });
      if (id && !(await ownedSet(id, ownerId))) return res.status(404).json({ error: 'Set bulunamadı.' });

      // Within one transaction, verify every item belongs to the acting writer.
      // A cross-user ID is never accepted, even when the set itself is owned.
      const result = await prisma.$transaction(async (tx: any) => {
        const rows = await tx.question.findMany({
          where: { id: { in: value.questionIds }, authorUserId: ownerId, isPersonal: true,
            status: 'TASLAK', projectId: null, taskId: null },
          select: { id: true }
        });
        if (rows.length !== value.questionIds.length) throw new Error('SET_OWNERSHIP_FAILURE');
        let itemSet;
        if (id) {
          const changed = await tx.personalQuestionSet.updateMany({
            where: { id, authorUserId: ownerId }, data: { title: value.title }
          });
          if (changed.count !== 1) throw new Error('SET_OWNERSHIP_FAILURE');
          await tx.personalQuestionSetItem.deleteMany({ where: { setId: id } });
          itemSet = id;
        } else {
          const created = await tx.personalQuestionSet.create({ data: { authorUserId: ownerId, title: value.title } });
          itemSet = created.id;
        }
        await tx.personalQuestionSetItem.createMany({ data: value.questionIds.map((questionId, sortOrder) =>
          ({ setId: itemSet, questionId, sortOrder })) });
        return itemSet;
      });
      const saved = await ownedSet(result, ownerId);
      return res.status(action === 'createPersonalSet' ? 201 : 200).json(publicSet(saved));
    }

    if (action === 'deletePersonalSet') {
      const id = setId(input?.setId);
      if (!id) return res.status(400).json({ error: 'Geçersiz set.' });
      const changed = await prisma.personalQuestionSet.deleteMany({ where: { id, authorUserId: ownerId } });
      return res.status(changed.count ? 200 : 404).json(changed.count ? { deleted: true } : { error: 'Set bulunamadı.' });
    }

    if (action === 'exportPersonalSet') {
      const id = setId(input?.setId);
      if (!id || typeof input?.includeAnswers !== 'boolean')
        return res.status(400).json({ error: 'Geçersiz Word seçimi.' });
      const set = await ownedSet(id, ownerId);
      if (!set) return res.status(404).json({ error: 'Set bulunamadı.' });
      if (!set.items.length) return res.status(409).json({ error: 'Boş soru seti dışa aktarılamaz.' });
      // Current ownership and personal status checked again at export time.
      await ensurePrivateOwnership(set.items.map(i => i.questionId), ownerId);
      const book: DocxBook = {
        id: set.id,
        title: 'Yazar Masası – ' + set.title,
        layoutColumns: 1,
        chapters: [{
          title: set.title, sortOrder: 0,
          questions: set.items.map((item, sortOrder) => ({
            sortOrder, snapshot: privateQuestionSnapshot(item.question)
          }))
        }]
      };
      const buffer = exportBookDocx(book, input.includeAnswers);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', 'attachment; filename="' + safePersonalDocxName(set.title) + '"');
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).send(buffer);
    }
    return res.status(400).json({ error: 'Bilinmeyen set işlemi.' });
  } catch (error: any) {
    if (error?.message === 'SET_TITLE_INVALID' || error?.message === 'SET_QUESTIONS_INVALID')
      return res.status(400).json({ error: 'Set adı veya soru seçimi geçersiz.' });
    if (error?.message === 'SET_OWNERSHIP_FAILURE')
      return res.status(403).json({ error: 'Yalnız kendi kişisel sorularınızı sete ekleyebilirsiniz.' });
    if (error instanceof DocxExportError) return res.status(422).json({ error: error.message });
    throw error;
  }
}
