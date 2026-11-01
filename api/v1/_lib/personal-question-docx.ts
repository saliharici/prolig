import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { getCurrentUser } from './current-user.js';
import { getQuestionArchiveStateMap } from './question-archive.js';
import { DocxExportError, exportBookDocx, type DocxBook } from './book-docx.js';
import type { FrozenBookQuestionV1 } from '../../../src/publishing/book-draft-contract.js';

const MAX_PERSONAL_EXPORT = 50;

/**
 * RELEASE-05 first slice: read-only export of the current author's
 * unassigned drafts. No Book, Question, ActivityLog, or royalty writes.
 *
 * This does not reclassify historical projectId=null pool questions as
 * private. A dedicated visibility model is required before claiming
 * cross-role confidentiality for newly created personal questions.
 */
export async function handlePersonalQuestionDocx(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Oturum açmanız gerekiyor.' });
  if (user.role.code !== 'YAZAR' || !user.AuthorProfile) {
    return res.status(403).json({ error: 'Bu işlem yalnız yazar hesabına açıktır.' });
  }

  const input = req.body;
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !['title', 'questionIds', 'includeAnswers'].includes(key))) {
    return res.status(400).json({ error: 'Word isteğinin alanları geçersiz.' });
  }
  const { title, questionIds, includeAnswers } = input;
  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120 ||
      !Array.isArray(questionIds) || questionIds.length < 1 ||
      questionIds.length > MAX_PERSONAL_EXPORT ||
      questionIds.some((id: unknown) => typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) ||
      new Set(questionIds).size !== questionIds.length || typeof includeAnswers !== 'boolean') {
    return res.status(400).json({ error: 'Başlık, cevap anahtarı veya 1–50 tekil soru seçimi geçersiz.' });
  }

  // Query ownership rather than trusting the browser's author/status fields.
  // In particular, assigned project/task questions cannot be exported here.
  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds as number[] }, authorUserId: user.id,
      projectId: null, taskId: null, status: 'TASLAK'
    },
    include: {
      authorUser: { select: { fullName: true } },
      assets: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
      privateGeometryAssets: { select: { id: true } }
    }
  });
  if (questions.length !== questionIds.length) {
    return res.status(404).json({ error: 'Seçilen sorulardan biri kişisel taslak kapsamınızda bulunamadı.' });
  }
  const archiveState = await getQuestionArchiveStateMap(questionIds as number[]);
  if (questions.some(question => archiveState.get(question.id) === true)) {
    return res.status(409).json({ error: 'Arşivlenmiş soru Word çıktısına eklenemez.' });
  }
  if (questions.some(question => question.privateGeometryAssets.length !== 0)) {
    return res.status(422).json({ error: 'Özel PNG çizimli soru bu Word sürümünde desteklenmiyor.' });
  }

  const byId = new Map(questions.map(question => [question.id, question]));
  const snapshots = (questionIds as number[]).map((id, index) => {
    const question = byId.get(id)!;
    const snapshot: FrozenBookQuestionV1 = {
      schemaVersion: 1,
      sourceQuestionId: question.id,
      sourceQuestionUpdatedAt: question.updatedAt.toISOString(),
      content: question.content,
      imageUrl: question.imageUrl,
      grade: question.grade,
      objectiveCode: question.objectiveCode,
      difficulty: question.difficulty,
      questionType: question.questionType ?? 'MULTIPLE_CHOICE',
      options: question.options,
      correctAnswer: question.correctAnswer,
      booleanAnswer: question.booleanAnswer,
      modelAnswer: question.modelAnswer,
      explanation: question.explanation,
      scoringRubric: question.scoringRubric,
      evaluationCriteria: question.evaluationCriteria,
      authorName: question.authorUser.fullName,
      assets: question.assets.map(asset => ({
        placement: asset.placement,
        assetType: asset.assetType,
        url: asset.url,
        title: asset.title,
        altText: asset.altText,
        sortOrder: asset.sortOrder
      }))
    };
    return { sortOrder: index, snapshot };
  });

  const book: DocxBook = {
    id: 1, title: title.trim(), layoutColumns: 1, personalUsage: true,
    chapters: [{ title: 'Sorular', sortOrder: 0, questions: snapshots }]
  };
  try {
    const document = exportBookDocx(book, includeAnswers);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="prolig-kisisel-soru-seti.docx"');
    res.setHeader('Content-Length', document.length.toString());
    return res.status(200).send(document);
  } catch (error) {
    if (error instanceof DocxExportError) {
      return res.status(422).json({ error: error.message });
    }
    throw error;
  }
}
