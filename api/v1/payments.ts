import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './_lib/prisma.js';
import { getCurrentUser } from './_lib/current-user.js';
import { transitionPayment } from './_lib/payment-settlement.js';
import { SettlementError, positiveId } from './_lib/payment-periods.js';
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
      if (user.role.code !== 'MUHASEBE') return res.status(403).json({ error: 'Ödemeleri yalnız Muhasebe yönetebilir.' });
      const action = req.query.action;
      const id = positiveId(req.query.id);
      if (!id) return res.status(400).json({ error: 'Invalid ID' });
      if (action !== 'approve' && action !== 'pay' && action !== 'cancel') return res.status(400).json({ error: 'Unknown action' });
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (action === 'cancel' && (reason.length < 3 || reason.length > 500)) return res.status(400).json({ error: 'İptal gerekçesi girin (3–500 karakter).' });
      const result = await prisma.$transaction(tx => transitionPayment(tx, id, action, user, reason), { isolationLevel: 'Serializable', timeout: 30000 });
      return res.status(200).json({ success: true, payment: result });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    if (error instanceof SettlementError) return res.status(error.status).json({ error: error.message });
    if (['P2025', 'P2034', 'P2002'].includes(error.code)) return res.status(409).json({ error: 'Conflict' });
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
