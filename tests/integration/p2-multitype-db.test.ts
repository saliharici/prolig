import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { prisma } from '../../api/v1/_lib/prisma.js';
import questionsHandler from '../../api/v1/questions/index.js';
import questionHandler from '../../api/v1/questions/[id].js';
import { buildQuestionCreateInput, buildQuestionEditPatch } from '../../src/questions/edit';
import type { ApiQuestion } from '../../src/questions/types';

/**
 * An isolated ephemeral PostgreSQL database is mandatory.
 * NEVER run this suite against Neon, Production, Preview or a personal DB.
 */
const isolated = process.env.PROLIG_P2_CI_ISOLATED_DB === 'true';
const target = (() => {
  try { return new URL(process.env.DATABASE_URL || ''); } catch { return null; }
})();
if (!isolated || !target || !['127.0.0.1', 'localhost'].includes(target.hostname) ||
    target.pathname !== '/prolig_p2_ci' || target.port !== '5432' ||
    process.env.PROLIG_QUESTION_TYPES_P2 !== 'true') {
  throw new Error('P2 CI isolation gate failed: expected localhost:5432/prolig_p2_ci and explicit feature flag');
}

type Reply = { statusCode: number; data: any; status: (code: number) => Reply; json: (data: any) => Reply };
const reply = (): Reply => {
  const r = { statusCode: 200, data: null as any, status(code: number) { this.statusCode = code; return this; },
    json(data: any) { this.data = data; return this; } };
  return r;
};
let userId = 0;
const request = (method: string, body?: unknown, id?: number, query: Record<string, any> = {}) => ({
  method, body, query: { ...query, ...(id ? { id: String(id) } : {}) },
  headers: { cookie: serialize('prolig_session', jwt.sign({ sub: String(userId) }, process.env.AUTH_SECRET!, { algorithm: 'HS256' })) }
}) as any;
async function create(body: Record<string, any>) {
  const res = reply();
  await questionsHandler(request('POST', body), res as any);
  expect(res.statusCode, JSON.stringify(res.data)).toBe(201);
  return res.data as ApiQuestion;
}
async function list(mode: 'active' | 'all' = 'active') {
  const res = reply();
  await questionsHandler(request('GET', undefined, undefined, mode === 'all' ? { archive: 'all' } : {}), res as any);
  expect(res.statusCode, JSON.stringify(res.data)).toBe(200);
  return res.data as ApiQuestion[];
}
async function patch(q: ApiQuestion, data: Record<string, any>) {
  const res = reply();
  await questionHandler(request('PATCH', { ...data, expectedUpdatedAt: new Date(q.updatedAt).toISOString() }, q.id), res as any);
  return res;
}

