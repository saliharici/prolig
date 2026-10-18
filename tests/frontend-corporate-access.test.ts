import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const login = readFileSync(new URL('../src/auth/LoginScreen.tsx', import.meta.url), 'utf8');
const membership = readFileSync(new URL('../src/membership/MembershipApplicationScreen.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/auth/corporate-access-v1.css', import.meta.url), 'utf8');

describe('Corporate access visual redesign V1', () => {
  it('keeps existing login endpoint and authenticated success callback', () => {
    expect(login).toContain("import { login } from './api'");
    expect(login).toContain('await login(email, password)');
    expect(login).toContain('onLoginSuccess()');
    expect(login).toContain('onCancel}');
  });
  it('keeps required credential fields and accessible error feedback', () => {
    expect(login).toContain('autoComplete="email"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login).toContain('role="alert"');
    expect(login).toContain('disabled={loading || !email || !password}');
  });
  it('keeps the membership submission and geographic dependence intact', () => {
    expect(membership).toContain('await submitMembershipApplication({');
    expect(membership).toContain('districtsForProvince(form.provinceId)');
    expect(membership).toContain('MEB_TEACHING_BRANCHES.map');
    expect(membership).toContain("change('districtName', '')");
    expect(membership).toContain('onSubmit={submit}');
  });
  it('preserves the approval-before-account disclaimer', () => {
    expect(membership).toContain('Başvuru göndermek doğrudan kullanıcı hesabı oluşturmaz.');
    expect(membership).toContain("useState<'idle' | 'sending' | 'done'>('idle')");
  });
  it('isolates the new style system to login and membership only', () => {
    expect(login).toContain('className="soft-login-shell prolig-access-v1 publisher-theme"');
    expect(membership).toContain('className="membership-page prolig-access-v1 publisher-theme"');
    expect(css).toContain('.prolig-access-v1');
    expect(css).not.toContain('.demo-sidebar');
    expect(css).not.toContain('.question-studio');
  });
});
