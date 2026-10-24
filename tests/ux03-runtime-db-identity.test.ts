import { describe, it, expect } from 'vitest';
import { checkRuntimeIdentity, EXPECTED } from '../scripts/ux03_runtime_db_identity_check.mjs';

const dummyUrl = 'postgresql://test:NOT_A_REAL_SECRET@' +
  EXPECTED.directHost + '/neondb?sslmode=require';
const valid = Object.freeze({
  VERCEL: '1', VERCEL_ENV: 'production',
  VERCEL_GIT_COMMIT_SHA: EXPECTED.sha,
  VERCEL_DEPLOYMENT_ID: EXPECTED.deploymentId,
  VERCEL_PROJECT_ID: EXPECTED.projectId,
  VERCEL_URL: EXPECTED.deploymentUrl,
  DATABASE_URL: dummyUrl,
});
function fakeClient({
  db = 'neondb', failAt = '',
}: { db?: string; failAt?: string } = {}) {
  const sql: string[] = [];
  let created = 0;
  class Client {
    constructor(_options: unknown) { created++; }
    async connect() { if (failAt === 'connect') throw Error('fake connection failure'); }
    async query(q: string) {
      sql.push(q);
      if (failAt === q) throw Error('fake query failure');
      return q === 'SELECT current_database() AS db'
        ? { rows: [{ db }] } : { rows: [] };
    }
    async end() { if (failAt === 'end') throw Error('fake end failure'); }
  }
  return { Client, sql, count: () => created };
}
describe('UX03-PROD-GATE-04 runtime-only, non-secret negative acceptance', () => {
  it('fails closed if production marker is missing without database connection', async () => {
    const p = fakeClient();
    const report = await checkRuntimeIdentity({ env: {}, Client: p.Client });
    expect(report.MATCH).toBe(false);
    expect(report.production_runtime).toBe(false);
    expect(p.count()).toBe(0);
    expect(Object.values(report).every(x => typeof x === 'boolean')).toBe(true);
  });

  it.each([
    ['Preview marker', { VERCEL_ENV: 'preview' }],
    ['missing deployment id', { VERCEL_DEPLOYMENT_ID: undefined }],
    ['wrong deployment id', { VERCEL_DEPLOYMENT_ID: 'dpl_WRONG' }],
    ['wrong project id', { VERCEL_PROJECT_ID: 'prj_WRONG' }],
    ['wrong deployment url', { VERCEL_URL: 'another-deployment.vercel.app' }],
    ['wrong SHA', { VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40) }],
    ['missing system Vercel indicator', { VERCEL: undefined }],
    ['wrong DB name', { DATABASE_URL: dummyUrl.replace('/neondb', '/other') }],
    ['wrong Neon host', { DATABASE_URL: dummyUrl.replace(EXPECTED.directHost, 'evil.example') }],
    ['pooled host not approved', { DATABASE_URL: dummyUrl.replace('ep-aged-rice-b21dkfno.', 'ep-aged-rice-b21dkfno-pooler.') }],
    ['missing DSN', { DATABASE_URL: undefined }],
    ['invalid DSN', { DATABASE_URL: 'not_a_db_url' }]
  ])('%s => MATCH=false before any DB call', async (_label, changes) => {
    const p = fakeClient();
    const report = await checkRuntimeIdentity({ env: { ...valid, ...changes }, Client: p.Client });
    expect(report.MATCH).toBe(false);
    expect(p.count()).toBe(0);
    expect(JSON.stringify(report)).not.toContain('NOT_A_REAL_SECRET');
    expect(JSON.stringify(report)).not.toContain('postgresql://');
  });

  it('uses one SELECT in a READ ONLY transaction and emits only booleans', async () => {
    const p = fakeClient();
    const report = await checkRuntimeIdentity({ env: { ...valid }, Client: p.Client });
    expect(p.count()).toBe(1);
    expect(p.sql).toEqual([
      'BEGIN TRANSACTION READ ONLY',
      "SET LOCAL statement_timeout = '2500ms'",
      'SELECT current_database() AS db',
      'ROLLBACK'
    ]);
    expect(report.MATCH).toBe(true); // simulated only, NOT a real Production attestation.
    expect(Object.values(report).every(x => typeof x === 'boolean')).toBe(true);
    expect(JSON.stringify(report)).not.toContain('postgresql://');
  });

  it.each([
    ['connect', 'connect'],
    ['read-only BEGIN', 'BEGIN TRANSACTION READ ONLY'],
    ['SELECT', 'SELECT current_database() AS db'],
    ['rollback', 'ROLLBACK'],
    ['close', 'end']
  ])('%s failure => MATCH=false', async (_label, failAt) => {
    const p = fakeClient({ failAt });
    const report = await checkRuntimeIdentity({ env: { ...valid }, Client: p.Client });
    expect(report.MATCH).toBe(false);
  });

  it('wrong connected database => MATCH=false', async () => {
    const p = fakeClient({ db: 'other' });
    const report = await checkRuntimeIdentity({ env: { ...valid }, Client: p.Client });
    expect(report.connected_database_matches).toBe(false);
    expect(report.MATCH).toBe(false);
  });
});
