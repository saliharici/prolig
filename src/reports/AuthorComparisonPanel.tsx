import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Users } from 'lucide-react';
import type { ApiProject } from '../projects/types';
import type { Role } from '../demo/model';
import {
  authorDetailsCsv, comparisonCsv, fetchAuthorPerformanceReport,
  filterAuthorReportRows, formatKurus, groupAuthorReport
} from './author-performance';
import type { AuthorPerformanceReport, ComparisonDimension } from './author-performance';
import './author-comparison.css';

const reportRoles: Role[] = [
  'GENEL_KOORDINATOR', 'MUHASEBE', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'
];

function downloadCsv(content: string, filename: string) {
  const file = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const fieldLabels: Record<ComparisonDimension, string> = {
  project: 'Proje', branch: 'Branş', province: 'İl'
};

export function AuthorComparisonPanel({ projects, role }: { projects: ApiProject[]; role: Role }) {
  const allowed = reportRoles.includes(role);
  const [report, setReport] = useState<AuthorPerformanceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dimension, setDimension] = useState<ComparisonDimension>('project');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [showAllAuthors, setShowAllAuthors] = useState(false);

  useEffect(() => {
    let active = true;
    setReport(null);
    setError('');
    if (!allowed) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void fetchAuthorPerformanceReport()
      .then(value => { if (active) setReport(value); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Rapor yüklenemedi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);

  const allowedProjectIds = useMemo(() => new Set(projects.map(project => project.id)), [projects]);
  const provinceOptions = useMemo(() => {
    const provinces = new Map<number, string>();
    report?.rows.forEach(row => {
      if (allowedProjectIds.has(row.projectId)) provinces.set(row.provinceId, row.provinceName);
    });
    return [...provinces.entries()].sort((a, b) => a[1].localeCompare(b[1], 'tr-TR'));
  }, [report, allowedProjectIds]);

  const filteredRows = useMemo(() => filterAuthorReportRows(
    report?.rows ?? [], allowedProjectIds, provinceFilter
  ), [report, allowedProjectIds, provinceFilter]);
  const financeVisible = Boolean(report?.financeVisible &&
    (role === 'GENEL_KOORDINATOR' || role === 'MUHASEBE'));

  const comparison = useMemo(() => groupAuthorReport(
    filteredRows, dimension, financeVisible
  ), [filteredRows, dimension, financeVisible]);

  const authorRows = useMemo(() =>
    [...filteredRows].sort((a, b) => b.counts.approved - a.counts.approved ||
      b.counts.total - a.counts.total ||
      a.authorName.localeCompare(b.authorName, 'tr-TR') || a.projectId - b.projectId),
    [filteredRows]
  );
  const displayedAuthors = showAllAuthors ? authorRows : authorRows.slice(0, 50);
  const maxApproved = Math.max(...comparison.map(row => row.counts.approved), 1);

  if (!allowed) return null;

  return <section className="panel reports-author-comparison" aria-label="Yazar performans karşılaştırması">
    <div className="panel-head">
      <div><span className="panel-kicker">ÜRETİM ANALİTİĞİ</span><h2>Yazar Performans Karşılaştırması</h2></div>
      <BarChart3 size={18} aria-hidden="true" />
    </div>
    <p className="reports-author-comparison-description">
      Proje, branş ve il bazında onaylanan soruları karşılaştırın. Üstteki proje, branş ve sınıf filtreleri bu rapora da uygulanır.
    </p>
    {loading && <p className="reports-author-comparison-feedback">Yazar üretim raporu yükleniyor…</p>}
    {!loading && error && <p className="reports-author-comparison-feedback" role="alert">{error}</p>}
    {!loading && !error && report && <>
      <div className="reports-author-controls">
        <label>Karşılaştırma
          <select value={dimension} onChange={e => setDimension(e.target.value as ComparisonDimension)}>
            <option value="project">Proje bazında</option>
            <option value="branch">Branş bazında</option>
            <option value="province">İl bazında</option>
          </select>
        </label>
        <label>İl filtresi
          <select value={provinceFilter} onChange={e => { setProvinceFilter(e.target.value); setShowAllAuthors(false); }}>
            <option value="all">Tüm iller</option>
            {provinceOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </label>
        <div className="reports-author-actions">
          <button className="secondary-button" type="button" disabled={!comparison.length}
            onClick={() => downloadCsv(comparisonCsv(comparison, dimension, financeVisible), 'prolig-yazar-karsilastirma.csv')}>
            <Download size={14} /> Karşılaştırma CSV
          </button>
          <button className="secondary-button" type="button" disabled={!authorRows.length}
            onClick={() => downloadCsv(authorDetailsCsv(authorRows, financeVisible), 'prolig-yazar-detay.csv')}>
            <Download size={14} /> Yazar CSV
          </button>
        </div>
      </div>

      <div className="reports-author-meta">
        <span><Users size={14} /> {new Set(filteredRows.map(row => row.userId)).size} tekil yazar</span>
        <span>{filteredRows.length} proje–yazar eşleşmesi</span>
        <span>{comparison.reduce((sum, row) => sum + row.counts.approved, 0)} onaylı soru</span>
      </div>
      {comparison.length === 0 ? <p className="reports-author-comparison-feedback">Bu filtrelerde karşılaştırılacak kayıt bulunamadı.</p> : <>
        <div className="reports-author-bars" aria-label="Onaylı soru karşılaştırması">
          {comparison.slice(0, 8).map(item =>
            <div key={item.key} className="reports-author-bar">
              <span title={item.label}>{item.label}</span>
              <div><b style={{ width: `${item.counts.approved / maxApproved * 100}%` }} /></div>
              <strong>{item.counts.approved}</strong>
            </div>)}
        </div>
        <div className="reports-author-table-scroll">
          <table className="reports-author-table">
            <thead><tr>
              <th>{fieldLabels[dimension].toLocaleUpperCase('tr-TR')}</th><th>YAZAR</th><th>PROJE</th>
              <th>TOPLAM</th><th>İNCELEMEDE</th><th>REVİZYON</th><th>ONAYLI</th><th>RED</th>
              {financeVisible && <th>YAZAR TELİFİ</th>}
            </tr></thead>
            <tbody>{comparison.map(item => <tr key={item.key}>
              <td><strong>{item.label}</strong><small>{item.subtitle}</small></td>
              <td>{item.authorCount}</td><td>{item.projectCount}</td>
              <td>{item.counts.total}</td><td>{item.counts.review}</td><td>{item.counts.revision}</td>
              <td><strong>{item.counts.approved}</strong></td><td>{item.counts.rejected}</td>
              {financeVisible && <td><strong>{item.earningsKurus ? formatKurus(item.earningsKurus.total) : '—'}</strong></td>}
            </tr>)}</tbody>
          </table>
        </div>
      </>}

      {authorRows.length > 0 && <div className="reports-author-detail">
        <h3>Yazar bazlı ayrıntılar</h3>
        <div className="reports-author-table-scroll">
          <table className="reports-author-table">
            <thead><tr>
              <th>YAZAR</th><th>PROJE</th><th>BRANŞ</th><th>İL</th>
              <th>TOPLAM</th><th>TASLAK</th><th>İNCELEMEDE</th><th>REVİZYON</th><th>ONAYLI</th><th>RED</th>
              {financeVisible && <th>TELİF TOPLAM</th>}
            </tr></thead>
            <tbody>{displayedAuthors.map(row => <tr key={`${row.projectId}:${row.userId}`}>
              <td><strong>{row.authorName}</strong></td><td>{row.projectCode}</td><td>{row.branchName}</td><td>{row.provinceName}</td>
              <td>{row.counts.total}</td><td>{row.counts.draft}</td><td>{row.counts.review}</td>
              <td>{row.counts.revision}</td><td><strong>{row.counts.approved}</strong></td><td>{row.counts.rejected}</td>
              {financeVisible && <td>{row.earnings ? formatKurus(BigInt(row.earnings.total.split('.')[0]) * 100n +
                BigInt((row.earnings.total.split('.')[1] ?? '').padEnd(2, '0'))) : '—'}</td>}
            </tr>)}</tbody>
          </table>
        </div>
        {authorRows.length > 50 && !showAllAuthors &&
          <button className="secondary-button" type="button" onClick={() => setShowAllAuthors(true)}>
            Diğer {authorRows.length - 50} kaydı da göster
          </button>}
      </div>}

      <p className="reports-author-disclaimer">
        Soru sayıları aktif (arşiv dışı) kayıtları, telif tutarları ise iptal edilmeyen YAZAR hakedişlerini kapsar.
        Aynı yazar farklı projelerde ayrı satırda yer alabilir; tekil yazar sayısı tekrarsızdır.
        {financeVisible ? ' Finans tutarları yetkili kullanıcıya açıktır ve ödeme kayıtlarıyla toplanmaz.' : ' Finans tutarları bu rolde gösterilmez.'}
      </p>
    </>}
  </section>;
}
