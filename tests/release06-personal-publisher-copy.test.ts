import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelResponse } from '@vercel/node';
import { prisma } from '../api/v1/_lib/prisma.js';
import { isQuestionArchived } from '../api/v1/_lib/question-archive.js';
import { handlePersonalPublisherCopy } from '../api/v1/_lib/personal-publisher-copy.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    question: { findFirst: vi.fn() },
    $transaction: vi.fn()
  }
}));
vi.mock('../api/v1/_lib/question-archive.js', () => ({
  isQuestionArchived: vi.fn()
}));

const revision = '2026-11-01T08:30:00.000Z';
const user = { id: 7, fullName: 'Release-06 Yazar', role: { code: 'YAZAR' }, AuthorProfile: { id: 12 } };
const body = { action: 'copyPersonalToPublisher', sourceQuestionId: 42, expectedUpdatedAt: revision };
function response() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() };
  return res as unknown as VercelResponse & typeof res;
}
const ownedQuestion = { id: 42, status: 'TASLAK', updatedAt: new Date(revision) };

describe('RELEASE-06 personal-to-publisher copy — minimal ownership contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isQuestionArchived).mockResolvedValue(false);
  });

  it('does not disclose or copy a question outside the author scope', async () => {
    vi.mocked(prisma.question.findFirst).mockResolvedValue(null);
    const res = response();
    await handlePersonalPublisherCopy(body, user, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(prisma.question.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 42, authorUserId: 7, isPersonal: true, projectId: null, taskId: null
      })
    }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects stale source revision without a write', async () => {
    vi.mocked(prisma.question.findFirst).mockResolvedValue({
      ...ownedQuestion, updatedAt: new Date('2026-11-01T08:31:00.000Z')
    } as any);
    const res = response();
    await handlePersonalPublisherCopy(body, user, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not copy archived personal questions', async () => {
    vi.mocked(prisma.question.findFirst).mockResolvedValue(ownedQuestion as any);
    vi.mocked(isQuestionArchived).mockResolvedValue(true);
    const res = response();
    await handlePersonalPublisherCopy(body, user, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a separate publisher draft and an audit record, never touching the original', async () => {
    vi.mocked(prisma.question.findFirst).mockResolvedValue(ownedQuestion as any);
    const source = Object.freeze({
      ...ownedQuestion,
      content: 'Aşağıdaki işlem sonucu kaçtır?',
      authorUserId: 7, isPersonal: true, projectId: null, taskId: null,
      imageUrl: null, grade: '7. Sınıf',
      objectiveCode: null, difficulty: 'Orta',
      options: ['1', '2', '3', '4'], correctAnswer: 'B',
      questionType: 'MULTIPLE_CHOICE', optionCount: 4,
      booleanAnswer: null, modelAnswer: null,
      scoringRubric: null, evaluationCriteria: null,
      explanation: null,
      assets: []
    });
    const created = {
      ...source, id: 99, isPersonal: false, status: 'TASLAK',
      authorUser: { id: 7, fullName: user.fullName, AuthorProfile: { branch: { name: 'Matematik' } } },
      project: null, assets: []
    };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
      question: {
        findFirst: vi.fn().mockResolvedValue(source),
        create: vi.fn().mockResolvedValue(created)
      },
      activityLog: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 1 })
      }
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));
    const res = response();
    await handlePersonalPublisherCopy(body, user, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(tx.question.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ authorUserId: 7, isPersonal: true, updatedAt: new Date(revision) })
    }));
    expect(tx.question.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        isPersonal: false, projectId: null, taskId: null,
        status: 'TASLAK', editorNote: null,
        authorUserId: 7, content: source.content
      })
    }));
    expect(tx.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'QUESTION_PERSONAL_COPIED_TO_PUBLISHER', entityId: 99 })
    }));
    expect(source.isPersonal).toBe(true);
    expect(prisma.question.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.activityLog.findMany).toHaveBeenCalledTimes(1);
  it('reuses an existing authorized publisher copy without creating a duplicate', async () => {
    vi.mocked(prisma.question.findFirst).mockResolvedValue(ownedQuestion as any);
    const source = {
      ...ownedQuestion, authorUserId: user.id, isPersonal: true,
      projectId: null, taskId: null, status: 'TASLAK', assets: []
    };
    const existing = {
      id: 3, authorUserId: user.id, isPersonal: false, status: 'TASLAK',
      content: 'Önceden yayınevine kopyalandı', questionType: 'MULTIPLE_CHOICE',
      assets: [], authorUser: { fullName: user.fullName, AuthorProfile: { branch: { name: 'Matematik' } } }
    };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      question: {
        findFirst: vi.fn().mockResolvedValueOnce(source).mockResolvedValueOnce(existing),
        create: vi.fn()
      },
      activityLog: {
        findMany: vi.fn().mockResolvedValue([{ entityId: 3, details: '{"sourceQuestionId":42,"status":"TASLAK","privateOriginalPreserved":true}' }]),
        create: vi.fn()
      }
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));
    const res = response();
    await handlePersonalPublisherCopy(body, user, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 3, existingCopy: true }));
    expect(tx.question.create).not.toHaveBeenCalled();
    expect(tx.activityLog.create).not.toHaveBeenCalled();
  });

  it('does not reuse a copy that does not belong to the authenticated author', async () => {
    vi.mocked(prisma.question.findFirst).mockResolvedValue(ownedQuestion as any);
    const source = {
      ...ownedQuestion, authorUserId: user.id, isPersonal: true,
      projectId: null, taskId: null, status: 'TASLAK', assets: []
    };
    const existingLog = { entityId: 18, details: '{"sourceQuestionId":42,"status":"TASLAK"}' };
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      question: {
        findFirst: vi.fn().mockResolvedValueOnce(source).mockResolvedValueOnce(null),
        create: vi.fn().mockResolvedValue({
          ...source, id: 90, isPersonal: false, status: 'TASLAK', assets: []
        })
      },
      activityLog: {
        findMany: vi.fn().mockResolvedValue([existingLog]),
        create: vi.fn()
      }
    };
    (prisma.$transaction as any).mockImplementation(async (callback: any) => callback(tx));
    const res = response();
    await handlePersonalPublisherCopy(body, user, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(tx.question.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ id: 18, authorUserId: 7, isPersonal: false })
    }));
    expect(tx.question.create).toHaveBeenCalledTimes(1);
  });
  });
});