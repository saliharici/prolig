/**
 * Fail-closed ownership gate for future private geometry uploads.
 * This module grants no upload access by itself.
 */
export interface GeometryActor {
  id: number;
  role: { code: string };
  status: string;
}

export interface GeometryQuestion {
  id: number;
  authorUserId: number;
  status: string;
}

export function canModifyQuestionGeometry(actor: GeometryActor | null, question: GeometryQuestion | null): boolean {
  if (!actor || !question) return false;
  if (!Number.isSafeInteger(actor.id) || actor.id <= 0 || !Number.isSafeInteger(question.id) || question.id <= 0) return false;
  if (actor.status.toUpperCase() !== 'AKTIF') return false;
  if (question.authorUserId !== actor.id) return false;
  if (actor.role?.code !== 'YAZAR') return false;
  return ['TASLAK', 'REVIZYON', 'REDDEDILDI'].includes(question.status);
}
