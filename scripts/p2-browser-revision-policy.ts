/** Pure policy for the locally isolated P2 revision-cycle browser acceptance only.
 * Never import this into the production API. All denials are fail-closed.
 */
export const REVISION_MARKER = 'P2-UAT-REVISION-20261017';
export const REVISION_PROJECT = 'PILOT-MAT-8-001';
export const REVISION_GRADE = '8. Sınıf';
export const REVISION_AUTHOR = 'pilot.yazar@prolig.local';
export const REVISION_EDITOR = 'pilot.editor@prolig.local';

export type RevisionDecision =
  | { allowed: true; action: 'submit' | 'request_revision' }
  | { allowed: false; status: 403 | 400 | 409; reason: string };

export function validateRevisionWorkflow(input: {
  enabled: boolean;
  origin: string | undefined;
  expectedOrigin: string;
  actorId: number | undefined;
  actorRole: string | undefined;
  actorEmail: string | undefined;
  question: {
    id: number;
    authorUserId: number;
    status: string;
    grade: string | null;
    objectiveCode: string | null;
    projectId: number | null;
    questionType: string | null;
    optionCount: number | null;
    authorUser?: { email: string } | null;
    assets?: unknown[];
  } | null;
  project: { id: number; code: string; branchId: number; targetGrade: string } | null;
  authorProjectAssigned: boolean;
  editorScopeAllowed: boolean;
  body: unknown;
}): RevisionDecision {
  const deny = (reason: string): RevisionDecision => ({ allowed: false, status: 403, reason });
  if (!input.enabled || input.origin !== input.expectedOrigin) return deny('Revision acceptance mode or same-origin gate not enabled.');
  const q = input.question;
  const p = input.project;
  if (!q || !p || !input.actorId || !input.actorRole || !input.authorProjectAssigned ||
      q.projectId !== p.id || p.code !== REVISION_PROJECT || p.targetGrade !== REVISION_GRADE ||
      q.grade !== REVISION_GRADE || q.authorUser?.email !== REVISION_AUTHOR ||
      q.questionType !== 'MULTIPLE_CHOICE' || q.optionCount !== 4 ||
      (q.assets?.length ?? 0) !== 0 ||
      typeof q.objectiveCode !== 'string' ||
      (q.objectiveCode !== REVISION_MARKER && !q.objectiveCode.startsWith(REVISION_MARKER + ' '))) {
    return deny('Question is not the exact dedicated owner/project/grade/type/marker test fixture.');
  }
  if (!input.body || typeof input.body !== 'object' || Array.isArray(input.body)) {
    return { allowed: false, status: 400, reason: 'Invalid test action payload.' };
  }
  const body = input.body as Record<string, unknown>;
  if (Object.keys(body).some(key => key !== 'action' && key !== 'note')) return deny('Unexpected workflow payload fields.');
  if (body.action === 'submit') {
    if (body.note !== undefined) return deny('Test submit cannot carry an editor note.');
    if (input.actorRole !== 'YAZAR' || input.actorEmail !== REVISION_AUTHOR || input.actorId !== q.authorUserId) {
      return deny('Only the exact owning pilot author may submit.');
    }
    if (q.status !== 'TASLAK' && q.status !== 'REVIZYON') {
      return { allowed: false, status: 409, reason: 'Submission is not available for this test state.' };
    }
    return { allowed: true, action: 'submit' };
  }
  if (body.action === 'request_revision') {
    if (input.actorRole !== 'EDITOR' || input.actorEmail !== REVISION_EDITOR || !input.editorScopeAllowed) {
      return deny('Only the assigned pilot editor may request revision.');
    }
    if (q.status !== 'INCELEMEDE') {
      return { allowed: false, status: 409, reason: 'Test question must be in review for revision.' };
    }
    if (typeof body.note !== 'string' || body.note.trim().length === 0 || body.note.trim().length > 600) {
      return { allowed: false, status: 400, reason: 'Revision note must contain 1–600 characters.' };
    }
    return { allowed: true, action: 'request_revision' };
  }
  return deny('Approval, rejection and all other workflow actions are forbidden in revision UAT.');
}
