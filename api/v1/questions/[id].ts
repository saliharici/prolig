import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { formatQuestionDto } from '../_lib/question-dto.js';
import { isQuestionArchived } from '../_lib/question-archive.js';
import {
  buildQuestionReadScope,
  canArchiveQuestion,
  canDeleteQuestion,
  canRestoreQuestion
} from '../_lib/question-access.js';

function questionInclude() {
  return {
    authorUser: {
      include: {
        AuthorProfile: {
          include: {
            branch: true,
            province: true
          }
        }
      }
    },
    project: true
  } as const;
}

function parseId(req: VercelRequest) {
  const idParam = req.query.id as string;
  const id = parseInt(idParam, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function findQuestionInScope(id: number, user: any) {
  const scope = buildQuestionReadScope(user);
  return prisma.question.findFirst({
    where: { AND: [{ id }, scope] },
    include: questionInclude()
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!['PATCH', 'POST', 'DELETE'].includes(req.method || '')) {
      res.setHeader('Allow', ['PATCH', 'POST', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (req.method === 'PATCH') return await handlePatch(req, res);
    return await handleLifecycle(req, res);
  } catch (error: any) {
    if (error.message === 'STALE') {
      return res.status(409).json({ error: 'Conflict or stale state' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleLifecycle(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (user.role.code === 'MUHASEBE') return res.status(403).json({ error: 'Forbidden' });

  const id = parseId(req);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  const question = await findQuestionInScope(id, user);
  if (!question) return res.status(404).json({ error: 'Not found' });

  const archived = await isQuestionArchived(id);

  if (req.method === 'POST') {
    const action = req.body?.action;

    if (action === 'archive') {
      if (archived) return res.status(200).json(formatQuestionDto(question, true));
      if (!canArchiveQuestion(question, user)) return res.status(403).json({ error: 'Archive is not allowed for this question' });

      await prisma.activityLog.create({
        data: {
          userName: user.fullName,
          action: 'QUESTION_ARCHIVED',
          entityType: 'Question',
          entityId: id,
          details: JSON.stringify({ status: question.status, authorUserId: question.authorUserId })
        }
      });

      return res.status(200).json(formatQuestionDto(question, true));
    }

    if (action === 'restore') {
      if (!archived) return res.status(200).json(formatQuestionDto(question, false));
      if (!canRestoreQuestion(question, user)) return res.status(403).json({ error: 'Restore is not allowed for this question' });

      await prisma.activityLog.create({
        data: {
          userName: user.fullName,
          action: 'QUESTION_RESTORED',
          entityType: 'Question',
          entityId: id,
          details: JSON.stringify({ status: question.status, authorUserId: question.authorUserId })
        }
      });

      return res.status(200).json(formatQuestionDto(question, false));
    }

    return res.status(400).json({ error: 'Unknown lifecycle action' });
  }

  if (!canDeleteQuestion(question, user, archived)) {
    return res.status(403).json({ error: 'Permanent deletion is not allowed for this question' });
  }

  await prisma.$transaction(async (tx: any) => {
    await tx.question.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        userName: user.fullName,
        action: 'QUESTION_DELETED',
        entityType: 'Question',
        entityId: id,
        details: JSON.stringify({
          status: question.status,
          archived,
          authorUserId: question.authorUserId,
          projectId: question.projectId
        })
      }
    });
  });

  return res.status(200).json({ deleted: true, id });
}

async function handlePatch(req: VercelRequest, res: VercelResponse) {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role.code !== 'YAZAR') {
    return res.status(403).json({ error: 'Only YAZAR can edit' });
  }

  if (!user.AuthorProfile) {
    return res.status(403).json({ error: 'AuthorProfile required' });
  }

  const id = parseId(req);
  if (!id) return res.status(400).json({ error: 'Invalid ID' });

  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) return res.status(404).json({ error: 'Not found' });

  if (question.authorUserId !== user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (await isQuestionArchived(id)) {
    return res.status(409).json({ error: 'Archived question must be restored before editing' });
  }

  if (question.status !== 'TASLAK' && question.status !== 'REVIZYON') {
    return res.status(409).json({ error: 'Question is locked' });
  }

  const payloadKeys = Object.keys(req.body || {});
  const protectedFields = ['id', 'authorUserId', 'status', 'editorNote', 'createdAt', 'updatedAt', 'isArchived'];
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

  const nextProjectId = projectId !== undefined ? projectId : question.projectId;
  const nextGrade = grade !== undefined ? updateData.grade : question.grade;

  if (projectId !== undefined) {
    if (projectId !== null && (typeof projectId !== 'number' || !Number.isSafeInteger(projectId) || projectId <= 0)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    updateData.projectId = projectId;
  }

  if (nextProjectId !== null && nextProjectId !== undefined && (projectId !== undefined || grade !== undefined)) {
    const pa = await prisma.projectAuthor.findUnique({
      where: {
        projectId_authorProfileId: {
          projectId: nextProjectId,
          authorProfileId: user.AuthorProfile.id
        }
      },
      include: { project: { select: { branchId: true, targetGrade: true } } }
    });
    if (!pa) return res.status(403).json({ error: 'Not assigned to this project' });
    if (pa.project.branchId !== user.AuthorProfile.branchId) {
      return res.status(403).json({ error: 'Project branch is outside author branch' });
    }
    if (!nextGrade || nextGrade !== pa.project.targetGrade) {
      return res.status(409).json({
        error: 'Question grade must match project target grade',
        expectedGrade: pa.project.targetGrade
      });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No editable fields provided' });
  }

  const updated = await prisma.$transaction(async (tx: any) => {
    const count = await tx.question.updateMany({
      where: {
        id,
        status: question.status,
        updatedAt: question.updatedAt
      },
      data: updateData
    });

    if (count.count === 0) throw new Error('STALE');

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
        entityId: q!.id,
        details: JSON.stringify({ keys: Object.keys(updateData) })
      }
    });

    return q;
  });

  return res.status(200).json(formatQuestionDto(updated, false));
}
