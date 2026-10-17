import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import workflow from '../api/v1/questions/[id]/workflow.js';
import * as session from '../api/v1/_lib/auth.js';
import * as compensation from '../api/v1/_lib/compensation-engine.js';
import { prisma } from '../api/v1/_lib/prisma.js';

// These are isolated in-memory handler contract tests: no Neon connection,
// no production API, no real questions and no real payment/accrual writes.
vi.mock('../api/v1/_lib/auth.js', () => ({ getSessionUserId: vi.fn() }));
vi.mock('../api/v1/_lib/compensation-engine.js', () => ({
  accrueQuestionApproval: vi.fn(async () => [])
}));
vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    question: { findUnique: vi.fn() },
    activityLog: { findFirst: vi.fn() },
    $transaction: vi.fn()
  }
}));

const author = {
  id: 7, status: 'Aktif', fullName: 'Pilot Yazar', role: { code: 'YAZAR' },
  AuthorProfile: { id: 19, branchId: 4, provinceId: 25 }
};
const editor = {
  id: 9, status: 'Aktif', fullName: 'Pilot Editör', role: { code: 'EDITOR' },
  editorBranchId: 4, branchAssignments: [{ branchId: 4 }],
  provinceId: 25, editorGrade: '8. Sınıf'
};
const outsider = { ...editor, id: 10, editorBranchId: 8, branchAssignments: [{ branchId: 8 }] };
const coordinator = { id: 20, status: 'Aktif', fullName: 'Genel Koordinatör', role: { code: 'GENEL_KOORDINATOR' } };
const userMap = new Map([author, editor, outsider, coordinator].map(user => [user.id, user]));
let saved: any;
let actorId = author.id;
let logs: Array<{ action: string; details: string }> = [];
const previousFlag = process.env.PROLIG_QUESTION_TYPES_P2;

function question(overrides: Record<string, unknown> = {}) {
  return {
    id: 900, authorUserId: author.id,
    content: 'Aşağıdaki dört seçenekten doğru olanını seçiniz.',
    questionType: 'MULTIPLE_CHOICE', optionCount: 4,
    options: ['10', '11', '12', '13'], correctAnswer: 'C',
    booleanAnswer: null, modelAnswer: null, scoringRubric: null,
    evaluationCriteria: null,
    grade: '8. Sınıf', projectId: 1,
    status: 'INCELEMEDE', editorNote: null,
    objectiveCode: 'P2-UAT-MOCK-ONLY',
    createdAt: new Date('2026-10-17T10:00:00.000Z'),
    updatedAt: new Date('2026-10-17T10:00:00.000Z'),
    authorUser: {
      ...author,
      AuthorProfile: { ...author.AuthorProfile, branch: { name: 'Matematik' }, province: { region: 'Doğu Anadolu' } }
    },
    project: { id: 1, code: 'PILOT-MAT-8-001', title: 'Test Projesi' },
    assets: [], imageUrl: null, isArchived: false,
    ...overrides
  };
}

function reqRes(action: string, note?: string) {
  const body = { action, ...(note === undefined ? {} : { note }) };
  const req = { method: 'POST', query: { id: String(saved.id) }, body, headers: {} } as unknown as VercelRequest;
  const res: any = {
    statusCode: 200, response: null,
    status(code: number) { res.statusCode = code; return res; },
    json(data: unknown) { res.response = JSON.parse(JSON.stringify(data)); return res; },
    setHeader() { return res; }
  };
  return { req, res: res as VercelResponse & { statusCode: number; response: any } };
}

async function run(actor: number, action: string, note?: string) {
  actorId = actor;
  const { req, res } = reqRes(action, note);
  await workflow(req, res);
  return res;
}

beforeEach(() => {
  vi.resetAllMocks();
  logs = [];
  saved = question();
  actorId = author.id;
  process.env.PROLIG_QUESTION_TYPES_P2 = 'true';
  vi.mocked(session.getSessionUserId).mockImplementation(() => actorId);
  vi.mocked(prisma.user.findUnique).mockImplementation((async ({ where }: any) => userMap.get(where.id) as any) as any);
  vi.mocked(prisma.question.findUnique).mockImplementation((async () => saved) as any);
  vi.mocked(prisma.activityLog.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback({
    question: {
      updateMany: async ({ where, data }: any) => {
        if (where.id !== saved.id || where.status !== saved.status) return { count: 0 };
        saved = { ...saved, ...data };
        return { count: 1 };
      },
      findUnique: async () => saved
    },
    activityLog: {
      create: async ({ data }: any) => {
        logs.push({ action: data.action, details: data.details });
        return data;
      }
    }
  }));
});
afterEach(() => {
  if (previousFlag === undefined) delete process.env.PROLIG_QUESTION_TYPES_P2;
  else process.env.PROLIG_QUESTION_TYPES_P2 = previousFlag;
});

