import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import projectsHandler from '../api/v1/projects/index.js';
import projectHandler from '../api/v1/projects/[id].js';
import * as currentUserLib from '../api/v1/_lib/current-user.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/current-user.js', () => ({
  getCurrentUser: vi.fn()
}));

vi.mock('../api/v1/_lib/compensation-engine.js', () => ({
  accrueQuestionApproval: vi.fn(),
  accrueProjectCoordinatorCompletion: vi.fn()
}));

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    branch: { findUnique: vi.fn() },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    authorProfile: { findMany: vi.fn() },
    projectAuthor: { createMany: vi.fn(), deleteMany: vi.fn() },
    question: { count: vi.fn() },
    task: { count: vi.fn() },
    fileRecord: { count: vi.fn() },
    payment: { count: vi.fn() },
    book: { count: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn()
  }
}));

function reqRes(method: string, body: any = {}, query: any = {}) {
  const req = { method, body, query, headers: {} } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  } as any as VercelResponse;
  return { req, res };
}

const authorAssignment = {
  authorProfileId: 3,
  authorProfile: {
    user: { id: 30, fullName: 'Erzurum Yazarı' },
    province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' }
  }
};

const projectRecord = (overrides: any = {}) => ({
  id: 10,
  title: '8. Sınıf Matematik',
  code: 'MAT-8-2027',
  projectType: 'Soru Bankası',
  coordinatorId: 1,
  progress: 10,
  deadline: new Date('2027-06-30T00:00:00.000Z'),
  status: 'Taslak',
  priority: 'Normal',
  targetGrade: '8. Sınıf',
  description: null,
  createdAt: new Date('2026-10-10T00:00:00.000Z'),
  updatedAt: new Date('2026-10-10T00:00:00.000Z'),
  branch: { id: 2, name: 'Matematik' },
  projectAuthors: [authorAssignment],
  ...overrides
});

const genel = {
  id: 1,
  fullName: 'Genel Koordinatör',
  role: { code: 'GENEL_KOORDINATOR' }
};

const il = {
  id: 1,
  fullName: 'Erzurum İl Koordinatörü',
  role: { code: 'IL_KOORDINATORU' },
  provinceId: 25
};

