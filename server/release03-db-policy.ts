/**
 * RELEASE-03 only: a fail-closed policy for Git-backed Vercel deployments.
 * This module is present only on the release candidate, never on main.
 * Pure/synchronous: it runs before Prisma generate, Pool, or Client can connect.
 */
export const RELEASE03_REF = 'release/prolig-pilot-v3-minimal';
export const RELEASE03_DB_HOST = 'ep-purple-flower-bai05qie.c-8.eu-central-1.aws.neon.tech';
export const RELEASE03_DB_NAME = 'neondb';
export const RELEASE03_DB_ROLE = 'neondb_owner';

export type Release03Environment = Record<string, string | undefined>;
const DATABASE_KEYS = ['DATABASE_URL', 'POSTGRES_URL', 'PRISMA_DATABASE_URL', 'DIRECT_URL'] as const;

/** The CI PostgreSQL-16 container runs without VERCEL or a Vercel target. */
export function isRelease03VercelRuntime(env: Release03Environment = process.env): boolean {
  // RELEASE-03 identity enforcement belongs to isolated Preview builds only.
  // Production retains the pre-existing DATABASE_URL/Pool behavior. The V3
  // database migration must still be applied before a Production deployment.
  return (env.VERCEL === '1' || env.VERCEL_ENV === 'preview') &&
    env.VERCEL_ENV !== 'production';
}

function reject(): never {
  // Do not disclose a URI, password, username, hostname, or driver diagnostics.
  throw new Error('RELEASE03_DB_GUARD_BLOCKED');
}

export function assertRelease03DbEnvironment(env: Release03Environment = process.env): boolean {
  if (!isRelease03VercelRuntime(env)) return false;
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview' ||
      env.VERCEL_GIT_COMMIT_REF !== RELEASE03_REF ||
      env.VERCEL_GIT_REPO_OWNER !== 'saliharici' ||
      env.VERCEL_GIT_REPO_SLUG !== 'prolig') reject();

  for (const key of DATABASE_KEYS) {
    const raw = env[key];
    if (!raw || /[\r\n]/.test(raw)) reject();
    let url: URL;
    try { url = new URL(raw); } catch { reject(); }
    if (!['postgresql:', 'postgres:'].includes(url.protocol) ||
        url.hostname !== RELEASE03_DB_HOST ||
        (url.port !== '' && url.port !== '5432') ||
        decodeURIComponent(url.pathname) !== '/' + RELEASE03_DB_NAME ||
        decodeURIComponent(url.username) !== RELEASE03_DB_ROLE ||
        !url.password ||
        url.searchParams.getAll('sslmode').length !== 1 ||
        url.searchParams.get('sslmode') !== 'verify-full' ||
        url.searchParams.has('uselibpqcompat') ||
        url.searchParams.has('sslrootcert') ||
        url.searchParams.has('sslcert') ||
        url.searchParams.has('sslkey')) reject();
  }
  return true;
}
