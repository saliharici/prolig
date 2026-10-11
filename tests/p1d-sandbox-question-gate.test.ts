import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const src = fs.readFileSync(path.join(process.cwd(), 'scripts/p1d-sandbox-question-gate.mjs'), 'utf8');

describe('P1-D isolated question integration launcher', () => {
  it('defaults to read-only preflight and requires exact explicit write approval', () => {
    expect(src).toContain("argv.length === 0 ? '--preflight'");
    expect(src).toContain("if (write && process.env.PROLIG_P1D_QUESTION_TEST_APPROVAL !== APPROVAL)");
    expect(src).toContain("ALLOW_TEMP_QUESTION_WRITES_IN_prolig_p1d_sandbox");
    expect(src).toContain("['scripts/p1d-pilot-check.mjs', ...(write ? ['--run-integration'] : [])]");
  });

  it('reads only Git-ignored sandbox configs and keeps original local environment out of child DB credentials', () => {
    expect(src).toContain("const PILOT = '.env.p1d.local'");
    expect(src).toContain("const PRIVATE = '.local/p1d-sandbox-credentials.env'");
    expect(src).toContain("const DB = 'prolig_p1d_sandbox'");
    expect(src).toContain("const p = parseFile(PILOT)");
    expect(src).toContain("const secrets = parseFile(PRIVATE)");
    expect(src).toContain("originalHosts.includes(endpoint(direct))");
    expect(src).not.toContain('process.env.DATABASE_URL');
    expect(src).not.toContain('process.env.AUTH_SECRET');
  });

  it('rejects unsafe pilot flags and mismatched PostgreSQL target', () => {
    expect(src).toContain("p.PROLIG_PILOT_DB_CONFIRMED !== 'false'");
    expect(src).toContain("p.PROLIG_P1D_ALLOW_WRITES !== 'false'");
    expect(src).toContain("uri.pathname !== '/' + DB");
    expect(src).toContain("endpoint(pooled) !== endpoint(direct)");
    expect(src).toContain("PROLIG_P1D_DB_NAME: DB");
    expect(src).toContain("PROLIG_P1D_DB_HOST: hostname");
  });

  it('constructs a sandbox-only child environment and delegates to guarded P1-D test runner', () => {
    expect(src).toContain('function sanitizedChildEnv(');
    expect(src).toContain("DATABASE_URL: pilot.DATABASE_URL");
    expect(src).toContain("DIRECT_URL: pilot.DIRECT_URL");
    expect(src).toContain("AUTH_SECRET: secret");
    expect(src).toContain("PROLIG_PILOT_DB_CONFIRMED: 'true'");
    expect(src).toContain("PROLIG_P1D_ALLOW_WRITES: write ? 'true' : 'false'");
    expect(src).toContain("DOTENV_CONFIG_PATH: PILOT");
    expect(src).not.toContain('env: process.env');
    expect(src).not.toContain('...process.env');
  });

  it('keeps generated test secrets separate and does not run database mutations directly', () => {
    expect(src).toContain("!/^[0-9a-f]{96}$/i.test(secrets.AUTH_SECRET)");
    expect(src).toContain("!/^[0-9a-f]{48}$/i.test(secrets[key] || '')");
    expect(src).not.toContain('prisma migrate');
    expect(src).not.toContain('prisma/seed.ts');
    expect(src).not.toMatch(/\bCREATE TABLE\b|\bDROP TABLE\b|\bTRUNCATE TABLE\b/);
  });
});
