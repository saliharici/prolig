import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCompensationAction } from '../api/v1/_lib/compensation-handler.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    compensationEntry: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn()
    },
    $transaction: vi.fn(async (cb: any) => cb(prisma))
  }
}));

const general = { id: 1, role: { code: 'GENEL_KOORDINATOR' } };
const accounting = { id: 2, role: { code: 'MUHASEBE' } };
const author = { id: 3, role: { code: 'YAZAR' } };

function reqRes(projectIds?: unknown) {
  const req = { method: 'GET', query: { limit: '1', ...(projectIds !== undefined ? { projectIds } : {}) } } as unknown as VercelRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis(), setHeader: vi.fn() } as unknown as VercelResponse;
  return { req, res };
}

describe('Reports → compensation summary bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.compensationEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.compensationEntry.groupBy).mockResolvedValue([]);
  });

  it('restricts BOTH total aggregation and paginated rows to selected projects', async () => {
    const { req, res } = reqRes('7,8,7');
    await handleCompensationAction(req, res, general, 'compensationEntries');
    const expected = { projectId: { in: [7, 8] } };
    expect(prisma.compensationEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expected, take: 2 }));
    expect(prisma.compensationEntry.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: expected }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('preserves individual author scoping even with a project ID filter', async () => {
    const { req, res } = reqRes('7');
    await handleCompensationAction(req, res, author, 'compensationEntries');
    expect(prisma.compensationEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 3, projectId: { in: [7] } }
    }));
    expect(prisma.compensationEntry.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 3, projectId: { in: [7] } }
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('keeps unfiltered totals for finance role when no project IDs are supplied', async () => {
    const { req, res } = reqRes();
    await handleCompensationAction(req, res, accounting, 'compensationEntries');
    expect(prisma.compensationEntry.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it.each(['', '0', '1,0', '1,,2', '1e3', '1 OR 1=1', '-7', '99999999999999999999', ['7', '8']])(
    'rejects malformed projectIds filter %j without accessing the ledger', async value => {
      const { req, res } = reqRes(value);
      await handleCompensationAction(req, res, general, 'compensationEntries');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(prisma.compensationEntry.findMany).not.toHaveBeenCalled();
      expect(prisma.compensationEntry.groupBy).not.toHaveBeenCalled();
    }
  );

  it('refuses more than 150 project IDs to keep report filter bounded', async () => {
    const ids = Array.from({ length: 151 }, (_, i) => i + 1).join(',');
    const { req, res } = reqRes(ids);
    await handleCompensationAction(req, res, general, 'compensationEntries');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.compensationEntry.findMany).not.toHaveBeenCalled();
  });
});
