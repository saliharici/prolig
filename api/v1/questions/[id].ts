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

  const { content, grade, objectiveCode, difficulty, options, correctAnswer, explanation, projectId } = req.body || {};

  const updateData: any = {};

  if (content !== undefined) {
    if (typeof content !== 'string' || content.trim().length < 10 || content.trim().length > 1200) {
      return res.status(400).json({ error: 'Invalid content' });
    }
    updateData.content = content.trim();
  }

  if (grade !== undefined) {
    if (typeof grade !== 'string' || grade.length > 50) return res.status(400).json({ error: 'Invalid grade' });
    updateData.grade = grade;
  }

  if (options !== undefined) {
    if (!Array.isArray(options) || options.length !== 4 || !options.every(o => typeof o === 'string')) {
      return res.status(400).json({ error: 'Options must be exactly 4 strings' });
    }
    updateData.options = options.map((o: string) => o.trim());
  }

  if (correctAnswer !== undefined) {
    if (correctAnswer !== null && !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      return res.status(400).json({ error: 'Invalid correctAnswer' });
    }
    updateData.correctAnswer = correctAnswer;
  }

  if (explanation !== undefined) {
    if (explanation !== null && (typeof explanation !== 'string' || explanation.length > 600)) {
      return res.status(400).json({ error: 'Invalid explanation' });
    }
    updateData.explanation = explanation;
  }

  if (objectiveCode !== undefined) updateData.objectiveCode = objectiveCode;
  if (difficulty !== undefined) updateData.difficulty = difficulty;

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
    return res.status(200).json(formatQuestionDto(question));
  }

  try {
    const updated = await prisma.$transaction(async (tx: any) => {
      const q = await tx.question.update({
        where: {
          id,
          status: question.status
        },
        data: updateData,
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
  } catch (error) {
    console.error(error);
    return res.status(409).json({ error: 'Conflict or not found' });
  }
}