#!/usr/bin/env node
/**
 * PRO-LIG P2 dedicated Neon acceptance branch: READ-ONLY identity gate.
 * This deliberately does NOT replace or weaken the legacy P1-D sandbox gate.
 * Never prints passwords, URIs, or environment-variable values.
 * Run only when the existing local .env.p2-acceptance.local is configured.
 */
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const ENV_FILE = '.env.p2-acceptance.local';
const EXPECTED_DB = 'neondb';
const EXPECTED_BRANCH_HOST = 'ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech';
const MAIN_BRANCH_HOST = 'ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech';
const MIGRATION = '20261014120000_question_types';
const P2_COLUMNS = ['questionType', 'optionCount', 'booleanAnswer', 'modelAnswer', 'scoringRubric', 'evaluationCriteria'];

function fail(message) { throw new Error('P2 ACCEPTANCE PREFLIGHT FAIL — ' + message); }
function normalizeHost(hostname) {
  return hostname.toLowerCase().replace(/-pooler(?=\.)/, '');
}

function parseSandboxUri(value) {
  let parsed;
  try { parsed = new URL(value); } catch { fail('Invalid PostgreSQL connection URL.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.username ||
      !parsed.password || parsed.pathname !== '/' + EXPECTED_DB) {
    fail('Sandbox connection scheme, credentials or database name invalid.');
  }
  const host = normalizeHost(parsed.hostname);
  if (host !== EXPECTED_BRANCH_HOST || host === MAIN_BRANCH_HOST) {
    fail('Connection host is not the pinned P2 acceptance branch.');
  }
  return parsed;
}

async function main() {
  if (process.argv.length !== 2) fail('This script does not accept arguments.');
  if (!existsSync(ENV_FILE)) fail('Missing private .env.p2-acceptance.local.');
  const env = dotenv.parse(readFileSync(ENV_FILE));
  if (!env.DATABASE_URL) fail('Sandbox DATABASE_URL is not configured.');
  parseSandboxUri(env.DATABASE_URL);

  const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 8000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');
    const result = await client.query(
      "SELECT current_database() AS name, (SELECT COUNT(*) FROM public.\"_prisma_migrations\" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='Question' AND column_name = ANY($2::text[])) AS columns, (SELECT COUNT(*) FROM public.\"User\" u JOIN public.\"Role\" r ON u.\"roleId\"=r.id WHERE (u.email=$3 AND r.code='YAZAR' AND u.status='Aktif') OR (u.email=$4 AND r.code='EDITOR' AND u.status='Aktif')) AS accounts, (SELECT COUNT(*) FROM public.\"Project\" WHERE code=$5 AND \"targetGrade\"='8. Sınıf') AS projects, (SELECT COUNT(*) FROM public.\"Question\" WHERE \"objectiveCode\" LIKE 'P2-TXN-20261017-%') AS lingering",
      [MIGRATION, P2_COLUMNS, 'pilot.yazar@prolig.local', 'pilot.editor@prolig.local', 'PILOT-MAT-8-001']
    );
    const row = result.rows[0];
    if (result.rowCount !== 1 || row.name !== EXPECTED_DB ||
        Number(row.migrations) !== 1 || Number(row.columns) !== 6 ||
        Number(row.accounts) !== 2 || Number(row.projects) !== 1 ||
        Number(row.lingering) !== 0) {
      fail('The acceptance branch schema, pilot fixture or cleanup checks failed.');
    }
    console.log('P2 scoped Neon acceptance branch: PASS');
    console.log('P2 migration, 6 typed columns, pilot author/editor and project: PASS');
    console.log('No lingering P2 synthetic transaction rows: PASS');
    console.log('READ ONLY: no questions created, updated or deleted.');
  } finally {
    if (connected) await client.query('ROLLBACK').catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'P2 scoped identity check failed.');
  process.exitCode = 2;
});
