import { Client, Pool, type PoolConfig } from 'pg';
import { assertRelease03DbEnvironment, type Release03Environment,
         RELEASE03_DB_NAME, RELEASE03_DB_ROLE } from './release03-db-policy.js';

const BLOCKED = 'RELEASE03_DB_GUARD_BLOCKED';

/**
 * On release Preview, verify the actual remote session (not just the URL):
 * authenticated PostgreSQL role, database, and SSL transport. No application
 * Pool client is handed out until a separate read-only attestation succeeds.
 */
async function attestRelease03Session(connectionString: string): Promise<void> {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 4000,
    query_timeout: 4000,
    ssl: { rejectUnauthorized: true },
    application_name: 'prolig-release03-preview-identity'
  });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    const response = await client.query(
      'SELECT current_database() AS db, current_user AS role, ' +
      '(SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()) AS tls'
    );
    if (response.rows.length !== 1 ||
        response.rows[0]?.db !== RELEASE03_DB_NAME ||
        response.rows[0]?.role !== RELEASE03_DB_ROLE ||
        response.rows[0]?.tls !== true) throw new Error(BLOCKED);
  } catch {
    throw new Error(BLOCKED);
  } finally {
    if (connected) {
      try { await client.end(); } catch { /* fail-closed verification, no secret logs */ }
    } else {
      try { await client.end(); } catch { /* no logging */ }
    }
  }
}

/**
 * Guard all pg.Pool acquisitions, including pool.query() (which internally
 * uses connect) and PrismaPg(pool). Shared first-use attestation rejects
 * unexpected endpoint credentials, database, and TLS before any app queries.
 * Non-Vercel CI and existing production/Preview code never import this module.
 */
export function createRelease03GuardedPool(
  config: PoolConfig,
  env: Release03Environment = process.env
): Pool {
  const enforced = assertRelease03DbEnvironment(env);
  if (!enforced) return new Pool(config);
  if (!config.connectionString) throw new Error(BLOCKED);

  const pool = new Pool({ ...config, ssl: { rejectUnauthorized: true } });
  const rawConnect = pool.connect.bind(pool);
  let checked: Promise<void> | null = null;

  const checkedConnect = async () => {
    if (!checked) checked = attestRelease03Session(config.connectionString!);
    await checked;
    return rawConnect();
  };

  // pg-pool routes both Pool.query() and Pool.connect() through this method.
  // Support both the callback and Promise forms used by pg and PrismaPg.
  pool.connect = ((callback?: (err: Error | null, client?: unknown, done?: unknown) => void) => {
    const result = checkedConnect();
    if (typeof callback === 'function') {
      result.then(
        client => callback(null, client, client.release.bind(client)),
        () => callback(new Error(BLOCKED))
      );
      return;
    }
    return result;
  }) as typeof pool.connect;

  return pool;
}
