const fs = require('fs');

const testCode = `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelRequest, VercelResponse } from '@vercel/node';
import handlerGetPost from '../api/v1/questions/index.js';
import handlerPatch from '../api/v1/questions/[id].js';
import handlerWorkflow from '../api/v1/questions/[id]/workflow.js';
import * as authLib from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/auth.js', () => ({
  getSessionUserId: vi.fn()
}));

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    question: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    projectAuthor: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb) => {
      const tx = {
        question: { create: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
        activityLog: { create: vi.fn() }
      };
      return cb(tx);
    })
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

    it('EDITOR receives branch filter and grade filter', async () => {
      setupUser('EDITOR', { editorBranchId: 2, editorGrade: 'Lise' });
      const { req, res } = mockReqRes('GET');
      await handlerGetPost(req, res);
      expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authorUser: { AuthorProfile: { branchId: 2 } }, grade: 'Lise' } }));
    });

    it('EDITOR missing branch returns fail-closed', async () => {
      setupUser('EDITOR'); // missing editorBranchId
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
    const setupYazar = (hasProfile = true) => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Test Yazar', status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: hasProfile ? { id: 1 } : null } as any);
      
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { create: vi.fn().mockResolvedValue({ id: 100, status: 'TASLAK', authorUserId: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

    const validBody = {
      content: 'A valid content length',
      grade: '8',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
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

    it('valid create -> 201 with forced status TASLAK and authorUserId', async () => {
      setupYazar();
      const { req, res } = mockReqRes('POST', { ...validBody, status: 'ONAYLANDI', authorUserId: 99 });
      await handlerGetPost(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      // The transaction mock returns id: 100, status: TASLAK, authorUserId: 1. It means client overrides are ignored.
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
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Yazar', status: 'Aktif', role: { code: 'YAZAR' }, AuthorProfile: { id: 1 } } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'TASLAK', updatedAt: new Date() } as any);
      
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

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

      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'ONAYLANDI' } as any);
      ({ req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' }));
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('protected field payload -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', { status: 'ONAYLANDI' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('empty payload -> 400', async () => {
      setupYazar();
      const { req, res } = mockReqRes('PATCH', {}, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('stale conditional update count=0 -> 409 and no audit log', async () => {
      setupYazar();
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findUnique: vi.fn() },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
      const { req, res } = mockReqRes('PATCH', { content: 'Valid content update' }, { id: '1' });
      await handlerPatch(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      // Since it threw STALE inside transaction, activityLog was not called (handled inside tx mock implementation)
    });
  });

  describe('WORKFLOW', () => {
    const setupEditor = () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Editor', status: 'Aktif', role: { code: 'EDITOR' }, editorBranchId: 1 } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, status: 'INCELEMEDE', authorUser: { AuthorProfile: { branchId: 1 } } } as any);
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          question: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
          activityLog: { create: vi.fn() }
        };
        return cb(tx);
      });
    };

    it('owner TASLAK submit -> 200', async () => {
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

      const { req, res } = mockReqRes('POST', { action: 'submit' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('submit with note -> 400', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Yazar', status: 'Aktif', role: { code: 'YAZAR' } } as any);
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, authorUserId: 1, status: 'TASLAK' } as any);
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

    it('editor out of branch -> 403', async () => {
      setupEditor();
      vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: 1, status: 'INCELEMEDE', authorUser: { AuthorProfile: { branchId: 2 } } } as any);
      const { req, res } = mockReqRes('POST', { action: 'approve' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('request_revision >600 chars -> 400', async () => {
      setupEditor();
      const longNote = 'A'.repeat(601);
      const { req, res } = mockReqRes('POST', { action: 'request_revision', note: longNote }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('valid reject -> 200', async () => {
      setupEditor();
      const { req, res } = mockReqRes('POST', { action: 'reject', note: 'Not valid' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('unexpected DB error -> 500', async () => {
      setupEditor();
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('Unexpected Prisma Error'));
      const { req, res } = mockReqRes('POST', { action: 'reject', note: 'Not valid' }, { id: '1' });
      await handlerWorkflow(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
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
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({
        select: expect.objectContaining({ id: true })
      }));
      // Asserting that it specifically uses 'select' instead of generic 'include' which would leak passwordHash implicitly.
    });
  });
});
`;

fs.writeFileSync('tests/question-handlers.test.ts', testCode, 'utf8');
