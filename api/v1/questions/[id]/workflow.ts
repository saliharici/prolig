import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../_lib/prisma.js';
import { getCurrentUser } from '../../_lib/current-user.js';
import { formatQuestionDto } from '../../_lib/question-dto.js';
import { canWorkflowReview } from '../../_lib/question-access.js';
import { isQuestionArchived } from '../../_lib/question-archive.js';
import { accrueQuestionApproval } from '../../_lib/compensation-engine.js';
import { validateQuestionAnswerStructure } from '../../../../shared/question-contract.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const idParam = req.query.id;
    if (typeof idParam !== 'string' || !/^[1-9][0-9]*$/.test(idParam)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const id = Number(idParam);
    if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Invalid ID' });

    const { action, note } = req.body || {};
    if (!action || typeof action !== 'string') return res.status(400).json({ error: 'Invalid action' });

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        authorUser: { include: { AuthorProfile: { include: { province: true } } } },
        assets: { orderBy: { sortOrder: 'asc' } }
      }
    });

    if (!question) {
      return res.status(404).json({ error: 'Not found' });
    }
    // A project-less question never participates in editor approval or royalty accrual.
    // Return 404 for non-owners, including coordinators, to avoid ID discovery.
    if (question.projectId === null) {
      return res.status(question.authorUserId === user.id ? 409 : 404)
        .json({ error: 'Kişisel soru yayınevi onay akışına girmez.' });
    }

    if (await isQuestionArchived(id)) {
      return res.status(409).json({ error: 'Archived question must be restored before workflow actions' });
    }

    let newStatus = '';
    let actionLog = '';
    let updateNote: string | undefined;

    if (action === 'submit') {
      if (user.role.code !== 'YAZAR' || question.authorUserId !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (question.status !== 'TASLAK' && question.status !== 'REVIZYON') {
        return res.status(409).json({ error: 'Invalid status for submit' });
      }
      if (note !== undefined) {
        return res.status(400).json({ error: 'Submit action must not contain a note' });
      }
      newStatus = 'INCELEMEDE';
      actionLog = 'QUESTION_SUBMITTED';
    } else if (action === 'approve') {
      if (!canWorkflowReview(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'INCELEMEDE') return res.status(409).json({ error: 'Invalid status for approve' });
      if (note !== undefined) {
        return res.status(400).json({ error: 'Approve action must not contain a note' });
      }
      newStatus = 'ONAYLANDI';
      actionLog = 'QUESTION_APPROVED';
    } else if (action === 'request_revision') {
      if (!canWorkflowReview(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'INCELEMEDE') return res.status(409).json({ error: 'Invalid status for revision' });
      if (!note || typeof note !== 'string' || note.trim().length === 0 || note.trim().length > 600) {
        return res.status(400).json({ error: 'A valid note is required for revision (max 600 chars)' });
      }
      updateNote = note.trim();
      newStatus = 'REVIZYON';
      actionLog = 'QUESTION_REVISION_REQUESTED';
    } else if (action === 'reject') {
      if (!canWorkflowReview(question, user)) return res.status(403).json({ error: 'Forbidden' });
      if (question.status !== 'INCELEMEDE') return res.status(409).json({ error: 'Invalid status for reject' });
      if (!note || typeof note !== 'string' || note.trim().length === 0 || note.trim().length > 600) {
        return res.status(400).json({ error: 'A valid note is required for reject (max 600 chars)' });
      }
      updateNote = note.trim();
      newStatus = 'REDDEDILDI';
      actionLog = 'QUESTION_REJECTED';
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    // Legacy rows keep their established workflow. Typed drafts may be incomplete,
    // but submission and approval require a complete type-specific answer structure.
    if (question.questionType && (action === 'submit' || action === 'approve')) {
      if (process.env.PROLIG_QUESTION_TYPES_P2 !== 'true') return res.status(403).json({ error: 'P2 soru türleri bu ortamda etkin değil.' });
      const error = validateQuestionAnswerStructure(question as any, true);
      if (error) return res.status(400).json({ error });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const updateData: any = { status: newStatus };
      if (updateNote !== undefined) {
        updateData.editorNote = updateNote;
      }

      const count = await tx.question.updateMany({
        where: { id, status: question.status },
        data: updateData
      });

      if (count.count === 0) {
        throw new Error('STALE');
      }

      const q = await tx.question.findUnique({
        where: { id },
        include: {
          authorUser: { include: { AuthorProfile: { include: { branch: true } } } },
          project: true,
          assets: { orderBy: { sortOrder: 'asc' } }
        }
      });

      if (action === 'approve') {
        await accrueQuestionApproval(tx, {
          id: q!.id,
          authorUserId: q!.authorUserId,
          projectId: q!.projectId
        }, user);
      }

      await tx.activityLog.create({
        data: {
          userName: user.fullName,
          action: actionLog,
          entityType: 'Question',
          entityId: q!.id,
          details: JSON.stringify({ from: question.status, to: newStatus })
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