describe('P2 isolated real PostgreSQL authoring + legacy compatibility', () => {
  beforeAll(async () => {
    const role = await prisma.role.create({ data: { code: 'YAZAR', name: 'CI Test Yazarı' } });
    const province = await prisma.province.create({ data: { id: 81, code: '81', name: 'P2 CI Province', region: 'CI' } });
    const branch = await prisma.branch.create({ data: { name: 'P2 CI Matematik', category: 'CI' } });
    const user = await prisma.user.create({ data: {
      username: 'ci-p2-writer', email: 'ci-p2-writer@example.test', fullName: 'CI P2 Writer',
      roleId: role.id, status: 'Aktif'
    } });
    userId = user.id;
    await prisma.authorProfile.create({ data: {
      userId: user.id, branchId: branch.id, provinceId: province.id
    } });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it('retains pre-P2 four-choice questions as MULTIPLE_CHOICE without altering their nullable schema fields', async () => {
    const legacy = await prisma.question.create({ data: {
      authorUserId: userId, content: 'Legacy question persists after enabling P2?',
      grade: '8. Sınıf', options: ['One', 'Two', 'Three', 'Four'], correctAnswer: 'A'
    } });
    expect(legacy.questionType).toBeNull();
    const result = (await list()).find(q => q.id === legacy.id)!;
    expect(result.questionType).toBe('MULTIPLE_CHOICE');
    expect(result.optionCount).toBe(4);
    expect(result.options).toHaveLength(4);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: legacy.id } })).questionType).toBeNull();
    const edited = await patch(result, { content: 'Legacy question updated without P2 discriminator' });
    expect(edited.statusCode).toBe(200);
    expect(edited.data.questionType).toBe('MULTIPLE_CHOICE');
  });

  it('creates, lists, reopens and edits four- and five-choice questions', async () => {
    for (const [grade, count] of [['8. Sınıf', 4], ['11. Sınıf', 5]] as const) {
      const choices = ['A choice', 'B choice', 'C choice', 'D choice', 'E choice'].slice(0, count);
      const raw = buildQuestionCreateInput({
        questionType: 'MULTIPLE_CHOICE', optionCount: count, booleanAnswer: null,
        modelAnswer: null, scoringRubric: null, evaluationCriteria: null,
        content: 'New real database multiple-choice question', grade, projectId: null,
        options: choices, correctAnswer: count === 5 ? 'E' : 'D', explanation: 'Solution', assets: []
      });
      const q = await create(raw);
      expect(q.questionType).toBe('MULTIPLE_CHOICE');
      expect(q.options).toHaveLength(count);
      expect(q.correctAnswer).toBe(count === 5 ? 'E' : 'D');
      const reopened = (await list()).find(x => x.id === q.id)!;
      expect(reopened.optionCount).toBe(count);
      const payload = buildQuestionEditPatch(reopened, {
        ...raw, content: 'Edited question is still safely stored', grade, projectId: null,
        options: choices, correctAnswer: count === 5 ? 'E' : 'D', explanation: 'Revised solution'
      });
      const edited = await patch(reopened, payload);
      expect(edited.statusCode, JSON.stringify(edited.data)).toBe(200);
      expect(edited.data.questionType).toBe('MULTIPLE_CHOICE');
      expect(edited.data.options).toHaveLength(count);
      expect((await list()).find(x => x.id === q.id)?.explanation).toBe('Revised solution');
    }
  });

  it('creates, lists, reopens and edits TRUE_FALSE without fake answer options', async () => {
    const raw = buildQuestionCreateInput({
      questionType: 'TRUE_FALSE', optionCount: null, booleanAnswer: false,
      modelAnswer: null, scoringRubric: null, evaluationCriteria: null,
      content: 'Every square has exactly four equal sides.', grade: '8. Sınıf', projectId: null,
      options: [], correctAnswer: '', explanation: 'A square has four equal sides: true is correct, but this case is intentionally false for persistence.', assets: []
    });
    const created = await create(raw);
    expect(created.questionType).toBe('TRUE_FALSE');
    expect(created.booleanAnswer).toBe(false);
    expect(created.options).toEqual([]);
    expect(created.correctAnswer).toBeNull();
    const reopened = (await list()).find(q => q.id === created.id)!;
    const edited = await patch(reopened, buildQuestionEditPatch(reopened, {
      ...raw, booleanAnswer: true, content: 'Every square has exactly four equal sides.'
    }));
    expect(edited.statusCode, JSON.stringify(edited.data)).toBe(200);
    expect(edited.data.booleanAnswer).toBe(true);
    expect(edited.data.options).toEqual([]);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: created.id } })).booleanAnswer).toBe(true);
  });

  it('creates, lists, reopens and edits OPEN_ENDED with rubric and model answer', async () => {
    const raw = buildQuestionCreateInput({
      questionType: 'OPEN_ENDED', optionCount: null, booleanAnswer: null,
      modelAnswer: 'Örnek model cevap: 42', scoringRubric: 'Doğruluk: 5 puan',
      evaluationCriteria: 'Gerekçeli açıklama zorunludur.',
      content: 'Verilen denklemi çözüm adımlarıyla açıklayınız.', grade: '11. Sınıf',
      projectId: null, options: [], correctAnswer: '', explanation: 'Adımları izleyiniz.', assets: []
    });
    const created = await create(raw);
    expect(created.questionType).toBe('OPEN_ENDED');
    expect(created.options).toEqual([]);
    expect(created.correctAnswer).toBeNull();
    expect(created.modelAnswer).toBe('Örnek model cevap: 42');
    const reopened = (await list()).find(q => q.id === created.id)!;
    expect(reopened.scoringRubric).toBe('Doğruluk: 5 puan');
    const edited = await patch(reopened, buildQuestionEditPatch(reopened, {
      ...raw, scoringRubric: 'Doğruluk: 8 puan', modelAnswer: 'Yeni model cevap: 43'
    }));
    expect(edited.statusCode, JSON.stringify(edited.data)).toBe(200);
    const stored = await prisma.question.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored.scoringRubric).toBe('Doğruluk: 8 puan');
    expect(stored.modelAnswer).toBe('Yeni model cevap: 43');
    expect(stored.options).toEqual([]);
  });

  it('rejects wrong answer shape and rejected type switches without writing records', async () => {
    const before = await prisma.question.count();
    const bad = reply();
    await questionsHandler(request('POST', {
      questionType: 'TRUE_FALSE', optionCount: null, booleanAnswer: null,
      content: 'Invalid true false question structure', grade: '8. Sınıf', projectId: null,
      options: [], correctAnswer: null
    }), bad as any);
    expect(bad.statusCode).toBe(400);
    expect(await prisma.question.count()).toBe(before);
    const existing = (await list()).find(q => q.questionType === 'TRUE_FALSE')!;
    const switched = await patch(existing, { questionType: 'OPEN_ENDED', modelAnswer: 'New answer' });
    expect(switched.statusCode).toBe(409);
    expect((await prisma.question.findUniqueOrThrow({ where: { id: existing.id } })).questionType).toBe('TRUE_FALSE');
  });

  it('disables typed writes immediately when the backend feature flag is false', async () => {
    const prev = process.env.PROLIG_QUESTION_TYPES_P2;
    const before = await prisma.question.count();
    try {
      process.env.PROLIG_QUESTION_TYPES_P2 = 'false';
      const res = reply();
      await questionsHandler(request('POST', {
        content: 'Disabled true false typed question', grade: '8. Sınıf',
        projectId: null, questionType: 'TRUE_FALSE', optionCount: null,
        options: [], correctAnswer: null, booleanAnswer: true
      }), res as any);
      expect(res.statusCode).toBe(403);
      expect(await prisma.question.count()).toBe(before);
    } finally {
      process.env.PROLIG_QUESTION_TYPES_P2 = prev;
    }
  });
});