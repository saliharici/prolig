import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/DemoApp.tsx', 'utf8');
const reports = readFileSync('src/reports/ReportsCenter.tsx', 'utf8');
const entries = readFileSync('src/compensation/CompensationEntriesPanel.tsx', 'utf8');
const style = readFileSync('src/workspace/corporate-finance-v3c.css', 'utf8');

describe('Corporate reports and royalties phase 3C', () => {
  it('passes existing task and payment loading/error state into reports', () => {
    expect(app).toContain('tasksError={reportTasksError}');
    expect(app).toContain('paymentsLoading={paymentsLoading}');
    expect(app).toContain('paymentsError={paymentsError}');
    expect(reports).toContain('const tasksUnavailable = canSeeTasks && (tasksLoading || Boolean(tasksError));');
    expect(reports).toContain('{paymentsLoading && <p className="reports-finance-message">Ödeme kayıtları yükleniyor...</p>}');
    expect(reports).toContain('{!paymentsLoading && paymentsError && <p className="reports-finance-message" role="alert">{paymentsError}</p>}');
  });

  it('never presents inaccessible tasks as zero or exports missing counts as zero', () => {
    expect(reports).toContain("tasksUnavailable ? (tasksLoading && !tasksError ? '…' : '—') : completedTasks");
    expect(reports).toContain("tasksUnavailable ? '' : project.taskCountActual");
    expect(reports).toContain("tasksUnavailable ? '—' : project.taskCountActual");
    expect(reports).toContain('Görev sayılarını sıfır kabul etmiyoruz.');
  });

  it('separates no records from no API access in question/task charts', () => {
    expect(reports).toContain('filteredQuestions.length === 0 ? <div className="reports-state-empty">');
    expect(reports).toContain('tasksError ? <div className="reports-state-empty"');
    expect(reports).toContain('tasksLoading ? <div className="reports-state-empty">');
    expect(reports).toContain('filteredTasks.length === 0 ? <div className="reports-state-empty">');
  });

  it('does not show placeholder zero royalty balances when the API is inaccessible', () => {
    expect(entries).toContain('{!loading && !error && <div className="compensation-entry-kpis">');
    expect(entries).toContain('Bu durum, kazanımlarınızın sıfır olduğu anlamına gelmez.');
    expect(entries).toContain('onClick={() => loadEntries()}');
    expect(reports).toContain('{!paymentsLoading && !paymentsError && <div className="reports-finance-metrics">');
    expect(reports).toContain('{!compensationLoading && !compensationError && compensationSummary && <div className="reports-finance-metrics">');
  });

  it('keeps native CSV/print and existing auth/action flows, with scoped responsive styling', () => {
    expect(reports).toContain('onClick={exportCsv}');
    expect(reports).toContain('onClick={() => window.print()}');
    expect(entries).toContain('fetchCompensationPage(append ? nextCursor : null)');
    expect(style).toContain('.corporate-workspace-v3 .reports-center');
    expect(style).toContain('.corporate-workspace-v3 .compensation-entries-panel');
    expect(style).not.toContain('.public-shell');
  });
});
