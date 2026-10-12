#!/usr/bin/env node
/**
 * P1-D fail-closed isolated pilot verification. Default: read-only identity
 * preflight. Explicit --run-integration + PROLIG_P1D_ALLOW_WRITES=true is
 * required for the temporary-question integration suite.
 * Never logs connection strings, secrets or test data.
 */
import 'dotenv/config';
import pg from 'pg';
import { spawnSync } from 'node:child_process';

const fail = message => {
  console.error('P1-D PILOT SAFETY GATE: FAIL — ' + message);
  process.exitCode = 2;
};
const { DATABASE_URL, PROLIG_PILOT_DB_CONFIRMED, PROLIG_P1D_DB_NAME, PROLIG_P1D_DB_HOST, AUTH_SECRET, PROLIG_P1D_ALLOW_WRITES } = process.env;
const args = process.argv.slice(2);
const runIntegration = args.length === 1 && args[0] === '--run-integration';
const unknownArgs = args.length !== 0 && !runIntegration;
if (unknownArgs) {
  fail('Unknown argument. Use no arguments for read-only preflight or --run-integration for a separately authorized write test.');
} else if (runIntegration && PROLIG_P1D_ALLOW_WRITES !== 'true') {
  fail('Write test not authorized. Set PROLIG_P1D_ALLOW_WRITES=true only after independent pilot database confirmation.');
} else if (PROLIG_PILOT_DB_CONFIRMED !== 'true' || !DATABASE_URL || !AUTH_SECRET) {
  fail('Explicit pilot flag, DATABASE_URL and AUTH_SECRET are mandatory.');
} else if (!PROLIG_P1D_DB_NAME || !/pilot|sandbox|test/i.test(PROLIG_P1D_DB_NAME)) {
  fail('PROLIG_P1D_DB_NAME must explicitly identify an isolated pilot, sandbox or test database.');
} else if (!PROLIG_P1D_DB_HOST) {
  fail('PROLIG_P1D_DB_HOST must explicitly match the isolated pilot database host.');
} else {
  let pool;
  try {
    const uri = new URL(DATABASE_URL);
    if (!['postgres:', 'postgresql:'].includes(uri.protocol)) throw new Error('PostgreSQL DATABASE_URL required.');
    if (uri.hostname.toLowerCase() !== PROLIG_P1D_DB_HOST.toLowerCase()) {
      throw new Error('Expected database host differs from DATABASE_URL hostname.');
    }
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1, connectionTimeoutMillis: 8000 });
    const result = await pool.query("SELECT current_database() AS database_name, current_user AS db_user");
    if (result.rows.length !== 1 || result.rows[0].database_name !== PROLIG_P1D_DB_NAME) {
      throw new Error('Connected database name does not match explicitly confirmed isolated pilot name.');
    }
    // Distinct project fixture signatures; no write in preflight.
    const fixtures = await pool.query(
      "SELECT email FROM \"User\" WHERE email IN ($1, $2)",
      ['pilot.yazar@prolig.local', 'pilot.editor@prolig.local']
    );
    if (fixtures.rowCount !== 2) throw new Error('Required isolated pilot writer/editor fixtures are absent.');
    await pool.end();
    pool = undefined;
    console.log('P1-D pilot identity and fixture preflight: PASS (secrets not displayed)');
    if (!runIntegration) {
      console.log('P1-D READ-ONLY PREFLIGHT: PASS — no test question created; no DB writes executed.');
    } else {
      const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const r = spawnSync(cmd, ['exec', '--', 'vitest', 'run', 'tests/integration/question-db.test.ts'], {
        env: { ...process.env, PROLIG_P1D_DB_VERIFIED: 'true' },
        stdio: 'inherit',
        shell: process.platform === 'win32'
      });
      process.exitCode = r.status === 0 && !r.error ? 0 : 1;
      console.log('P1-D isolated DB roundtrip/concurrency gate: ' + (process.exitCode === 0 ? 'PASS' : 'FAIL'));
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : 'Unexpected pilot preflight error.');
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}
