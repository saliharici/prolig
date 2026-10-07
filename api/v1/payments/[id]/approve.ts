import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../_lib/prisma.js';
import { getCurrentUser } from '../../_lib/current-user.js';
import { checkPaymentAccess } from '../../_lib/payment-access.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const rawId = req.query.id;
    if (Array.isArray(rawId) || typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
      return res.status(400).json({ error: 'Invalid payment id' });
    }

    const paymentId = Number(rawId);

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!checkPaymentAccess(user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true, updatedAt: true }
    });

    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'Bekliyor') return res.status(409).json({ error: 'Invalid state transition' });

    await prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: paymentId, status: 'Bekliyor', updatedAt: payment.updatedAt },
        data: { status: 'Onaylandi' }
      });

      if (count === 0) throw new Error('Optimistic concurrency conflict');

      await tx.activityLog.create({
        data: {
          action: 'PAYMENT_APPROVED',
          entityType: 'Payment',
          entityId: paymentId,
          userName: user.fullName,
          details: JSON.stringify({ fromStatus: 'Bekliyor', toStatus: 'Onaylandi' })
        }
      });
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Optimistic concurrency conflict') {
      return res.status(409).json({ error: 'Payment state changed by another process' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
