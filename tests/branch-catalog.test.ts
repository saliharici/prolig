import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MEB_TEACHING_BRANCHES, isMebTeachingBranch } from '../shared/branch-catalog';

describe('canonical teaching branch catalog', () => {
  it('contains the full PRO-LIG MEB teaching-field catalog rather than a single pilot branch', () => {
    expect(MEB_TEACHING_BRANCHES.length).toBeGreaterThanOrEqual(90);
    for (const branch of ['Matematik', 'İlköğretim Matematik', 'Türkçe', 'Türk Dili ve Edebiyatı', 'Fen Bilimleri', 'Fizik', 'Bilişim Teknolojileri', 'Bilgisayar ve Öğretim Teknolojileri']) {
      expect(isMebTeachingBranch(branch)).toBe(true);
    }
  });

  it('uses the canonical catalog in the public membership form', () => {
    const screen = fs.readFileSync(path.resolve(__dirname, '../src/membership/MembershipApplicationScreen.tsx'), 'utf8');
    expect(screen).toContain("import { MEB_TEACHING_BRANCHES } from '../../shared/branch-catalog'");
    expect(screen).toContain('MEB_TEACHING_BRANCHES.map((branch)');
    expect(screen).toContain('Branş seçiniz');
    expect(screen).not.toContain('placeholder="Örn. Matematik"');
  });

  it('synchronizes canonical branches before coordinator metadata is returned', () => {
    const api = fs.readFileSync(path.resolve(__dirname, '../api/v1/management.ts'), 'utf8');
    expect(api).toContain("import { MEB_TEACHING_BRANCHES, isMebTeachingBranch } from '../../shared/branch-catalog.js'");
    expect(api).toContain('async function ensureCanonicalBranches()');
    expect(api).toContain('await ensureCanonicalBranches();');
    expect(api).toContain('skipDuplicates: true');
  });
});
