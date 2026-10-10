import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Compensation frontend', () => {
  const demo = fs.readFileSync(path.resolve(__dirname, '../src/DemoApp.tsx'), 'utf8');
  const rules = fs.readFileSync(path.resolve(__dirname, '../src/compensation/CompensationRulesPanel.tsx'), 'utf8');
  const entries = fs.readFileSync(path.resolve(__dirname, '../src/compensation/CompensationEntriesPanel.tsx'), 'utf8');
  const api = fs.readFileSync(path.resolve(__dirname, '../src/compensation/api.ts'), 'utf8');
  const css = fs.readFileSync(path.resolve(__dirname, '../src/compensation/compensation.css'), 'utf8');

  it('adds tariff and earned-fee tabs to Telif ve Ödemeler', () => {
    expect(demo).toContain("useState<'overview' | 'rates' | 'earnings'>('overview')");
    expect(demo).toContain('Ücret Tarifeleri');
    expect(demo).toContain('Kazanılmış Ücretler');
    expect(demo).toContain('<CompensationRulesPanel projects={projects} currentRole={currentUser.role} />');
    expect(demo).toContain('<CompensationEntriesPanel />');
  });

  it('allows tariff editing only for the general coordinator', () => {
    expect(rules).toContain("const canManage = currentRole === 'GENEL_KOORDINATOR'");
    expect(rules).toContain('Tarifeyi Genel Koordinatör belirler');
    expect(rules).toContain('Tarifeyi Kaydet');
    expect(rules).toContain('Proje özel tarifesi');
    expect(rules).toContain('Tarife değiştiğinde eski ücretler geriye dönük değişmez');
  });

  it('separates writer editor and coordinator rates', () => {
    expect(rules).toContain("code: 'YAZAR'");
    expect(rules).toContain("code: 'EDITOR'");
    expect(rules).toContain("code: 'IL_KOORDINATORU'");
    expect(rules).toContain("code: 'BOLGE_KOORDINATORU'");
    expect(rules).toContain("code: 'GENEL_KOORDINATOR'");
    expect(rules).toContain('Onaylanan soru başına');
    expect(rules).toContain('Sonuçlandırılan soru başına');
    expect(rules).toContain('Tamamlanan proje başına');
  });

  it('shows role-separated calculated earnings with immutable source detail', () => {
    expect(entries).toContain('YAZAR TELİFLERİ');
    expect(entries).toContain('EDİTÖR ÜCRETLERİ');
    expect(entries).toContain('KOORDİNATÖR ÜCRETLERİ');
    expect(entries).toContain('hak edildiği andaki birim ücretin değişmez snapshot');
    expect(entries).toContain('Soru #');
    expect(entries).toContain('entry.unitPrice');
    expect(entries).toContain('entry.amount');
  });

  it('uses consolidated compensation API routes', () => {
    expect(api).toContain('/api/v1/compensation/rules');
    expect(api).toContain('/api/v1/compensation/entries');
    expect(css).toContain('.payment-module-tabs');
    expect(css).toContain('.compensation-entry-kpis');
  });
});
