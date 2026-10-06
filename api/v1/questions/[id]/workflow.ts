import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../_lib/prisma.js';
import { getCurrentUser } from '../../_lib/current-user.js';
import { formatQuestionDto } from '../../_lib/question-dto.js';
import { canWorkflowSubmit, canWorkflowReview } from '../../_lib/question-access.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const idParam = req.query.id as string;
  const id = parseInt(idParam, 10);
  if (isNaN(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });

  const { action, note } = req.body || {};
  if (!action || typeof action !== 'string') return res.status(400).json({ error: 'Invalid action' });

  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      authorUser: { include: { AuthorProfile: true } }
    }
  });

  if (!question) {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    let newStatus = '';
    let actionLog = '';

    if (action === 'submit') {
      if (!canWorkflowSubmit(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'TASLAK' && question.status !== 'REVIZYON') return res.status(409).json({ error: 'Invalid status for submit' });
      newStatus = 'INCELEMEDE';
      actionLog = 'QUESTION_SUBMITTED';
    } else if (action === 'approve') {
      if (!canWorkflowReview(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'INCELEMEDE') return res.status(409).json({ error: 'Invalid status for approve' });
      newStatus = 'ONAYLANDI';
      actionLog = 'QUESTION_APPROVED';
    } else if (action === 'request_revision') {
      if (!canWorkflowReview(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'INCELEMEDE') return res.status(409).json({ error: 'Invalid status for revision' });
      if (!note || typeof note !== 'string' || note.trim().length === 0) return res.status(400).json({ error: 'Note is required' });
      newStatus = 'REVIZYON';
      actionLog = 'QUESTION_REVISION_REQUESTED';
    } else if (action === 'reject') {
      if (!canWorkflowReview(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'INCELEMEDE') return res.status(409).json({ error: 'Invalid status for reject' });
      if (!note || typeof note !== 'string' || note.trim().length === 0) return res.status(400).json({ error: 'Note is required' });
      newStatus = 'REDDEDILDI';
      actionLog = 'QUESTION_REJECTED';
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updateData: any = { status: newStatus };
      if (note !== undefined && note !== null) {
        updateData.editorNote = note.trim();
      }

      const q = await tx.question.update({
        where: { id, status: question.status },
        data: updateData,
        include: {
          authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
          project: true
        }
      });

      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: actionLog,
          entityType: 'Question',
          entityId: q.id,
          details: JSON.stringify({ from: question.status, to: newStatus })
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