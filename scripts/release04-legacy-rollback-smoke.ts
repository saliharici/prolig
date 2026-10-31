/**
 * Run ONLY inside the exact deployed legacy main revision checked out into
 * a disposable directory on GitHub's ephemeral PostgreSQL CI.
 * Proves core old-Prisma reads continue after the additive RELEASE-04 schema.
 * Does not validate a Neon branch restore or Vercel promotion/rollback.
 */
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const raw = process.env.DATABASE_URL ?? '';
let target: URL;
try { target = new URL(raw); } catch { throw new Error('RELEASE04_LEGACY_SMOKE_INVALID_CI_URL'); }
if (process.env.CI !== 'true' || !['127.0.0.1','localhost'].includes(target.hostname) ||
    target.pathname !== '/prolig_release03_ci') {
  throw new Error('RELEASE04_LEGACY_SMOKE_EPHEMERAL_CI_ONLY');
}
const pool = new Pool({connectionString: raw});
const db = new PrismaClient({adapter: new PrismaPg(pool)});
try {
  // The ephemeral migration chain does not run the application's historic
  // data seed. Production already has this role; initialize only this isolated
  // smoke fixture before exercising the old generated Prisma client.
  const provinceRole = await db.role.upsert({
    where: {code: 'IL_KOORDINATORU'},
    create: {code: 'IL_KOORDINATORU', name: 'İl Koordinatörü', permissions: []},
    update: {}
  });
  if (!provinceRole) throw new Error('LEGACY_IL_ROLE_MISSING');
  const created = await db.user.create({data: {
    username:'ci-release04-legacy', email:'ci-release04-legacy@invalid.example',
    fullName:'Release 04 CI Legacy', status:'Aktif',
    role: {connect: {code:'IL_KOORDINATORU'}}
  }});
  const read = await db.user.findUnique({
    where: {id: created.id}, include: {role: true, branchAssignments:true}
  });
  if (read?.role.code !== 'IL_KOORDINATORU' || read?.email !== created.email) {
    throw new Error('LEGACY_ROLE_USER_READ_FAILED');
  }
  const [users,projects,questions,books,entries,payments] = await Promise.all([
    db.user.count(),db.project.count(),db.question.count(),db.book.count(),
    db.compensationEntry.count(),db.payment.count()
  ]);
  if (users !== 1 || [projects,questions,books,entries,payments].some(v => v !== 0)) {
    throw new Error('LEGACY_AGGREGATE_MISMATCH');
  }
  console.log('RELEASE04_LEGACY_APP_DB_COMPAT_PASS: old Prisma user+IL role/read and key aggregates on expanded ephemeral schema.');
  console.log('This does NOT verify live restore, old Vercel runtime environment, or post-activation rollback.');
} finally {
  await db.$disconnect();
  await pool.end();
}
