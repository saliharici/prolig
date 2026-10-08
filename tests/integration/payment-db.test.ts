import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DB integration NOT RUN: DATABASE_URL is required');
  describe.skip('Payment DB Integration', () => { it('skipped', () => {}); });
} else if (process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true') {
  console.warn('DB integration NOT RUN: PROLIG_PILOT_DB_CONFIRMED=true is required');
  describe.skip('Payment DB Integration', () => { it('skipped', () => {}); });
} else {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  describe('Payment DB Integration', () => {
    afterAll(async () => {
      await prisma.$disconnect();
      await pool.end();
    });

    it('has exactly one canonical payment record assigned correctly', async () => {
      const payments = await prisma.payment.findMany({
        where: { contractNo: 'PILOT-HAK-001' },
        include: { authorUser: true, project: true }
      });

      expect(payments.length).toBe(1);
      const payment = payments[0];
      
      expect(payment.authorUser.email).toBe('pilot.yazar@prolig.local');
      expect(payment.project?.code).toBe('PILOT-MAT-8-001');
      expect(payment.amount.toFixed(2)).toBe('1000.00');
      expect(['Bekliyor', 'Onaylandi', 'Odendi', 'Iptal']).toContain(payment.status);
    });
  });
}
