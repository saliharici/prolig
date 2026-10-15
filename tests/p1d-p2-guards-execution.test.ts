import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyP2Guards, mutationOnly, PILOT_AUTHOR_EMAIL, PILOT_PROJECT_CODE, P2_UAT_MARKER } from '../scripts/p1d-sandbox-browser-app.js';
import * as currentUserModule from '../api/v1/_lib/current-user.js';
import { prisma } from '../api/v1/_lib/prisma.js';
import questionIdHandler from '../api/v1/questions/[id].js';
import questionIndexHandler from '../api/v1/questions/index.js';
import { buildQuestionCreateInput, buildQuestionEditPatch } from '../src/questions/edit';
import { createQuestion } from '../src/questions/api';
import { htmlToLegacyMarkup } from '../src/questions/question-editor-converter';
import * as questionArchive from '../api/v1/_lib/question-archive.js';

vi.mock('../api/v1/_lib/current-user.js', () => ({
  getCurrentUser: vi.fn()
}));

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
    projectAuthor: { findUnique: vi.fn() },
    question: { findUnique: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn()
  }
}));

vi.mock('../api/v1/_lib/question-archive.js', () => ({
  isQuestionArchived: vi.fn(),
  getQuestionArchiveStateMap: vi.fn()
}));


function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.headers = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    res.body = data;
    return res;
  });
  res.setHeader = vi.fn((key: string, val: string) => {
    res.headers[key] = val;
    return res;
  });
  return res;
}

