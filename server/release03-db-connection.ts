import { Client, Pool, type PoolConfig } from 'pg';
import { assertRelease03DbEnvironment, type Release03Environment,
         RELEASE03_DB_NAME, RELEASE03_DB_ROLE } from './release03-db-policy.js';
import {
  isRelease03VerifiedTlsSocket,
  release03TlsOptions,
  release03VerifiedPgConnectionString,
} from './release03-tls-identity.js';

const BLOCKED = 'RELEASE03_DB_GUARD_BLOCKED';

type PgStreamClient = { connection?: { stream?: unknown } };

/** Attest the real TLS socket and PostgreSQL session before any app query. */
async function attestRelease03Session(connectionString: string): Promise<void> {
  const client = new Client({
    connectionString: release03VerifiedPgConnectionString(connectionString),
    connectionTimeoutMillis: 4000,
    query_timeout: 4000,
    ssl: { ...release03TlsOptions(), rejectUnauthorized: true },
    application_name: 'prolig-release03-preview-identity'
  });
  try {
    await client.connect();
    if (!isRelease03VerifiedTlsSocket((client as unknown as PgStreamClient).connection?.stream)) {
      throw new Error(BLOCKED);
    }
    // Neon's proxy may terminate the client-facing TLS handshake. Its
    // pg_stat_ssl view is not a reliable substitute for the verified socket.
    const response = await client.query(
      'SELECT current_database() AS db, current_user AS role'
    );
    if (response.rows.length !== 1 ||
        response.rows[0]?.db !== RELEASE03_DB_NAME ||
        response.rows[0]?.role !== RELEASE03_DB_ROLE) throw new Error(BLOCKED);
  } catch {
    throw new Error(BLOCKED);
  } finally {
    try { await client.end(); } catch { /* fail closed; never log secrets */ }
  }
}

/** Guard PostgreSQL and PrismaPg(pool) entrypoints on the release Preview only. */
export function createRelease03GuardedPool(
  config: PoolConfig,
  env: Release03Environment = process.env
): Pool {
  const enforced = assertRelease03DbEnvironment(env);
  if (!enforced) return new Pool(config);
  if (!config.connectionString) throw new Error(BLOCKED);

  const pool = new Pool({
    ...config,
    connectionString: release03VerifiedPgConnectionString(config.connectionString),
    ssl: { ...release03TlsOptions(), rejectUnauthorized: true },
  });
  const rawConnect = pool.connect.bind(pool);
  let checked: Promise<void> | null = null;

  const checkedConnect = async () => {
    if (!checked) checked = attestRelease03Session(config.connectionString!);
    await checked;
    const client = await rawConnect();
    if (!isRelease03VerifiedTlsSocket((client as unknown as PgStreamClient).connection?.stream)) {
      client.release(true);
      throw new Error(BLOCKED);
    }
    return client;
  };

  // Pool.query() and PrismaPg(pool) also acquire connections through Pool.connect().
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