describe('P2-E editor decision contract — mock-only / no Neon writes', () => {
  it('author submits only own draft; editor cannot submit on behalf of author', async () => {
    saved.status = 'TASLAK';
    expect((await run(editor.id, 'submit')).statusCode).toBe(403);
    expect((await run(author.id, 'submit')).statusCode).toBe(200);
    expect(saved.status).toBe('INCELEMEDE');
    expect(logs.map(l => l.action)).toEqual(['QUESTION_SUBMITTED']);
    expect(compensation.accrueQuestionApproval).not.toHaveBeenCalled();
    expect((await run(author.id, 'submit')).statusCode).toBe(409);
  });

  it('revision decision requires an editor note, notifies author and permits resubmission', async () => {
    expect((await run(editor.id, 'request_revision', '')).statusCode).toBe(400);
    expect((await run(editor.id, 'request_revision', '  Eksik çözüm adımı  ')).statusCode).toBe(200);
    expect(saved.status).toBe('REVIZYON');
    expect(saved.editorNote).toBe('Eksik çözüm adımı');
    expect(logs.map(l => l.action)).toEqual(['QUESTION_REVISION_REQUESTED']);
    expect((await run(author.id, 'submit')).statusCode).toBe(200);
    expect(saved.status).toBe('INCELEMEDE');
    expect(compensation.accrueQuestionApproval).not.toHaveBeenCalled();
  });

  it('reject requires a reason and does not create money records', async () => {
    expect((await run(editor.id, 'reject')).statusCode).toBe(400);
    expect((await run(editor.id, 'reject', '  İçerik kazanımla ilişkili değil  ')).statusCode).toBe(200);
    expect(saved.status).toBe('REDDEDILDI');
    expect(saved.editorNote).toBe('İçerik kazanımla ilişkili değil');
    expect(logs.map(l => l.action)).toEqual(['QUESTION_REJECTED']);
    expect(compensation.accrueQuestionApproval).not.toHaveBeenCalled();
  });

  it('in-scope editor approval invokes earning engine once, atomically with status and audit', async () => {
    expect((await run(editor.id, 'approve')).statusCode).toBe(200);
    expect(saved.status).toBe('ONAYLANDI');
    expect(compensation.accrueQuestionApproval).toHaveBeenCalledTimes(1);
    expect(compensation.accrueQuestionApproval).toHaveBeenCalledWith(
      expect.any(Object),
      { id: saved.id, authorUserId: author.id, projectId: 1 },
      expect.objectContaining({ id: editor.id })
    );
    expect(logs.map(l => l.action)).toEqual(['QUESTION_APPROVED']);
    expect((await run(editor.id, 'approve')).statusCode).toBe(409);
  });

  it('general coordinator approval does not bypass draft status', async () => {
    saved.status = 'TASLAK';
    expect((await run(coordinator.id, 'approve')).statusCode).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('scope denies editors of different branch, province and grade', async () => {
    expect((await run(outsider.id, 'approve')).statusCode).toBe(403);
    actorId = editor.id;
    saved.grade = '7. Sınıf';
    expect((await run(editor.id, 'approve')).statusCode).toBe(403);
    saved.grade = '8. Sınıf';
    saved.authorUser.AuthorProfile.provinceId = 34;
    expect((await run(editor.id, 'approve')).statusCode).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(compensation.accrueQuestionApproval).not.toHaveBeenCalled();
  });

  it('revise/reject note is limited to 600 characters, approve never accepts note', async () => {
    expect((await run(editor.id, 'reject', 'x'.repeat(601))).statusCode).toBe(400);
    expect((await run(editor.id, 'request_revision', 'x'.repeat(601))).statusCode).toBe(400);
    expect((await run(editor.id, 'approve', 'No hidden note')).statusCode).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cannot approve an incomplete typed multiple-choice question', async () => {
    saved.options = ['10', '', '12', '13'];
    expect((await run(editor.id, 'approve')).statusCode).toBe(400);
    expect(compensation.accrueQuestionApproval).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('cannot approve an open-ended question without a model answer', async () => {
    saved.questionType = 'OPEN_ENDED';
    saved.optionCount = null;
    saved.options = [];
    saved.correctAnswer = null;
    saved.modelAnswer = '';
    expect((await run(editor.id, 'approve')).statusCode).toBe(400);
    expect(compensation.accrueQuestionApproval).not.toHaveBeenCalled();
  });

  it('does not allow archived questions to undergo workflow decisions', async () => {
    vi.mocked(prisma.activityLog.findFirst).mockResolvedValue({ action: 'QUESTION_ARCHIVED' } as any);
    expect((await run(editor.id, 'approve')).statusCode).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks non-reviewer author decisions and unauthenticated workflow', async () => {
    expect((await run(author.id, 'approve')).statusCode).toBe(403);
    expect((await run(author.id, 'request_revision', 'revize')).statusCode).toBe(403);
    vi.mocked(session.getSessionUserId).mockReturnValue(null);
    expect((await run(editor.id, 'approve')).statusCode).toBe(401);
  });
});
