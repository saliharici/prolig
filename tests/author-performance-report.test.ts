import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../api/v1/_lib/prisma.js';
import { getQuestionArchiveStateMap } from '../api/v1/_lib/question-archive.js';
import { canReadAuthorPerformanceReport, getAuthorPerformanceReport } from '../api/v1/_lib/author-performance-report.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    project: { findMany: vi.fn() },
    question: { findMany: vi.fn() },
    compensationEntry: { groupBy: vi.fn() }
  }
}));
vi.mock('../api/v1/_lib/question-archive.js', () => ({
  getQuestionArchiveStateMap: vi.fn()
}));

const general = { id: 1, role: { code: 'GENEL_KOORDINATOR' } };
const finance = { id: 2, role: { code: 'MUHASEBE' } };
const province = { id: 3, role: { code: 'IL_KOORDINATORU' }, provinceId: 25 };
const region = { id: 4, role: { code: 'BOLGE_KOORDINATORU' }, assignedRegion: 'Doğu Anadolu' };
const project = {
  id: 7, code: 'MATH-7', title: 'Matematik 7', targetGrade: '7. Sınıf',
  branch: { id: 4, name: 'Matematik' },
  projectAuthors: [
    { authorProfile: { user: { id: 20, fullName: 'Zeynep Yazar' },
      province: { id: 25, name: 'Erzurum', region: 'Doğu Anadolu' } } },
    { authorProfile: { user: { id: 30, fullName: 'Ayşe Yazar' },
      province: { id: 34, name: 'İstanbul', region: 'Marmara' } } }
  ]
};

describe('cross-project author performance reporting — read-only scoped', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.project.findMany).mockResolvedValue([project] as any);
    vi.mocked(prisma.question.findMany).mockResolvedValue([]);
    vi.mocked(prisma.compensationEntry.groupBy).mockResolvedValue([]);
    vi.mocked(getQuestionArchiveStateMap).mockResolvedValue(new Map());
  });

  it('rejects authors and editors before database access', async () => {
    for (const role of ['YAZAR', 'EDITOR', 'UNKNOWN']) {
      expect(canReadAuthorPerformanceReport(role)).toBe(false);
      await expect(getAuthorPerformanceReport({ role: { code: role } })).rejects.toThrow('FORBIDDEN');
    }
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('scopes province coordinator to their author, with no financial query or earnings fields', async () => {
    const result = await getAuthorPerformanceReport(province);
    expect(result.financeVisible).toBe(false);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].userId).toBe(20);
    expect(result.rows[0].provinceName).toBe('Erzurum');
    expect(JSON.stringify(result)).not.toContain('earnings');
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [
        { projectId: { in: [7] }, authorUserId: { in: [20] } },
        { authorUser: { AuthorProfile: { provinceId: 25 } } }
      ] }
    }));
  });

  it('uses both project visibility and author geography for region coordinator', async () => {
    const result = await getAuthorPerformanceReport(region);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].userId).toBe(20);
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [
        { coordinatorId: 4 },
        { projectAuthors: { some: { authorProfile: { province: { region: 'Doğu Anadolu' } } } } }
      ] }
    }));
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
  });

  it('excludes archived questions, counts each live workflow status and requires matching project-author assignments', async () => {
    vi.mocked(prisma.question.findMany).mockResolvedValue([
      { id: 1, projectId: 7, authorUserId: 20, status: 'TASLAK' },
      { id: 2, projectId: 7, authorUserId: 20, status: 'INCELEMEDE' },
      { id: 3, projectId: 7, authorUserId: 20, status: 'REVIZYON' },
      { id: 4, projectId: 7, authorUserId: 20, status: 'ONAYLANDI' },
      { id: 5, projectId: 7, authorUserId: 20, status: 'REDDEDILDI' },
      { id: 6, projectId: 7, authorUserId: 20, status: 'ONAYLANDI' },
      { id: 7, projectId: 99, authorUserId: 20, status: 'ONAYLANDI' },
      { id: 8, projectId: 7, authorUserId: 999, status: 'ONAYLANDI' }
    ] as any);
    vi.mocked(getQuestionArchiveStateMap).mockResolvedValue(new Map([[6, true]]));
    const result = await getAuthorPerformanceReport(general);
    expect(result.rows.find(row => row.userId === 20)?.counts).toEqual({
      total: 5, draft: 1, review: 1, revision: 1, approved: 1, rejected: 1
    });
    expect(result.rows.find(row => row.userId === 30)?.counts.total).toBe(0);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [
        { projectId: { in: [7] }, authorUserId: { in: [20, 30] } }, {}
      ] },
      select: { id: true, projectId: true, authorUserId: true, status: true }
    }));
  });

  it('counts question states in finance view without exposing question content', async () => {
    const result = await getAuthorPerformanceReport(finance);
    expect(result.financeVisible).toBe(true);
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { projectId: { in: [7] }, authorUserId: { in: [20, 30] } },
      select: { id: true, projectId: true, authorUserId: true, status: true }
    }));
    expect(result.rows.every(row => row.earnings?.total === '0.00')).toBe(true);
  });

  it('groups only active author royalties with exact cents per project-author combination', async () => {
    vi.mocked(prisma.compensationEntry.groupBy).mockResolvedValue([
      { projectId: 7, userId: 20, status: 'HAK_EDILDI', _sum: { amount: '10.40' } },
      { projectId: 7, userId: 20, status: 'ODEME_BEKLIYOR', _sum: { amount: '2.20' } },
      { projectId: 7, userId: 20, status: 'ODEMEYE_ALINDI', _sum: { amount: '4.33' } },
      { projectId: 7, userId: 20, status: 'ODENDI', _sum: { amount: '0.01' } },
      { projectId: 7, userId: 20, status: 'IPTAL', _sum: { amount: '99.00' } },
      { projectId: 7, userId: 30, status: 'ODENDI', _sum: { amount: '4.50' } },
      { projectId: 99, userId: 20, status: 'ODENDI', _sum: { amount: '100.00' } }
    ] as any);
    const result = await getAuthorPerformanceReport(general);
    expect(prisma.compensationEntry.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      by: ['projectId', 'userId', 'status'],
      where: { projectId: { in: [7] }, userId: { in: [20, 30] }, roleCode: 'YAZAR' }
    }));
    expect(result.rows.find(row => row.userId === 20)?.earnings).toEqual({
      total: '16.94', waiting: '12.60', inProcess: '4.33', paid: '0.01'
    });
    expect(result.rows.find(row => row.userId === 30)?.earnings?.paid).toBe('4.50');
  });

  it('handles projects without assignments without sending unrestricted data queries', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ ...project, projectAuthors: [] }] as any);
    const result = await getAuthorPerformanceReport(general);
    expect(result.rows).toEqual([]);
    expect(prisma.question.findMany).not.toHaveBeenCalled();
    expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
  });
});
