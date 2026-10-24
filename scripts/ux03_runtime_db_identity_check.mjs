#!/usr/bin/env node
/**
 * UX03-PROD-GATE-04 | NO HTTP ROUTE.
 *
 * Operator-only runtime identity probe. It is NOT deployed to Production by this
 * change. Executing locally, in a Preview, in CI or with a pulled .env does not
 * attest the existing Production runtime. Fail closed on missing system env.
 *
 * Only booleans may be printed. Never print DSN, errors, SQL rows or credentials.
 */
import pg from 'pg';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// IDs were checked independently using Vercel deployment and Neon branch/compute
// metadata on 2026-10-24. This does NOT establish the deployed process's DB URL.
export const EXPECTED = Object.freeze({
  deploymentId: 'dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX',
  deploymentUrl: 'prolig-r5nax0mep-salih22.vercel.app',
  projectId: 'prj_jXxAOO5pMvKLVq8IXhzGekBNOjho',
  sha: '2654872084c4fd3190ab5d6b345a8509f6d89564',
  neonProjectId: 'calm-band-45633698',
  neonBranchId: 'br-soft-salad-b2vb8sdr',
  database: 'neondb',
  // Independently resolved to the expected Neon project / main branch.
  directHost: 'ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech',
  // Deliberately exclude pooled connections. Listed in metadata but pooler_enabled=false.
});

export async function checkRuntimeIdentity({
  env = process.env,
  Client = pg.Client,
} = {}) {
  const report = {
    production_runtime: env.VERCEL === '1' && env.VERCEL_ENV === 'production',
    deployed_sha_matches: env.VERCEL_GIT_COMMIT_SHA === EXPECTED.sha,
    deployment_identity_matches:
      env.VERCEL_DEPLOYMENT_ID === EXPECTED.deploymentId &&
      env.VERCEL_PROJECT_ID === EXPECTED.projectId &&
      env.VERCEL_URL === EXPECTED.deploymentUrl,
    approved_neon_endpoint: false,
    approved_database_name: false,
    read_only_database_connection: false,
    connected_database_matches: false,
    MATCH: false,
  };

  let connectionString;
  try {
    connectionString = env.DATABASE_URL;
    const url = new URL(connectionString);
    report.approved_neon_endpoint =
      (url.protocol === 'postgres:' || url.protocol === 'postgresql:') &&
      url.hostname.toLowerCase() === EXPECTED.directHost &&
      (url.port === '' || url.port === '5432') &&
      Boolean(url.username) && Boolean(url.password);
    report.approved_database_name =
      decodeURIComponent(url.pathname) === '/' + EXPECTED.database;
  } catch {
    // No details, including exception messages: they may contain secrets.
  }

  const eligible = report.production_runtime &&
    report.deployed_sha_matches && report.deployment_identity_matches &&
    report.approved_neon_endpoint && report.approved_database_name;
  if (!eligible) return report;

  let client;
  let begun = false;
  let selectedDatabaseMatches = false;
  let rolledBack = false;
  let closed = false;
  try {
    client = new Client({
      connectionString,
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
      application_name: 'prolig-ux03-gate04-readonly',
    });
    await client.connect();
    await client.query('BEGIN TRANSACTION READ ONLY');
    begun = true;
    await client.query("SET LOCAL statement_timeout = '2500ms'");
    const result = await client.query('SELECT current_database() AS db');
    selectedDatabaseMatches =
      result.rows?.length === 1 && result.rows[0].db === EXPECTED.database;
  } catch {
    // Fail closed; never disclose driver details.
  } finally {
    if (begun) {
      try {
        await client.query('ROLLBACK');
        rolledBack = true;
      } catch {
        // A failed rollback invalidates the identity attestation.
      }
    }
    if (client) {
      try {
        await client.end();
        closed = true;
      } catch {
        // A failed close invalidates the identity attestation.
      }
    }
  }
  report.read_only_database_connection = begun && rolledBack && closed;
  report.connected_database_matches = selectedDatabaseMatches;
  report.MATCH = eligible &&
    report.read_only_database_connection && report.connected_database_matches;
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkRuntimeIdentity();
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exitCode = result.MATCH ? 0 : 2;
}
