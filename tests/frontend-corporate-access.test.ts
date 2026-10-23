import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const login = readFileSync(new URL('../src/auth/LoginScreen.tsx', import.meta.url), 'utf8');
const membership = readFileSync(new URL('../src/membership/MembershipApplicationScreen.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/auth/publisher-access-ux02.css', import.meta.url), 'utf8');
describe('UX-02 employee access', () => {
 it('keeps the real login endpoint and callbacks', () => {
  expect(login).toContain("import { login } from './api'");
  expect(login).toContain('await login(email, password)');
  expect(login).toContain('onLoginSuccess();');
  expect(login).toContain('onCancel();');
 });
 it('keeps required credential fields and accessible errors', () => {
  expect(login).toContain('autoComplete="email"');
  expect(login).toContain('autoComplete="current-password"');
  expect(login).toContain('role="alert"');
  expect(login).toContain('disabled={loading || !email || !password}');
  expect(login).toContain('Şifreyi göster');
 });
 it('keeps existing membership API and geographic input untouched', () => {
  expect(membership).toContain('await submitMembershipApplication({');
  expect(membership).toContain('districtsForProvince(form.provinceId)');
  expect(membership).toContain('MEB_TEACHING_BRANCHES.map');
  expect(membership).toContain("change('districtName', '')");
  expect(membership).toContain('onSubmit={submit}');
  expect(membership).toContain('Başvuru göndermek doğrudan kullanıcı hesabı oluşturmaz.');
 });
 it('isolates the redesign to employee login only', () => {
  expect(login).toContain('ux02-login-shell');
  expect(css).toContain('.prolig-access-v1.ux02-login-shell');
  expect(css).not.toContain('.membership-page');
  expect(css).not.toContain('.question-studio');
  expect(css).not.toContain('.demo-sidebar');
 });
});
