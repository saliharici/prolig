import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { prisma } from '../../api/v1/_lib/prisma.js';
import questions from '../../api/v1/questions/index.js';
import questionDetail from '../../api/v1/questions/[id].js';
import questionWorkflow from '../../api/v1/questions/[id]/workflow.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/*
 * This suite does REAL localhost HTTP requests against the real Vercel question
 * handlers, with a valid pilot-user session cookie and REAL Neon PostgreSQL.
 * It does not execute the deployed Vercel router or a password-based login.
 *
 * Never include it in ordinary CI. Only the read-only preflight-approved
 * scripts/p2-live-http-acceptance.mjs may enable this suite.
 */
const HOST = 'ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech';
const OBJECTIVE_PREFIX = 'P2-HTTP-UAT-';
const marker = OBJECTIVE_PREFIX + randomUUID().replace(/-/g, '').slice(0, 16);
const authorEmail = 'pilot.yazar@prolig.local';
const editorEmail = 'pilot.editor@prolig.local';
const projectCode = 'PILOT-MAT-8-001';
let server: Server | undefined;
let rootUrl = '';
let authorId = 0;
let editorId = 0;
let projectId = 0;
let originalIds: number[] = [];
const idsCreated = new Set<number>();

function verifyWriteTarget() {
  if (process.env.PROLIG_P2_LIVE_WRITE_APPROVAL !== 'P2_ACCEPTANCE_ONLY' ||
      process.env.PROLIG_QUESTION_TYPES_P2 !== 'true' ||
      !process.env.AUTH_SECRET || !process.env.DATABASE_URL) {
    throw new Error('P2 test environment approval missing; no writes allowed.');
  }
  const parsed = new URL(process.env.DATABASE_URL);
  const hostname = parsed.hostname.toLowerCase().replace(/-pooler(?=\.)/, '');
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      hostname !== HOST || parsed.pathname !== '/neondb') {
    throw new Error('P2 live tests require the exact isolated Neon acceptance host.');
  }
}

function cookie(id: number): string {
  return 'prolig_session=' + jwt.sign({ sub: String(id) }, process.env.AUTH_SECRET!, {
    algorithm: 'HS256', expiresIn: '10m'
  });
}

async function request(method: string, path: string, userId: number | null, body?: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (userId) headers.cookie = cookie(userId);
  const res = await fetch(rootUrl + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, data: await res.json() as any };
}

function assertNoCollision(rows: Array<{ id: number; authorUserId: number; objectiveCode: string | null; status: string }>) {
  if (rows.some(row => row.authorUserId !== authorId ||
      row.objectiveCode !== marker ||
      !['TASLAK', 'INCELEMEDE', 'REVIZYON'].includes(row.status) ||
      originalIds.includes(row.id))) {
    throw new Error('Refusing cleanup because an unexpected record matched the test marker.');
  }
}

async function cleanSynthetic() {
  verifyWriteTarget();
  const rows = await prisma.question.findMany({
    where: { objectiveCode: marker },
    select: { id: true, authorUserId: true, objectiveCode: true, status: true }
  });
  assertNoCollision(rows);
  for (const row of rows) {
    if (!idsCreated.has(row.id)) {
      throw new Error('Refusing cleanup of an untracked question ID.');
    }
  }
  if (rows.length === 0) return;
  const cleanupIds = rows.map(row => row.id);
  const [assets, payments] = await Promise.all([
    prisma.questionAsset.count({ where: { questionId: { in: cleanupIds } } }),
    prisma.compensationEntry.count({ where: { questionId: { in: cleanupIds } } })
  ]);
  if (assets !== 0 || payments !== 0) {
    throw new Error('Refusing cleanup: a disposable test question has related assets or compensation.');
  }
  await prisma.$transaction(async tx => {
    const reread = await tx.question.findMany({
      where: { id: { in: cleanupIds } },
      select: { id: true, authorUserId: true, objectiveCode: true, status: true }
    });
    if (reread.length !== cleanupIds.length) throw new Error('Cleanup record count changed.');
    assertNoCollision(reread);
    await tx.activityLog.deleteMany({
      where: { entityType: 'Question', entityId: { in: cleanupIds } }
    });
    const deleted = await tx.question.deleteMany({
      where: {
        id: { in: cleanupIds }, objectiveCode: marker,
        authorUserId: authorId, status: { in: ['TASLAK', 'INCELEMEDE', 'REVIZYON'] }
      }
    });
    if (deleted.count !== cleanupIds.length) throw new Error('Cleanup did not delete exactly the disposable questions.');
  });
  for (const id of cleanupIds) idsCreated.delete(id);
}

