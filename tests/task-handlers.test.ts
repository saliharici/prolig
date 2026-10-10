import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleTaskAction } from '../api/v1/_lib/task-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    authorProfile: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
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
  } as unknown as VercelResponse;
  return { req, res };
}

const project = {
  id: 10,
  title: '8. Sınıf Matematik',
  code: 'MAT-8',
  projectType: 'Soru Bankası',
  coordinatorId: 1,
  progress: 0,
  deadline: new Date('2027-06-30T00:00:00.000Z'),
  status: 'Devam_Ediyor',
  priority: 'Normal',
  targetGrade: '8. Sınıf',
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  branch: { id: 2, name: 'Matematik' },
  _count: { tasks: 1 },
  projectAuthors: [{
    authorProfileId: 3,
    authorProfile: {
      user: { id: 30, fullName: 'Yazar' },
      province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' }
    }
  }]
};

function taskRecord(overrides: any = {}) {
  return {
    id: 50,
    title: '30 soru hazırla',
    description: null,
    assignedAuthorProfileId: 3,
    assignedCoordinatorId: null,
    priority: 'Yuksek',
    status: 'Bekliyor',
    startDate: new Date('2026-10-10T00:00:00.000Z'),
    dueDate: new Date('2027-10-20T00:00:00.000Z'),
    completionDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project,
    assignedAuthorProfile: {
      id: 3,
      user: { id: 30, fullName: 'Yazar' },
      province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' },
      branch: { id: 2, name: 'Matematik' }
    },
    assignedCoordinator: null,
    ...overrides
  };
}

const genel = {
  id: 1,
  fullName: 'Genel Koordinatör',
  role: { code: 'GENEL_KOORDINATOR' },
  AuthorProfile: null
};

const yazar = {
  id: 30,
  fullName: 'Yazar',
  role: { code: 'YAZAR' },
  AuthorProfile: { id: 3 }
};

describe('Task action handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(prisma as any));
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
  });

  it('scopes an author to own assigned tasks', async () => {
    const { req, res } = reqRes('GET');
    await handleTaskAction(req, res, yazar, 'tasks');
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { assignedAuthorProfileId: 3 }
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('creates a task only for a project author and starts in Bekliyor', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(project as any);
    vi.mocked(prisma.authorProfile.findUnique).mockResolvedValue({
      id: 3,
      status: 'Aktif',
      user: { id: 30, status: 'Aktif', role: { code: 'YAZAR' } }
    } as any);
    vi.mocked(prisma.task.create).mockResolvedValue({ id: 50 } as any);
    vi.mocked(prisma.task.findUnique).mockResolvedValue(taskRecord() as any);

    const { req, res } = reqRes('POST', {
      title: '30 soru hazırla',
      projectId: 10,
      priority: 'Yuksek',
      startDate: '2026-10-10',
      dueDate: '2026-10-20',
      assignedAuthorProfileId: 3
    });
    await handleTaskAction(req, res, genel, 'tasks');

    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        projectId: 10,
        status: 'Bekliyor',
        assignedAuthorProfileId: 3,
        assignedCoordinatorId: null
      })
    }));
    expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'TASK_CREATED' })
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('lets the assignee advance but not complete the task directly', async () => {
    vi.mocked(prisma.task.update).mockResolvedValue({ id: 50 } as any);

    let { req, res } = reqRes('PATCH', { status: 'Devam_Ediyor' }, { id: '50' });
    vi.mocked(prisma.task.findUnique)
      .mockResolvedValueOnce(taskRecord() as any)
      .mockResolvedValueOnce(taskRecord({ status: 'Devam_Ediyor' }) as any);
    await handleTaskAction(req, res, yazar, 'task');
    expect(res.status).toHaveBeenCalledWith(200);

    ({ req, res } = reqRes('PATCH', { status: 'Tamamlandi' }, { id: '50' }));
    vi.mocked(prisma.task.findUnique).mockResolvedValue(taskRecord({ status: 'Kontrol_Bekliyor' }) as any);
    await handleTaskAction(req, res, yazar, 'task');
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('only allows permanent delete while waiting', async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(taskRecord({ status: 'Devam_Ediyor' }) as any);

    let { req, res } = reqRes('DELETE', {}, { id: '50' });
    await handleTaskAction(req, res, genel, 'task');
    expect(res.status).toHaveBeenCalledWith(409);

    vi.mocked(prisma.task.findUnique).mockResolvedValue(taskRecord({ status: 'Bekliyor' }) as any);
    vi.mocked(prisma.task.delete).mockResolvedValue({ id: 50 } as any);
    ({ req, res } = reqRes('DELETE', {}, { id: '50' }));
    await handleTaskAction(req, res, genel, 'task');
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 50 } });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
