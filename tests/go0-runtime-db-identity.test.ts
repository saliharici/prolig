import { describe, expect, it, vi } from 'vitest';
import {
  checkGo0DbIdentity,
  GO0_EXPECTED,
  maybeLogGo0IdentityOnce,
} from '../api/v1/_lib/go0-db-attestation.js';

const fakeUrl =
  'postgresql://fake_user:FAKE_TEST_PASSWORD@' +
  GO0_EXPECTED.neonDirectHost + '/neondb?sslmode=verify-full';

const goodEnv: Record<string, string | undefined> = {
  PROLIG_GO0_DB_ATTESTATION: '1',
  VERCEL: '1',
  VERCEL_ENV: 'production',
  VERCEL_PROJECT_ID: GO0_EXPECTED.vercelProjectId,
  VERCEL_DEPLOYMENT_ID: 'dpl_ABCdef123',
  VERCEL_GIT_COMMIT_SHA: 'a'.repeat(40),
  VERCEL_GIT_COMMIT_REF: 'main',
  VERCEL_GIT_REPO_SLUG: 'prolig',
  VERCEL_GIT_REPO_OWNER: 'saliharici',
  VERCEL_URL: 'prolig-diagnostic-salih22.vercel.app',
  DATABASE_URL: fakeUrl,
};

function mockedClient({ failOn, db = 'neondb' }: {
  failOn?: string;
  db?: string;
} = {}) {
  const sql: string[] = [];
  let created = 0;
  class FakeClient {
    constructor(_options: unknown) { created++; }
    async connect() {
      if (failOn === 'connect') throw new Error('DO_NOT_LOG_PASSWORD');
    }
    async query(command: string): Promise<{ rows: Array<{db?: string}> }> {
      sql.push(command);
      if (failOn === command) throw new Error('DO_NOT_LOG_PASSWORD');
      return {
        rows: command === 'SELECT current_database() AS db' ? [{ db }] : []
      };
    }
    async end() {
      if (failOn === 'end') throw new Error('DO_NOT_LOG_PASSWORD');
    }
  }
  return { FakeClient, sql, created: () => created };
}

describe('GO-0 new-deployment-only runtime observer', () => {
  it('remains inert for the public health route without separate operator flag', async () => {
    const emit = vi.fn();
    const check = vi.fn();
    await maybeLogGo0IdentityOnce({ ...goodEnv, PROLIG_GO0_DB_ATTESTATION: '0' }, emit, check);
    expect(check).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it.each([
    ['Preview environment', { VERCEL_ENV: 'preview' }],
    ['No system marker', { VERCEL: undefined }],
    ['Missing deployment ID', { VERCEL_DEPLOYMENT_ID: undefined }],
    ['Missing git SHA', { VERCEL_GIT_COMMIT_SHA: undefined }],
    ['Wrong git ref', { VERCEL_GIT_COMMIT_REF: 'feature' }],
    ['Wrong repository owner', { VERCEL_GIT_REPO_OWNER: 'other' }],
    ['Wrong project ID', { VERCEL_PROJECT_ID: 'prj_other' }],
    ['Wrong generated deployment URL', { VERCEL_URL: 'example.vercel.app' }],
    ['Missing DATABASE_URL', { DATABASE_URL: undefined }],
    ['Malformed DATABASE_URL', { DATABASE_URL: 'invalid-url' }],
    ['Wrong PostgreSQL host', { DATABASE_URL: fakeUrl.replace(GO0_EXPECTED.neonDirectHost, 'example.org') }],
    ['Pooled host', { DATABASE_URL: fakeUrl.replace('ep-aged-rice-b21dkfno.', 'ep-aged-rice-b21dkfno-pooler.') }],
    ['Wrong DB', { DATABASE_URL: fakeUrl.replace('/neondb', '/testdb') }],
  ])('%s => fail closed without connecting', async (_name, changes) => {
    const fake = mockedClient();
    const r = await checkGo0DbIdentity({
      env: { ...goodEnv, ...changes },
      ClientConstructor: fake.FakeClient,
    });
    expect(r.MATCH).toBe(false);
    expect(fake.created()).toBe(0);
    expect(Object.values(r).every(v => typeof v === 'boolean')).toBe(true);
    expect(JSON.stringify(r)).not.toContain('FAKE_TEST_PASSWORD');
  });

  it('connects once, runs a single read-only SELECT, rolls back and closes', async () => {
    const fake = mockedClient();
    const r = await checkGo0DbIdentity({
      env: goodEnv,
      ClientConstructor: fake.FakeClient,
    });
    expect(r.MATCH).toBe(true); // fake simulated success, NEVER Production PASS
    expect(fake.created()).toBe(1);
    expect(fake.sql).toEqual([
      'BEGIN TRANSACTION READ ONLY',
      "SET LOCAL statement_timeout = '2500ms'",
      'SELECT current_database() AS db',
      'ROLLBACK',
    ]);
    expect(Object.values(r).every(v => typeof v === 'boolean')).toBe(true);
    expect(JSON.stringify(r)).not.toContain('postgresql://');
  });

  it.each([
    ['connect fails', 'connect'],
    ['BEGIN fails', 'BEGIN TRANSACTION READ ONLY'],
    ['SET LOCAL fails', "SET LOCAL statement_timeout = '2500ms'"],
    ['SELECT fails', 'SELECT current_database() AS db'],
    ['ROLLBACK fails', 'ROLLBACK'],
    ['close fails', 'end'],
  ])('%s => MATCH=false', async (_name, failOn) => {
    const fake = mockedClient({ failOn });
    const r = await checkGo0DbIdentity({ env: goodEnv, ClientConstructor: fake.FakeClient });
    expect(r.MATCH).toBe(false);
  });

  it('rejects a successful connection to a different database', async () => {
    const fake = mockedClient({ db: 'wrong' });
    const r = await checkGo0DbIdentity({ env: goodEnv, ClientConstructor: fake.FakeClient });
    expect(r.connected_read_only).toBe(false);
    expect(r.MATCH).toBe(false);
  });

  it('writes one boolean-only operator log for a separately enabled deployment', async () => {
    const emit = vi.fn();
    const check = vi.fn(async () => ({
      production_runtime: true, deployment_identity_present: true,
      endpoint_matches: true, database_name_matches: true,
      connected_read_only: true, MATCH: true,
    }));
    await maybeLogGo0IdentityOnce(goodEnv, emit, check);
    await maybeLogGo0IdentityOnce(goodEnv, emit, check);
    expect(check).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
    const log = String(emit.mock.calls[0]?.[0]);
    expect(log).toContain('PROLIG_GO0_IDENTITY');
    expect(log).toContain('"MATCH":true');
    expect(log).not.toContain('postgresql://');
    expect(log).not.toContain('FAKE_TEST_PASSWORD');
  });
});
