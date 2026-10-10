import { beforeEach, describe, expect, it, vi } from 'vitest';
import { periodBounds, preparePeriod, settlePeriod, cancelPeriod, closePeriod } from '../api/v1/_lib/payment-periods.js';
import { transitionPayment } from '../api/v1/_lib/payment-settlement.js';
import { cents, sumMoney, paymentAmount } from '../api/v1/_lib/settlement-money.js';

const actor = { id: 9, fullName: 'Muhasebe' };
const amount = (value: string) => ({ toString: () => value, toFixed: () => value });
const draft = { id: 4, status: 'TASLAK', updatedAt: new Date(), ...periodBounds('2026-10-01', '2026-10-31') };
const entry = (id: number, userId: number, value: string) => ({ id, userId, amount: amount(value), paymentId: null, status: 'ODEME_BEKLIYOR', paymentPeriodId: 4 });
let tx: any;
beforeEach(() => {
  tx = {
    paymentPeriod: { findUnique: vi.fn().mockResolvedValue(draft), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    compensationEntry: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    payment: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn(), create: vi.fn().mockResolvedValue({ id: 55 }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    activityLog: { create: vi.fn() }
  };
});

describe('Settlement money and Istanbul calendar boundaries', () => {
  it('sums Decimal snapshots exactly and guards payment storage overflow', () => {
    expect(sumMoney([amount('0.10'), amount('0.20')])).toBe('0.30');
    expect(paymentAmount([amount('9999999999.98'), amount('0.01')])).toBe('9999999999.99');
    expect(() => paymentAmount([amount('9999999999.99'), amount('0.01')])).toThrow('INVALID_AMOUNT');
    expect(() => paymentAmount([amount('0.00')])).toThrow('INVALID_AMOUNT');
    for (const invalid of ['-1', '1.234', 'NaN']) expect(() => cents(amount(invalid))).toThrow();
  });
  it('includes the full last Istanbul day with an exclusive UTC end', () => {
    const bounds = periodBounds('2026-10-01', '2026-10-31');
    expect(bounds.periodStart.toISOString()).toBe('2026-09-30T21:00:00.000Z');
    expect(bounds.periodEnd.toISOString()).toBe('2026-10-31T21:00:00.000Z');
    expect(periodBounds('2026-10-10', '2026-10-10').periodEnd.getTime() - periodBounds('2026-10-10', '2026-10-10').periodStart.getTime()).toBe(86400000);
    for (const [start, end] of [['2026-02-30', '2026-03-01'], ['2026-13-01', '2026-13-02'], ['2026-10-10', '2026-10-09'], ['2026-10-01T00:00:00Z', '2026-10-31']]) expect(() => periodBounds(start, end)).toThrow();
  });
});

describe('Payment period preparation and settlement', () => {
  it('claims only unreserved earned snapshots within the date range', async () => {
    tx.compensationEntry.findMany.mockResolvedValue([entry(1, 2, '0.10')]);
    tx.compensationEntry.updateMany.mockResolvedValue({ count: 1 });
    await preparePeriod(tx, 4, actor);
    expect(tx.compensationEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'HAK_EDILDI', paymentId: null, paymentPeriodId: null, earnedAt: { gte: draft.periodStart, lt: draft.periodEnd } } }));
    expect(tx.compensationEntry.updateMany.mock.calls[0][0].data).toEqual({ status: 'ODEME_BEKLIYOR', paymentPeriodId: 4 });
  });
  it('rejects empty preparations and a lost claim', async () => {
    await expect(preparePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
    tx.compensationEntry.findMany.mockResolvedValue([entry(1, 2, '1.00')]);
    tx.compensationEntry.updateMany.mockResolvedValue({ count: 0 });
    await expect(preparePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
    expect(tx.activityLog.create).not.toHaveBeenCalled();
  });
  it('creates one payment per beneficiary with exact snapshot sums and no price mutation', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'HAZIR' });
    tx.compensationEntry.findMany.mockResolvedValue([entry(1, 2, '0.10'), entry(2, 2, '0.20'), entry(3, 3, '25.01')]);
    tx.compensationEntry.updateMany.mockImplementation(async (args: any) => ({ count: args.where.id.in.length }));
    await settlePeriod(tx, 4, actor);
    expect(tx.payment.create.mock.calls.map((call: any) => call[0].data)).toEqual([
      { authorUserId: 2, paymentPeriodId: 4, amount: '0.30', status: 'Bekliyor' },
      { authorUserId: 3, paymentPeriodId: 4, amount: '25.01', status: 'Bekliyor' }
    ]);
    for (const [args] of tx.compensationEntry.updateMany.mock.calls) {
      expect(args.where.paymentId).toBeNull();
      expect(Object.keys(args.data).sort()).toEqual(['approvedAt', 'paymentId', 'status']);
    }
    expect(tx.activityLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'PAYMENT_PERIOD_SETTLED' }) }));
  });
  it.each(['HAK_EDILDI', 'ODENDI', 'IPTAL', 'ODEMEYE_ALINDI'])('rejects non-queued entry state %s', async status => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'HAZIR' });
    tx.compensationEntry.findMany.mockResolvedValue([{ ...entry(1, 2, '1.00'), status }]);
    await expect(settlePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
  it('rejects an entry already bound to another payment', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'HAZIR' });
    tx.compensationEntry.findMany.mockResolvedValue([{ ...entry(1, 2, '1.00'), paymentId: 99 }]);
    await expect(settlePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
  });
  it('rejects a concurrent period claim before creating payments', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'HAZIR' });
    tx.paymentPeriod.updateMany.mockResolvedValue({ count: 0 });
    await expect(settlePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
  it('rejects a concurrent entry attachment before writing success logs', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'HAZIR' });
    tx.compensationEntry.findMany.mockResolvedValue([entry(1, 2, '1.00')]);
    tx.compensationEntry.updateMany.mockResolvedValue({ count: 0 });
    await expect(settlePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
    expect(tx.activityLog.create).not.toHaveBeenCalled();
  });
  it.each(['TASLAK', 'ONAYLANDI', 'KAPANDI', 'IPTAL'])('refuses settling period in %s state', async status => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status });
    await expect(settlePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
    expect(tx.payment.create).not.toHaveBeenCalled();
  });
  it('releases prepared entries on cancellation without changing their snapshot', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'HAZIR' });
    tx.compensationEntry.findMany.mockResolvedValue([entry(1, 2, '1.00')]);
    tx.compensationEntry.updateMany.mockResolvedValue({ count: 1 });
    await cancelPeriod(tx, 4, actor, 'Yanlış tarih');
    expect(tx.compensationEntry.updateMany.mock.calls[0][0].data).toEqual({ status: 'HAK_EDILDI', paymentPeriodId: null });
    expect(tx.activityLog.create.mock.calls[0][0].data.details).toContain('releasedEntryIds');
  });
  it('refuses closure before every payment is completed', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'ONAYLANDI' });
    tx.payment.findMany.mockResolvedValue([{ id: 55, status: 'Onaylandi' }]);
    await expect(closePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
  });
  it('requires paid entries to reconcile when closing a period', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'ONAYLANDI' });
    tx.payment.findMany.mockResolvedValue([{ id: 55, status: 'Odendi', amount: amount('1.00'), authorUserId: 2 }]);
    tx.compensationEntry.findMany.mockResolvedValue([{ ...entry(1, 2, '1.00'), status: 'ODENDI', paidAt: new Date() }]);
    await closePeriod(tx, 4, actor);
    expect(tx.activityLog.create).toHaveBeenCalled();
    tx.compensationEntry.findMany.mockResolvedValue([{ ...entry(1, 2, '2.00'), status: 'ODENDI', paidAt: new Date() }]);
    await expect(closePeriod(tx, 4, actor)).rejects.toMatchObject({ status: 409 });
  });
});

