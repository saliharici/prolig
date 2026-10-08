import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/v1/payments.js';
import { prisma } from '../api/v1/_lib/prisma.js';
import { getCurrentUser } from '../api/v1/_lib/current-user.js';

vi.mock('../api/v1/_lib/prisma.js', () => ({
  prisma: {
    payment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

vi.mock('../api/v1/_lib/current-user.js', () => ({
  getCurrentUser: vi.fn(),
}));

function reqRes(method: string, query: any = {}) {
  const req = { method, query } as VercelRequest;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as VercelResponse;
  return { req, res };
}

describe('Payment API Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /payments', () => {
    it('returns 401 if no session', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      const { req, res } = reqRes('GET');
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 for unauthorized role', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, role: 'YAZAR', fullName: 'Test' } as any);
      const { req, res } = reqRes('GET');
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 200 for MUHASEBE', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, role: 'MUHASEBE', fullName: 'Test' } as any);
      vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
      const { req, res } = reqRes('GET');
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 200 for GENEL_KOORDINATOR', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, role: 'GENEL_KOORDINATOR', fullName: 'Test' } as any);
      vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
      const { req, res } = reqRes('GET');
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('POST approve', () => {
    beforeEach(() => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, role: 'MUHASEBE', fullName: 'Test' } as any);
    });

    it('returns 200 and writes ActivityLog on success', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Bekliyor', updatedAt: new Date(), amount: '100', projectId: 1 } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as any);
      const { req, res } = reqRes('POST', { action: 'approve', id: '1' });
      await handler(req, res);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'Onaylandi' } }));
      expect(prisma.activityLog.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 409 for invalid state', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Odendi', updatedAt: new Date(), amount: '100' } as any);
      const { req, res } = reqRes('POST', { action: 'approve', id: '1' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 409 and no log on stale updateMany count=0', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Bekliyor', updatedAt: new Date(), amount: '100' } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any);
      const { req, res } = reqRes('POST', { action: 'approve', id: '1' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(prisma.activityLog.create).not.toHaveBeenCalled();
    });
  });

  describe('POST pay', () => {
    beforeEach(() => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, role: 'MUHASEBE', fullName: 'Test' } as any);
    });

    it('returns 200, sets date and writes ActivityLog on success', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Onaylandi', updatedAt: new Date(), amount: '100', projectId: 1 } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 1 } as any);
      const { req, res } = reqRes('POST', { action: 'pay', id: '1' });
      await handler(req, res);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'Odendi' }) }));
      expect((vi.mocked(prisma.payment.updateMany).mock.calls[0][0] as any).data.paymentDate).toBeDefined();
      expect(prisma.activityLog.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 409 for invalid state', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Bekliyor', updatedAt: new Date(), amount: '100' } as any);
      const { req, res } = reqRes('POST', { action: 'pay', id: '1' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 409 and no log on stale updateMany count=0', async () => {
      vi.mocked(prisma.payment.findUnique).mockResolvedValue({ status: 'Onaylandi', updatedAt: new Date(), amount: '100' } as any);
      vi.mocked(prisma.payment.updateMany).mockResolvedValue({ count: 0 } as any);
      const { req, res } = reqRes('POST', { action: 'pay', id: '1' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(prisma.activityLog.create).not.toHaveBeenCalled();
    });
  });

  describe('Invalid requests', () => {
    beforeEach(() => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, role: 'MUHASEBE', fullName: 'Test' } as any);
    });

    it('returns 400 for unknown action', async () => {
      const { req, res } = reqRes('POST', { action: 'unknown', id: '1' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid id "1abc"', async () => {
      const { req, res } = reqRes('POST', { action: 'approve', id: '1abc' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid id "0"', async () => {
      const { req, res } = reqRes('POST', { action: 'approve', id: '0' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid id "-1"', async () => {
      const { req, res } = reqRes('POST', { action: 'approve', id: '-1' });
      await handler(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
