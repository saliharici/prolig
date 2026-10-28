import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../api/v1/_lib/prisma.js';
import { getQuestionArchiveStateMap } from '../api/v1/_lib/question-archive.js';
import { canReadProjectAuthorPerformance, getProjectAuthorPerformance } from '../api/v1/_lib/project-author-performance.js';
import { mayViewProjectAuthorPerformance } from '../src/projects/ProjectAuthorPerformancePanel.js';
import { fetchProjectAuthorPerformance } from '../src/projects/api.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    question: { findMany: vi.fn() },
    compensationEntry: { groupBy: vi.fn() }
  }
}));
vi.mock('../api/v1/_lib/question-archive.js', () => ({
  getQuestionArchiveStateMap: vi.fn()
}));

const general = { id: 1, role: { code: 'GENEL_KOORDINATOR' } };
const accounting = { id: 2, role: { code: 'MUHASEBE' } };
const provinceCoordinator = { id: 3, branchAssignments: [{ branchId: 4 }], role: { code: 'BRANS_KOORDINATORU' } };
const regionCoordinator = { id: 4, assignedRegion: 'Doğu Anadolu', role: { code: 'BOLGE_KOORDINATORU' } };
const project = {
  id: 55,
  projectAuthors: [
    { authorProfile: { user: { id: 101, fullName: 'Zehra Kaya' }, branchId: 4, province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' } } },
    { authorProfile: { user: { id: 102, fullName: 'Ali Demir' }, branchId: 5, province: { id: 34, name: 'İstanbul', region: 'Marmara' } } }
  ]
};

describe('Project author productivity and earned royalties — read only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.compensationEntry.groupBy).mockResolvedValue([]);
    vi.mocked(getQuestionArchiveStateMap).mockResolvedValue(new Map());
  });

  it('reports all five workflow statuses, excludes archived and other-project records', async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValue([
      { id: 1, authorUserId: 101, status: 'TASLAK' },
      { id: 2, authorUserId: 101, status: 'INCELEMEDE' },
      { id: 3, authorUserId: 101, status: 'REVIZYON' },
      { id: 4, authorUserId: 101, status: 'ONAYLANDI' },
      { id: 5, authorUserId: 101, status: 'REDDEDILDI' },
      { id: 6, authorUserId: 101, status: 'ONAYLANDI' }
    ] as any);
    vi.mocked(getQuestionArchiveStateMap).mockResolvedValue(new Map([[6, true]]));
    const result = await getProjectAuthorPerformance(project, general);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [{ projectId: 55, authorUserId: { in: [101, 102] } }, {}] },
      select: { id: true, authorUserId: true, status: true }
    }));
    const author = result.authors.find(a => a.userId === 101)!;
    expect(author.counts).toEqual({ total: 5, draft: 1, review: 1, revision: 1, approved: 1, rejected: 1 });
  });

  it('filters branch coordinator by assigned branch with finance excluded', async () => {
    const result = await getProjectAuthorPerformance(project, provinceCoordinator);
    expect(result.authors.map(a => a.userId)).toEqual([101]);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [
        { projectId: 55, authorUserId: { in: [101] } },
        { authorUser: { AuthorProfile: { branchId: { in: [4] } } } }
      ] }
    }));
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('earnings');
  });

  it('restricts region coordinator to own geographic area', async () => {
    const result = await getProjectAuthorPerformance(project, regionCoordinator);
    expect(result.authors).toHaveLength(1);
    expect(result.authors[0].userId).toBe(101);
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
  });

  it('rejects writer/editor roles from author-by-author team analytics', async () => {
    for (const role of ['YAZAR','EDITOR','UNKNOWN']) {
      expect(canReadProjectAuthorPerformance(role)).toBe(false);
      await expect(getProjectAuthorPerformance(project, { role: { code: role } })).rejects.toThrow('FORBIDDEN');
      expect(mayViewProjectAuthorPerformance(role === 'UNKNOWN' ? 'YAZAR' : role as any)).toBe(false);
    }
    expect(prisma.question.findMany).not.toHaveBeenCalled();
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
  });

  it('returns zero-filled authors even with no questions or remuneration', async () => {
    const result = await getProjectAuthorPerformance(project, accounting);
    expect(result.financeVisible).toBe(true);
    expect(result.authors).toHaveLength(2);
    for (const author of result.authors) {
      expect(author.counts.total).toBe(0);
      expect(author.earnings).toEqual({ total: '0.00', waiting: '0.00', inProcess: '0.00', paid: '0.00' });
    }
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 55, authorUserId: { in: [101, 102] } }
    }));
  });

  it('sums ONLY YAZAR role ledger for each author in exact cents, excluding cancellation', async () => {
    vi.mocked(prisma.compensationEntry.groupBy).mockResolvedValue([
      { userId: 101, status: 'HAK_EDILDI', _sum: { amount: '12.20' } },
      { userId: 101, status: 'ODEME_BEKLIYOR', _sum: { amount: '4.30' } },
      { userId: 101, status: 'ODEMEYE_ALINDI', _sum: { amount: '5.11' } },
      { userId: 101, status: 'ODENDI', _sum: { amount: '3.01' } },
      { userId: 101, status: 'IPTAL', _sum: { amount: '90.00' } },
      { userId: 102, status: 'ODENDI', _sum: { amount: '70.50' } }
    ] as any);
    const result = await getProjectAuthorPerformance(project, accounting);
    expect(prisma.compensationEntry.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: 55, userId: { in: [101, 102] }, roleCode: 'YAZAR' },
      by: ['userId','status']
    }));
    expect(result.authors.find(a => a.userId === 101)?.earnings).toEqual({
      total: '24.62', waiting: '16.50', inProcess: '5.11', paid: '3.01'
    });
    expect(result.authors.find(a => a.userId === 102)?.earnings?.total).toBe('70.50');
  });

  it('does not attempt database queries if geographic scope excludes all authors', async () => {
    const result = await getProjectAuthorPerformance(project, { ...provinceCoordinator, branchAssignments: [{ branchId: 99 }] });
    expect(result.authors).toEqual([]);
    expect(prisma.question.findMany).not.toHaveBeenCalled();
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
  });
});

describe('Project author performance UI contracts', () => {
  it('uses a single project-scoped GET with cookies; does not mutate any data', async () => {
    const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ projectId: 55, authors: [], financeVisible: false }) });
    vi.stubGlobal('fetch', mock);
    try {
      const result = await fetchProjectAuthorPerformance(55);
      expect(result.projectId).toBe(55);
      expect(mock).toHaveBeenCalledWith('/api/v1/projects/55?view=authorPerformance', { credentials: 'include' });
      await expect(fetchProjectAuthorPerformance(-1)).rejects.toThrow();
      expect(mock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
