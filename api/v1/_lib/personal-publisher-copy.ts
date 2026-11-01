import type { VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { isQuestionArchived } from './question-archive.js';
import { formatQuestionDto } from './question-dto.js';

/**
 * RELEASE-06: create a new, independent publisher draft from an author's
 * private question. The original personal question and personal sets are
 * never modified or moved into the publisher pool.
 */
export async function handlePersonalPublisherCopy(input: any, user: any, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (user.role?.code !== 'YAZAR' || !user.AuthorProfile) {
    return res.status(403).json({ error: 'Bu işlem yalnız soru sahibi yazara açıktır.' });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['action', 'sourceQuestionId', 'expectedUpdatedAt'].includes(key))) {
    return res.status(400).json({ error: 'Kopyalama isteği geçersiz.' });
  }
  const sourceQuestionId = input.sourceQuestionId;
  const expectedUpdatedAt = input.expectedUpdatedAt;
  if (!Number.isSafeInteger(sourceQuestionId) || sourceQuestionId <= 0 ||
      typeof expectedUpdatedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(expectedUpdatedAt) ||
      !Number.isFinite(Date.parse(expectedUpdatedAt))) {
    return res.status(400).json({ error: 'Geçerli soru kimliği ve son kayıt sürümü gerekli.' });
  }

  // Never disclose another author's private question, including its existence.
  const owned = await prisma.question.findFirst({
    where: {
      id: sourceQuestionId, authorUserId: user.id, isPersonal: true,
      projectId: null, taskId: null
    },
    select: { id: true, status: true, updatedAt: true }
  });
  if (!owned) return res.status(404).json({ error: 'Kişisel soru bulunamadı.' });
  if (owned.status !== 'TASLAK') return res.status(409).json({ error: 'Yalnız kişisel taslak kopyalanabilir.' });
  if (owned.updatedAt.toISOString() !== expectedUpdatedAt) {
    return res.status(409).json({ error: 'Soru başka bir yerde değişti. Güncel sürümü açın.' });
  }
  if (await isQuestionArchived(sourceQuestionId)) {
    return res.status(409).json({ error: 'Arşivlenmiş soru kopyalanamaz.' });
  }

  let result;
  try {
    result = await prisma.$transaction(async tx => {
      // Reconfirm scope and version inside the write transaction.
      const source = await tx.question.findFirst({
        where: {
          id: sourceQuestionId, authorUserId: user.id, isPersonal: true,
          projectId: null, taskId: null, status: 'TASLAK',
          updatedAt: new Date(expectedUpdatedAt)
        },
        include: { assets: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } }
      });
      if (!source) throw new Error('RELEASE06_STALE_SOURCE');

      // Serialize concurrent clicks for this source within PostgreSQL.
      // No migration or permanent lock table is required.
      // pg_advisory_xact_lock returns PostgreSQL void; Prisma/adapter-pg cannot deserialize void.
      // Return a boolean expression instead, retaining the transaction-scoped lock.
      await tx.$queryRaw`SELECT (pg_advisory_xact_lock(17006, ${sourceQuestionId}) IS NULL) AS lock_result`;

      // Find an earlier publisher copy, including copies made before this
      // idempotency fix. Audit content is only a candidate index: parse it and
      // re-authorize the destination question before returning anything.
      const history = await tx.activityLog.findMany({
        where: {
          entityType: 'Question',
          action: 'QUESTION_PERSONAL_COPIED_TO_PUBLISHER',
          details: { contains: '"sourceQuestionId":' + sourceQuestionId + ',' }
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: { entityId: true, details: true }
      });
      for (const log of history) {
        if (!Number.isSafeInteger(log.entityId) || !log.details) continue;
        let provenance: any;
        try { provenance = JSON.parse(log.details); } catch { continue; }
        if (provenance.sourceQuestionId !== sourceQuestionId) continue;
        const existing = await tx.question.findFirst({
          where: {
            id: log.entityId!, authorUserId: user.id,
            isPersonal: false
          },
          include: {
            authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
            project: true,
            assets: { orderBy: { sortOrder: 'asc' } }
          }
        });
        if (existing) return { question: existing, reused: true };
      }

      const created = await tx.question.create({
        data: {
          authorUserId: user.id,
          content: source.content,
          imageUrl: source.imageUrl,
          grade: source.grade,
          objectiveCode: source.objectiveCode,
          difficulty: source.difficulty,
          options: source.options,
          correctAnswer: source.correctAnswer,
          questionType: source.questionType,
          optionCount: source.optionCount,
          booleanAnswer: source.booleanAnswer,
          modelAnswer: source.modelAnswer,
          scoringRubric: source.scoringRubric,
          evaluationCriteria: source.evaluationCriteria,
          explanation: source.explanation,
          isPersonal: false,
          personalSubject: null, personalTopic: null,
          projectId: null, taskId: null,
          status: 'TASLAK', editorNote: null,
          assets: source.assets.length ? {
            create: source.assets.map(asset => ({
              placement: asset.placement, assetType: asset.assetType,
              url: asset.url, title: asset.title, altText: asset.altText,
              sortOrder: asset.sortOrder
            }))
          } : undefined
        },
        include: {
          authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
          project: true,
          assets: { orderBy: { sortOrder: 'asc' } }
        }
      });

      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: 'QUESTION_PERSONAL_COPIED_TO_PUBLISHER',
          entityType: 'Question', entityId: created.id,
          details: JSON.stringify({
            sourceQuestionId, status: 'TASLAK',
            privateOriginalPreserved: true
          })
        }
      });
      return { question: created, reused: false };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'RELEASE06_STALE_SOURCE') {
      return res.status(409).json({ error: 'Soru sürümü değişti. Kopyalama yapılmadı.' });
    }
    throw error;
  }
  // Not submitted for review. No approval, Book, Payment or royalty writes.
  return res.status(result.reused ? 200 : 201).json({
    ...formatQuestionDto(result.question),
    existingCopy: result.reused
  });
}
