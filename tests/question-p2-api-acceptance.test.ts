import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import questionIndex from '../api/v1/questions/index.js';
import questionDetail from '../api/v1/questions/[id].js';
import questionWorkflow from '../api/v1/questions/[id]/workflow.js';
import * as auth from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';
import { buildQuestionCreateInput, buildQuestionEditPatch, normalizeQuestionOptions, restoredQuestionCorrectAnswer } from '../src/questions/edit';
import { questionTypeDraft } from '../src/questions/question-type-state';
import type { QuestionEditDraft } from '../src/questions/edit';
import type { ApiQuestion } from '../src/questions/types';

vi.mock('../api/v1/_lib/auth.js', () => {
  // Test-only bridge: old handler fixtures set getSessionUserId. The
  // additive UX03 migration initializes User.authVersion with DEFAULT 0.
  // Keep the real production session-version enforcement unchanged.
  const getSessionUserId = vi.fn<() => number | null>();
  return {
    getSessionUserId,
    getSessionClaims: vi.fn(() => {
      const userId = getSessionUserId();
      return userId == null ? null : { userId, version: 0 };
    }),
    hasCurrentSessionVersion: vi.fn((
      claims: { version: number | null } | null,
      authVersion: number | undefined,
    ) => claims !== null && claims.version !== null && claims.version === (authVersion ?? 0)),
  };
});
vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    question: { findMany: vi.fn(), findUnique: vi.fn() },
    projectAuthor: { findUnique: vi.fn() },
    activityLog: { findMany: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn()
  }
}));

let saved: any = null;
let auditActions: string[] = [];
const author = {
  id: 7, fullName: 'Test Yazarı', status: 'Aktif',
  role: { code: 'YAZAR' },
  AuthorProfile: { id: 19, branchId: 4, provinceId: 25, branch: null }
};
const previousFlag = process.env.PROLIG_QUESTION_TYPES_P2;

function call(method: string, body: unknown = undefined, id?: number) {
  const req = { method, body, query: id ? { id: String(id) } : {}, headers: {} } as unknown as VercelRequest;
  const res: any = {
    statusCode: 200, data: undefined,
    status(statusCode: number) { this.statusCode = statusCode; return this; },
    json(data: unknown) { this.data = JSON.parse(JSON.stringify(data)); return this; },
    setHeader() { return this; }
  };
  return { req, res: res as VercelResponse & { statusCode: number; data: any } };
}

function authorDraft(overrides: Partial<QuestionEditDraft> = {}): QuestionEditDraft {
  return {
    ...questionTypeDraft(),
    questionType: 'MULTIPLE_CHOICE', optionCount: 4,
    content: 'Aşağıdaki ifadelerden doğru olanı seçiniz.',
    grade: '10. Sınıf', projectId: null,
    options: ['İstanbul', 'İzmir', 'Ankara', 'Erzurum'],
    correctAnswer: 'C', explanation: 'Konu açıklaması',
    modelAnswer: '', scoringRubric: '', evaluationCriteria: '', booleanAnswer: null,
    ...overrides
  };
}

function reopen(question: ApiQuestion): QuestionEditDraft {
  return {
    ...questionTypeDraft(question),
    content: question.content, grade: question.grade ?? '',
    projectId: question.projectId, explanation: question.explanation ?? '',
    options: normalizeQuestionOptions(question.options),
    correctAnswer: restoredQuestionCorrectAnswer(question),
    assets: question.assets ?? []
  };
}

