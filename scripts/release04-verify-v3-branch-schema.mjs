// RELEASE-04: ephemeral PostgreSQL CI attestation; NEVER run this against Neon/Production.
// Retains the historical IL role and proves BRANS is added, not renamed.
import { Client } from 'pg';
const raw = process.env.DATABASE_URL;
if (!raw) throw new Error('Missing ephemeral CI DATABASE_URL');
const uri = new URL(raw);
if (!['localhost', '127.0.0.1'].includes(uri.hostname) || uri.pathname !== '/prolig_release03_ci')
  throw new Error('RELEASE04_SCHEMA_CHECK_LOCAL_CI_ONLY');

const db = new Client({ connectionString: raw });
await db.connect();
try {
  const {rows} = await db.query(`SELECT
    (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='Task' AND column_name='targetQuestionCount') AS task_target,
    (SELECT COUNT(*)::int FROM information_schema.columns WHERE table_name='Question' AND column_name='taskId' AND is_nullable='YES') AS task_relation,
    (SELECT COUNT(*)::int FROM pg_enum WHERE enumtypid='"RoleCode"'::regtype) AS enum_count,
    (SELECT COUNT(*)::int FROM pg_enum WHERE enumtypid='"RoleCode"'::regtype AND enumlabel='IL_KOORDINATORU') AS historical_il,
    (SELECT COUNT(*)::int FROM pg_enum WHERE enumtypid='"RoleCode"'::regtype AND enumlabel='BRANS_KOORDINATORU') AS new_branch,
    (SELECT COUNT(*)::int FROM "Role" WHERE code='BRANS_KOORDINATORU') AS branch_role,
    (SELECT COUNT(*)::int FROM "_prisma_migrations"
      WHERE migration_name='20261029010000_task_question_production_v3' AND finished_at IS NOT NULL) AS v3_applied,
    (SELECT COUNT(*)::int FROM "_prisma_migrations"
      WHERE migration_name='20261031010000_release04_expand_branch_coordinator_enum' AND finished_at IS NOT NULL) AS branch_enum_applied,
    (SELECT COUNT(*)::int FROM "_prisma_migrations"
      WHERE migration_name='20261031011000_release04_seed_branch_coordinator_role' AND finished_at IS NOT NULL) AS branch_seed_applied,
    (SELECT COUNT(*)::int FROM "_prisma_migrations"
      WHERE migration_name LIKE '20261027010000_branch%' OR migration_name LIKE '20261029030000_unit%') AS forbidden_migrations,
    to_regclass('"PrivateGeometryAsset"') IS NOT NULL AS has_p3,
    to_regclass('"ProjectUnitPlan"') IS NOT NULL AS has_v4`);
  const x = rows[0];
  const expected = ['task_target','task_relation','historical_il','new_branch','branch_role','v3_applied','branch_enum_applied','branch_seed_applied'];
  if (expected.some(k => x[k] !== 1) || x.enum_count !== 7 || x.has_v4 || x.has_p3 || x.forbidden_migrations !== 0)
    throw new Error('RELEASE04_SCHEMA_INVARIANTS_FAIL: ' + JSON.stringify(x));
  const {rows: constraints} = await db.query(`SELECT COUNT(*)::int AS n FROM information_schema.table_constraints
     WHERE table_name='Question' AND constraint_type='FOREIGN KEY'`);
  if (constraints[0].n < 2) throw new Error('Question foreign-key constraints missing');
  console.log('RELEASE04_CI_SCHEMA PASS: V3 + additive branch role + historical IL retained.');
  console.log('WARNING: This isolated CI does NOT certify Production migration path. P3 Preview-only migration must be excluded before live release.');
} finally {
  await db.end();
}
