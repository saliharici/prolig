import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { buildQuestionReadScope } from '../_lib/question-access.js';
import { formatQuestionDto } from '../_lib/question-dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role.code === 'MUHASEBE') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const where = buildQuestionReadScope(user);

  try {
    const questions = await prisma.question.findMany({
      where,
      include: {
        authorUser: {
          include: {
            AuthorProfile: {
              include: {
                branch: true
              }
            }
          }
        },
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(questions.map(formatQuestionDto));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role.code !== 'YAZAR') {
    return res.status(403).json({ error: 'Only YAZAR can create questions' });
  }

  if (!user.AuthorProfile) {
    return res.status(403).json({ error: 'AuthorProfile required' });
  }

  const { content, grade, objectiveCode, difficulty, options, correctAnswer, explanation, projectId } = req.body || {};

  if (!content || typeof content !== 'string' || content.trim().length < 10 || content.trim().length > 1200) {
    return res.status(400).json({ error: 'Invalid content' });
  }

  if (!grade || typeof grade !== 'string' || grade.length > 50) {
    return res.status(400).json({ error: 'Invalid grade' });
  }

  if (options) {
    if (!Array.isArray(options) || options.length !== 4 || !options.every(o => typeof o === 'string')) {
      return res.status(400).json({ error: 'Options must be exactly 4 strings' });
    }
  }

  if (correctAnswer && !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    return res.status(400).json({ error: 'Invalid correctAnswer' });
  }

  if (explanation && (typeof explanation !== 'string' || explanation.length > 600)) {
    return res.status(400).json({ error: 'Invalid explanation' });
  }

  if (projectId) {
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

    if (!pa) {
      return res.status(403).json({ error: 'Not assigned to this project' });
    }
  }

  try {
    const question = await prisma.$transaction(async (tx) => {
      const q = await tx.question.create({
        data: {
          content: content.trim(),
          grade,
          objectiveCode: objectiveCode || null,
          difficulty: difficulty || null,
          options: options ? options.map((o: string) => o.trim()) : [],
          correctAnswer: correctAnswer || null,
          explanation: explanation || null,
          projectId: projectId || null,
          authorUserId: user.id,
          status: 'TASLAK'
        },
        include: {
          authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
          project: true
        }
      });

      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: 'QUESTION_CREATED',
          entityType: 'Question',
          entityId: q.id,
          details: JSON.stringify({ status: 'TASLAK' })
        }
      });

      return q;
    });

    return res.status(201).json(formatQuestionDto(question));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
