#!/usr/bin/env node
/**
 * UX-03 Production schema inventory — READ-ONLY, operator-run only.
 * No migration, authentication action, credential output, or data export.
 * Never infer a production database from an unrelated Neon integration.
 */
import pg from 'pg';
const { Client } = pg;

const expectedHost = process.env.PROLIG_EXPECTED_PRODUCTION_DB_HOST;
const expectedDb = process.env.PROLIG_EXPECTED_PRODUCTION_DB_NAME;
const dsn = process.env.DATABASE_URL;
function stop(reason, exitCode = 2) {
  console.error('UX03_PROD_PREFLIGHT: ' + reason);
  process.exit(exitCode);
}
if (process.env.PROLIG_UX03_READONLY_PREFLIGHT !== 'YES') {
  stop('BLOCKED: explicit read-only operator flag required.');
}
if (!dsn || !expectedHost || !expectedDb) {
  stop('BLOCKED: operator must provide production DB connection and exact expected host/database.');
}
let target;
try { target = new URL(dsn); } catch { stop('BLOCKED: invalid DATABASE_URL format.'); }
if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
    target.hostname !== expectedHost ||
    decodeURIComponent(target.pathname) !== '/' + expectedDb ||
    !target.username || !target.password) {
  stop('BLOCKED: target host/database does not exactly match operator-approved Production identity.');
}
if (expectedDb === 'ux02_test' || /(?:^|[-_])test(?:$|[-_])/i.test(expectedDb)) {
  stop('BLOCKED: production preflight must not inspect an isolated TEST database.');
}
const client = new Client({ connectionString: dsn, application_name: 'prolig-ux03-schema-readonly' });
let begun = false;
try {
  await client.connect();
  await client.query('BEGIN TRANSACTION READ ONLY');
  begun = true;
  await client.query("SET LOCAL statement_timeout = '5000ms'");
  const result = await client.query(`
    SELECT
      current_database() = $1 AS target_database_matches,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User') AS user_table,
      EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='User' AND column_name='authVersion'
          AND data_type='integer' AND is_nullable='NO') AS auth_version,
      EXISTS (SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='PasswordResetToken') AS token_table,
      EXISTS (SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='PasswordResetRate') AS rate_table,
      EXISTS (SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='_prisma_migrations') AS migration_table
  `, [expectedDb]);
  const s = result.rows[0];
  let migrationRecorded = false;
  if (s.migration_table) {
    const history = await client.query(`
      SELECT EXISTS (SELECT 1 FROM public."_prisma_migrations"
        WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied
    `, ['20261024010000_ux03_password_recovery']);
    migrationRecorded = history.rows[0].applied === true;
  }
  await client.query('ROLLBACK');
  begun = false;
  const report = {
    mode: 'READ_ONLY',
    databaseIdentityMatches: s.target_database_matches === true,
    userTable: s.user_table === true,
    authVersionColumn: s.auth_version === true,
    resetTokenTable: s.token_table === true,
    resetRateTable: s.rate_table === true,
    prismaMigrationTable: s.migration_table === true,
    ux03MigrationRecorded: migrationRecorded,
  };
  const schemaReady = Object.values(report).every(value => value === true || value === 'READ_ONLY');
  console.log(JSON.stringify({ ...report, schemaReady, productionReleaseApproved: false }, null, 2));
  if (!schemaReady) process.exitCode = 2;
} catch {
  console.error('UX03_PROD_PREFLIGHT: BLOCKED: read-only inspection failed. No credentials or server error details printed.');
  process.exitCode = 2;
} finally {
  if (begun) { try { await client.query('ROLLBACK'); } catch { /* already disconnected */ } }
  await client.end().catch(() => {});
}
