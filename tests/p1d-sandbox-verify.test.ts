import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const src = fs.readFileSync(path.join(process.cwd(), 'scripts/p1d-sandbox-verify.mjs'), 'utf8');

describe('P1-D post-bootstrap read-only verification safety', () => {
  it('only uses the dedicated pilot environment and requires the exact sandbox name', () => {
    expect(src).toContain("const EXPECTED_DB = 'prolig_p1d_sandbox'");
    expect(src).toContain("const PILOT_FILE = '.env.p1d.local'");
    expect(src).toContain("const pooled = connectionUrl(pilot.DATABASE_URL, true)");
    expect(src).toContain("const direct = connectionUrl(pilot.DIRECT_URL, false)");
    expect(src).toContain("url.pathname !== '/' + EXPECTED_DB");
    expect(src).not.toContain('process.env.DATABASE_URL');
  });

  it('enforces original host independence and write flags remaining false', () => {
    expect(src).toContain("oldHosts.includes(normalizedHost(direct))");
    expect(src).toContain("pilot.PROLIG_PILOT_DB_CONFIRMED !== 'false'");
    expect(src).toContain("pilot.PROLIG_P1D_ALLOW_WRITES !== 'false'");
    expect(src).toContain("pooled.username !== direct.username");
  });

  it('uses only read-only transactions for all PostgreSQL queries', () => {
    expect(src).toContain("await client.query('BEGIN READ ONLY')");
    expect(src).toContain("await client.query('COMMIT')");
    expect(src).toContain("await client.query('ROLLBACK')");
    expect(src).not.toMatch(/\bspawnSync\b|\bexecSync\b|\bCREATE TABLE\b|\bALTER TABLE\b|\bDROP TABLE\b|\bTRUNCATE\b/);
    expect(src).not.toContain('migrate deploy');
    expect(src).not.toContain('prisma/seed.ts');
  });

  it('checks seven migrations and the six role-specific fake identities', () => {
    expect(src).toContain("names.length !== 7");
    expect(src).toContain("FROM public.\"_prisma_migrations\"");
    expect(src).toContain("'GENEL_KOORDINATOR'");
    expect(src).toContain("'BOLGE_KOORDINATORU'");
    expect(src).toContain("'IL_KOORDINATORU'");
    expect(src).toContain("'EDITOR'");
    expect(src).toContain("'YAZAR'");
    expect(src).toContain("'MUHASEBE'");
    expect(src).toContain("PILOT_ACCOUNTS.size");
  });

  it('checks editor/author scope and the project author assignment', () => {
    expect(src).toContain("author.branch_name !== 'Matematik'");
    expect(src).toContain("editor.editorGrade !== '8. Sınıf'");
    expect(src).toContain('coordinator.provinceId !== author.province_id');
    expect(src).toContain('UserBranchAssignment');
    expect(src).toContain('ProjectAuthor');
    expect(src).toContain("project.code !== 'PILOT-MAT-8-001'");
    expect(src).toContain('POST-BOOTSTRAP VERIFY: PASS');
  });
});
