import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { paymentSelect, formatPaymentDto } from './payment-dto.js';
import { sumMoney } from './settlement-money.js';
import { SettlementError, periodBounds, positiveId, preparePeriod, settlePeriod, closePeriod, cancelPeriod, logSettlement } from './payment-periods.js';

export type PeriodAction = 'paymentPeriods' | 'paymentPeriod' | 'paymentPeriodPrepare' | 'paymentPeriodSettle' | 'paymentPeriodClose' | 'paymentPeriodCancel';

const periodInclude = {
  entries: { select: { id: true, userId: true, amount: true, status: true } },
  payments: { select: paymentSelect, orderBy: { id: 'asc' as const } }
} as const;

function periodDto(period: any) {
  const active = period.entries.filter((entry: any) => entry.status !== 'IPTAL');
  const day = (date: Date) => new Date(date.getTime() + 10800000).toISOString().slice(0, 10);
  return {
    id: period.id, code: period.code, name: period.name, status: period.status,
    startDate: day(period.periodStart), endDate: day(new Date(period.periodEnd.getTime() - 1)),
    approvedAt: period.approvedAt, closedAt: period.closedAt,
    entryCount: active.length, beneficiaryCount: new Set(active.map((entry: any) => entry.userId)).size,
    totalAmount: sumMoney(active.map((entry: any) => entry.amount)),
    paidAmount: sumMoney(active.filter((entry: any) => entry.status === 'ODENDI').map((entry: any) => entry.amount)),
    outstandingAmount: sumMoney(active.filter((entry: any) => entry.status !== 'ODENDI').map((entry: any) => entry.amount)),
    payments: period.payments.map(formatPaymentDto)
  };
}

export async function handlePaymentPeriodAction(req: VercelRequest, res: VercelResponse, user: any, action: PeriodAction) {
  if (!['GENEL_KOORDINATOR', 'MUHASEBE'].includes(user?.role?.code)) return res.status(403).json({ error: 'Forbidden' });
  if (req.method !== 'GET' && user.role.code !== 'MUHASEBE') return res.status(403).json({ error: 'Ödeme sürecini yalnız Muhasebe yönetebilir.' });
  try {
    if (action === 'paymentPeriods') {
      if (req.method === 'GET') {
        const periods = await prisma.paymentPeriod.findMany({ include: periodInclude, orderBy: [{ periodStart: 'desc' }, { id: 'desc' }], take: 100 });
        return res.status(200).json({ periods: periods.map(periodDto) });
      }
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const code = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';
      if (!name || name.length > 120 || !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) throw new SettlementError(400, 'Dönem adı veya kodu geçersiz.');
      const bounds = periodBounds(req.body?.startDate, req.body?.endDate);
      const created = await prisma.$transaction(async tx => {
        const period = await tx.paymentPeriod.create({ data: { name, code, ...bounds, createdByUserId: user.id }, include: periodInclude });
        await logSettlement(tx, user, 'PAYMENT_PERIOD_CREATED', 'PaymentPeriod', period.id, { code, startDate: req.body.startDate, endDate: req.body.endDate });
        return period;
      });
      return res.status(201).json({ period: periodDto(created) });
    }
    const id = positiveId(req.query.id);
    if (!id) throw new SettlementError(400, 'Geçersiz dönem numarası.');
    if (action === 'paymentPeriod') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      const current = await prisma.paymentPeriod.findUnique({ where: { id }, include: periodInclude });
      if (!current) throw new SettlementError(404, 'Ödeme dönemi bulunamadı.');
      return res.status(200).json({ period: periodDto(current) });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (action === 'paymentPeriodCancel' && (reason.length < 3 || reason.length > 500)) throw new SettlementError(400, 'İptal gerekçesi girin (3–500 karakter).');
    await prisma.$transaction(async tx => {
      if (action === 'paymentPeriodPrepare') await preparePeriod(tx, id, user);
      else if (action === 'paymentPeriodSettle') await settlePeriod(tx, id, user);
      else if (action === 'paymentPeriodClose') await closePeriod(tx, id, user);
      else if (action === 'paymentPeriodCancel') await cancelPeriod(tx, id, user, reason);
      else throw new SettlementError(400, 'Unknown action');
    }, { isolationLevel: 'Serializable', timeout: 30000 });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error instanceof SettlementError) return res.status(error.status).json({ error: error.message });
    if (['P2002', 'P2034', 'P2025'].includes(error.code)) return res.status(409).json({ error: 'Dönem veya kazanımlar değişti. Listeyi yenileyin.' });
    if (error.message === 'INVALID_AMOUNT') return res.status(409).json({ error: 'Ödeme tutarı geçersiz veya ödeme limiti aşıldı.' });
    console.error('Payment period error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
