import 'dotenv/config';
import pg from 'pg';

// Read-only schema diagnostics. Never logs credentials or mutates any data.
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Run this only against an isolated development/test database.');
  process.exitCode = 2;
} else if (process.env.PROLIG_PILOT_DB_CONFIRMED !== 'true') {
  console.error('PROLIG_PILOT_DB_CONFIRMED=true is required for the explicitly designated pilot database.');
  process.exitCode = 2;
} else {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const tables = await client.query(
      "SELECT to_regclass('public.\"UserBranchAssignment\"')::text AS branch_assignment, to_regclass('public.\"_prisma_migrations\"')::text AS migration_table"
    );
    const row = tables.rows[0];
    console.log('UserBranchAssignment:', row.branch_assignment ? 'present' : 'MISSING');
    console.log('_prisma_migrations:', row.migration_table ? 'present' : 'MISSING');
    if (row.migration_table) {
      const migrations = await client.query(
        "SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations WHERE migration_name ILIKE '%branch%' ORDER BY migration_name"
      );
      console.log('Branch-related migration statuses:', JSON.stringify(migrations.rows));
    }
    if (!row.branch_assignment) {
      console.error('Schema mismatch: diagnose pending/failed migration. Do not reset database or remove branch authorization fields.');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Read-only schema diagnostic failed:', error instanceof Error ? error.name + ': ' + error.message : 'unknown error');
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}
