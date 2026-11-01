import { Client, Pool, type PoolConfig } from 'pg';
import { checkServerIdentity, type PeerCertificate, type TLSSocket } from 'node:tls';
import type { Release03Environment } from './release03-db-policy.js';

/**
 * RELEASE-05 isolated Preview only.
 * Other Previews continue to use their existing RELEASE-03 fail-closed guard.
 * This file never changes Production connection behavior.
 */
const APPROVED_PREVIEW_REFS = new Set([
  'feat/release05-author-desk-20261101',
  'feat/release06-publisher-flow-v1',
  'feat/release07-editable-geometry-v1'
]);
const HOST = 'ep-withered-sunset-baxau75t-pooler.c-8.eu-central-1.aws.neon.tech';
const DB = 'ux02_test';
const USER = 'ux02_owner';
const BLOCKED = 'RELEASE05_PREVIEW_DB_GUARD_BLOCKED';

type PgClientWithStream = { connection?: { stream?: unknown } };
function reject(): never { throw new Error(BLOCKED); }

export function isRelease05Preview(env: Release03Environment = process.env): boolean {
  return env.VERCEL_ENV === 'preview' && APPROVED_PREVIEW_REFS.has(env.VERCEL_GIT_COMMIT_REF || '');
}

function verifiedConnectionString(config: PoolConfig, env: Release03Environment): string {
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview' ||
      !APPROVED_PREVIEW_REFS.has(env.VERCEL_GIT_COMMIT_REF || '') ||
      env.VERCEL_GIT_REPO_OWNER !== 'saliharici' ||
      env.VERCEL_GIT_REPO_SLUG !== 'prolig' ||
      !config.connectionString || config.connectionString !== env.DATABASE_URL ||
      /[\r\n]/.test(config.connectionString)) reject();

  let url: URL;
  try { url = new URL(config.connectionString); } catch { reject(); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
      url.hostname !== HOST || (url.port !== '' && url.port !== '5432') ||
      decodeURIComponent(url.pathname) !== '/' + DB ||
      decodeURIComponent(url.username) !== USER || !url.password ||
      url.searchParams.getAll('sslmode').length !== 1 ||
      !['require', 'verify-full'].includes(url.searchParams.get('sslmode') || '') ||
      ['sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'].some(key => url.searchParams.has(key)) ||
      url.hash) reject();

  // pg-connection-string can override explicit TLS when sslmode is in the URI.
  // Only the in-memory driver copy drops sslmode; TLS below remains mandatory.
  url.searchParams.delete('sslmode');
  return url.toString();
}

function tlsOptions() {
  return { rejectUnauthorized: true, servername: HOST, minVersion: 'TLSv1.2' as const };
}

function verifiedTlsSocket(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const socket = value as Partial<TLSSocket>;
  if (socket.encrypted !== true || socket.authorized !== true ||
      socket.authorizationError || socket.servername !== HOST ||
      typeof socket.getPeerCertificate !== 'function') return false;
  try {
    const cert = socket.getPeerCertificate();
    return Boolean(cert?.raw) && checkServerIdentity(HOST, cert as PeerCertificate) === undefined;
  } catch { return false; }
}

async function attestSession(connectionString: string): Promise<void> {
  const client = new Client({
    connectionString, ssl: tlsOptions(), connectionTimeoutMillis: 5000,
    query_timeout: 5000, application_name: 'prolig-release05-isolated-preview'
  });
  try {
    await client.connect();
    if (!verifiedTlsSocket((client as unknown as PgClientWithStream).connection?.stream)) reject();
    const result = await client.query('SELECT current_database() AS db, current_user AS role');
    if (result.rows.length !== 1 || result.rows[0]?.db !== DB || result.rows[0]?.role !== USER) reject();
  } catch { reject(); }
  finally { try { await client.end(); } catch { /* no secrets in logs */ } }
}

/** Check the actual TLS socket and database session before allowing app queries. */
export function createRelease05PreviewPool(
  config: PoolConfig, env: Release03Environment = process.env
): Pool {
  const connectionString = verifiedConnectionString(config, env);
  const pool = new Pool({ ...config, connectionString, ssl: tlsOptions() });
  const rawConnect = pool.connect.bind(pool);
  let checked: Promise<void> | null = null;
  const checkedConnect = async () => {
    if (!checked) checked = attestSession(connectionString);
    await checked;
    const client = await rawConnect();
    if (!verifiedTlsSocket((client as unknown as PgClientWithStream).connection?.stream)) {
      client.release(true);
      reject();
    }
    return client;
  };
  pool.connect = ((callback?: (error: Error | null, client?: unknown, done?: unknown) => void) => {
    const result = checkedConnect();
    if (typeof callback === 'function') {
      result.then(client => callback(null, client, client.release.bind(client)), () => callback(new Error(BLOCKED)));
      return;
    }
    return result;
  }) as typeof pool.connect;
  return pool;
}
