import { getCurrentUser } from './current-user.js';
import { prisma } from './prisma.js';
import { canModifyQuestionGeometry } from './geometry-authorization.js';
import type { VercelRequest } from '@vercel/node';

/**
 * Server-only preflight gate for any future geometry write.
 * Does not create a presigned URL, write an asset or expose storage credentials.
 * Never trust author IDs or question state supplied by the browser.
 */
export async function verifyGeometryWriteAccess(req: VercelRequest, questionId: number) {
  if (!Number.isSafeInteger(questionId) || questionId <= 0) {
    return { allowed: false as const, reason: 'INVALID_QUESTION' as const };
  }
  const user = await getCurrentUser(req);
  if (!user) return { allowed: false as const, reason: 'UNAUTHENTICATED' as const };
  if (user.role.code !== 'YAZAR') return { allowed: false as const, reason: 'NOT_AUTHOR' as const };
  const question = await prisma.question.findFirst({
    where: { id: questionId, authorUserId: user.id },
    select: { id: true, authorUserId: true, status: true }
  });
  if (!question || !canModifyQuestionGeometry(user, question)) {
    return { allowed: false as const, reason: 'NOT_EDITABLE' as const };
  }
  return {
    allowed: true as const,
    ownerUserId: user.id,
    questionId: question.id
  };
}
