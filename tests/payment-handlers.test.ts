import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import indexHandler from '../api/v1/payments/index.js';
import approveHandler from '../api/v1/payments/[id]/approve.js';
import payHandler from '../api/v1/payments/[id]/pay.js';
import * as authLib from '../api/v1/_lib/auth.js';
import { prisma } from '../api/v1/_lib/prisma.js';

vi.mock('../api/v1/_lib/auth.js', () => ({ getSessionUserId: vi.fn() }));
vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    payment: { findMany: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn((cb) => cb(prisma))
  }
}));

function reqRes(method = 'GET', query: any = {}) {
  const req = { method, query, headers: {} } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn()
  } as unknown as VercelResponse;
  return { req, res };
}

function authAs(role: string) {
  vi.mocked(authLib.getSessionUserId).mockReturnValue(1);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 1, fullName: 'Test User', role: { code: role }, status: 'Aktif' } as any);
}

describe('Payment API Handlers', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('Index / GET', () => {
    it('returns 405 for non-GET', async () => {
      const { req, res } = reqRes('POST');
      await indexHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('returns 401 for unauthenticated', async () => {
      vi.mocked(authLib.getSessionUserId).mockReturnValue(null);
      const { req, res } = reqRes('GET');
      await indexHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 for unauthorized role', async () => {
      authAs('EDITOR');
      const { req, res } = reqRes('GET');
      await indexHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 200 for MUHASEBE', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
      const { req, res } = reqRes('GET');
      await indexHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('Approve / POST', () => {
    it('returns 405 for non-POST', async () => {
      const { req, res } = reqRes('GET', { id: '1' });
      await approveHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('returns 400 for invalid id', async () => {
      const { req, res } = reqRes('POST', { id: 'abc' });
      await approveHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 for missing payment', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);
      const { req, res } = reqRes('POST', { id: '1' });
      await approveHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 409 if not Bekliyor', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Onaylandi' } as any);
      const { req, res } = reqRes('POST', { id: '1' });
      await approveHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 409 on update concurrency failure', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Bekliyor', updatedAt: new Date() } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any);
      const { req, res } = reqRes('POST', { id: '1' });
      await approveHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('updates and logs on success', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Bekliyor', updatedAt: new Date() } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as any);
      const { req, res } = reqRes('POST', { id: '1' });
      await approveHandler(req, res);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'Onaylandi' } }));
      expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'PAYMENT_APPROVED' }) }));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Pay / POST', () => {
    it('returns 409 if not Onaylandi', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Bekliyor' } as any);
      const { req, res } = reqRes('POST', { id: '1' });
      await payHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('updates and logs on success', async () => {
      authAs('MUHASEBE');
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Onaylandi', updatedAt: new Date() } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as any);
      const { req, res } = reqRes('POST', { id: '1' });
      await payHandler(req, res);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'Odendi', paymentDate: expect.any(Date) })
      }));
      expect(prisma.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'PAYMENT_PAID' }) }));
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