describe('Payment reconciliation', () => {
  beforeEach(() => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'ONAYLANDI' });
    tx.payment.findUnique.mockResolvedValue({ status: 'Onaylandi', updatedAt: new Date(), amount: amount('0.30'), authorUserId: 2, paymentPeriodId: 4 });
    tx.compensationEntry.findMany.mockResolvedValue([{ ...entry(1, 2, '0.10'), status: 'ODEMEYE_ALINDI' }, { ...entry(2, 2, '0.20'), status: 'ODEMEYE_ALINDI' }]);
    tx.compensationEntry.updateMany.mockResolvedValue({ count: 2 });
  });
  it('updates payment and all entries with the same paid timestamp', async () => {
    await transitionPayment(tx, 55, 'pay', actor);
    const payment = tx.payment.updateMany.mock.calls[0][0];
    const entries = tx.compensationEntry.updateMany.mock.calls[0][0];
    expect(payment.data.status).toBe('Odendi');
    expect(entries.data).toEqual({ status: 'ODENDI', paidAt: payment.data.paymentDate });
  });
  it('rejects mismatched totals, beneficiaries, periods or entry states', async () => {
    for (const override of [{ amount: amount('9.99') }, { userId: 7 }, { paymentPeriodId: 99 }, { status: 'ODENDI' }]) {
      tx.compensationEntry.findMany.mockResolvedValue([{ ...entry(1, 2, '0.30'), status: 'ODEMEYE_ALINDI', ...override }]);
      await expect(transitionPayment(tx, 55, 'pay', actor)).rejects.toMatchObject({ status: 409 });
    }
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });
  it('throws to roll back payment when any entry update loses its claim', async () => {
    tx.compensationEntry.updateMany.mockResolvedValue({ count: 1 });
    await expect(transitionPayment(tx, 55, 'pay', actor)).rejects.toMatchObject({ status: 409 });
    expect(tx.activityLog.create).not.toHaveBeenCalled();
  });
  it('cancels unpaid payment and releases its entries for a new period', async () => {
    await transitionPayment(tx, 55, 'cancel', actor, 'Banka hesabı hatalı');
    expect(tx.payment.updateMany.mock.calls[0][0].data).toEqual({ status: 'Iptal' });
    expect(tx.compensationEntry.updateMany.mock.calls[0][0].data).toEqual({ status: 'HAK_EDILDI', paymentId: null, paymentPeriodId: null, approvedAt: null });
  });
  it('rejects mutations in closed periods and cancelling already paid payments', async () => {
    tx.paymentPeriod.findUnique.mockResolvedValue({ ...draft, status: 'KAPANDI' });
    await expect(transitionPayment(tx, 55, 'pay', actor)).rejects.toMatchObject({ status: 409 });
    tx.payment.findUnique.mockResolvedValue({ status: 'Odendi' });
    await expect(transitionPayment(tx, 55, 'cancel', actor, 'Gerekçe')).rejects.toMatchObject({ status: 409 });
  });
});
