import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { canReadAuthorPerformanceReport } from '../api/v1/_lib/author-performance-report.js';

// The role gate is pure; unit acceptance must never connect to Neon.
vi.mock('../api/v1/_lib/prisma.js', () => ({ prisma: {} }));

const center = readFileSync(new URL('../src/reports/ReportsCenter.tsx', import.meta.url), 'utf8');
const comparison = readFileSync(new URL('../src/reports/AuthorComparisonPanel.tsx', import.meta.url), 'utf8');
const reportCss = readFileSync(new URL('../src/reports/reports.css', import.meta.url), 'utf8');

describe('Reports V1 final role boundary regression', () => {
  it('keeps finance details gated to general coordinator and accounting', () => {
    expect(center).toContain("const canSeeFinance = ['GENEL_KOORDINATOR', 'MUHASEBE'].includes(role)");
    expect(center).toContain("const canSeeContent = role !== 'MUHASEBE'");
    expect(center).toContain("const canSeeTasks = role !== 'MUHASEBE'");
    expect(center).toContain("const canSeeAuthors = ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'BRANS_KOORDINATORU'].includes(role)");
    expect(center).toContain('{canSeeFinance && <section className="panel reports-finance-card">');
    expect(center).toContain('canSeeFinance ? payments : []');
    expect(center).toContain('const exportCsv = () =>');
    // The general project CSV must not expose finance-only aggregates.
    const csv = center.slice(center.indexOf('const exportCsv = () =>'), center.indexOf('const resetFilters = () =>'));
    expect(csv).not.toContain('compensationSummary');
    expect(csv).not.toContain('filteredPayments');
  });

  it('allows only report-eligible roles to access author comparisons', () => {
    const eligible = ['GENEL_KOORDINATOR', 'MUHASEBE', 'BOLGE_KOORDINATORU', 'BRANS_KOORDINATORU'];
    const restricted = ['YAZAR', 'EDITOR'];
    for (const role of eligible) expect(canReadAuthorPerformanceReport(role)).toBe(true);
    for (const role of restricted) expect(canReadAuthorPerformanceReport(role)).toBe(false);
    expect(comparison).toContain("role === 'GENEL_KOORDINATOR' || role === 'MUHASEBE'");
    expect(comparison).toContain('if (!allowed) return null;');
    expect(comparison).toContain('comparisonCsv(comparison, dimension, financeVisible)');
    expect(comparison).toContain('authorDetailsCsv(authorRows, financeVisible)');
  });
});

describe('Reports print/PDF acceptance structure', () => {
  it('hides actual workspace navigation rather than the nonexistent legacy .sidebar', () => {
    expect(reportCss).toContain('@media print');
    expect(reportCss).toContain('.demo-shell:has(.reports-center) .demo-sidebar');
    expect(reportCss).toContain('.demo-shell:has(.reports-center) .topbar.topbar-command');
    expect(reportCss).toContain('.demo-shell:has(.reports-center) .reports-filter-panel');
    expect(reportCss).toContain('.demo-shell:has(.reports-center) #workspace-content');
    expect(reportCss).not.toContain('@media print{.sidebar,.topbar');
    expect(reportCss).toContain('.reports-print-scope { display: none; }');
    expect(center).toContain('Rapor kapsamı:');
    expect(center).toContain('roleLabels[role]');
  });

  it('prints multi-page data instead of clipping tables or forcing all panels onto one page', () => {
    expect(reportCss).toContain('.reports-center .panel {');
    expect(reportCss).toContain('break-inside: auto !important;');
    expect(reportCss).toContain('.reports-author-table-scroll');
    expect(reportCss).toContain('overflow: visible !important;');
    expect(reportCss).toContain('table-layout: fixed;');
    expect(reportCss).toContain('display: table-header-group;');
    expect(reportCss).toContain('.report-project-row {');
    expect(reportCss).toContain('white-space: normal !important;');
    expect(reportCss).toContain('break-inside: avoid-page !important;');
  });
});