describe('P2-2E Guarded Persistence Runtime Execution', () => {
  const next = vi.fn();
  const pilotUser = {
    id: 101,
    email: PILOT_AUTHOR_EMAIL,
    fullName: 'Pilot Yazar',
    role: { code: 'YAZAR' }
  };
  const otherUser = {
    id: 202,
    email: 'baskasi@prolig.local',
    fullName: 'Yabancı Yazar',
    role: { code: 'YAZAR' }
  };
  const pilotProject = {
    id: 1,
    code: PILOT_PROJECT_CODE,
    title: 'Pilot Matematik 8'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(pilotUser as any);
  });


  describe('Route and Operation Method Restrictions', () => {
    it('blocks /workflow transitions with HTTP 403', async () => {
      const req = { path: '/api/v1/questions/12/workflow', method: 'POST', body: {} };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('TASLAK status. Workflow transitions are blocked');
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks arbitrary DELETE with HTTP 403', async () => {
      const req = { path: '/api/v1/questions/12', method: 'DELETE' };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('Arbitrary browser DELETE is blocked');
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks question archive and restore actions with HTTP 403', async () => {
      const req = { path: '/api/v1/questions/12', method: 'POST', body: { action: 'archive' } };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('Archiving and restoring are blocked');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('POST Question Creation Guards', () => {
    it('rejects typed question payloads even for approved sandbox author and project', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.project.findUnique).mockResolvedValue(pilotProject as any);
      const req = {
        path: '/api/v1/questions', method: 'POST',
        body: { projectId: 1, content: 'Korumalı test sorusu', objectiveCode: 'P2-UAT',
          questionType: 'MULTIPLE_CHOICE', optionCount: 4,
          options: ['A', 'B', 'C', 'D'], correctAnswer: 'C' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('Typed question fields are disabled');
      expect(next).not.toHaveBeenCalled();
    });
    it('rejects POST if user is not the synthetic pilot author', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(otherUser as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(otherUser as any);
      const req = {
        path: '/api/v1/questions',
        method: 'POST',
        body: { projectId: 1, objectiveCode: 'P2-UAT', content: 'Test Soru' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain(PILOT_AUTHOR_EMAIL);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects POST if projectId is missing', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      const req = {
        path: '/api/v1/questions',
        method: 'POST',
        body: { content: 'P2-UAT Soru' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('authorized synthetic project');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects POST if project is not PILOT-MAT-8-001', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.project.findUnique).mockResolvedValue({
        id: 2,
        code: 'OTHER-PROJ-001'
      } as any);

      const req = {
        path: '/api/v1/questions',
        method: 'POST',
        body: { projectId: 2, objectiveCode: 'P2-UAT', content: 'Test Soru' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain(PILOT_PROJECT_CODE);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects POST if P2-UAT ownership marker is absent in objectiveCode and content', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.project.findUnique).mockResolvedValue(pilotProject as any);

      const req = {
        path: '/api/v1/questions',
        method: 'POST',
        body: { projectId: 1, objectiveCode: 'MAT-8.1', content: 'İşaretsiz test soru metni' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('P2-UAT test ownership marker');
      expect(next).not.toHaveBeenCalled();
    });

    it('permits POST when author, project, and P2-UAT marker are valid', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.project.findUnique).mockResolvedValue(pilotProject as any);

      const req = {
        path: '/api/v1/questions',
        method: 'POST',
        body: { projectId: 1, objectiveCode: 'P2-UAT-MAT-8.1', content: '<p>Tiptap <strong>deneme</strong></p>' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('PATCH Question Modification Guards', () => {
    const existingP2Question = {
      id: 55,
      projectId: 1,
      authorUserId: 101,
      status: 'TASLAK',
      objectiveCode: 'P2-UAT-MAT-8.1',
      content: '<p>İlk metin</p>',
      authorUser: pilotUser,
      project: pilotProject
    };

    it('rejects PATCH if question does not belong to pilot author', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        ...existingP2Question,
        authorUser: otherUser
      } as any);

      const req = {
        path: '/api/v1/questions/55',
        method: 'PATCH',
        params: { id: '55' },
        body: { content: 'Yeni metin P2-UAT' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('cannot modify questions belonging to other authors');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects PATCH if question is not in TASLAK status (e.g. INCELEMEDE or ONAYLANDI)', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        ...existingP2Question,
        status: 'ONAYLANDI'
      } as any);

      const req = {
        path: '/api/v1/questions/55',
        method: 'PATCH',
        params: { id: '55' },
        body: { content: 'Yeni metin P2-UAT' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('only permits editing questions in TASLAK status');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects PATCH if request body attempts to switch projectId', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue(existingP2Question as any);

      const req = {
        path: '/api/v1/questions/55',
        method: 'PATCH',
        params: { id: '55' },
        body: { projectId: 99, content: 'Yeni metin P2-UAT' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('cannot alter project association during PATCH');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects PATCH if request body attempts to change authorUserId', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue(existingP2Question as any);

      const req = {
        path: '/api/v1/questions/55',
        method: 'PATCH',
        params: { id: '55' },
        body: { authorUserId: 999, content: 'Yeni metin P2-UAT' }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('cannot alter author during PATCH');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects PATCH if updated content and objectiveCode remove the P2-UAT marker', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue(existingP2Question as any);

      const req = {
        path: '/api/v1/questions/55',
        method: 'PATCH',
        params: { id: '55' },
        body: {
          objectiveCode: 'MAT-8.1-SADE',
          content: 'Artık işaret içermeyen metin'
        }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain('cannot remove P2-UAT ownership marker during PATCH');
      expect(next).not.toHaveBeenCalled();
    });

    it('permits valid PATCH preserving TASLAK status and P2-UAT ownership marker', async () => {
      vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue(pilotUser as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue(existingP2Question as any);

      const req = {
        path: '/api/v1/questions/55',
        method: 'PATCH',
        params: { id: '55' },
        body: {
          content: '<p>Tiptap güncellendi: <em>italik</em> P2-UAT</p>',
          expectedUpdatedAt: '2026-10-12T00:00:00.000Z'
        }
      };
      const res = createMockRes();

      await applyP2Guards(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Question Reopen and Reload Flow Verification', () => {
    it('confirms single question endpoint api/v1/questions/[id].ts rejects GET with 405 Method Not Allowed', async () => {
      const req: any = { method: 'GET', query: { id: '55' } };
      const res = createMockRes();

      await questionIdHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.body.error).toBe('Method not allowed');
      expect(res.headers.Allow).toEqual(['PATCH', 'POST', 'DELETE']);
    });
  });

  it('keeps question mutations disabled in read-only P2 mode', () => {
    const res = createMockRes();
    mutationOnly({ method: 'POST', body: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.error).toContain('read-only');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an outdated PATCH revision with HTTP 409 before any update', async () => {
    vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue({
      ...pilotUser, AuthorProfile: { id: 44, branchId: 8 }
    } as any);
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      id: 55, authorUserId: pilotUser.id, status: 'TASLAK',
      updatedAt: new Date('2026-10-13T00:00:00.000Z')
    } as any);
    vi.mocked(questionArchive.isQuestionArchived).mockResolvedValue(false);
    const res = createMockRes();
    await questionIdHandler({
      method: 'PATCH', query: { id: '55' },
      body: { content: 'Güncel olmayan düzenleme', expectedUpdatedAt: '2026-10-12T00:00:00.000Z' }
    } as any, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('serializes rich P2 form fields, passes the guard and satisfies the canonical POST contract', async () => {
    vi.mocked(currentUserModule.getCurrentUser).mockResolvedValue({
      ...pilotUser, AuthorProfile: { id: 44, branchId: 8 }
    } as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(pilotProject as any);
    vi.mocked(prisma.projectAuthor.findUnique).mockResolvedValue({
      project: { branchId: 8, targetGrade: '8. Sınıf' }
    } as any);

    const content = htmlToLegacyMarkup('<p>İstanbul’da <strong>kalın</strong> ve <em>italik</em> <u>metin</u></p><p>İkinci satır</p>');
    const explanation = htmlToLegacyMarkup('<p>Çözüm: <code>$x = \\sqrt{16}$</code></p>');
    const input = buildQuestionCreateInput({
      content, grade: '8. Sınıf', projectId: 1,
      options: ['Bir', 'İki', 'Üç', 'Dört'], correctAnswer: 'C', explanation, assets: []
    }, true);
    expect(input.objectiveCode).toBe('P2-UAT');
    expect(input.content).toContain('**kalın**');
    expect(input.content).toContain('_italik_');
    expect(input.content).toContain('<u>metin</u>');
    expect(input.content).toContain('İkinci satır');
    expect(input.explanation).toContain('$x = \\sqrt{16}$');

    const req: any = { path: '/api/v1/questions', method: 'POST', body: input };
    const guardRes = createMockRes();
    await applyP2Guards(req, guardRes, next);
    expect(next).toHaveBeenCalledOnce();
    expect(guardRes.status).not.toHaveBeenCalled();

    const create = vi.fn(async ({ data }: any) => ({
      id: 55, ...data, createdAt: new Date(), updatedAt: new Date(),
      authorUser: pilotUser, project: pilotProject, assets: []
    }));
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback({
      question: { create }, activityLog: { create: vi.fn() }
    }));
    const apiRes = createMockRes();
    await questionIndexHandler(req, apiRes);
    expect(apiRes.status).toHaveBeenCalledWith(201);
    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].data).toMatchObject({
      objectiveCode: 'P2-UAT', projectId: 1, grade: '8. Sınıf',
      options: ['Bir', 'İki', 'Üç', 'Dört'], correctAnswer: 'C', status: 'TASLAK'
    });
    expect(apiRes.body.objectiveCode).toBe('P2-UAT');
  });

  it('keeps the P1 create payload unchanged and preserves the marker on an edit patch', () => {
    const draft = {
      content: 'Test sorusu yeterince uzun', grade: '8. Sınıf', projectId: 1,
      options: ['A1', 'B1', 'C1', 'D1'], correctAnswer: 'C', explanation: '', assets: []
    };
    expect(buildQuestionCreateInput(draft).objectiveCode).toBeUndefined();
    const patch = buildQuestionEditPatch({
      ...draft, id: 55, objectiveCode: 'P2-UAT', difficulty: null, imageUrl: null,
      explanation: null, status: 'TASLAK', editorNote: null,
      createdAt: '2026-10-12T00:00:00.000Z', updatedAt: '2026-10-12T00:00:00.000Z',
      isArchived: false, author: null, project: null
    }, { ...draft, content: 'Test sorusu düzenlendi yeterince uzun' });
    expect(patch).toMatchObject({
      expectedUpdatedAt: '2026-10-12T00:00:00.000Z', content: 'Test sorusu düzenlendi yeterince uzun'
    });
    expect(patch).not.toHaveProperty('objectiveCode');
  });

  it('shows the P2 guard refusal reason instead of masking it as generic authorization', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false, status: 403,
      json: async () => ({ error: 'P2-UAT test ownership marker is required.' })
    } as Response);
    await expect(createQuestion(buildQuestionCreateInput({
      content: 'Sentetik soru yeterince uzun', grade: '8. Sınıf', projectId: 1,
      options: ['A1', 'B1', 'C1', 'D1'], correctAnswer: 'C', explanation: '', assets: []
    }))).rejects.toThrow('P2-UAT sahiplik işareti gerekli');
    fetchMock.mockRestore();
  });
});
