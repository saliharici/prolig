import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const landing = readFileSync(new URL('../src/public/PublicLanding.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/public/publisher-ux02.css', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
describe('PRO-LIG institutional publishing UX-02', () => {
 it('keeps public destinations and accessible mobile menu', () => {
  expect(landing).toContain('onLoginClick');
  expect(landing).toContain('onApplyClick');
  for (const id of ['yayinlar','kurumsal','editorial','iletisim']) expect(landing).toContain('id="' + id + '"');
  expect(landing).toContain('ux02-mobile-nav');
  expect(landing).toContain('aria-expanded={menuOpen}');
  expect(landing).not.toContain('/api/v1/');
 });
 it('isolates publisher styling from authenticated screens', () => {
  expect(landing).toContain('prolig-publisher-ux02');
  expect(landing).toContain("import './publisher-ux02.css'");
  expect(css).toContain('.publisher-theme.prolig-publisher-ux02');
  expect(css).not.toContain('.demo-sidebar');
  expect(css).not.toContain('.soft-login-shell');
 });
 it('has publication honesty and semantic content', () => {
  expect(landing).toContain('Doğrulanmış kitap ve katalog bilgileri eklendikçe');
  expect(landing).toContain('Gerçek kitap kapağı veya yayımlanmış eser görseli değildir.');
  expect(landing).toContain('Ana içeriğe geç');
  expect(landing).toContain('id="public-content"');
  expect(landing).not.toContain('Bir dikdörtgenin kısa kenarı');
  expect(css).toContain('prefers-reduced-motion');
 });
 it('retains previous isolated deployment restrictions', () => {
  expect(config.git.deploymentEnabled['feat/p2-professional-question-editor-20261012']).toBe(false);
  expect(config.git.deploymentEnabled['feature/corporate-landing-v1-20261014']).toBe(false);
 });
});
