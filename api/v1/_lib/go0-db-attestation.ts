/**
 * GO-0 Production database-identity attestation.
 *
 * Default OFF. The only trigger is the existing /api/v1/health handler, and
 * its public response never contains the result. Operator-only Vercel runtime
 * logs receive booleans, without any DSN, credentials, driver errors or rows.
 *
 * THIS ATTESTS ONLY THE DEPLOYMENT WHOSE RUNTIME LOG ACTUALLY CONTAINS IT.
 * It cannot attest any prior immutable Vercel deployment.
 */
import { Client } from 'pg';

export const GO0_EXPECTED = Object.freeze({
  vercelProjectId: 'prj_jXxAOO5pMvKLVq8IXhzGekBNOjho',
  neonDirectHost: 'ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech',
  neonDatabase: 'neondb',
});

type Environment = Record<string, string | undefined>;
type DbClient = {
  // pg.Client.connect() resolves to Client; fakes may resolve to void.
  connect(): Promise<unknown>;
  query(sql: string): Promise<{ rows: Array<{ db?: string }> }>;
  end(): Promise<void>;
};
type DbClientConstructor = new (options: {
  connectionString: string;
  connectionTimeoutMillis: number;
  query_timeout: number;
  application_name: string;
}) => DbClient;

export type Go0IdentityResult = {
  production_runtime: boolean;
  deployment_identity_present: boolean;
  endpoint_matches: boolean;
  database_name_matches: boolean;
  connected_read_only: boolean;
  MATCH: boolean;
};

export async function checkGo0DbIdentity(options: {
  env?: Environment;
  ClientConstructor?: DbClientConstructor;
} = {}): Promise<Go0IdentityResult> {
  const env = options.env ?? process.env;
  const report: Go0IdentityResult = {
    production_runtime: env.VERCEL === '1' && env.VERCEL_ENV === 'production',
    deployment_identity_present: false,
    endpoint_matches: false,
    database_name_matches: false,
    connected_read_only: false,
    MATCH: false,
  };
  report.deployment_identity_present =
    env.VERCEL_PROJECT_ID === GO0_EXPECTED.vercelProjectId &&
    /^dpl_[a-zA-Z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID ?? '') &&
    /^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? '') &&
    env.VERCEL_GIT_COMMIT_REF === 'main' &&
    env.VERCEL_GIT_REPO_SLUG === 'prolig' &&
    env.VERCEL_GIT_REPO_OWNER === 'saliharici' &&
    typeof env.VERCEL_URL === 'string' &&
    env.VERCEL_URL.endsWith('-salih22.vercel.app');

  let connectionString: string;
  try {
    if (!env.DATABASE_URL) return report;
    connectionString = env.DATABASE_URL;
    const url = new URL(connectionString);
    report.endpoint_matches =
      (url.protocol === 'postgresql:' || url.protocol === 'postgres:') &&
      url.hostname.toLowerCase() === GO0_EXPECTED.neonDirectHost &&
      (url.port === '' || url.port === '5432') &&
      Boolean(url.username) && Boolean(url.password);
    report.database_name_matches =
      decodeURIComponent(url.pathname) === '/' + GO0_EXPECTED.neonDatabase;
  } catch {
    return report; // No secret/URL/error output.
  }

  if (!report.production_runtime || !report.deployment_identity_present ||
      !report.endpoint_matches || !report.database_name_matches) {
    return report; // Never connect to an unapproved host or non-Production environment.
  }

  const ClientType = options.ClientConstructor ?? Client;
  let client: DbClient | null = null;
  let began = false;
  let selectedDatabaseMatches = false;
  let rolledBack = false;
  let closed = false;
  try {
    client = new ClientType({
      connectionString,
      connectionTimeoutMillis: 3000,
      query_timeout: 3000,
      application_name: 'prolig-go0-runtime-identity-readonly',
    });
    await client.connect();
    await client.query('BEGIN TRANSACTION READ ONLY');
    began = true;
    await client.query("SET LOCAL statement_timeout = '2500ms'");
    const response = await client.query('SELECT current_database() AS db');
    selectedDatabaseMatches =
      response.rows.length === 1 &&
      response.rows[0]?.db === GO0_EXPECTED.neonDatabase;
  } catch {
    // Fail closed. Never log driver exceptions or SQL row values.
  } finally {
    if (began && client) {
      try {
        await client.query('ROLLBACK');
        rolledBack = true;
      } catch {
        // An unsuccessful rollback invalidates the attestation.
      }
    }
    if (client) {
      try {
        await client.end();
        closed = true;
      } catch {
        // An unsuccessful connection close invalidates the attestation.
      }
    }
  }

  report.connected_read_only = began && selectedDatabaseMatches && rolledBack && closed;
  report.MATCH = report.production_runtime && report.deployment_identity_present &&
    report.endpoint_matches && report.database_name_matches && report.connected_read_only;
  return report;
}

let oneAttempt: Promise<void> | null = null;

/**
 * Inert unless explicitly enabled in an approved NEW production deployment.
 * No public route or response body is created and only Boolean fields are logged.
 */
export function maybeLogGo0IdentityOnce(
  env: Environment = process.env,
  emit: (message: string) => void = (message) => console.info(message),
  check: (options: { env: Environment }) => Promise<Go0IdentityResult> = checkGo0DbIdentity,
): Promise<void> {
  if (env.PROLIG_GO0_DB_ATTESTATION !== '1' ||
      env.VERCEL !== '1' || env.VERCEL_ENV !== 'production') {
    return Promise.resolve();
  }
  if (!oneAttempt) {
    oneAttempt = check({ env })
      .then((report) => { emit('PROLIG_GO0_IDENTITY ' + JSON.stringify(report)); })
      .catch(() => { emit('PROLIG_GO0_IDENTITY ' + JSON.stringify({ MATCH: false })); });
  }
  return oneAttempt;
}