function installIsolatedPrisma() {
  vi.mocked(auth.getSessionUserId).mockReturnValue(author.id);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(author as any);
  vi.mocked(prisma.question.findUnique).mockImplementation((async () => saved) as any);
  vi.mocked(prisma.question.findMany).mockImplementation((async () => saved ? [saved] : []) as any);
  vi.mocked(prisma.activityLog.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
  vi.mocked(prisma.$transaction).mockImplementation(async (operation: any) => {
    return operation({
      question: {
        create: async ({ data }: any) => {
          saved = {
            ...data, id: 91,
            createdAt: new Date('2026-10-17T01:00:00.000Z'),
            updatedAt: new Date('2026-10-17T01:00:00.000Z'),
            authorUser: { ...author, AuthorProfile: { ...author.AuthorProfile, branch: null } },
            project: null, assets: [], imageUrl: null, editorNote: null
          };
          return saved;
        },
        updateMany: async ({ where, data }: any) => {
          if (!saved || saved.id !== where.id ||
              (where.authorUserId !== undefined && saved.authorUserId !== where.authorUserId) ||
              (where.status !== undefined && saved.status !== where.status) ||
              (where.updatedAt !== undefined && saved.updatedAt.getTime() !== where.updatedAt.getTime())) {
            return { count: 0 };
          }
          const oldRevision = saved.updatedAt.getTime();
          saved = { ...saved, ...data };
          if (data.updatedAt === undefined) saved.updatedAt = new Date(oldRevision + 1000);
          return { count: 1 };
        },
        findUnique: async () => saved
      },
      activityLog: {
        create: async ({ data }: any) => { auditActions.push(data.action); return data; }
      }
    });
  });
}

async function createQuestion(draft: QuestionEditDraft) {
  const { req, res } = call('POST', buildQuestionCreateInput(draft));
  await questionIndex(req, res);
  expect(res.statusCode).toBe(201);
  expect(res.data.status).toBe('TASLAK');
  return res.data as ApiQuestion;
}

async function readQuestion() {
  const { req, res } = call('GET');
  await questionIndex(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.data).toHaveLength(1);
  return res.data[0] as ApiQuestion;
}

describe('P2 question API acceptance - isolated mocked persistence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.PROLIG_QUESTION_TYPES_P2 = 'true';
    saved = null;
    auditActions = [];
    installIsolatedPrisma();
  });

  afterEach(() => {
    if (previousFlag === undefined) delete process.env.PROLIG_QUESTION_TYPES_P2;
    else process.env.PROLIG_QUESTION_TYPES_P2 = previousFlag;
  });

  it.each([
    {
      label: 'four-choice',
      initial: { optionCount: 4, options: ['İstanbul', 'İzmir', 'Ankara', 'Erzurum'], correctAnswer: 'D' },
      change: { content: 'Düzenlenmiş dört seçenekli soru kökü.' },
      expectedField: 'content', expectedValue: 'Düzenlenmiş dört seçenekli soru kökü.'
    },
    {
      label: 'five-choice E',
      initial: { optionCount: 5, options: ['A', 'B', 'C', 'D', 'E'], correctAnswer: 'E' },
      change: { content: 'Düzenlenmiş beş seçenekli soru kökü.' },
      expectedField: 'content', expectedValue: 'Düzenlenmiş beş seçenekli soru kökü.'
    },
    {
      label: 'true/false false',
      initial: { questionType: 'TRUE_FALSE', booleanAnswer: false },
      change: { booleanAnswer: true },
      expectedField: 'booleanAnswer', expectedValue: true
    },
    {
      label: 'open-ended',
      initial: { questionType: 'OPEN_ENDED', modelAnswer: 'İlk model cevap', scoringRubric: '5 puan', evaluationCriteria: 'İşlem doğru' },
      change: { modelAnswer: 'Güncellenmiş model cevap' },
      expectedField: 'modelAnswer', expectedValue: 'Güncellenmiş model cevap'
    }
  ] as const)('creates, reopens, patches and submits $label', async scenario => {
    const initial = authorDraft(scenario.initial as Partial<QuestionEditDraft>);
    await createQuestion(initial);
    const opened = await readQuestion();
    expect(opened.questionType).toBe(initial.questionType);
    expect(opened.optionCount).toBe(initial.questionType === 'MULTIPLE_CHOICE' ? initial.optionCount : null);
    expect(opened.booleanAnswer).toBe(initial.questionType === 'TRUE_FALSE' ? initial.booleanAnswer : null);
    expect(opened.modelAnswer).toBe(initial.questionType === 'OPEN_ENDED' ? initial.modelAnswer : null);
    expect(opened.scoringRubric).toBe(initial.questionType === 'OPEN_ENDED' ? initial.scoringRubric : null);
    expect(opened.evaluationCriteria).toBe(initial.questionType === 'OPEN_ENDED' ? initial.evaluationCriteria : null);

    const editing = reopen(opened);
    const patch = buildQuestionEditPatch(opened, { ...editing, ...scenario.change });
    expect(patch).toEqual({ expectedUpdatedAt: opened.updatedAt, [scenario.expectedField]: scenario.expectedValue });
    const { req: editReq, res: editRes } = call('PATCH', patch, opened.id);
    await questionDetail(editReq, editRes);
    expect(editRes.statusCode).toBe(200);
    const reread = await readQuestion();
    expect((reread as any)[scenario.expectedField]).toEqual(scenario.expectedValue);
    expect(reread.questionType).toEqual(opened.questionType);
    expect(reread.optionCount).toEqual(opened.optionCount);
    expect(reread.options).toEqual(opened.options);
    expect(reread.correctAnswer).toEqual(opened.correctAnswer);
    expect(reread.scoringRubric).toEqual(opened.scoringRubric);
    expect(reread.evaluationCriteria).toEqual(opened.evaluationCriteria);

    const { req: submitReq, res: submitRes } = call('POST', { action: 'submit' }, opened.id);
    await questionWorkflow(submitReq, submitRes);
    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.data.status).toBe('INCELEMEDE');
    expect((await readQuestion()).status).toBe('INCELEMEDE');
    expect(auditActions).toEqual(['QUESTION_CREATED', 'QUESTION_UPDATED', 'QUESTION_SUBMITTED']);
  });

  it('keeps incomplete OPEN_ENDED question as a draft, but blocks submission without model answer', async () => {
    const initial = authorDraft({ questionType: 'OPEN_ENDED', modelAnswer: '', scoringRubric: 'Rubrik' });
    const created = await createQuestion(initial);
    const { req, res } = call('POST', { action: 'submit' }, created.id);
    await questionWorkflow(req, res);
    expect(res.statusCode).toBe(400);
    expect((await readQuestion()).status).toBe('TASLAK');
    expect(auditActions).toEqual(['QUESTION_CREATED']);
  });

  it('rejects an outdated revision without changing the saved question', async () => {
    await createQuestion(authorDraft({ questionType: 'TRUE_FALSE', booleanAnswer: false }));
    const opened = await readQuestion();
    const initialRevision = opened.updatedAt;
    const first = buildQuestionEditPatch(opened, { ...reopen(opened), booleanAnswer: true });
    const { req: firstReq, res: firstRes } = call('PATCH', first, opened.id);
    await questionDetail(firstReq, firstRes);
    expect(firstRes.statusCode).toBe(200);
    const { req: staleReq, res: staleRes } = call('PATCH', {
      expectedUpdatedAt: initialRevision, content: 'İkinci oturumun eski değişikliği.'
    }, opened.id);
    await questionDetail(staleReq, staleRes);
    expect(staleRes.statusCode).toBe(409);
    expect((await readQuestion()).booleanAnswer).toBe(true);
    expect(auditActions).toEqual(['QUESTION_CREATED', 'QUESTION_UPDATED']);
  });
});
