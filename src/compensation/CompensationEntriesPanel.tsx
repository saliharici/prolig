import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CheckCircle2, FileQuestion, RotateCcw, Search, Users } from 'lucide-react';
import { fetchCompensationEntries } from './api';
import type { CompensationEntry, CompensationRole } from './types';
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
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));

export function CompensationEntriesPanel() {
  const [entries, setEntries] = useState<CompensationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | CompensationRole>('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');

  const loadEntries = async () => {
    setLoading(true);
    setError('');
    try {
      setEntries(await fetchCompensationEntries(400));
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

  const totals = useMemo(() => {
    const active = entries.filter(entry => entry.status !== 'IPTAL');
    const sum = (roles: CompensationRole[]) =>
      active.filter(entry => roles.includes(entry.roleCode)).reduce((total, entry) => total + Number(entry.amount), 0);
    return {
      all: active.reduce((total, entry) => total + Number(entry.amount), 0),
      writer: sum(['YAZAR']),
      editor: sum(['EDITOR']),
      coordinator: sum(['IL_KOORDINATORU', 'BOLGE_KOORDINATORU', 'GENEL_KOORDINATOR'])
    };
  }, [entries]);

  return (
    <div className="compensation-entries-panel">
      <div className="compensation-entry-kpis">
        <article className="panel"><span className="comp-entry-icon total"><CheckCircle2 size={17}/></span><div><small>TOPLAM KAZANIM</small><strong>{money(totals.all)}</strong><span>{entries.length} kazanım kaydı</span></div></article>
        <article className="panel"><span className="comp-entry-icon writer"><FileQuestion size={17}/></span><div><small>YAZAR TELİFLERİ</small><strong>{money(totals.writer)}</strong><span>Onaylanan sorulardan</span></div></article>
        <article className="panel"><span className="comp-entry-icon editor"><Users size={17}/></span><div><small>EDİTÖR ÜCRETLERİ</small><strong>{money(totals.editor)}</strong><span>Sonuçlanan incelemelerden</span></div></article>
        <article className="panel"><span className="comp-entry-icon coordinator"><BriefcaseBusiness size={17}/></span><div><small>KOORDİNATÖR ÜCRETLERİ</small><strong>{money(totals.coordinator)}</strong><span>Tamamlanan projelerden</span></div></article>
      </div>

      <section className="panel compensation-entry-workbench">
        <div className="compensation-entry-head">
          <div><span className="panel-kicker">KAZANIM DÖKÜMÜ</span><h2>Hesaplanan ücretler</h2><p>Her satır, hak edildiği andaki birim ücretin değişmez snapshot’ıdır.</p></div>
          <button className="secondary-button" onClick={loadEntries}><RotateCcw size={15}/> Yenile</button>
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
        {error && !loading && <div className="compensation-alert error"><span>{error}</span><button onClick={loadEntries}>Tekrar Dene</button></div>}
        {!loading && !error && <div className="table-wrap">
          <table className="compensation-entry-table">
            <thead><tr><th>KİŞİ</th><th>ROL</th><th>KAYNAK</th><th>BİRİM</th><th>ADET</th><th>TUTAR</th><th>DURUM</th><th>HAK EDİŞ TARİHİ</th></tr></thead>
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
              <td>{shortDate(entry.earnedAt)}</td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <div className="compensation-state">Bu filtrelerde kazanım kaydı bulunmuyor.</div>}
        </div>}
      </section>
    </div>
  );
}
