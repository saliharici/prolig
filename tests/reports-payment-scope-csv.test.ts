import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ApiPayment } from '../src/payments/types';
import { paymentTotalsForReport } from '../src/reports/finance-scope';
import { safeCsvCell } from '../src/reports/author-performance';

const reportsSource = readFileSync(new URL('../src/reports/ReportsCenter.tsx', import.meta.url), 'utf8');

function payment(overrides: Partial<ApiPayment> = {}): ApiPayment {
  return {
    id: 1, amount: '0.00', status: 'Bekliyor', contractNo: null,
    paymentDate: null, createdAt: '2026-10-18T09:00:00.000Z',
    updatedAt: '2026-10-18T09:00:00.000Z',
    author: null, project: null, entries: [],
    ...overrides
  };
}

function earning(id: number, projectId: number | null, amount: string): NonNullable<ApiPayment['entries']>[number] {
  return {
    id, project: projectId === null ? null : { id: projectId, code: 'P-' + projectId, title: 'Proje ' + projectId },
    roleCode: 'YAZAR', earningType: 'QUESTION_AUTHOR', questionId: id,
    sourceKey: 'QUESTION_AUTHOR:' + id, quantity: 1, unitPrice: amount,
    amount, status: 'ODEMEYE_ALINDI', earnedAt: '2026-10-18T00:00:00.000Z', paidAt: null
  };
}

describe('Reports: project-scoped payment reconciliation', () => {
  it('allocates beneficiary-level period payments only to selected project earnings', () => {
    const pooled = payment({
      amount: '150.25',
      entries: [earning(1, 7, '100.10'), earning(2, 8, '50.15')],
      project: null
    });
    expect(paymentTotalsForReport([pooled], new Set([7]))).toEqual({ pending: 10010, approved: 0, paid: 0 });
    expect(paymentTotalsForReport([pooled], new Set([8]))).toEqual({ pending: 5015, approved: 0, paid: 0 });
    expect(paymentTotalsForReport([pooled], new Set([7, 8]))).toEqual({ pending: 15025, approved: 0, paid: 0 });
    expect(paymentTotalsForReport([pooled], new Set())).toEqual({ pending: 0, approved: 0, paid: 0 });
    expect(paymentTotalsForReport([pooled], null)).toEqual({ pending: 15025, approved: 0, paid: 0 });
  });

  it('trusts earning allocations over a legacy project pointer when earnings exist', () => {
    const pooled = payment({
      amount: '75.00', project: { id: 7, title: 'Proje 7', code: 'P-7' },
      entries: [earning(3, 7, '25.00'), earning(4, 8, '50.00')], status: 'Onaylandi'
    });
    expect(paymentTotalsForReport([pooled], new Set([7])).approved).toBe(2500);
    expect(paymentTotalsForReport([pooled], new Set([8])).approved).toBe(5000);
    expect(paymentTotalsForReport([pooled], null).approved).toBe(7500);
  });

  it('preserves unfiltered totals and supports older payment records without earning links', () => {
    const legacy = payment({ id: 5, amount: '12.34', status: 'Odendi', project: { id: 8, code: 'P-8', title: 'Proje 8' } });
    expect(paymentTotalsForReport([legacy], new Set([8])).paid).toBe(1234);
    expect(paymentTotalsForReport([legacy], new Set([7])).paid).toBe(0);
    expect(paymentTotalsForReport([legacy], null).paid).toBe(1234);
  });

  it('separates statuses and excludes cancelled records, projectless earnings and rounding drift', () => {
    const samples = [
      payment({ id: 1, amount: '0.10', entries: [earning(1, 7, '0.10')], status: 'Bekliyor' }),
      payment({ id: 2, amount: '0.20', entries: [earning(2, 7, '0.20')], status: 'Bekliyor' }),
      payment({ id: 3, amount: '2.00', entries: [earning(3, 7, '2.00')], status: 'Onaylandi' }),
      payment({ id: 4, amount: '3.00', entries: [earning(4, 7, '3.00')], status: 'Odendi' }),
      payment({ id: 5, amount: '4.00', entries: [earning(5, 7, '4.00')], status: 'Iptal' }),
      payment({ id: 6, amount: '9.00', entries: [earning(6, null, '9.00')], status: 'Odendi' })
    ];
    expect(paymentTotalsForReport(samples, new Set([7]))).toEqual({ pending: 30, approved: 200, paid: 300 });
    expect(paymentTotalsForReport(samples, null)).toEqual({ pending: 30, approved: 200, paid: 1200 });
  });

  it('uses authorization-gated finance summaries without expanding read visibility', () => {
    expect(reportsSource).toContain("const canSeeFinance = ['GENEL_KOORDINATOR', 'MUHASEBE'].includes(role)");
    expect(reportsSource).toContain('canSeeFinance ? payments : []');
    expect(reportsSource).toContain('paymentTotalsForReport(');
    expect(reportsSource).toContain('hasProjectScopedFilter ? filteredProjectIds : null');
    expect(reportsSource).not.toContain("payment.project?.id ? filteredProjectIds.has(payment.project.id) : false");
  });
});

describe('Reports: CSV export spreadsheet safety', () => {
  it('reuses the tested escape and spreadsheet-formula protections for project exports', () => {
    expect(reportsSource).toContain("import { safeCsvCell } from './author-performance';");
    expect(reportsSource).toContain("row.map(safeCsvCell).join(';')");
    expect(safeCsvCell('=HYPERLINK("https://unsafe.example")')).toBe("\"'=HYPERLINK(\"\"https://unsafe.example\"\")\"");
    expect(safeCsvCell(' +SUM(A1:A3)')).toBe("\"' +SUM(A1:A3)\"");
    expect(safeCsvCell('Proje; \"Örnek\"')).toBe('\"Proje; \"\"Örnek\"\"\"');
  });
  it('keeps the report CSV a project summary and financial fields off the general CSV', () => {
    expect(reportsSource).toContain('const exportCsv = () =>');
    expect(reportsSource).toContain('Proje CSV');
    const exportSection = reportsSource.slice(reportsSource.indexOf('const exportCsv = () =>'), reportsSource.indexOf('const resetFilters = () =>'));
    expect(exportSection).not.toContain('compensationSummary');
    expect(exportSection).not.toContain('payment.amount');
    expect(exportSection).toContain("'text/csv;charset=utf-8;'");
  });
});
