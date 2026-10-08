import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import collectionHandler from '../api/v1/authors/index.js';
import detailHandler from '../api/v1/authors/[id].js';
import * as authLib from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/auth.js', () => ({ getSessionUserId: vi.fn() }));
vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    authorProfile: { findMany: vi.fn(), findFirst: vi.fn() }
  }
}));

const selectedAuthor = {
  id: 3,
  userId: 4,
  title: 'Yazar / Öğretmen',
  experienceYears: 5,
  status: 'Aktif',
  user: { fullName: 'Pilot Yazar' },
  branch: { id: 2, name: 'Matematik' },
  province: { id: 34, name: 'İİstanbul', region: 'Marmara' },
  district: null,
  institution: null,
  projectAuthors: [{ project: { status: 'Devam_Ediyor', targetGrade: '8. Sınıf' } }]
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

describe('Author API handlers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for unauthenticated collection and detail requests', async () => {
    vi.mocked(authLib.getSessionUserId).mockReturnValue(null);
    let { req, res } = reqRes();
    await collectionHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);

    ({ req, res } = reqRes('GET', { id: '3' }));
    await detailHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns a branch-scoped collection for EDITOR without using editor grade', async () => {
    authenticateAs('EDITOR', { editorBranchId: 2, provinceId: 34, editorGrade: '8. Sınıf', branchAssignments: [] });
    vi.mocked(prisma.authorProfile.findMany).mockResolvedValue([selectedAuthor] as any);
    const { req, res } = reqRes();
    await collectionHandler(req, res);
    expect(prisma.authorProfile.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { branchId: { in: [2] }, provinceId: 34 },
      orderBy: [{ province: { name: 'asc' } }, { user: { fullName: 'asc' } }, { id: 'asc' }]
    }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ fullName: 'Pilot Yazar', activeProjectCount: 1 })]);
  });

  it('returns 403 for an unsupported role', async () => {
    authenticateAs('UNKNOWN');
    const { req, res } = reqRes();
    await collectionHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns an in-scope detail and 404 for an out-of-scope or missing author', async () => {
    authenticateAs('YAZAR', { AuthorProfile: { id: 3 } });
    vi.mocked(prisma.authorProfile.findFirst).mockResolvedValueOnce(selectedAuthor as any).mockResolvedValueOnce(null);

    let { req, res } = reqRes('GET', { id: '3' });
    await detailHandler(req, res);
    expect(prisma.authorProfile.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ id: 3 }, { id: 3 }] }
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

  it.each(['POST', 'PATCH', 'DELETE'])('returns 405 for %s without exposing mutation APIs', async method => {
    let { req, res } = reqRes(method);
    await collectionHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);

    ({ req, res } = reqRes(method, { id: '3' }));
    await detailHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
