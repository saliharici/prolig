import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, FileQuestion, RotateCcw, Search, Users } from 'lucide-react';
import { fetchCompensationPage } from './api';
import type { CompensationEntry, CompensationRole, CompensationSummary } from './types';
import './compensation.css';

const roleLabels: Record<CompensationRole, string> = {
  YAZAR: 'Yazar',
  EDITOR: 'Editör',
  IL_KOORDINATORU: 'İl Koordinatörü',
  BOLGE_KOORDINATORU: 'Bölge Koordinatörü',
  GENEL_KOORDINATOR: 'Genel Koordinatör'
};

const statusLabels: Record<CompensationEntry['status'], string> = {
  HAK_EDILDI: 'Hak Edildi',
  ODEME_BEKLIYOR: 'Ödeme Bekliyor',
  ODEMEYE_ALINDI: 'Ödemeye Alındı',
  ODENDI: 'Ödendi',
  IPTAL: 'İptal'
};

const money = (value: string | number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value));

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(value));

export function CompensationEntriesPanel({ personal = false }: { personal?: boolean }) {
  const [entries, setEntries] = useState<CompensationEntry[]>([]);
  const [summary, setSummary] = useState<CompensationSummary>({ count: 0, total: '0.00', waiting: '0.00', inProcess: '0.00', paid: '0.00', writer: '0.00', editor: '0.00', coordinator: '0.00' });
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | CompensationRole>('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');

  const loadEntries = async (append = false) => {
    setLoading(true);
    setError('');
    try {
      const page = await fetchCompensationPage(append ? nextCursor : null);
      setEntries(previous => append ? [...previous, ...page.entries] : page.entries);
      setSummary(page.summary);
      setNextCursor(page.nextCursor);
    } catch (err: any) {
      setError(err?.message || 'Kazanılmış ücretler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const projects = useMemo(() => {
    const map = new Map<number, { id: number; code: string; title: string }>();
    entries.forEach(entry => {
      if (entry.project) map.set(entry.project.id, entry.project);
    });
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, 'tr-TR'));
  }, [entries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('tr-TR');
    return entries.filter(entry => {
      if (roleFilter !== 'ALL' && entry.roleCode !== roleFilter) return false;
      if (projectFilter !== 'ALL' && entry.project?.id !== Number(projectFilter)) return false;
      if (!term) return true;
      return `${entry.user.fullName} ${roleLabels[entry.roleCode]} ${entry.project?.title || ''} ${entry.project?.code || ''} ${entry.questionId || ''}`
        .toLocaleLowerCase('tr-TR')
        .includes(term);
    });
  }, [entries, roleFilter, projectFilter, search]);


  return (
    <div className="compensation-entries-panel">
      <div className="compensation-entry-kpis">
        <article className="panel"><span className="comp-entry-icon total"><CheckCircle2 size={17}/></span><div><small>TOPLAM KAZANIM</small><strong>{money(summary.total)}</strong><span>{summary.count} kazanım kaydı</span></div></article>
        <article className="panel"><span className="comp-entry-icon writer"><FileQuestion size={17}/></span><div><small>{personal ? 'ÖDEME BEKLEYEN' : 'YAZAR TELİFLERİ'}</small><strong>{money(personal ? summary.waiting : summary.writer)}</strong><span>{personal ? 'Hak edilmiş / döneme alınmış' : 'Onaylanan sorulardan'}</span></div></article>
        <article className="panel"><span className="comp-entry-icon editor"><Users size={17}/></span><div><small>{personal ? 'ÖDEME SÜRECİNDE' : 'EDİTÖR ÜCRETLERİ'}</small><strong>{money(personal ? summary.inProcess : summary.editor)}</strong><span>{personal ? 'Ödeme emri oluşturuldu' : 'Sonuçlanan incelemelerden'}</span></div></article>
        <article className="panel"><span className="comp-entry-icon coordinator"><BriefcaseBusiness size={17}/></span><div><small>{personal ? 'ÖDENEN' : 'KOORDİNATÖR ÜCRETLERİ'}</small><strong>{money(personal ? summary.paid : summary.coordinator)}</strong><span>{personal ? 'Tamamlanan ödemeler' : 'Tamamlanan projelerden'}</span></div></article>
      </div>

      <section className="panel compensation-entry-workbench">
        <div className="compensation-entry-head">
          <div><span className="panel-kicker">KAZANIM DÖKÜMÜ</span><h2>{personal ? 'Telif Ekstrem' : 'Hesaplanan ücretler'}</h2><p>Her satır, hak edildiği andaki birim ücretin değişmez snapshot’ıdır.</p></div>
          <button className="secondary-button" disabled={loading} onClick={() => loadEntries()}><RotateCcw size={15}/> Yenile</button>
        </div>

        <div className="compensation-entry-toolbar">
          <div className="search-box compensation-entry-search">
            <Search size={16}/>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Kişi, proje veya soru numarası ara..." />
          </div>
          <select value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'ALL' | CompensationRole)}>
            <option value="ALL">Tüm roller</option>
            {Object.entries(roleLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)}>
            <option value="ALL">Tüm projeler</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.code} · {project.title}</option>)}
          </select>
        </div>

        {loading && <div className="compensation-state"><RotateCcw size={18} className="spin"/> Kazanımlar yükleniyor...</div>}
        {error && !loading && <div className="compensation-alert error"><span>{error}</span><button onClick={() => loadEntries()}>Tekrar Dene</button></div>}
        {!loading && !error && <div className="table-wrap">
          <table className="compensation-entry-table">
            <thead><tr><th>KİŞİ</th><th>ROL</th><th>KAYNAK</th><th>BİRİM</th><th>ADET</th><th>TUTAR</th><th>DURUM</th><th>HAK EDİŞ TARİHİ</th><th>ÖDEME DÖNEMİ</th><th>ÖDEME TARİHİ</th></tr></thead>
            <tbody>{filtered.map(entry => <tr key={entry.id}>
              <td><strong>{entry.user.fullName}</strong></td>
              <td>{roleLabels[entry.roleCode]}</td>
              <td>{entry.questionId
                ? <span className="comp-source"><strong>Soru #{entry.questionId}</strong><small>{entry.project ? `${entry.project.code} · ${entry.project.title}` : 'Genel soru havuzu'}</small></span>
                : <span className="comp-source"><strong>{entry.project?.code || 'Proje'}</strong><small>{entry.project?.title || 'Proje koordinasyonu'}</small></span>}</td>
              <td><strong>{money(entry.unitPrice)}</strong><small>{entry.unitType === 'QUESTION' ? ' / soru' : entry.unitType === 'PROJECT' ? ' / proje' : ' / dönem'}</small></td>
              <td>{entry.quantity}</td>
              <td><strong className="compensation-price">{money(entry.amount)}</strong></td>
              <td><span className={`comp-entry-status ${entry.status.toLocaleLowerCase('tr-TR')}`}>{statusLabels[entry.status]}</span></td>
              <td>{shortDate(entry.earnedAt)}</td><td>{entry.paymentPeriod?.code || '—'}{entry.payment && <small>Ödeme #{entry.payment.id}</small>}</td><td>{entry.paidAt ? shortDate(entry.paidAt) : '—'}</td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <div className="compensation-state">Bu filtrelerde kazanım kaydı bulunmuyor.</div>}
        </div>}
        {!loading && nextCursor && <button className="secondary-button" onClick={() => loadEntries(true)}>Daha fazla kazanım yükle ({entries.length} / {summary.count})</button>}
        <p className="panel-sub">Özet tutarlar tüm kazanımları kapsar. Arama ve filtreler yüklenmiş satırlarda çalışır.</p>
      </section>
    </div>
  );
}

