import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  RELEASE03_DB_HOST, RELEASE03_DB_NAME, RELEASE03_DB_ROLE, RELEASE03_REF,
  assertRelease03DbEnvironment, isRelease03VercelRuntime,
  type Release03Environment
} from '../server/release03-db-policy.js';

function safeEnv(): Release03Environment {
  const url = `postgresql://${RELEASE03_DB_ROLE}:fixture-only@${RELEASE03_DB_HOST}:5432/${RELEASE03_DB_NAME}?sslmode=verify-full`;
  return {
    VERCEL: '1', VERCEL_ENV: 'preview',
    VERCEL_GIT_COMMIT_REF: RELEASE03_REF,
    VERCEL_GIT_REPO_OWNER: 'saliharici',
    VERCEL_GIT_REPO_SLUG: 'prolig',
    DATABASE_URL: url, POSTGRES_URL: url, PRISMA_DATABASE_URL: url, DIRECT_URL: url
  };
}

describe('RELEASE-03 fail-closed Preview database guard', () => {
  it('allows the complete isolated TEST identity (policy only, no connection)', () => {
    expect(assertRelease03DbEnvironment(safeEnv())).toBe(true);
  });

  it('does not impose the new policy on normal non-Vercel CI', () => {
    expect(isRelease03VercelRuntime({ CI: 'true' })).toBe(false);
    expect(assertRelease03DbEnvironment({ CI: 'true' })).toBe(false);
  });

  it('does not apply the RELEASE-03 Preview identity gate to Production', () => {
    const production = { ...safeEnv(), VERCEL_ENV: 'production' };
    expect(isRelease03VercelRuntime(production)).toBe(false);
    expect(assertRelease03DbEnvironment(production)).toBe(false);
  });

  it.each([
    ['missing release ref', 'VERCEL_GIT_COMMIT_REF', undefined],
    ['different branch', 'VERCEL_GIT_COMMIT_REF', 'main'],
    ['missing Vercel identity', 'VERCEL', undefined],
    ['unexpected repository', 'VERCEL_GIT_REPO_SLUG', 'another-repo'],
    ['missing migration URL', 'DIRECT_URL', undefined],
    ['missing runtime fallback URL', 'POSTGRES_URL', undefined],
    ['missing Prisma fallback URL', 'PRISMA_DATABASE_URL', undefined],
    ['missing primary URL', 'DATABASE_URL', undefined],
    ['host mismatch', 'DATABASE_URL', 'postgresql://neondb_owner:pass@ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full'],
    ['weak TLS', 'POSTGRES_URL', `postgresql://neondb_owner:pass@${RELEASE03_DB_HOST}/neondb?sslmode=require`],
    ['disabled TLS', 'DIRECT_URL', `postgresql://neondb_owner:pass@${RELEASE03_DB_HOST}/neondb?sslmode=disable`],
    ['wrong role', 'DATABASE_URL', `postgresql://postgres:pass@${RELEASE03_DB_HOST}/neondb?sslmode=verify-full`],
    ['wrong database', 'DATABASE_URL', `postgresql://neondb_owner:pass@${RELEASE03_DB_HOST}/production?sslmode=verify-full`],
  ] as const)('rejects %s before a database Pool is created', (_, key, value) => {
    expect(() => assertRelease03DbEnvironment({ ...safeEnv(), [key]: value })).toThrow('RELEASE03_DB_GUARD_BLOCKED');
  });

  it('rejects a duplicate SSL mode', () => {
    const env = safeEnv();
    env.DIRECT_URL += '&sslmode=disable';
    expect(() => assertRelease03DbEnvironment(env)).toThrow('RELEASE03_DB_GUARD_BLOCKED');
  });

  it('keeps deployment blocking exclusive to the release branch', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8'));
    expect(config.git.deploymentEnabled[RELEASE03_REF]).toBe(false);
    expect(config.git.deploymentEnabled['feat/p2-professional-question-editor-20261012']).toBe(false);
    expect(config.git.deploymentEnabled['feature/corporate-landing-v1-20261014']).toBe(false);
  });

  it('wires both PostgreSQL entrypoints and Prisma CLI to the same guard', () => {
    const legacy = readFileSync('server/postgres.ts','utf8');
    const api = readFileSync('api/v1/_lib/prisma.ts','utf8');
    const cli = readFileSync('prisma.config.ts','utf8');
    const verified = readFileSync('server/release03-db-connection.ts','utf8');
    expect(legacy).toContain('createRelease03GuardedPool(');
    expect(api).toContain('createRelease03GuardedPool(');
    expect(cli).toContain('assertRelease03DbEnvironment();');
    expect(verified).toContain('pg_stat_ssl');
    expect(verified).toContain('current_database()');
    expect(verified).toContain('current_user');
    expect(verified).toContain('rejectUnauthorized: true');
  });
});
