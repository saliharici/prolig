/** Report DTO, pure aggregations and CSV exports (no DB/browser access). */
export type AuthorMetricCounts = {
  total: number; draft: number; review: number;
  revision: number; approved: number; rejected: number;
};
export type AuthorRoyalties = {
  total: string; waiting: string; inProcess: string; paid: string;
};
export interface AuthorPerformanceReportRow {
  projectId: number; projectCode: string; projectTitle: string;
  branchId: number; branchName: string; grade: string;
  userId: number; authorName: string;
  provinceId: number; provinceName: string;
  counts: AuthorMetricCounts;
  earnings?: AuthorRoyalties;
}
export type AuthorPerformanceReport = {
  financeVisible: boolean;
  rows: AuthorPerformanceReportRow[];
};
export type ComparisonDimension = 'project' | 'branch' | 'province';
export type AggregateRow = {
  key: string; label: string; subtitle: string;
  authorCount: number; projectCount: number;
  counts: AuthorMetricCounts;
  earningsKurus?: { total: bigint; waiting: bigint; inProcess: bigint; paid: bigint };
};

const zeroCounts = (): AuthorMetricCounts => ({
  total: 0, draft: 0, review: 0, revision: 0, approved: 0, rejected: 0
});
const keys = ['total','draft','review','revision','approved','rejected'] as const;
const moneyKeys = ['total','waiting','inProcess','paid'] as const;

export function parseKurus(value: string): bigint {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('INVALID_MONETARY_TOTAL');
  const [lira, fraction = ''] = value.split('.');
  return BigInt(lira) * 100n + BigInt(fraction.padEnd(2, '0'));
}
export function formatKurus(value: bigint): string {
  if (value < 0n) throw new Error('INVALID_MONETARY_TOTAL');
  return new Intl.NumberFormat('tr-TR').format(value / 100n) + ',' +
    (value % 100n).toString().padStart(2, '0') + ' ₺';
}
export function csvAmount(value: bigint): string {
  return (value / 100n).toString() + '.' + (value % 100n).toString().padStart(2, '0');
}

export function filterAuthorReportRows(
  rows: AuthorPerformanceReportRow[],
  allowedProjectIds: ReadonlySet<number>,
  provinceFilter: string
): AuthorPerformanceReportRow[] {
  return rows.filter(row =>
    allowedProjectIds.has(row.projectId) &&
    (provinceFilter === 'all' || String(row.provinceId) === provinceFilter)
  );
}

export function groupAuthorReport(
  rows: AuthorPerformanceReportRow[],
  dimension: ComparisonDimension,
  financeVisible: boolean
): AggregateRow[] {
  const groups = new Map<string, AggregateRow & { authorIds: Set<number>; projectIds: Set<number> }>();
  for (const row of rows) {
    const key = dimension === 'project'
      ? `project:${row.projectId}`
      : dimension === 'branch' ? `branch:${row.branchId}` : `province:${row.provinceId}`;
    const label = dimension === 'project' ? row.projectTitle : dimension === 'branch' ? row.branchName : row.provinceName;
    const subtitle = dimension === 'project' ? row.projectCode : dimension === 'branch' ? 'Branş' : 'İl';
    let agg = groups.get(key);
    if (!agg) {
      agg = {
        key, label, subtitle, authorCount: 0, projectCount: 0,
        counts: zeroCounts(),
        ...(financeVisible ? { earningsKurus: { total: 0n, waiting: 0n, inProcess: 0n, paid: 0n } } : {}),
        authorIds: new Set(), projectIds: new Set()
      };
      groups.set(key, agg);
    }
    agg.authorIds.add(row.userId);
    agg.projectIds.add(row.projectId);
    for (const field of keys) agg.counts[field] += row.counts[field];
    if (financeVisible && agg.earningsKurus && row.earnings) {
      for (const field of moneyKeys) agg.earningsKurus[field] += parseKurus(row.earnings[field]);
    }
  }

  return [...groups.values()].map(group => {
    const { authorIds, projectIds, ...result } = group;
    return { ...result, authorCount: authorIds.size, projectCount: projectIds.size };
  }).sort((a, b) => b.counts.approved - a.counts.approved ||
    b.counts.total - a.counts.total ||
    a.label.localeCompare(b.label, 'tr-TR') || a.key.localeCompare(b.key));
}

/** Escape delimiter, quotations, newlines AND spreadsheet formula injection. */
export function safeCsvCell(value: string | number): string {
  const raw = String(value);
  // Spreadsheet imports can execute formula cells even when quoted.
  const neutral = /^[\s\uFEFF]*[=+\-@]/.test(raw) || /^[\t\r\n]/.test(raw)
    ? '\'' + raw : raw;
  return '"' + neutral.replaceAll('"', '""') + '"';
}
function csv(rows: Array<Array<string | number>>) {
  return '\uFEFF' + rows.map(row => row.map(safeCsvCell).join(';')).join('\r\n');
}

const countHeader = ['Toplam soru','Taslak','İncelemede','Revizyon','Onaylandı','Reddedildi'];
const moneyHeader = ['Hak edilen toplam (TL)','Bekleyen (TL)','Ödeme sürecinde (TL)','Ödenen (TL)'];

export function comparisonCsv(groups: AggregateRow[], dimension: ComparisonDimension, financeVisible: boolean) {
  const label = dimension === 'project' ? 'Proje' : dimension === 'branch' ? 'Branş' : 'İl';
  return csv([
    [label, 'Açıklama', 'Tekil yazar', 'Proje adedi', ...countHeader, ...(financeVisible ? moneyHeader : [])],
    ...groups.map(group => [
      group.label, group.subtitle, group.authorCount, group.projectCount,
      ...keys.map(key => group.counts[key]),
      ...(financeVisible && group.earningsKurus ? moneyKeys.map(key => csvAmount(group.earningsKurus![key])) : [])
    ])
  ]);
}
export function authorDetailsCsv(rows: AuthorPerformanceReportRow[], financeVisible: boolean) {
  return csv([
    ['Proje kodu','Proje','Branş','İl','Yazar','Sınıf',...countHeader,...(financeVisible ? moneyHeader : [])],
    ...rows.map(row => [
      row.projectCode,row.projectTitle,row.branchName,row.provinceName,row.authorName,row.grade,
      ...keys.map(key => row.counts[key]),
      ...(financeVisible && row.earnings ? moneyKeys.map(key => row.earnings![key]) : [])
    ])
  ]);
}

export async function fetchAuthorPerformanceReport(): Promise<AuthorPerformanceReport> {
  const response = await fetch('/api/v1/projects?view=authorPerformanceReport', { credentials: 'include' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(response.status === 403
    ? 'Bu raporu görüntüleme yetkiniz bulunmuyor.'
    : typeof body?.error === 'string' ? body.error : 'Yazar performans raporu yüklenemedi.');
  return body as AuthorPerformanceReport;
}