beforeAll(async () => {
  verifyWriteTarget();
  // Every run verifies target identity and fixtures before any create call.
  const migration = await prisma.$queryRaw<Array<{ applied: bigint; cols: bigint }>>`SELECT (SELECT count(*) FROM public."_prisma_migrations" WHERE migration_name = '20261014120000_question_types' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied, (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='Question' AND column_name IN ('questionType','optionCount','booleanAnswer','modelAnswer','scoringRubric','evaluationCriteria')) AS cols`;
  if (Number(migration[0]?.applied) !== 1 || Number(migration[0]?.cols) !== 6) {
    throw new Error('P2 migration/columns not verified.');
  }
  const [author, editor, project] = await Promise.all([
    prisma.user.findUnique({ where: { email: authorEmail }, include: { role: true, AuthorProfile: true } }),
    prisma.user.findUnique({ where: { email: editorEmail }, include: { role: true } }),
    prisma.project.findUnique({ where: { code: projectCode } })
  ]);
  if (!author?.AuthorProfile || author.role.code !== 'YAZAR' || author.status !== 'Aktif' ||
      !editor || editor.role.code !== 'EDITOR' || editor.status !== 'Aktif' ||
      !project || project.targetGrade !== '8. Sınıf' ||
      author.AuthorProfile.branchId !== editor.editorBranchId ||
      editor.editorGrade !== '8. Sınıf' || project.branchId !== author.AuthorProfile.branchId) {
    throw new Error('P2 dedicated pilot author/editor/project fixture mismatch.');
  }
  authorId = author.id;
  editorId = editor.id;
  projectId = project.id;
  const pa = await prisma.projectAuthor.findUnique({
    where: { projectId_authorProfileId: { projectId, authorProfileId: author.AuthorProfile.id } }
  });
  if (!pa) throw new Error('Pilot author not assigned to pilot project.');
  const existing = await prisma.question.findMany({ select: { id: true } });
  originalIds = existing.map(q => q.id);
  if (await prisma.question.count({ where: { objectiveCode: { startsWith: OBJECTIVE_PREFIX } } }) !== 0) {
    throw new Error('Pre-existing HTTP acceptance markers found: manual review required.');
  }

  server = createServer(async (incoming, outgoing) => {
    try {
      const parts = new URL(incoming.url ?? '/', 'http://127.0.0.1');
      const match = parts.pathname.match(/^\/api\/v1\/questions\/([1-9]\d*)(?:\/workflow)?$/);
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks).toString('utf8');
      const body = raw ? JSON.parse(raw) : undefined;
      const req = {
        method: incoming.method, headers: incoming.headers,
        query: match ? { id: match[1] } : {}, body
      } as unknown as VercelRequest;
      const res = {
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        setHeader(key: string, val: string | string[]) { outgoing.setHeader(key, val); return this; },
        json(value: unknown) {
          outgoing.writeHead(this.statusCode, { 'content-type': 'application/json' });
          outgoing.end(JSON.stringify(value));
          return this;
        }
      } as unknown as VercelResponse;
      if (match && parts.pathname.endsWith('/workflow')) await questionWorkflow(req, res);
      else if (match) await questionDetail(req, res);
      else if (parts.pathname === '/api/v1/questions') await questions(req, res);
      else { outgoing.statusCode = 404; outgoing.end('{}'); }
    } catch {
      if (!outgoing.writableEnded) {
        outgoing.writeHead(500, { 'content-type': 'application/json' });
        outgoing.end('{"error":"Local acceptance server failure"}');
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    server!.once('error', reject);
    server!.listen(0, '127.0.0.1', resolve);
  });
  rootUrl = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
}, 20_000);

afterEach(async () => { await cleanSynthetic(); }, 20_000);

afterAll(async () => {
  try {
    // Attempt safe cleanup even if an assertion failed before afterEach.
    if (authorId) await cleanSynthetic();
    if (originalIds.length) {
      const current = await prisma.question.findMany({ select: { id: true } });
      expect(current.map(q => q.id).sort((a, b) => a - b))
        .toEqual([...originalIds].sort((a, b) => a - b));
    }
  } finally {
    if (server) await new Promise<void>(resolve => server!.close(() => resolve()));
    await prisma.$disconnect();
  }
}, 20_000);

function basePayload(partial: Record<string, unknown>) {
  return {
    objectiveCode: marker,
    content: 'P2 gerçek HTTP kabul testi: Soruyu dikkatle okuyunuz.',
    projectId, grade: '8. Sınıf', difficulty: 'ORTA',
    options: ['Bir', 'İki', 'Üç', 'Dört'], correctAnswer: 'D',
    explanation: 'Test açıklaması', assets: [],
    questionType: 'MULTIPLE_CHOICE', optionCount: 4,
    booleanAnswer: null, modelAnswer: null, scoringRubric: null, evaluationCriteria: null,
    ...partial
  };
}

async function create(payload: Record<string, unknown>) {
  const res = await request('POST', '/api/v1/questions', authorId, payload);
  expect(res.status, JSON.stringify({ error: res.data.error, phase: 'create' })).toBe(201);
  expect(res.data.status).toBe('TASLAK');
  expect(res.data.objectiveCode).toBe(marker);
  idsCreated.add(res.data.id);
  return res.data;
}

async function read(id: number) {
  const r = await request('GET', '/api/v1/questions', authorId);
  expect(r.status).toBe(200);
  const q = r.data.find((item: any) => item.id === id);
  expect(q).toBeDefined();
  return q;
}

describe('P2 live authenticated localhost API + isolated Neon PostgreSQL', () => {
  it('rejects unauthenticated access and non-author creation', async () => {
    expect((await request('GET', '/api/v1/questions', null)).status).toBe(401);
    expect((await request('POST', '/api/v1/questions', editorId, basePayload({}))).status).toBe(403);
  });

  it.each([
    {
      label: '4 choices D',
      input: {},
      patch: { content: 'P2 değiştirilen dört seçenekli gerçek soru metni.' },
      target: { correctAnswer: 'D', optionCount: 4 }
    },
    {
      label: '5 choices E',
      input: { grade: '10. Sınıf', projectId: null, optionCount: 5,
        options: ['Bir', 'İki', 'Üç', 'Dört', 'Beş'], correctAnswer: 'E' },
      patch: { content: 'P2 değiştirilen beş seçenekli gerçek soru metni.' },
      target: { correctAnswer: 'E', optionCount: 5 }
    },
    {
      label: 'true false',
      input: { questionType: 'TRUE_FALSE', optionCount: null, options: [],
        correctAnswer: null, booleanAnswer: false },
      patch: { booleanAnswer: true },
      target: { booleanAnswer: true, correctAnswer: null }
    },
    {
      label: 'open ended',
      input: { questionType: 'OPEN_ENDED', optionCount: null, options: [],
        correctAnswer: null, modelAnswer: 'İlk model cevap',
        scoringRubric: 'İlk rubrik', evaluationCriteria: 'İlk ölçüt' },
      patch: { modelAnswer: 'Yeni model cevap' },
      target: { modelAnswer: 'Yeni model cevap', scoringRubric: 'İlk rubrik', evaluationCriteria: 'İlk ölçüt' }
    }
  ])('creates → reopens → edits → submits $label', async ({ input, patch, target }) => {
    const created = await create(basePayload(input));
    const opened = await read(created.id);
    const result = await request('PATCH', '/api/v1/questions/' + created.id, authorId, {
      expectedUpdatedAt: opened.updatedAt, ...patch
    });
    expect(result.status, JSON.stringify({ error: result.data.error, phase: 'PATCH' })).toBe(200);
    const reopened = await read(created.id);
    for (const [key, value] of Object.entries(target)) {
      expect(reopened[key]).toEqual(value);
    }
    const forbidden = await request('POST', '/api/v1/questions/' + created.id + '/workflow', editorId, { action: 'submit' });
    expect(forbidden.status).toBe(403);
    const submitted = await request('POST', '/api/v1/questions/' + created.id + '/workflow', authorId, { action: 'submit' });
    expect(submitted.status, JSON.stringify({ error: submitted.data.error, phase: 'submit' })).toBe(200);
    expect((await read(created.id)).status).toBe('INCELEMEDE');

    const audit = await prisma.activityLog.findMany({ where: { entityType: 'Question', entityId: created.id } });
    expect(audit.map(row => row.action)).toContain('QUESTION_CREATED');
    expect(audit.map(row => row.action)).toContain('QUESTION_UPDATED');
    expect(audit.map(row => row.action)).toContain('QUESTION_SUBMITTED');
  });

  it('blocks incomplete open-ended submission and a stale PATCH', async () => {
    const q = await create(basePayload({
      questionType: 'OPEN_ENDED', optionCount: null, options: [], correctAnswer: null,
      modelAnswer: null, scoringRubric: 'Eksik model cevaplı rubrik'
    }));
    const before = await read(q.id);
    const stale = await request('PATCH', '/api/v1/questions/' + q.id, authorId, {
      expectedUpdatedAt: '2020-01-01T00:00:00.000Z',
      content: 'Eski oturumun değiştirmemesi gereken soru metni'
    });
    expect(stale.status).toBe(409);
    expect((await read(q.id)).content).toBe(before.content);
    const submit = await request('POST', '/api/v1/questions/' + q.id + '/workflow', authorId, { action: 'submit' });
    expect(submit.status).toBe(400);
    expect((await read(q.id)).status).toBe('TASLAK');
  });
});
