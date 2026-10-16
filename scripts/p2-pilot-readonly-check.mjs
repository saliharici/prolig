#!/usr/bin/env node
/**
 * P2 question types: READ-ONLY preflight for the existing isolated P1-D sandbox.
 *
 * Never reads the default .env file as its connection source, never writes
 * to any database, and never prints secrets or full connection strings.
 *
 * This is NOT the create/edit/submit acceptance run. It only verifies that
 * the separate sandbox is suitable for a future explicitly authorized run.
 */
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const SANDBOX_ENV = '.env.p1d.local';
const EXPECTED_DB = 'prolig_p1d_sandbox';
const EXPECTED_NEON_HOST_ROOT = 'ep-lingering-leaf-b9q3ohxd';
const MIGRATION = '20261014120000_question_types';
const requiredFields = ['questionType', 'optionCount', 'booleanAnswer', 'modelAnswer', 'scoringRubric', 'evaluationCriteria'];
const originalEnvs = ['.env', '.env.development.local'];

function fail(message) {
  throw new Error('P2 READ-ONLY PREFLIGHT: FAIL — ' + message);
}

function parsePgUrl(value, pooled) {
  let url;
  try { url = new URL(value); } catch { fail('Invalid sandbox connection configuration.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.username || !url.password || url.pathname !== '/' + EXPECTED_DB ||
      !url.hostname.endsWith('.neon.tech') ||
      url.hostname.includes('-pooler.') !== pooled) {
    fail('Sandbox database URL does not match the expected identity.');
  }
  const normalizedHost = url.hostname.replace(/-pooler(?=\.)/, '').toLowerCase();
  if (!normalizedHost.startsWith(EXPECTED_NEON_HOST_ROOT + '.')) {
    fail('Sandbox Neon endpoint does not match the pinned independent endpoint.');
  }
  return normalizedHost;
}

async function main() {
  if (process.argv.length !== 2) fail('Arguments are forbidden; this command is read-only.');
  if (!existsSync(SANDBOX_ENV)) fail('Independent .env.p1d.local configuration is unavailable.');
  const sandbox = dotenv.parse(readFileSync(SANDBOX_ENV));
  const pooledHost = parsePgUrl(sandbox.DATABASE_URL, true);
  const directHost = parsePgUrl(sandbox.DIRECT_URL, false);
  if (pooledHost !== directHost) fail('Pooled/direct sandbox endpoint mismatch.');

  let inspectedOriginal = false;
  for (const file of originalEnvs) {
    if (!existsSync(file)) continue;
    const original = dotenv.parse(readFileSync(file));
    for (const key of ['DATABASE_URL', 'DIRECT_URL', 'POSTGRES_URL', 'POSTGRES_PRISMA_URL']) {
      const value = original[key];
      if (!value) continue;
      inspectedOriginal = true;
      let host;
      try { host = new URL(value).hostname.replace(/-pooler(?=\.)/, '').toLowerCase(); }
      catch { fail('Existing application environment has an invalid database host.'); }
      if (host === directHost) fail('Independent sandbox points at the application database host.');
    }
  }
  if (!inspectedOriginal) fail('Cannot prove the sandbox differs from the application database.');

  const client = new pg.Client({ connectionString: sandbox.DIRECT_URL, connectionTimeoutMillis: 8000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');

    const identity = await client.query('SELECT current_database() AS db');
    if (identity.rows[0]?.db !== EXPECTED_DB) fail('Connected database identity mismatch.');

    const migrations = await client.query(
      'SELECT EXISTS (SELECT 1 FROM public."_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied',
      [MIGRATION]
    );
    if (migrations.rows[0]?.applied !== true) fail('P2 question types migration is not applied in the sandbox.');

    const fields = await client.query(
      'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      ['public', 'Question']
    );
    const available = new Set(fields.rows.map(row => row.column_name));
    if (requiredFields.some(field => !available.has(field))) fail('P2 question type columns are incomplete.');

    const users = await client.query(
      'SELECT email FROM public."User" WHERE email IN ($1, $2)',
      ['pilot.yazar@prolig.local', 'pilot.editor@prolig.local']
    );
    if (users.rowCount !== 2) fail('Dedicated pilot author/editor fixtures are missing.');

    console.log('P2 isolated sandbox identity: PASS');
    console.log('P2 migration and required columns: PASS');
    console.log('Pilot author/editor fixtures: PASS');
    console.log('READ-ONLY PREFLIGHT: PASS — no questions created, changed or deleted.');
  } finally {
    if (connected) await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'P2 read-only preflight failed.');
  process.exitCode = 2;
});