describe('Project management handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(prisma as any));
    vi.mocked(prisma.project.findMany).mockResolvedValue([]);
    vi.mocked(prisma.question.count).mockResolvedValue(0);
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.fileRecord.count).mockResolvedValue(0);
    vi.mocked(prisma.payment.count).mockResolvedValue(0);
    vi.mocked(prisma.book.count).mockResolvedValue(0);
  });

  it('requires authentication and coordinator role to create', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(null as any);
    let { req, res } = reqRes('POST');
    await projectsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);

    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue({ id: 5, role: { code: 'EDITOR' } } as any);
    ({ req, res } = reqRes('POST'));
    await projectsHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('creates a coordinator-owned Taslak and scoped author assignments', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(genel as any);
    vi.mocked(prisma.branch.findUnique).mockResolvedValue({ id: 2 } as any);
    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(projectRecord() as any);
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 10 } as any);
    vi.mocked(prisma.authorProfile.findMany).mockResolvedValue([{
      id: 3,
      branchId: 2,
      status: 'Aktif',
      branch: { id: 2, name: 'Matematik' },
      province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' },
      user: { id: 30, status: 'Aktif', role: { code: 'YAZAR' } }
    }] as any);

    const { req, res } = reqRes('POST', {
      title: '8. Sınıf Matematik',
      code: 'mat-8-2027',
      projectType: 'Soru Bankası',
      deadline: '2027-06-30',
      priority: 'Normal',
      targetGrade: '8. Sınıf',
      branchId: 2,
      description: 'Pilot',
      authorProfileIds: [3]
    });
    await projectsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.project.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        code: 'MAT-8-2027',
        coordinatorId: 1,
        progress: 0,
        status: 'Taslak',
        branchId: 2,
        targetGrade: '8. Sınıf'
      })
    }));
    expect(prisma.projectAuthor.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [{ projectId: 10, authorProfileId: 3 }]
    }));
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PROJECT_CREATED', entityId: 10 })
    }));
  });

  it('lets an IL coordinator read own unassigned projects through coordinatorId scope', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(il as any);
    const { req, res } = reqRes('GET');
    await projectsHandler(req, res);
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { coordinatorId: 1 },
          { projectAuthors: { some: { authorProfile: { provinceId: 25 } } } }
        ]
      }
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('blocks branch or class changes after questions are linked', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(il as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectRecord() as any);
    vi.mocked(prisma.branch.findUnique).mockResolvedValue({ id: 4 } as any);
    vi.mocked(prisma.question.count).mockResolvedValue(2);

    const { req, res } = reqRes('PATCH', { branchId: 4 }, { id: '10' });
    await projectHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ linkedQuestions: 2 }));
  });

  it('blocks removing an author who already has project history', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(il as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectRecord() as any);
    vi.mocked(prisma.question.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.task.count).mockResolvedValue(0);
    vi.mocked(prisma.fileRecord.count).mockResolvedValue(0);
    vi.mocked(prisma.payment.count).mockResolvedValue(0);

    const { req, res } = reqRes('PATCH', { authorProfileIds: [] }, { id: '10' });
    await projectHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Authors with project history cannot be removed'
    }));
  });

  it('preserves retained ProjectAuthor rows and only diffs author membership', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(genel as any);
    const secondAssignment = {
      authorProfileId: 4,
      authorProfile: {
        user: { id: 40, fullName: 'İkinci Yazar' },
        province: { id: 6, name: 'Ankara', region: 'İç Anadolu' }
      }
    };
    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(projectRecord({ projectAuthors: [authorAssignment, secondAssignment] }) as any)
      .mockResolvedValueOnce(projectRecord({ projectAuthors: [authorAssignment] }) as any);
    vi.mocked(prisma.authorProfile.findMany).mockResolvedValue([
      {
        id: 3,
        branchId: 2,
        status: 'Aktif',
        province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' },
        branch: { id: 2, name: 'Matematik' },
        user: { id: 30, status: 'Aktif', role: { code: 'YAZAR' } }
      },
      {
        id: 5,
        branchId: 2,
        status: 'Aktif',
        province: { id: 35, name: 'İzmir', region: 'Ege' },
        branch: { id: 2, name: 'Matematik' },
        user: { id: 50, status: 'Aktif', role: { code: 'YAZAR' } }
      }
    ] as any);

    const { req, res } = reqRes('PATCH', { authorProfileIds: [3, 5] }, { id: '10' });
    await projectHandler(req, res);

    expect(prisma.projectAuthor.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 10, authorProfileId: { in: [4] } }
    });
    expect(prisma.projectAuthor.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [{ projectId: 10, authorProfileId: 5 }]
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('archives a manageable project and writes audit history', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(il as any);
    vi.mocked(prisma.project.findUnique)
      .mockResolvedValueOnce(projectRecord() as any)
      .mockResolvedValueOnce(projectRecord({ status: 'Arsiv' }) as any);

    const { req, res } = reqRes('POST', { action: 'archive' }, { id: '10' });
    await projectHandler(req, res);

    expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { status: 'Arsiv' } });
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PROJECT_ARCHIVED' })
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('refuses permanent delete when historical relations exist', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(il as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectRecord({ status: 'Arsiv' }) as any);
    vi.mocked(prisma.question.count).mockResolvedValue(4);

    const { req, res } = reqRes('DELETE', {}, { id: '10' });
    await projectHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(prisma.project.delete).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Project has historical records. Archive it instead of deleting.'
    }));
  });

  it('permanently deletes an empty draft or archived project', async () => {
    vi.mocked(currentUserLib.getCurrentUser).mockResolvedValue(il as any);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(projectRecord({ status: 'Taslak', projectAuthors: [] }) as any);
    vi.mocked(prisma.project.delete).mockResolvedValue({ id: 10 } as any);

    const { req, res } = reqRes('DELETE', {}, { id: '10' });
    await projectHandler(req, res);

    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 10 } });
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PROJECT_DELETED' })
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
