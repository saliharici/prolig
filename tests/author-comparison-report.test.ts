import { describe, expect, it, vi } from 'vitest';
import {
  authorDetailsCsv, comparisonCsv, csvAmount, filterAuthorReportRows,
  formatKurus, groupAuthorReport, parseKurus, safeCsvCell, fetchAuthorPerformanceReport
} from '../src/reports/author-performance';
import type { AuthorPerformanceReportRow } from '../src/reports/author-performance';

const example: AuthorPerformanceReportRow[] = [
  {
    projectId: 3, projectCode: 'M-3', projectTitle: 'Matematik Test',
    branchId: 1, branchName: 'Matematik', grade: '7. Sınıf',
    userId: 10, authorName: 'Aylin Yazar', provinceId: 25, provinceName: 'Erzurum',
    counts: { total: 3, draft: 1, review: 1, revision: 0, approved: 1, rejected: 0 },
    earnings: { total: '10.01', waiting: '6.00', inProcess: '4.00', paid: '0.01' }
  },
  {
    projectId: 4, projectCode: 'M-4', projectTitle: 'Matematik Devam',
    branchId: 1, branchName: 'Matematik', grade: '8. Sınıf',
    userId: 10, authorName: 'Aylin Yazar', provinceId: 25, provinceName: 'Erzurum',
    counts: { total: 2, draft: 0, review: 0, revision: 1, approved: 1, rejected: 0 },
    earnings: { total: '0.02', waiting: '0.02', inProcess: '0.00', paid: '0.00' }
  },
  {
    projectId: 4, projectCode: 'M-4', projectTitle: 'Matematik Devam',
    branchId: 1, branchName: 'Matematik', grade: '8. Sınıf',
    userId: 20, authorName: 'Berk Öğretmen', provinceId: 34, provinceName: 'İstanbul',
    counts: { total: 1, draft: 0, review: 0, revision: 0, approved: 1, rejected: 0 },
    earnings: { total: '3.50', waiting: '0.00', inProcess: '0.00', paid: '3.50' }
  }
];

describe('Author report filtered comparisons & CSV exports', () => {
  it('groups by project, branch, province and counts distinct authors per bucket', () => {
    const byProject = groupAuthorReport(example, 'project', true);
    expect(byProject).toHaveLength(2);
    const projectFour = byProject.find(row => row.key === 'project:4')!;
    expect(projectFour.counts.total).toBe(3);
    expect(projectFour.counts.approved).toBe(2);
    expect(projectFour.authorCount).toBe(2);
    expect(projectFour.earningsKurus?.total).toBe(352n);

    const byBranch = groupAuthorReport(example, 'branch', true);
    expect(byBranch).toHaveLength(1);
    expect(byBranch[0].authorCount).toBe(2);
    expect(byBranch[0].projectCount).toBe(2);
    expect(byBranch[0].counts.approved).toBe(3);
    expect(byBranch[0].earningsKurus?.total).toBe(1353n);

    const byProvince = groupAuthorReport(example, 'province', true);
    const erzurum = byProvince.find(row => row.key === 'province:25')!;
    expect(erzurum.authorCount).toBe(1);
    expect(erzurum.projectCount).toBe(2);
    expect(erzurum.counts.total).toBe(5);
  });

  it('filters by project and then by province, without replacing empty results by all projects', () => {
    expect(filterAuthorReportRows(example, new Set([4]), '25')).toHaveLength(1);
    expect(filterAuthorReportRows(example, new Set(), 'all')).toEqual([]);
    expect(filterAuthorReportRows(example, new Set([3]), '34')).toEqual([]);
  });

  it('keeps exact cents even when aggregating and exporting financial values', () => {
    expect(parseKurus('10.01')).toBe(1001n);
    expect(parseKurus('0.02')).toBe(2n);
    expect(csvAmount(1353n)).toBe('13.53');
    expect(formatKurus(1353n)).toContain('13,53');
    expect(() => parseKurus('1.234')).toThrow();
  });

  it('removes all financial data from coordinator comparison and detailed CSV', () => {
    const grouped = groupAuthorReport(example, 'province', false);
    expect(grouped.every(row => row.earningsKurus === undefined)).toBe(true);
    const safeExport = authorDetailsCsv(example, false);
    expect(safeExport).not.toContain('Hak edilen toplam');
    expect(safeExport).not.toContain('10.01');
    expect(comparisonCsv(grouped, 'province', false)).not.toContain('Bekleyen (TL)');
    expect(comparisonCsv(grouped, 'province', false)).toContain('Erzurum');
  });

  it('quotes delimiters, quotes, linefeeds and neutralizes spreadsheet formulas', () => {
    expect(safeCsvCell('=1+2')).toBe("\"'=1+2\"");
    expect(safeCsvCell('  +SUM(A1:A4)')).toBe("\"'  +SUM(A1:A4)\"");
    expect(safeCsvCell('test;\"hello\"')).toBe('\"test;\"\"hello\"\"\"');
    const danger = [{ ...example[0], authorName: '=HYPERLINK(\"https://evil.test\")' }];
    const csv = authorDetailsCsv(danger, false);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('fails closed on malformed successful report responses rather than crashing the home page', async () => {
    for (const payload of [[], {}, null, { financeVisible: true }, { financeVisible: 'yes', rows: [] }]) {
      const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
      vi.stubGlobal('fetch', mock);
      try {
        await expect(fetchAuthorPerformanceReport()).rejects.toThrow('beklenmeyen biçimde');
      } finally {
        vi.unstubAllGlobals();
      }
    }
  });

  it('uses only authenticated read-only GET for the report', async () => {
    const mock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ financeVisible: false, rows: [] })
    });
    vi.stubGlobal('fetch', mock);
    try {
      const response = await fetchAuthorPerformanceReport();
      expect(response.rows).toEqual([]);
      expect(mock).toHaveBeenCalledWith('/api/v1/projects?view=authorPerformanceReport', {
        credentials: 'include'
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
