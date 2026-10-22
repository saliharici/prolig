import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const landing = readFileSync(new URL('../src/public/PublicLanding.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/public/publisher-ux02.css', import.meta.url), 'utf8');
const legacyCss = readFileSync(new URL('../src/demo.css', import.meta.url), 'utf8');
describe('Public Landing transition V2 → UX-02', () => {
 it('presents publishing, not internal software functions', () => {
  for (const x of ['Yayınlarımız','Kurumsal','Editoryal Yaklaşım','İletişim','Yazar ve Editör Başvurusu','Çalışan Girişi']) expect(landing).toContain(x);
  expect(landing).not.toContain('PRO-LİG, birbirinden kopuk araçlar');
  expect(landing).not.toContain('fetchProjects');
 });
 it('avoids inventing publisher titles, covers or figures', () => {
  expect(landing).toContain('Yayınlarımız yakında burada.');
  expect(landing).toContain('Temsili kurumsal görsel');
  expect(landing).not.toContain('DOSYA NO. 001');
  expect(landing).not.toContain('8. Sınıf Matematik');
  expect(landing).not.toContain('Bir dikdörtgenin kısa kenarı');
  expect(landing).not.toContain('Üretim aktif');
 });
 it('retains original brand images without changing workspaces', () => {
  const app = readFileSync(new URL('../src/DemoApp.tsx', import.meta.url), 'utf8');
  const login = readFileSync(new URL('../src/auth/LoginScreen.tsx', import.meta.url), 'utf8');
  expect(landing).toContain('src="/brand/prolig-logo-primary.png"');
  expect(app).toContain('className="app-brand-logo"');
  expect(app).toContain('src="/brand/prolig-logo-inverse.png"');
  expect(login).toContain('src="/brand/prolig-logo-primary.png"');
  expect(legacyCss).toContain('.app-brand-logo{');
 });
 it('links to matching real sections with accessible responsive navigation', () => {
  for (const id of ['yayinlar','kurumsal','editorial','iletisim']) {
   expect(landing).toContain('id="' + id + '"');
   expect(landing).toContain("href: '#" + id + "'");
  }
  expect(landing).toContain('aria-controls="ux02-mobile-navigation"');
  expect(css).toContain('@media(max-width:650px)');
  expect(css).toContain('prefers-reduced-motion');
 });
});
