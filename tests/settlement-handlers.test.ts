import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../api/v1/_lib/prisma.js';
import { handleCompensationAction } from '../api/v1/_lib/compensation-handler.js';
import { handlePaymentPeriodAction } from '../api/v1/_lib/payment-period-handler.js';
import paymentHandler from '../api/v1/payments.js';
import { getCurrentUser } from '../api/v1/_lib/current-user.js';

vi.mock('../api/v1/_lib/current-user.js', () => ({ getCurrentUser: vi.fn() }));
vi.mock('../api/v1/_lib/prisma.js', () => ({ prisma: {
  compensationEntry: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
  paymentPeriod: { findMany: vi.fn(), create: vi.fn() },
  payment: { findMany: vi.fn() }, activityLog: { create: vi.fn() },
  $transaction: vi.fn(async cb => cb(prisma))
} }));
function reqRes(method = 'GET', query: any = {}, body: any = {}) {
  const req = { method, query, body } as VercelRequest;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() } as unknown as VercelResponse;
  return { req, res };
}
const actor = (code: string) => ({ id: 7, fullName: 'Kullanıcı', role: { code } });
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.compensationEntry.findMany).mockResolvedValue([]);
  vi.mocked(prisma.compensationEntry.groupBy as any).mockResolvedValue([]);
  vi.mocked(prisma.paymentPeriod.findMany).mockResolvedValue([]);
});

describe('Authenticated financial scope', () => {
  it.each(['YAZAR', 'EDITOR', 'IL_KOORDINATORU', 'BOLGE_KOORDINATORU'])('%s can read only own entries despite forged userId', async code => {
    const { req, res } = reqRes('GET', { userId: '999' }, { userId: 999 });
    await handleCompensationAction(req, res, actor(code), 'compensationEntries');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(prisma.compensationEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
    expect(prisma.compensationEntry.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7 } }));
  });
  it.each(['GENEL_KOORDINATOR', 'MUHASEBE'])('%s reads all earnings and periods', async code => {
    const r = reqRes();
    await handleCompensationAction(r.req, r.res, actor(code), 'compensationEntries');
    expect(prisma.compensationEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    await handlePaymentPeriodAction(r.req, r.res, actor(code), 'paymentPeriods');
    expect(r.res.status).toHaveBeenCalledWith(200);
  });
  it('rejects a cursor belonging to another user', async () => {
    vi.mocked(prisma.compensationEntry.findFirst).mockResolvedValue(null);
    const r = reqRes('GET', { cursor: '999' });
    await handleCompensationAction(r.req, r.res, actor('YAZAR'), 'compensationEntries');
    expect(r.res.status).toHaveBeenCalledWith(400);
    expect(prisma.compensationEntry.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 7, id: 999 } }));
    expect(prisma.compensationEntry.findMany).not.toHaveBeenCalled();
  });
  it('aggregates all scoped earnings beyond the displayed page', async () => {
    vi.mocked(prisma.compensationEntry.groupBy as any).mockResolvedValue([
      { status: 'HAK_EDILDI', roleCode: 'YAZAR', _sum: { amount: '120.10' }, _count: { _all: 600 } },
      { status: 'ODEMEYE_ALINDI', roleCode: 'YAZAR', _sum: { amount: '0.20' }, _count: { _all: 2 } },
      { status: 'ODENDI', roleCode: 'YAZAR', _sum: { amount: '50.00' }, _count: { _all: 4 } },
      { status: 'IPTAL', roleCode: 'YAZAR', _sum: { amount: '100.00' }, _count: { _all: 3 } }
    ]);
    const r = reqRes('GET', { limit: '1' });
    await handleCompensationAction(r.req, r.res, actor('YAZAR'), 'compensationEntries');
    expect(r.res.json).toHaveBeenCalledWith(expect.objectContaining({ summary: expect.objectContaining({ count: 609, total: '170.30', waiting: '120.10', inProcess: '0.20', paid: '50.00' }) }));
  });
  it.each(['YAZAR', 'EDITOR', 'IL_KOORDINATORU', 'BOLGE_KOORDINATORU'])('%s cannot inspect or mutate periods', async code => {
    for (const method of ['GET', 'POST']) {
      const r = reqRes(method);
      await handlePaymentPeriodAction(r.req, r.res, actor(code), 'paymentPeriods');
      expect(r.res.status).toHaveBeenCalledWith(403);
    }
  });
  it('general coordinator cannot create periods or mark payments as paid', async () => {
    const r = reqRes('POST', { action: 'pay', id: '1' });
    await handlePaymentPeriodAction(r.req, r.res, actor('GENEL_KOORDINATOR'), 'paymentPeriods');
    expect(r.res.status).toHaveBeenCalledWith(403);
    vi.mocked(getCurrentUser).mockResolvedValue(actor('GENEL_KOORDINATOR') as any);
    await paymentHandler(r.req, r.res);
    expect(r.res.status).toHaveBeenLastCalledWith(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('Payment period HTTP errors', () => {
  it('rejects malformed period input before transaction', async () => {
    const r = reqRes('POST', {}, { code: '2026-10', name: 'Ekim', startDate: '2026-10-31', endDate: '2026-10-01' });
    await handlePaymentPeriodAction(r.req, r.res, actor('MUHASEBE'), 'paymentPeriods');
    expect(r.res.status).toHaveBeenCalledWith(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each(['P2002', 'P2034', 'P2025'])('maps database conflict %s to HTTP 409', async code => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce({ code });
    const r = reqRes('POST', {}, { code: '2026-10', name: 'Ekim', startDate: '2026-10-01', endDate: '2026-10-31' });
    await handlePaymentPeriodAction(r.req, r.res, actor('MUHASEBE'), 'paymentPeriods');
    expect(r.res.status).toHaveBeenCalledWith(409);
  });
  it('runs settlement in a Serializable transaction', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce({ code: 'P2034' });
    const r = reqRes('POST', { id: '4' });
    await handlePaymentPeriodAction(r.req, r.res, actor('MUHASEBE'), 'paymentPeriodSettle');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable', timeout: 30000 });
    expect(r.res.status).toHaveBeenCalledWith(409);
  });
});
