import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import handlerGetPost from '../api/v1/questions/index.js';
import handlerPatch from '../api/v1/questions/[id].js';
import handlerWorkflow from '../api/v1/questions/[id]/workflow.js';
import * as authLib from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/auth.js', () => ({
  getSessionUserId: vi.fn()
}));

vi.mock('../api/v1/_lib/compensation-engine.js', () => ({
  accrueQuestionApproval: vi.fn(),
  accrueProjectCoordinatorCompletion: vi.fn()
}));

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    question: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    projectAuthor: { findUnique: vi.fn() },
    activityLog: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn()
  }
}));

function mockReqRes(method: string, body: any = {}, query: any = {}): { req: VercelRequest, res: VercelResponse } {
  const req = { method, body, query, headers: {} } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  } as any;
  return { req, res };
}

describe('Question API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.activityLog.findFirst).mockResolvedValue(null);
  });

  describe('AUTH', () => {
    it('unauthenticated GET/POST/PATCH/workflow -> 401', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(null);
      let { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(401);

      ({ req, res } = mockReqRes('POST'));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(401);

      ({ req, res } = mockReqRes('PATCH', {}, { id: '1' }));
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(401);

      ({ req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' }));
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('inactive current user -> 401', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'Pasif' } as any);
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('POST unexpected projectAuthor lookup DB failure -> controlled 500', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: { id: 1, branchId: 1 } } as any);
      vi.mocked(prisma.projectAuthor.findUnique).mockRejectedValue(new Error('DB Error'));
      const { req, res } = mockReqRes('POST', { content: 'Valid content', grade: '8. Sınıf', options: ['A','B','C','D'], correctAnswer: 'A', projectId: 1 });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('PATCH initial question lookup DB failure -> controlled 500', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: { id: 1 } } as any);
      vi.mocked(prisma.question.findUnique).mockRejectedValue(new Error('DB Error'));
      const { req, res } = mockReqRes('PATCH', {}, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('PATCH transaction failure -> controlled 500', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: { id: 1 } } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'TASLAK' } as any);
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Tx Error'));
      const { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('workflow initial question lookup DB failure -> controlled 500', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'YAZAR' } } as any);
      vi.mocked(prisma.question.findUnique).mockRejectedValue(new Error('DB Error'));
      const { req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET', () => {
    const setupUser = (roleCode: string, extra: any = {}) => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: roleCode }, ...extra } as any);
      vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    };

    it('GENEL passes unrestricted where', async () => {
      setupUser('GENEL_KOORDINATOR');
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('YAZAR findMany receives authorUserId=current user', async () => {
      setupUser('YAZAR');
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorUserId: 1 } }));
    });

    it('BOLGE findMany receives AuthorProfile.province.region', async () => {
      setupUser('BOLGE_KOORDINATORU', { assignedRegion: 'Ege' });
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorUser: { AuthorProfile: { province: { region: 'Ege' } } } } }));
    });

    it('IL findMany receives AuthorProfile.provinceId', async () => {
      setupUser('IL_KOORDINATORU', { provinceId: 35 });
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorUser: { AuthorProfile: { provinceId: 35 } } } }));
    });

    it('EDITOR receives branch, geography and grade filters', async () => {
      setupUser('EDITOR', { editorBranchId: 2, provinceId: 34, editorGrade: 'Lise', branchAssignments: [] });
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          authorUser: { AuthorProfile: { branchId: { in: [2] }, provinceId: 34 } },
          grade: 'Lise'
        }
      }));
    });

    it('EDITOR missing branch returns fail-closed', async () => {
      setupUser('EDITOR');
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: -1 } }));
    });

    it('MUHASEBE -> 403', async () => {
      setupUser('MUHASEBE');
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('DB failure -> controlled 500', async () => {
      setupUser('YAZAR');
      vi.mocked(prisma.question.findMany).mockRejectedValue(new Error('DB Error'));
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('CREATE', () => {
    const validBody = {
      content: 'A valid content length',
      grade: '8',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    };

    const setupYazar = (hasProfile = true) => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Test Yazar', status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: hasProfile ? { id: 1, branchId: 1 } : null } as any);
      
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { create: vi.fn().mockImplementation((args: any) => ({ ...args.data, id: 100 })) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

    it('non-YAZAR -> 403', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'EDITOR' } } as any);
      const { req, res } = mockReqRes('POST', validBody);
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('YAZAR without AuthorProfile -> 403', async () => {
      setupYazar(false);
      const { req, res } = mockReqRes('POST', validBody);
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('valid create -> 201 with forced status TASLAK and authorUserId, malicious payload ignored', async () => {
      setupYazar();
      let capturedTx: any;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { create: vi.fn().mockImplementation((args: any) => { capturedTx = args.data; return { ...args.data, id: 100 }; }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });

      const { req, res } = mockReqRes('POST', { ...validBody, status: 'ONAYLANDI', authorUserId: 999 });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(capturedTx.authorUserId).toBe(1);
      expect(capturedTx.status).toBe('TASLAK');
    });

    it('successful CREATE writes ActivityLog in transaction', async () => {
      setupYazar();
      let activityLogCreated = false;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { create: vi.fn().mockReturnValue({ id: 100, status: 'TASLAK' }) },
          activityLog: { create: vi.fn().mockImplementation(() => { activityLogCreated = true; }) }
        };
        return cb(tx);
      });

      const { req, res } = mockReqRes('POST', validBody);
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(activityLogCreated).toBe(true);
    });

    it('validation errors', async () => {
      setupYazar();
      let { req, res } = mockReqRes('POST', { ...validBody, content: '' });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, grade: '' }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, options: null }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, options: ['A', 'B', 'C'] }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, options: ['A', 'B', 'C', ''] }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, correctAnswer: 'E' }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, objectiveCode: { foo: 'bar' } }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, difficulty: 123 }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('POST', { ...validBody, projectId: 0 }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('unassigned project -> 403', async () => {
      setupYazar();
      vi.mocked(prisma.projectAuthor.findUnique).mockResolvedValue(null);
      const { req, res } = mockReqRes('POST', { ...validBody, projectId: 10 });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('enforces project target grade on create', async () => {
      setupYazar();
      vi.mocked(prisma.projectAuthor.findUnique).mockResolvedValue({
        project: { branchId: 1, targetGrade: '8. Sınıf' }
      } as any);

      let { req, res } = mockReqRes('POST', { ...validBody, grade: '7. Sınıf', projectId: 10 });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Question grade must match project target grade',
        expectedGrade: '8. Sınıf'
      }));

      ({ req, res } = mockReqRes('POST', { ...validBody, grade: '8. Sınıf', projectId: 10 }));
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('null projectId accepted', async () => {
      setupYazar();
      const { req, res } = mockReqRes('POST', { ...validBody, projectId: null });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('PATCH', () => {
    const setupYazar = () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Yazar', status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: { id: 1, branchId: 1 } } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'TASLAK', updatedAt: new Date() } as any);
      
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

    it('invalid id -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', { content: 'valid' }, { id: 'invalid' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('non-YAZAR -> 403', async () => {
      setupYazar();
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'EDITOR' } } as any);
      const { req, res } = mockReqRes('PATCH', { content: 'valid' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('missing AuthorProfile -> 403', async () => {
      setupYazar();
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: null } as any);
      const { req, res } = mockReqRes('PATCH', { content: 'valid' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('missing question -> 404', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue(null);
      const { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('non-owner -> 403', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 2, status: 'TASLAK' } as any);
      const { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('TASLAK/REVIZYON owner valid edit -> 200', async () => {
      setupYazar();
      let { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(200);

      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'REVIZYON' } as any);
      ({ req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' }));
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('INCELEMEDE/ONAYLANDI/REDDEDILDI -> 409', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'INCELEMEDE' } as any);
      let { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('protected field payload -> 400', async () => {
      setupYazar();
      let { req, res } = mockReqRes('PATCH', { status: 'ONAYLANDI' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('PATCH', { authorUserId: 2 }, { id: '1' }));
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      ({ req, res } = mockReqRes('PATCH', { editorNote: 'fake' }, { id: '1' }));
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('empty payload -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', {}, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('invalid grade -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', { grade: '' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('invalid options -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', { options: ['A'] }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('invalid projectId -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', { projectId: 0 }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('enforces project target grade when editing a linked question', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({
        id: 1,
        authorUserId: 1,
        status: 'TASLAK',
        updatedAt: new Date(),
        projectId: 10,
        grade: '8. Sınıf'
      } as any);
      vi.mocked(prisma.projectAuthor.findUnique).mockResolvedValue({
        project: { branchId: 1, targetGrade: '8. Sınıf' }
      } as any);

      const { req, res } = mockReqRes('PATCH', { grade: '7. Sınıf' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Question grade must match project target grade',
        expectedGrade: '8. Sınıf'
      }));
    });

    it('unassigned project -> 403', async () => {
      setupYazar();
      vi.mocked(prisma.projectAuthor.findUnique).mockResolvedValue(null);
      const { req, res } = mockReqRes('PATCH', { projectId: 10 }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('stale conditional update count=0 -> 409 and no audit log', async () => {
      setupYazar();
      let activityLogCreated = false;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findUnique: vi.fn() },
          activityLog: { create: vi.fn().mockImplementation(() => { activityLogCreated = true; }) }
        };
        return cb(tx);
      });
      const { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(activityLogCreated).toBe(false);
    });

    it('successful PATCH creates ActivityLog', async () => {
      setupYazar();
      let activityLogCreated = false;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn().mockImplementation(() => { activityLogCreated = true; }) }
        };
        return cb(tx);
      });
      const { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(activityLogCreated).toBe(true);
    });
  });

  describe('WORKFLOW', () => {
    const setupEditor = (grade: string | undefined = undefined) => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Editor', status: 'Aktif', role: { code: 'EDITOR' }, editorBranchId: 1, provinceId: 34, editorGrade: grade, branchAssignments: [] } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, status: 'INCELEMEDE', grade: '8', authorUser: { AuthorProfile: { branchId: 1, provinceId: 34, province: { id: 34, region: 'Marmara' } } } } as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

    const setupYazar = () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Yazar', status: 'Aktif', role: { code: 'YAZAR' } } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'TASLAK' } as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

    it('owner TASLAK submit -> 200', async () => {
      setupYazar();
      const { req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('owner REVIZYON submit -> 200', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'REVIZYON' } as any);
      const { req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('non-owner submit -> 403', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 2, status: 'TASLAK' } as any);
      const { req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('owner wrong state -> 409', async () => {
      setupYazar();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'ONAYLANDI' } as any);
      const { req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('submit with note -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('POST', { action: 'submit', note: 'Spoofed note' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('editor in scope approve -> 200', async () => {
      setupEditor();
      const { req, res } = mockReqRes('POST', { action: 'approve' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('EDITOR grade mismatch -> 403', async () => {
      setupEditor('7'); // Editor handles grade 7, question is grade 8
      const { req, res } = mockReqRes('POST', { action: 'approve' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('GENEL approve -> 200', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Genel', status: 'Aktif', role: { code: 'GENEL_KOORDINATOR' } } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, status: 'INCELEMEDE' } as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = { question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) }, activityLog: { create: vi.fn() } };
        return cb(tx);
      });
      const { req, res } = mockReqRes('POST', { action: 'approve' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('approve with note -> 400', async () => {
      setupEditor();
      const { req, res } = mockReqRes('POST', { action: 'approve', note: 'x' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('request_revision empty note -> 400', async () => {
      setupEditor();
      const { req, res } = mockReqRes('POST', { action: 'request_revision', note: '   ' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('valid request_revision -> 200 stores TRIMMED editorNote', async () => {
      setupEditor();
      let capturedTx: any;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockImplementation((args: any) => { capturedTx = args.data; return { count: 1 }; }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
      const { req, res } = mockReqRes('POST', { action: 'request_revision', note: '  fix it  ' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(capturedTx.editorNote).toBe('fix it');
    });

    it('reject empty note -> 400', async () => {
      setupEditor();
      const { req, res } = mockReqRes('POST', { action: 'reject', note: '' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('reject >600 -> 400', async () => {
      setupEditor();
      const longNote = 'A'.repeat(601);
      const { req, res } = mockReqRes('POST', { action: 'reject', note: longNote }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('stale workflow transition -> 409 and creates NO audit', async () => {
      setupEditor();
      let activityLogCreated = false;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findUnique: vi.fn() },
          activityLog: { create: vi.fn().mockImplementation(() => { activityLogCreated = true; }) }
        };
        return cb(tx);
      });
      const { req, res } = mockReqRes('POST', { action: 'approve' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(activityLogCreated).toBe(false);
    });

    it('successful workflow sets correct action code in ActivityLog', async () => {
      setupEditor();
      let loggedAction = '';
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn().mockImplementation((args: any) => { loggedAction = args.data.action; }) }
        };
        return cb(tx);
      });
      const { req, res } = mockReqRes('POST', { action: 'approve' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(loggedAction).toBe('QUESTION_APPROVED');
    });
  });

  describe('METHODS', () => {
    it('unsupported method -> 405', async () => {
      const { req, res } = mockReqRes('DELETE');
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);
    });
  });

  describe('SECURITY', () => {
    it('getCurrentUser uses select to omit passwordHash', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ status: 'Aktif' } as any);
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      
      const findUniqueCall = vi.mocked(prisma.user.findUnique).mock.calls[0][0];
      expect(findUniqueCall?.select).toBeDefined();
      expect(findUniqueCall?.select).not.toHaveProperty("passwordHash");
    });
  });
});
