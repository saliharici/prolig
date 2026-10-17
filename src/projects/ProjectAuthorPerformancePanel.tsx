import { useEffect, useMemo, useState } from 'react';
import { Users, Wallet } from 'lucide-react';
import type { Role } from '../demo/model';
import { toKurus } from '../payments/money';
import { fetchProjectAuthorPerformance } from './api';
import type { ProjectAuthorPerformance } from './types';
import './project-author-performance.css';

export function mayViewProjectAuthorPerformance(role: Role) {
  return ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','MUHASEBE'].includes(role);
}

const amount = (value: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(toKurus(value) / 100);

export function ProjectAuthorPerformancePanel({ projectId, role }: { projectId: number; role: Role }) {
  const allowed = mayViewProjectAuthorPerformance(role);
  const [data, setData] = useState<ProjectAuthorPerformance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    setSearch('');
    if (!allowed) {
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    void fetchProjectAuthorPerformance(projectId)
      .then(result => { if (active) setData(result); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'Yazar performansı yüklenemedi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [projectId, allowed]);

  const authors = useMemo(() =>
    (data?.authors ?? [])
      .filter(author => `${author.fullName} ${author.provinceName}`.toLocaleLowerCase('tr-TR').includes(search.trim().toLocaleLowerCase('tr-TR')))
      .sort((a, b) => b.counts.approved - a.counts.approved || b.counts.total - a.counts.total || a.fullName.localeCompare(b.fullName, 'tr-TR')),
    [data, search]
  );

  if (!allowed) return null;

  return <section className="project-author-performance" aria-label="Yazar performans ve hakedişleri">
    <div className="project-author-performance-head">
      <div><span className="panel-kicker">PROJE EKİBİ · SORU ÜRETİMİ</span><h3>Yazar Performansı ve Hakediş</h3></div>
      <span className="project-author-performance-counter"><Users size={14} /> {data?.authors.length ?? '—'} yazar</span>
    </div>
    {loading && <p className="project-author-performance-feedback">Yazar performansları yükleniyor…</p>}
    {!loading && error && <p className="project-author-performance-feedback" role="alert">{error}</p>}
    {!loading && !error && data && <>
      <label className="project-author-performance-search">
        <span>Yazar veya il ara</span>
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Yazar adı veya il…" />
      </label>
      <div className="project-author-performance-scroll">
        <table className="project-author-performance-table">
          <thead><tr>
            <th>YAZAR</th><th>TOPLAM</th><th>TASLAK</th><th>İNCELEMEDE</th>
            <th>REVİZYON</th><th>ONAYLI</th><th>RED</th>
            {data.financeVisible && <th>YAZAR TELİFİ</th>}
          </tr></thead>
          <tbody>{authors.map(author => <tr key={author.userId}>
            <td><strong>{author.fullName}</strong><small>{author.provinceName}</small></td>
            <td>{author.counts.total}</td>
            <td>{author.counts.draft}</td>
            <td>{author.counts.review}</td>
            <td>{author.counts.revision}</td>
            <td><strong>{author.counts.approved}</strong></td>
            <td>{author.counts.rejected}</td>
            {data.financeVisible && <td>
              {author.earnings
                ? <span className="project-author-performance-money">
                    <strong><Wallet size={12} /> {amount(author.earnings.total)}</strong>
                    <small>Bekleyen: {amount(author.earnings.waiting)}</small>
                    <small>İşlemde: {amount(author.earnings.inProcess)} · Ödenen: {amount(author.earnings.paid)}</small>
                  </span>
                : '—'}
            </td>}
          </tr>)}</tbody>
        </table>
      </div>
      {authors.length === 0 && <p className="project-author-performance-feedback">{data.authors.length ? 'Aramanıza uygun yazar bulunamadı.' : 'Bu yetki kapsamında atanmış yazar bulunmuyor.'}</p>}
      <p className="project-author-performance-note">
        Sayılar yalnızca yetki kapsamındaki, projeye bağlı aktif soru kayıtlarından hesaplanır; arşivlenen sorular dahil edilmez.
        {data.financeVisible && ' Telif tutarları sadece YAZAR rolündeki hakediş kayıtlarından hesaplanır; editör ve koordinatör ücretleri dahil edilmez. Onaylanan soru, tarife yoksa sıfır telif oluşturabilir.'}
      </p>
    </>}
  </section>;
}
