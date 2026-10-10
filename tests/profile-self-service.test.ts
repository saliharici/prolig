import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('self profile security contract', () => {
  const meApi = fs.readFileSync(path.resolve(__dirname, '../api/v1/auth/me.ts'), 'utf8');
  const profileUi = fs.readFileSync(path.resolve(__dirname, '../src/profile/ProfileModal.tsx'), 'utf8');
  const demoApp = fs.readFileSync(path.resolve(__dirname, '../src/DemoApp.tsx'), 'utf8');

  it('locks identity, role and authorization scope server-side', () => {
    for (const field of [
      "'email'", "'username'", "'role'", "'roleId'", "'status'",
      "'provinceId'", "'districtId'", "'assignedRegion'", "'editorBranchId'",
      "'editorGrade'", "'branchIds'", "'branchId'", "'institutionId'", "'iban'",
      "'password'", "'passwordHash'"
    ]) {
      expect(meApi).toContain(field);
    }
    expect(meApi).toContain("Authorization and identity fields cannot be changed from profile");
    expect(meApi).toContain("const commonAllowed = new Set(['fullName', 'phone', 'avatarUrl'])");
    expect(meApi).toContain("const authorAllowed = new Set(['title', 'experienceYears', 'biography'])");
  });

  it('writes only an audit field list and does not log personal values', () => {
    expect(meApi).toContain("action: 'USER_PROFILE_UPDATED'");
    expect(meApi).toContain("fields: [...Object.keys(userData), ...Object.keys(authorData)]");
  });

  it('shows immutable account scope separately from editable profile fields', () => {
    expect(profileUi).toContain('Değiştirilemeyen hesap bilgileri');
    expect(profileUi).toContain('E-posta / Kullanıcı adı');
    expect(profileUi).toContain('Yetki kapsamı');
    expect(profileUi).toContain('Rol, coğrafi kapsam, branş ve erişim yetkileri yalnız yetkili koordinatörler tarafından değiştirilebilir.');
    expect(demoApp).toContain('title="Profilimi düzenle"');
    expect(demoApp).toContain('<ProfileModal user={currentUser}');
  });
});
