import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('P1-D independent sandbox inspection safety gate', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'scripts/p1d-sandbox-inspect.mjs'), 'utf8');

  it('uses only the dedicated pilot env file for its two database connections', () => {
    expect(source).toContain("const PILOT_FILE = '.env.p1d.local'");
    expect(source).toContain("const EXPECTED_DB = 'prolig_p1d_sandbox'");
    expect(source).toContain("const pooled = parsePilotUrl(pilot.DATABASE_URL, true)");
    expect(source).toContain("const direct = parsePilotUrl(pilot.DIRECT_URL, false)");
    expect(source).toContain("pilot.PROLIG_P1D_ALLOW_WRITES !== 'false'");
    expect(source).toContain("pilot.PROLIG_PILOT_DB_CONFIRMED !== 'false'");
  });

  it('fails closed when pooled and direct hosts differ or overlap old Neon connections', () => {
    expect(source).toContain("if (hostRoot(pooled) !== hostRoot(direct)) reject(");
    expect(source).toContain("if (originalHostRoots.includes(hostRoot(direct)))");
    expect(source).toContain("if (!originalHostRoots.length) reject(");
    expect(source).toContain("if (pooled.username !== direct.username) reject(");
    expect(source).toContain("url.pathname !== '/' + EXPECTED_DB");
  });

  it('inspects schema and identity using read-only transactions and never invokes migration/seed', () => {
    expect(source).toContain("await client.query('BEGIN READ ONLY')");
    expect(source).toContain("await client.query('COMMIT')");
    expect(source).toContain("await client.query('ROLLBACK')");
    expect(source).toContain("current_database()");
    expect(source).toContain("information_schema.tables");
    expect(source).toContain("to_regclass('public.");
    expect(source).not.toMatch(/\bspawnSync\b|\bexecSync\b|\bCREATE TABLE\b|\bDROP TABLE\b|\bALTER TABLE\b/);
    expect(source).not.toContain('migrate deploy');
    expect(source).not.toContain('prisma/seed.ts');
  });
});
