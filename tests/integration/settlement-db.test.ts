import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { PrismaClient, type Prisma } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { preparePeriod, settlePeriod, closePeriod, periodBounds } from '../../api/v1/_lib/payment-periods.js';
import { transitionPayment } from '../../api/v1/_lib/payment-settlement.js';

const connectionString = process.env.SETTLEMENT_TEST_DATABASE_URL;
const allowed = connectionString && process.env.PROLIG_SETTLEMENT_TEST_DB_CONFIRMED === 'true' && ['127.0.0.1', 'localhost'].includes(new URL(connectionString).hostname);
// Requires a NEW, disposable localhost database. Never uses DATABASE_URL or Pilot/production credentials.
describe.skipIf(!allowed)('Settlement database transactions (disposable localhost DB)', () => {
  let pool: Pool;
  let db: PrismaClient;
  let actor: { id: number; fullName: string };
  let writerId: number;
  let ruleId: number;
  let legacyBefore: any;
  let legacyId: number;
  let sequence = 0;
  beforeAll(async () => {
    pool = new Pool({ connectionString, max: process.env.SETTLEMENT_TEST_SINGLE_CONNECTION === 'true' ? 1 : 8 });
    // Refuse nonempty databases rather than resetting or dropping anything.
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    if (tables.rows.length) throw new Error('A fresh disposable database is required');
    const root = new URL('../../prisma/migrations/', import.meta.url);
    const migrations = readdirSync(root).filter(name => /^\d/.test(name)).sort();
    const next = migrations.find(name => name.endsWith('_payment_period_settlement'))!;
    for (const name of migrations.filter(name => name !== next)) await pool.query(readFileSync(new URL(`${name}/migration.sql`, root), 'utf8'));
    const role = await pool.query(`INSERT INTO "Role" ("code", "name") VALUES ('MUHASEBE', 'Test muhasebe') RETURNING id`);
    const user = await pool.query(`INSERT INTO "User" ("username", "email", "fullName", "roleId", "updatedAt") VALUES ('settlement_test_accounting', 'settlement-accounting@test.invalid', 'Test Muhasebe', $1, NOW()) RETURNING id`, [role.rows[0].id]);
    actor = { id: user.rows[0].id, fullName: 'Test Muhasebe' };
    const legacy = await pool.query(`INSERT INTO "Payment" ("authorUserId", "amount", "status", "updatedAt", "notes") VALUES ($1, 123.45, 'Odendi', NOW(), 'migration preservation fixture') RETURNING *`, [actor.id]);
    legacyBefore = legacy.rows[0]; legacyId = legacyBefore.id;
    await pool.query(readFileSync(new URL(`${next}/migration.sql`, root), 'utf8'));
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
    const writerRole = await db.role.create({ data: { code: 'YAZAR', name: 'Test yazar' } });
    const writer = await db.user.create({ data: { username: 'settlement_test_writer', email: 'settlement-writer@test.invalid', fullName: 'Test Yazar', roleId: writerRole.id } });
    writerId = writer.id;
    ruleId = (await db.compensationRule.create({ data: { roleCode: 'YAZAR', earningType: 'QUESTION_AUTHOR', unitType: 'QUESTION', unitPrice: '0.10', createdByUserId: actor.id } })).id;
  }, 30000);
  afterAll(async () => { await db?.$disconnect(); await pool?.end(); });

  async function fixture() {
    const n = ++sequence;
    const bounds = periodBounds('2026-10-01', '2026-10-31');
    const period = await db.paymentPeriod.create({ data: { code: `DB-TEST-${n}`, name: `Test ${n}`, ...bounds, createdByUserId: actor.id } });
    const entries = await Promise.all(['0.10', '0.20'].map((amount, i) => db.compensationEntry.create({ data: { userId: writerId, roleCode: 'YAZAR', earningType: 'QUESTION_AUTHOR', ruleId, sourceKey: `db-${n}-${i}`, unitPrice: amount, amount, earnedAt: new Date('2026-10-10T10:00:00Z') } })));
    return { period, entries };
  }
  const transact = <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) => db.$transaction(fn, { isolationLevel: 'Serializable', timeout: 30000 });

  it('preserves every legacy Payment column through the additive migration', async () => {
    const after = (await pool.query('SELECT * FROM "Payment" WHERE id=$1', [legacyId])).rows[0];
    expect(after).toEqual({ ...legacyBefore, paymentPeriodId: null });
  });
  it('settles exact totals, pays every entry atomically and keeps price snapshots', async () => {
    const { period, entries } = await fixture();
    await transact(tx => preparePeriod(tx, period.id, actor));
    await transact(tx => settlePeriod(tx, period.id, actor));
    const payment = await db.payment.findFirstOrThrow({ where: { paymentPeriodId: period.id } });
    expect(payment.amount.toFixed(2)).toBe('0.30');
    await transact(tx => transitionPayment(tx, payment.id, 'approve', actor));
    await transact(tx => transitionPayment(tx, payment.id, 'pay', actor));
    const paid = await db.compensationEntry.findMany({ where: { paymentId: payment.id }, orderBy: { id: 'asc' } });
    expect(paid).toHaveLength(2);
    paid.forEach((entry, i) => {
      expect(entry.status).toBe('ODENDI'); expect(entry.paidAt).not.toBeNull();
      expect(entry.unitPrice.toFixed(2)).toBe(entries[i].unitPrice.toFixed(2));
      expect(entry.amount.toFixed(2)).toBe(entries[i].amount.toFixed(2)); expect(entry.ruleId).toBe(ruleId);
    });
    await expect(transact(tx => settlePeriod(tx, period.id, actor))).rejects.toMatchObject({ status: 409 });
    expect(await db.payment.count({ where: { paymentPeriodId: period.id } })).toBe(1);
    await transact(tx => closePeriod(tx, period.id, actor));
    expect((await db.paymentPeriod.findUniqueOrThrow({ where: { id: period.id } })).status).toBe('KAPANDI');
  });
  it('rolls back period state, payments and logs if settlement fails after payment creation', async () => {
    const { period } = await fixture();
    await transact(tx => preparePeriod(tx, period.id, actor));
    const beforeLogs = await db.activityLog.count();
    await expect(transact(async tx => { await settlePeriod(tx, period.id, actor); throw new Error('injected failure'); })).rejects.toThrow('injected failure');
    expect(await db.payment.count({ where: { paymentPeriodId: period.id } })).toBe(0);
    expect((await db.paymentPeriod.findUniqueOrThrow({ where: { id: period.id } })).status).toBe('HAZIR');
    expect(await db.compensationEntry.count({ where: { paymentPeriodId: period.id, status: 'ODEME_BEKLIYOR', paymentId: null } })).toBe(2);
    expect(await db.activityLog.count()).toBe(beforeLogs);
    await transact(tx => settlePeriod(tx, period.id, actor));
  });
  it('rolls back paid flags and timestamps when the payment transaction fails', async () => {
    const { period } = await fixture();
    await transact(tx => preparePeriod(tx, period.id, actor)); await transact(tx => settlePeriod(tx, period.id, actor));
    const payment = await db.payment.findFirstOrThrow({ where: { paymentPeriodId: period.id } });
    await transact(tx => transitionPayment(tx, payment.id, 'approve', actor));
    await expect(transact(async tx => { await transitionPayment(tx, payment.id, 'pay', actor); throw new Error('injected failure'); })).rejects.toThrow('injected failure');
    expect((await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('Onaylandi');
    expect(await db.compensationEntry.count({ where: { paymentId: payment.id, status: 'ODEMEYE_ALINDI', paidAt: null } })).toBe(2);
    await transact(tx => transitionPayment(tx, payment.id, 'cancel', actor, 'Test cancellation'));
  });
  it.skipIf(process.env.SETTLEMENT_TEST_SINGLE_CONNECTION === 'true')('racing settlement transactions create only one beneficiary payment', async () => {
    const { period } = await fixture();
    await transact(tx => preparePeriod(tx, period.id, actor));
    const results = await Promise.allSettled([transact(tx => settlePeriod(tx, period.id, actor)), transact(tx => settlePeriod(tx, period.id, actor))]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(await db.payment.count({ where: { paymentPeriodId: period.id } })).toBe(1);
  });
});
