import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const script = fs.readFileSync(path.join(process.cwd(), 'scripts/p1d-sandbox-bootstrap.mjs'), 'utf8');
const seed = fs.readFileSync(path.join(process.cwd(), 'prisma/seed.ts'), 'utf8');

describe('P1-D isolated sandbox bootstrap guardrails', () => {
  it('requires named sandbox, two independent Neon URLs and original-host comparison', () => {
    expect(script).toContain("const DB = 'prolig_p1d_sandbox'");
    expect(script).toContain("const PILOT_FILE = '.env.p1d.local'");
    expect(script).toContain('const pooled = checkedUrl(p.DATABASE_URL, true)');
    expect(script).toContain('const direct = checkedUrl(p.DIRECT_URL, false)');
    expect(script).toContain('existing.includes(server(direct))');
    expect(script).toContain("p.PROLIG_PILOT_DB_CONFIRMED !== 'false'");
    expect(script).toContain("p.PROLIG_P1D_ALLOW_WRITES !== 'false'");
    expect(script).not.toContain("dotenv.config()");
  });

  it('defaults to read-only plan and requires separate exact write acknowledgment', () => {
    expect(script).toContain("args.length === 0 ? '--plan'");
    expect(script).toContain("mode === '--apply' && process.env.PROLIG_P1D_APPLY_CONFIRM !== 'CREATE-prolig_p1d_sandbox'");
    expect(script).toContain("await client.query('BEGIN READ ONLY')");
    expect(script).toContain("await inspect(p.DIRECT_URL, 'empty')");
    expect(script).toContain("await inspect(p.DATABASE_URL, 'empty')");
    expect(script).toContain("if (mode === '--plan') {");
    expect(script).toContain("EXPECTED_MIGRATIONS = 7");
  });

  it('isolates child environment and does not pass ordinary production URLs or secrets', () => {
    expect(script).toContain('function isolatedChildEnvironment(p) {');
    expect(script).toContain("DATABASE_URL: p.DATABASE_URL");
    expect(script).toContain("DIRECT_URL: p.DIRECT_URL");
    expect(script).toContain("PROLIG_PILOT_DB_CONFIRMED: 'true'");
    expect(script).toContain("PROLIG_ROTATE_PILOT_PASSWORDS: 'false'");
    expect(script).toContain("PROLIG_P1D_SANDBOX_ONLY: 'true'");
    expect(script).not.toContain('env: process.env');
    expect(script).not.toContain('...process.env');
    expect(script).not.toContain('shell: true');
  });

  it('keeps six fake passwords separate from original pilot and verifies seeded fixtures', () => {
    expect(script).toContain(".local/p1d-sandbox-credentials.env");
    expect(script).toContain("writeFileSync(CREDENTIALS, lines.join('\\n') + '\\n', { flag: 'wx', mode: 0o600 })");
    expect(script).toContain("await inspect(p.DIRECT_URL, 'migrated')");
    expect(script).toContain("await inspect(p.DIRECT_URL, 'seeded')");
    expect(script).toContain('users.rowCount !== 6');
    expect(script).toContain("projects.rows[0]?.code !== 'PILOT-MAT-8-001'");
    expect(seed).toContain('process.env.PROLIG_PILOT_CREDENTIALS_PATH');
    expect(seed).toContain("process.env.PROLIG_P1D_SANDBOX_ONLY === 'true'");
    expect(seed).toContain("envPath !== path.resolve('.local/p1d-sandbox-credentials.env')");
  });
});
