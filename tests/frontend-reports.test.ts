import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Raporlar V1', () => {
  const reportsPath = path.resolve(__dirname, '../src/reports/ReportsCenter.tsx');
  const reportsCssPath = path.resolve(__dirname, '../src/reports/reports.css');
  const demoPath = path.resolve(__dirname, '../src/DemoApp.tsx');
  const modelPath = path.resolve(__dirname, '../src/demo/model.ts');

  it('adds Raporlar to workspace navigation for all canonical roles', () => {
    const model = fs.readFileSync(modelPath, 'utf8');
    expect(model).toContain("| 'reports'");
    expect(model).toContain("reports: 'Raporlar'");
    for (const role of ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU', 'EDITOR', 'YAZAR', 'MUHASEBE']) {
      const roleLine = model.split('\n').find(line => line.includes(`${role}:`) && line.includes("['overview'"));
      expect(roleLine).toContain("'reports'");
    }
  });

  it('uses scoped live project, question, task, author and payment data', () => {
    const demo = fs.readFileSync(demoPath, 'utf8');
    const reports = fs.readFileSync(reportsPath, 'utf8');

    expect(demo).toContain('<ReportsCenter');
    expect(demo).toContain('projects={apiProjects}');
    expect(demo).toContain('questions={apiQuestions}');
    expect(demo).toContain('tasks={reportTasks}');
    expect(demo).toContain('authors={apiAuthors}');
    expect(demo).toContain('payments={apiPayments}');
    expect(demo).toContain("if (section !== 'reports' || currentUser.role === 'MUHASEBE') return;");
    expect(reports).toContain("const canSeeFinance = ['GENEL_KOORDINATOR', 'MUHASEBE'].includes(role)");
    expect(reports).toContain("const canSeeAuthors = ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'].includes(role)");
  });

  it('provides filters, KPI analysis, project performance and role-aware report sections', () => {
    const reports = fs.readFileSync(reportsPath, 'utf8');

    expect(reports).toContain('Tüm projeler');
    expect(reports).toContain('Tüm branşlar');
    expect(reports).toContain('Tüm kademeler');
    expect(reports).toContain('AKTİF PROJE');
    expect(reports).toContain('SORU ÜRETİMİ');
    expect(reports).toContain('TAMAMLANAN GÖREV');
    expect(reports).toContain('GENEL İLERLEME');
    expect(reports).toContain('PROJE PERFORMANSI');
    expect(reports).toContain('YAZAR AĞI');
    expect(reports).toContain('TELİF VE ÖDEMELER');
  });

  it('exports CSV and supports browser print/PDF without a new server endpoint', () => {
    const reports = fs.readFileSync(reportsPath, 'utf8');
    const vercel = fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf8');

    expect(reports).toContain('const exportCsv = () =>');
    expect(reports).toContain("type: 'text/csv;charset=utf-8;'");
    expect(reports).toContain('window.print()');
    expect(reports).toContain('Yazdır / PDF');
    expect(vercel).not.toContain('/api/v1/reports');
  });

  it('has responsive and print-specific presentation rules', () => {
    const css = fs.readFileSync(reportsCssPath, 'utf8');
    expect(css).toContain('.reports-kpi-grid');
    expect(css).toContain('.reports-main-grid');
    expect(css).toContain('.reports-project-panel');
    expect(css).toContain('@media print');
  });
});
