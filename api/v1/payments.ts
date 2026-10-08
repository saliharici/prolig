import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/prisma.js';
import { getCurrentUser } from './_lib/current-user.js';
import { checkPaymentAccess } from './_lib/payment-access.js';
import { paymentSelect, formatPaymentDto } from './_lib/payment-dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!checkPaymentAccess(user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'GET') {
      const payments = await prisma.payment.findMany({
        select: paymentSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
      });
      return res.status(200).json(payments.map(formatPaymentDto));
    }

    if (req.method === 'POST') {
      const action = req.query.action;
      
      const rawId = req.query.id;
      if (
        Array.isArray(rawId) ||
        typeof rawId !== 'string' ||
        !/^[1-9]\d*$/.test(rawId)
      ) {
        return res.status(400).json({ error: 'Invalid ID' });
      }
      const id = Number(rawId);
      if (!Number.isSafeInteger(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      if (action === 'approve') {
        const result = await prisma.$transaction(async (tx) => {
          const current = await tx.payment.findUnique({
            where: { id },
            select: { status: true, updatedAt: true, amount: true, projectId: true }
          });

          if (!current) throw new Error('NOT_FOUND');
          if (current.status !== 'Bekliyor') throw new Error('INVALID_STATE');

          const { count } = await tx.payment.updateMany({ where: { id, status: 'Bekliyor', updatedAt: current.updatedAt }, data: { status: 'Onaylandi' } }); if (count === 0) throw new Error('Optimistic concurrency conflict');

          await tx.activityLog.create({
            data: {
              userName: user.fullName,
              action: "PAYMENT_APPROVED",
              entityType: 'Payment',
              entityId: id, details: JSON.stringify({ previousStatus: current.status })
            }
          });

          return { success: true };
        });
        return res.status(200).json({ success: true, payment: result });
      }

      if (action === 'pay') {
        const result = await prisma.$transaction(async (tx) => {
          const current = await tx.payment.findUnique({
            where: { id },
            select: { status: true, updatedAt: true, amount: true, projectId: true }
          });

          if (!current) throw new Error('NOT_FOUND');
          if (current.status !== 'Onaylandi') throw new Error('INVALID_STATE');

          const { count } = await tx.payment.updateMany({ where: { id, status: 'Onaylandi', updatedAt: current.updatedAt }, data: { status: 'Odendi', paymentDate: new Date() } }); if (count === 0) throw new Error('Optimistic concurrency conflict');

          await tx.activityLog.create({
            data: {
              userName: user.fullName,
              action: "PAYMENT_PAID",
              entityType: 'Payment',
              entityId: id, details: JSON.stringify({ previousStatus: current.status })
            }
          });

          return { success: true };
        });
        return res.status(200).json({ success: true, payment: result });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error(error);
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Not found' });
    if (error.message === 'INVALID_STATE') return res.status(409).json({ error: 'Conflict' });
    if (error.message === 'Optimistic concurrency conflict' || error.code === 'P2025') return res.status(409).json({ error: 'Optimistic concurrency conflict' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
