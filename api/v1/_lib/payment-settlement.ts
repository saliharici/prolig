import type { Prisma } from '../../../generated/prisma/client.js';
import { SettlementError, logSettlement } from './payment-periods.js';
import { sumMoney } from './settlement-money.js';

export async function transitionPayment(tx: Prisma.TransactionClient, id: number, action: 'approve' | 'pay' | 'cancel', actor: { id: number; fullName: string }, reason = '') {
  const current = await tx.payment.findUnique({ where: { id }, select: { status: true, updatedAt: true, amount: true, authorUserId: true, paymentPeriodId: true } });
  if (!current) throw new SettlementError(404, 'Not found');
  if (action === 'approve' && current.status !== 'Bekliyor' || action === 'pay' && current.status !== 'Onaylandi' || action === 'cancel' && !['Bekliyor', 'Onaylandi'].includes(current.status)) throw new SettlementError(409, 'Conflict');
  let entries: { id: number; amount: Prisma.Decimal; status: string; userId: number; paymentPeriodId: number | null }[] = [];
  if (current.paymentPeriodId) {
    const period = await tx.paymentPeriod.findUnique({ where: { id: current.paymentPeriodId } });
    if (!period || period.status !== 'ONAYLANDI') throw new SettlementError(409, 'Dönem ödeme işlemine kapalı.');
    // Serialize payment actions with period closure/cancellation.
    const lock = await tx.paymentPeriod.updateMany({ where: { id: period.id, status: 'ONAYLANDI', updatedAt: period.updatedAt }, data: { updatedAt: new Date() } });
    if (lock.count !== 1) throw new SettlementError(409, 'Dönem değişti.');
    entries = await tx.compensationEntry.findMany({ where: { paymentId: id }, select: { id: true, amount: true, status: true, userId: true, paymentPeriodId: true } });
    if (!entries.length || entries.some(entry => entry.status !== 'ODEMEYE_ALINDI' || entry.userId !== current.authorUserId || entry.paymentPeriodId !== period.id) || sumMoney(entries.map(entry => entry.amount)) !== current.amount.toFixed(2)) throw new SettlementError(409, 'Ödeme ve kazanım tutarları eşleşmiyor.');
  }
  const now = new Date();
  const status = action === 'approve' ? 'Onaylandi' : action === 'pay' ? 'Odendi' : 'Iptal';
  const result = await tx.payment.updateMany({ where: { id, status: current.status, updatedAt: current.updatedAt }, data: { status, ...(action === 'pay' ? { paymentDate: now } : {}) } });
  if (result.count !== 1) throw new SettlementError(409, 'Optimistic concurrency conflict');
  if (entries.length && action !== 'approve') {
    const data = action === 'pay' ? { status: 'ODENDI' as const, paidAt: now } : { status: 'HAK_EDILDI' as const, paymentId: null, paymentPeriodId: null, approvedAt: null };
    const updated = await tx.compensationEntry.updateMany({ where: { id: { in: entries.map(entry => entry.id) }, paymentId: id, paymentPeriodId: current.paymentPeriodId, status: 'ODEMEYE_ALINDI' }, data });
    if (updated.count !== entries.length) throw new SettlementError(409, 'Bağlı kazanımlar değişti.');
  }
  await logSettlement(tx, actor, action === 'approve' ? 'PAYMENT_APPROVED' : action === 'pay' ? 'PAYMENT_PAID' : 'PAYMENT_CANCELLED', 'Payment', id, { previousStatus: current.status, paymentPeriodId: current.paymentPeriodId ?? null, entryCount: entries.length, ...(action === 'cancel' ? { reason, releasedEntryIds: entries.map(entry => entry.id) } : {}) });
  return { success: true };
}
