import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import collectionHandler from '../api/v1/projects/index.js';
import detailHandler from '../api/v1/projects/[id].js';
import * as authLib from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/auth.js', () => ({ getSessionUserId: vi.fn() }));
vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    project: { findMany: vi.fn(), findFirst: vi.fn() }
  }
}));

const selectedProject = {
  id: 1,
  title: '8. Sınıf Matematik Pilot Soru Bankası',
  code: 'PILOT-MAT-8-001',
  projectType: 'Soru Bankası',
  progress: 0,
  deadline: new Date('2027-06-30T00:00:00.000Z'),
  status: 'Devam_Ediyor',
  priority: 'Normal',
  targetGrade: '8. Sınıf',
  description: 'Pilot',
  createdAt: new Date(),
  updatedAt: new Date(),
  branch: { id: 2, name: 'Matematik' },
  projectAuthors: [{
    authorProfileId: 3,
    authorProfile: { user: { id: 4, fullName: 'Pilot Yazar' }, province: { id: 34, name: 'İstanbul', region: 'Marmara' } }
  }]
};

function reqRes(method = 'GET', query: any = {}) {
  const req = { method, query, headers: {} } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  } as unknown as VercelResponse;
  return { req, res };
}

function authenticateAs(role: string, extra: Record<string, unknown> = {}) {
  vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 1,
    fullName: 'Pilot User',
    status: 'Aktif',
    role: { code: role },
    AuthorProfile: null,
    ...extra
  } as any);
}

describe('Project API handlers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for unauthenticated collection and detail requests', async () => {
    vi.mocked(authLib.getSessionUserId).mockReturnValue(null);
    let { req, res } = reqRes();
    await collectionHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);

    ({ req, res } = reqRes('GET', { id: '1' }));
    await detailHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns scoped collection for a supported role', async () => {
    authenticateAs('EDITOR', { editorBranchId: 2, provinceId: 34, editorGrade: '8. Sınıf', branchAssignments: [] });
    vi.mocked(prisma.project.findMany).mockResolvedValue([selectedProject] as any);
    const { req, res } = reqRes();
    await collectionHandler(req, res);
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { branchId: { in: [2] }, projectAuthors: { some: { authorProfile: { provinceId: 34 } } }, targetGrade: '8. Sınıf' },
      orderBy: [{ deadline: 'asc' }, { id: 'asc' }]
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 403 for an unsupported role', async () => {
    authenticateAs('UNKNOWN');
    const { req, res } = reqRes();
    await collectionHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns an in-scope detail and 404 for an out-of-scope or missing project', async () => {
    authenticateAs('YAZAR', { AuthorProfile: { id: 3 } });
    vi.mocked(prisma.project.findFirst).mockResolvedValueOnce(selectedProject as any).mockResolvedValueOnce(null);

    let { req, res } = reqRes('GET', { id: '1' });
    await detailHandler(req, res);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ projectAuthors: { some: { authorProfileId: 3 } } }, { id: 1 }] }
    }));
    expect(res.status).toHaveBeenCalledWith(200);

    ({ req, res } = reqRes('GET', { id: '999' }));
    await detailHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 for an invalid detail id', async () => {
    const { req, res } = reqRes('GET', { id: '0' });
    await detailHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 405 for unsupported PUT methods while mutation methods are handled explicitly', async () => {
    let { req, res } = reqRes('PUT');
    await collectionHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'POST']);

    ({ req, res } = reqRes('PUT', { id: '1' }));
    await detailHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET', 'PATCH', 'POST', 'DELETE']);
  });
});
