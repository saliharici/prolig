import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import { getCurrentUser } from '../_lib/current-user.js';
import { checkPaymentAccess } from '../_lib/payment-access.js';
import { paymentSelect, formatPaymentDto } from '../_lib/payment-dto.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!checkPaymentAccess(user)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const payments = await prisma.payment.findMany({
      select: paymentSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

    return res.status(200).json(payments.map(formatPaymentDto));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
