import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const landing = source('src/public/PublicLanding.tsx');
const login = source('src/auth/LoginScreen.tsx');
const gate = source('src/auth/AuthGate.tsx');
const publicCss = source('src/public/publisher-ux02.css');
const accessCss = source('src/auth/publisher-access-ux02.css');

describe('UX-02 · publisher homepage and employee login', () => {
 it('represents PRO-LIG as publisher rather than product SaaS', () => {
   expect(landing).toContain('Nitelikli içerik,');
   expect(landing).toContain('güçlü bir yayın anlayışı.');
   expect(landing).toContain('PRO-LİG YAYINEVİ');
   expect(landing).not.toContain('SchoolFlow');
   expect(landing).not.toContain('Süper Admin');
   expect(landing).not.toContain('Panel Tasarımları');
 });
 it('does not fabricate a catalog, title, ISBN, or verified address', () => {
   expect(landing).toContain('Henüz katalog kaydı gösterilmiyor.');
   expect(landing).toContain('Temsili kurumsal görsel');
   expect(landing).toContain('doğrulandıktan sonra');
   expect(landing).not.toContain('8. Sınıf Matematik');
   expect(landing).not.toContain('ISBN');
 });
 it('keeps four real anchors, employee login and existing application callback', () => {
   for (const id of ['yayinlar','kurumsal','editorial','iletisim']) {
     expect(landing).toContain('id="' + id + '"');
     expect(landing).toContain("href: '#" + id + "'");
   }
   expect(landing).toContain('onLoginClick()');
   expect(landing).toContain('onApplyClick()');
   expect(landing).toContain('aria-expanded={menuOpen}');
   expect(landing).toContain("event.key === 'Escape'");
   expect(landing).not.toContain('fetchProjects');
 });
 it('preserves authenticated access checks and fails closed on an unavailable session service', () => {
   expect(gate).toContain("setAuthState({ status: 'error'");
   expect(gate).toContain('serviceNotice=');
   expect(gate).toContain('onRetryConnection={checkSession}');
   expect(gate).toContain("authState.status === 'authenticated'");
   expect(gate).toContain('currentUser={authState.user}');
   expect(gate).not.toContain("setAuthState({ status: 'authenticated', user: ");
   expect(gate).not.toContain('PublisherDesignPreview');
 });
 it('keeps real employee login endpoint, errors, password toggle and focus semantics', () => {
   expect(login).toContain("import { login } from './api'");
   expect(login).toContain('await login(email, password)');
   expect(login).toContain('onLoginSuccess();');
   expect(login).toContain('onCancel();');
   expect(login).toContain('autoComplete="email"');
   expect(login).toContain('autoComplete="current-password"');
   expect(login).toContain('role="alert"');
   expect(login).toContain("aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}");
   expect(login).toContain('disabled={loading || !email || !password}');
   expect(login).not.toContain('ornek@prolig.local');
   expect(login).not.toContain('Şifremi Unuttum');
   expect(login).not.toContain('SUPER_ADMIN');
 });
 it('styles only publisher public and employee access; supports mobile and motion settings', () => {
   expect(publicCss).toContain('.publisher-theme.prolig-publisher-ux02');
   expect(publicCss).toContain('@media(max-width:650px)');
   expect(publicCss).toContain('prefers-reduced-motion');
   expect(accessCss).toContain('.prolig-access-v1.ux02-login-shell');
   expect(accessCss).toContain('@media(max-width:650px)');
   expect(accessCss).not.toContain('.demo-sidebar');
   expect(accessCss).not.toContain('.membership-page');
 });
});
