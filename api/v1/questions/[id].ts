import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { formatQuestionDto } from '../_lib/question-dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role.code !== 'YAZAR') {
    return res.status(403).json({ error: 'Only YAZAR can edit' });
  }

  if (!user.AuthorProfile) {
    return res.status(403).json({ error: 'AuthorProfile required' });
  }

  const idParam = req.query.id as string;
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });

  const question = await prisma.question.findUnique({
    where: { id }
  });

  if (!question) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (question.authorUserId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (question.status !== 'TASLAK' && question.status !== 'REVIZYON') {
    return res.status(409).json({ error: 'Question is locked' });
  }

  const payloadKeys = Object.keys(req.body || {});
  const protectedFields = ['id', 'authorUserId', 'status', 'editorNote', 'createdAt', 'updatedAt'];
  if (payloadKeys.some(k => protectedFields.includes(k))) {
    return res.status(400).json({ error: 'Cannot modify protected fields' });
  }

  const { content, grade, objectiveCode, difficulty, options, correctAnswer, explanation, projectId } = req.body || {};

  const updateData: any = {};

  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length < 10 || content.trim().length > 1200) {
      return res.status(400).json({ error: 'Invalid content' });
    }
    updateData.content = content.trim();
  }

  if (grade !== undefined) {
    if (typeof grade !== 'string' || grade.trim().length === 0 || grade.length > 50) {
      return res.status(400).json({ error: 'Invalid grade' });
    }
    updateData.grade = grade.trim();
  }

  if (options !== undefined) {
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ error: 'Options must be exactly 4 strings' });
    }
    const cleanOptions = options.map((o: any) => typeof o === 'string' ? o.trim() : '');
    if (cleanOptions.some((o: string) => o.length === 0 || o.length > 500)) {
      return res.status(400).json({ error: 'Invalid option length' });
    }
    updateData.options = cleanOptions;
  }

  if (correctAnswer !== undefined) {
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return res.status(400).json({ error: 'Invalid correctAnswer' });
    }
    updateData.correctAnswer = correctAnswer;
  }

  if (explanation !== undefined) {
    if (explanation !== null && (typeof explanation !== 'string' || explanation.trim().length > 600)) {
      return res.status(400).json({ error: 'Invalid explanation' });
    }
    updateData.explanation = explanation ? explanation.trim() : null;
  }

  if (objectiveCode !== undefined) {
    if (objectiveCode !== null && (typeof objectiveCode !== 'string' || objectiveCode.trim().length > 100)) {
      return res.status(400).json({ error: 'Invalid objectiveCode' });
    }
    updateData.objectiveCode = objectiveCode ? objectiveCode.trim() : null;
  }

  if (difficulty !== undefined) {
    if (difficulty !== null && (typeof difficulty !== 'string' || difficulty.trim().length > 100)) {
      return res.status(400).json({ error: 'Invalid difficulty' });
    }
    updateData.difficulty = difficulty ? difficulty.trim() : null;
  }

  if (projectId !== undefined) {
    if (projectId !== null) {
      if (typeof projectId !== 'number' || !Number.isSafeInteger(projectId) || projectId <= 0) {
        return res.status(400).json({ error: 'Invalid projectId' });
      }
      const pa = await prisma.projectAuthor.findUnique({
        where: {
          projectId_authorProfileId: {
            projectId,
            authorProfileId: user.AuthorProfile.id
          }
        }
      });
      if (!pa) return res.status(403).json({ error: 'Not assigned to this project' });
    }
    updateData.projectId = projectId;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  try {
    const updated = await prisma.$transaction(async (tx: any) => {
      const count = await tx.question.updateMany({
        where: {
          id,
          status: question.status
        },
        data: updateData
      });

      if (count.count === 0) {
        throw new Error('STALE');
      }

      const q = await tx.question.findUnique({
        where: { id },
        include: {
          authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
          project: true
        }
      });

      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: 'QUESTION_UPDATED',
          entityType: 'Question',
          entityId: q.id,
          details: JSON.stringify({ keys: Object.keys(updateData) })
        }
      });

      return q;
    });

    return res.status(200).json(formatQuestionDto(updated));
  } catch (error: any) {
    if (error.message === 'STALE') {
      return res.status(409).json({ error: 'Conflict or stale state' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
