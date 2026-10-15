import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Public Landing - editorial V2', () => {
  const landing = fs.readFileSync(path.join(__dirname, '../src/public/PublicLanding.tsx'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../src/public/public-enterprise-v1.css'), 'utf8');
  const legacyCss = fs.readFileSync(path.join(__dirname, '../src/demo.css'), 'utf8');

  it('explains real platform domains without exposing internal or live records', () => {
    for (const term of ['Proje Yönetimi', 'Görev Takibi', 'Soru Üretimi', 'Kurumsal Mesajlar', 'Telif ve Ödemeler', 'Rol & Yetki', 'İşlem Geçmişi']) {
      expect(landing).toContain(term);
    }
    expect(landing).not.toContain('fetchProjects');
    expect(landing).not.toContain('/api/v1/projects');
  });

  it('replaces the synthetic project ticker with an explicitly labeled case file', () => {
    expect(landing).toContain('YAYIN DOSYASI / ÖRNEK');
    expect(landing).toContain('DOSYA NO. 001');
    expect(landing).toContain('8. Sınıf Matematik');
    expect(landing).not.toContain('public-pulse-track');
    expect(landing).not.toContain('projectPulse');
  });

  it('features an actual editorial manuscript and reviewer note without claiming real activity', () => {
    expect(landing).toContain('Bir dikdörtgenin kısa kenarı 4 cm');
    expect(landing).toContain('C) 24');
    expect(landing).toContain('EDİTÖR NOTU / 01');
    expect(landing).toContain('Temsili ürün görünümü');
    expect(landing).not.toContain('Üretim aktif');
  });

  it('presents a neutral workflow without internal pilot identifiers', () => {
    expect(landing).not.toContain('PILOT-MAT-8-001');
    expect(landing).not.toContain('REFERANS PİLOT');
    expect(landing).toContain('Yazar ve editör ekibi');
    expect(landing).not.toContain('Ülke Geneli');
  });

  it('retains corporate primary branding in header and footer', () => {
    expect(landing).toContain('src="/brand/prolig-logo-primary.png"');
    expect(landing).toContain('footer-brand-logo');
    expect(landing).not.toContain('<div className="public-brand-mark">P</div>');
    expect(legacyCss).toContain('.public-brand-logo{');
  });

  it('does not modify the dashboard or login brand assets', () => {
    const app = fs.readFileSync(path.join(__dirname, '../src/DemoApp.tsx'), 'utf8');
    const login = fs.readFileSync(path.join(__dirname, '../src/auth/LoginScreen.tsx'), 'utf8');
    expect(app).toContain('className="app-brand-logo"');
    expect(app).toContain('src="/brand/prolig-logo-inverse.png"');
    expect(login).toContain('src="/brand/prolig-logo-primary.png"');
    expect(legacyCss).toContain('.app-brand-logo{');
    expect(css).not.toContain('.soft-login-shell');
  });

  it('keeps navigation anchors and uses responsive, reduced-motion CSS', () => {
    expect(landing).toContain('<a href="#platform">Platform</a>');
    expect(landing).toContain('<a href="#projeler">Projeler</a>');
    expect(landing).toContain('<a href="#nasil-calisir">Nasıl Çalışır</a>');
    expect(landing).toContain('<a href="#yayin-projesi">Yayın Akışı</a>');
    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('prefers-reduced-motion');
  });
});
