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
    expect(css).toContain('animation:publicTicker 30s linear infinite');
    expect(css).toContain('.public-pulse-shell:hover .public-pulse-track{animation-play-state:paused}');
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

  it('updates public navigation to platform, projects, workflow and pilot', () => {
    expect(landing).toContain('<a href="#platform">Platform</a>');
    expect(landing).toContain('<a href="#projeler">Projeler</a>');
    expect(landing).toContain('<a href="#nasil-calisir">Nasıl Çalışır</a>');
    expect(landing).toContain('<a href="#pilot">Pilot</a>');
  });
});
