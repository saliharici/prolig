import type { Prisma } from '../../../generated/prisma/client.js';
import { paymentAmount, sumMoney } from './settlement-money.js';

type Tx = Prisma.TransactionClient;
type Actor = { id: number; fullName: string };

export class SettlementError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function positiveId(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function calendarDay(value: unknown): Date {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) {
    throw new SettlementError(400, 'Tarih YYYY-AA-GG biçiminde olmalı.');
  }
  const date = new Date(`${value}T00:00:00+03:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 10800000).toISOString().slice(0, 10) !== value) {
    throw new SettlementError(400, 'Geçersiz takvim tarihi.');
  }
  return date;
}

export function periodBounds(start: unknown, end: unknown) {
  const periodStart = calendarDay(start);
  const periodEnd = new Date(calendarDay(end).getTime() + 86400000);
  if (periodStart >= periodEnd) throw new SettlementError(400, 'Başlangıç, bitişten sonra olamaz.');
  return { periodStart, periodEnd };
}

export async function logSettlement(tx: Tx, actor: Actor, action: string, entityType: string, entityId: number, details: object) {
  await tx.activityLog.create({ data: { userName: actor.fullName, action, entityType, entityId, details: JSON.stringify(details) } });
}

async function period(tx: Tx, id: number) {
  const value = await tx.paymentPeriod.findUnique({ where: { id } });
  if (!value) throw new SettlementError(404, 'Ödeme dönemi bulunamadı.');
  return value;
}

async function movePeriod(tx: Tx, current: Awaited<ReturnType<typeof period>>, from: string, data: Prisma.PaymentPeriodUncheckedUpdateManyInput) {
  if (current.status !== from) throw new SettlementError(409, 'Dönem bu işleme uygun değil. Listeyi yenileyin.');
  const result = await tx.paymentPeriod.updateMany({ where: { id: current.id, status: current.status, updatedAt: current.updatedAt }, data });
  if (result.count !== 1) throw new SettlementError(409, 'Dönem başka bir işlem tarafından değiştirildi.');
}

export async function preparePeriod(tx: Tx, id: number, actor: Actor) {
  const current = await period(tx, id);
  // Claim the period before selecting entries. Serializable isolation also protects
  // overlapping periods. Conflicts roll back this claim together with all entries.
  await movePeriod(tx, current, 'TASLAK', { status: 'HAZIR' });
  const where = { status: 'HAK_EDILDI' as const, paymentId: null, paymentPeriodId: null, earnedAt: { gte: current.periodStart, lt: current.periodEnd } };
  const entries = await tx.compensationEntry.findMany({ where, select: { id: true, amount: true } });
  if (!entries.length) throw new SettlementError(409, 'Bu tarihlerde döneme alınabilecek kazanım yok.');
  const claim = await tx.compensationEntry.updateMany({ where: { ...where, id: { in: entries.map(entry => entry.id) } }, data: { status: 'ODEME_BEKLIYOR', paymentPeriodId: id } });
  if (claim.count !== entries.length) throw new SettlementError(409, 'Kazanımlar başka bir döneme alındı.');
  await logSettlement(tx, actor, 'PAYMENT_PERIOD_PREPARED', 'PaymentPeriod', id, { entryCount: entries.length, totalAmount: sumMoney(entries.map(entry => entry.amount)) });
}

export async function settlePeriod(tx: Tx, id: number, actor: Actor) {
  const current = await period(tx, id);
  const now = new Date();
  await movePeriod(tx, current, 'HAZIR', { status: 'ONAYLANDI', approvedByUserId: actor.id, approvedAt: now });
  const entries = await tx.compensationEntry.findMany({ where: { paymentPeriodId: id }, select: { id: true, userId: true, amount: true, paymentId: true, status: true } });
  if (!entries.length || entries.some(entry => entry.paymentId !== null || entry.status !== 'ODEME_BEKLIYOR')) {
    throw new SettlementError(409, 'Dönem kazanımları mutabakata uygun değil.');
  }
  const groups = new Map<number, typeof entries>();
  for (const entry of entries) {
    const group = groups.get(entry.userId);
    if (group) group.push(entry); else groups.set(entry.userId, [entry]);
  }
  for (const [beneficiaryUserId, group] of groups) {
    const amount = paymentAmount(group.map(entry => entry.amount));
    const payment = await tx.payment.create({ data: { authorUserId: beneficiaryUserId, paymentPeriodId: id, amount, status: 'Bekliyor' } });
    const attached = await tx.compensationEntry.updateMany({ where: { id: { in: group.map(entry => entry.id) }, userId: beneficiaryUserId, paymentPeriodId: id, paymentId: null, status: 'ODEME_BEKLIYOR' }, data: { paymentId: payment.id, status: 'ODEMEYE_ALINDI', approvedAt: now } });
    if (attached.count !== group.length) throw new SettlementError(409, 'Kazanımlar başka bir ödeme işleminde kullanıldı.');
    await logSettlement(tx, actor, 'PAYMENT_CREATED_FROM_SETTLEMENT', 'Payment', payment.id, { paymentPeriodId: id, beneficiaryUserId, entryCount: group.length, amount });
  }
  await logSettlement(tx, actor, 'PAYMENT_PERIOD_SETTLED', 'PaymentPeriod', id, { previousStatus: 'HAZIR', entryCount: entries.length, beneficiaryCount: groups.size, totalAmount: sumMoney(entries.map(entry => entry.amount)) });
}

export async function cancelPeriod(tx: Tx, id: number, actor: Actor, reason: string) {
  const current = await period(tx, id);
  if (!['TASLAK', 'HAZIR'].includes(current.status)) throw new SettlementError(409, 'Yalnız taslak veya hazır dönem iptal edilebilir.');
  await movePeriod(tx, current, current.status, { status: 'IPTAL' });
  const entries = await tx.compensationEntry.findMany({ where: { paymentPeriodId: id }, select: { id: true, status: true, paymentId: true } });
  if (entries.some(entry => entry.status !== 'ODEME_BEKLIYOR' || entry.paymentId !== null)) throw new SettlementError(409, 'Dönemde kesinleşmiş ödeme var.');
  const released = await tx.compensationEntry.updateMany({ where: { paymentPeriodId: id, paymentId: null, status: 'ODEME_BEKLIYOR' }, data: { status: 'HAK_EDILDI', paymentPeriodId: null } });
  if (released.count !== entries.length) throw new SettlementError(409, 'Dönem kazanımları değişti.');
  await logSettlement(tx, actor, 'PAYMENT_PERIOD_CANCELLED', 'PaymentPeriod', id, { reason, releasedEntryIds: entries.map(entry => entry.id) });
}

export async function closePeriod(tx: Tx, id: number, actor: Actor) {
  const current = await period(tx, id);
  await movePeriod(tx, current, 'ONAYLANDI', { status: 'KAPANDI', closedByUserId: actor.id, closedAt: new Date() });
  const payments = await tx.payment.findMany({ where: { paymentPeriodId: id }, select: { id: true, status: true, amount: true, authorUserId: true } });
  if (!payments.length || payments.some(payment => !['Odendi', 'Iptal'].includes(payment.status))) throw new SettlementError(409, 'Tamamlanmamış ödemeler varken dönem kapatılamaz.');
  for (const payment of payments) {
    const entries = await tx.compensationEntry.findMany({ where: { paymentId: payment.id }, select: { amount: true, status: true, paidAt: true, userId: true, paymentPeriodId: true } });
    if (payment.status === 'Iptal') {
      if (entries.length) throw new SettlementError(409, 'İptal ödemeye bağlı kazanım var.');
    } else if (!entries.length || entries.some(entry => entry.status !== 'ODENDI' || !entry.paidAt || entry.userId !== payment.authorUserId || entry.paymentPeriodId !== id) || sumMoney(entries.map(entry => entry.amount)) !== payment.amount.toFixed(2)) {
      throw new SettlementError(409, 'Ödeme ve kazanım mutabakatı eşleşmiyor.');
    }
  }
  await logSettlement(tx, actor, 'PAYMENT_PERIOD_CLOSED', 'PaymentPeriod', id, { paymentCount: payments.length });
}
