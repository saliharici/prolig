import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Public Landing V2', () => {
  const landing = fs.readFileSync(path.join(__dirname, '../src/public/PublicLanding.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../src/demo.css'), 'utf8');

  it('presents the expanded platform without exposing internal operational data', () => {
    expect(landing).toContain('Yayın üretiminden');
    expect(landing).toContain('Proje Yönetimi');
    expect(landing).toContain('Görev Takibi');
    expect(landing).toContain('Soru Üretimi');
    expect(landing).toContain('Kurumsal Mesajlar');
    expect(landing).toContain('Hakedişler');
    expect(landing).toContain('Rol & Yetki');
    expect(landing).toContain('İşlem Geçmişi');
    expect(landing).not.toContain('fetchProjects');
    expect(landing).not.toContain('/api/v1/projects');
  });

  it('adds a duplicated project pulse track for seamless desktop ticker animation', () => {
    expect(landing).toContain('PROJE NABZI');
    expect(landing).toContain('public-pulse-track');
    expect(landing).toContain('{[0, 1].map(copy => (');
    expect(landing).toContain('8. Sınıf Matematik Pilot Soru Bankası');
    expect(css).toContain('@keyframes publicTicker');
    expect(css).toContain('animation:publicTicker 38s linear infinite');
    expect(css).toContain('.public-pulse-shell:hover .public-pulse-track{animation-play-state:paused}');
    expect(landing).toContain('public-pulse-fade-left');
    expect(landing).toContain('public-pulse-signal');
    expect(css).toContain('publicPulseGlow');
  });

  it('degrades the ticker to horizontal touch scrolling on mobile and respects reduced motion', () => {
    expect(css).toContain('.public-pulse-viewport{overflow-x:auto;scroll-snap-type:x mandatory');
    expect(css).toContain('.public-pulse-copy:nth-child(2){display:none}');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('.public-pulse-track{animation:none}');
  });

  it('keeps the public reference pilot copy neutral and canonical', () => {
    expect(landing).toContain('PILOT-MAT-8-001');
    expect(landing).toContain('Pilot Yazar Ağı');
    expect(landing).not.toContain('Ülke Geneli');
    expect(landing).not.toContain('8. Sınıf LGS Soru Bankası');
  });

  it('uses the primary PRO-LIG brand asset in header and footer', () => {
    expect(landing).toContain('src="/brand/prolig-logo-primary.png"');
    expect(landing).toContain('public-brand-logo');
    expect(landing).not.toContain('<div className="public-brand-mark">P</div>');
    expect(css).toContain('.public-brand-logo{');
    expect(css).toContain('.footer-brand-logo{');
  });

  it('uses dedicated inverse and operations brand variants where appropriate', () => {
    const app = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf8');
    const login = fs.readFileSync(path.join(__dirname, '../src/auth/LoginScreen.tsx'), 'utf8');
    expect(app).toContain('className="app-brand-logo"');
    expect(app).toContain('src="/brand/prolig-logo-inverse.png"');
    expect(login).toContain('src="/brand/prolig-logo-primary.png"');
    expect(landing).toContain('src="/brand/prolig-logo-operations.png"');
    expect(app).not.toContain('<div className="brand-mark"><span>P</span></div>');
    expect(css).toContain('.app-brand-logo{');
    expect(css).toContain('.public-operations-logo{');
  });

  it('updates public navigation to platform, projects, workflow and pilot', () => {
    expect(landing).toContain('<a href="#platform">Platform</a>');
    expect(landing).toContain('<a href="#projeler">Projeler</a>');
    expect(landing).toContain('<a href="#nasil-calisir">Nasıl Çalışır</a>');
    expect(landing).toContain('<a href="#pilot">Pilot</a>');
  });
});
