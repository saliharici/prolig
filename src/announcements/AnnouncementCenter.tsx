import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive, ArchiveRestore, BellRing, CalendarDays, Megaphone, PencilLine,
  Plus, RefreshCw, Search, ShieldCheck, X
} from 'lucide-react';
import {
  changeAnnouncementState, createAnnouncement, fetchAnnouncement,
  fetchAnnouncements, updateAnnouncement
} from './api';
import type {
  AnnouncementAudience, AnnouncementBox, AnnouncementCounts,
  AnnouncementPriority, ApiAnnouncement
} from './types';

const emptyCounts: AnnouncementCounts = { active: 0, archived: 0, unread: 0 };
const priorities: Array<{ value: AnnouncementPriority; label: string }> = [
  { value: 'Dusuk', label: 'Düşük' },
  { value: 'Normal', label: 'Normal' },
  { value: 'Yuksek', label: 'Yüksek' },
  { value: 'Acil', label: 'Acil' }
];

function priorityLabel(value: AnnouncementPriority) {
  return priorities.find(item => item.value === value)?.label ?? value;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(value));
}

export function AnnouncementCenter({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const [box, setBox] = useState<AnnouncementBox>('active');
  const [announcements, setAnnouncements] = useState<ApiAnnouncement[]>([]);
  const [counts, setCounts] = useState<AnnouncementCounts>(emptyCounts);
  const [canPublish, setCanPublish] = useState(false);
  const [audiences, setAudiences] = useState<AnnouncementAudience[]>(['Tümü','Koordinatörler','Editörler','Yazarlar','Muhasebe']);
  const [selected, setSelected] = useState<ApiAnnouncement | null>(null);
  const [editing, setEditing] = useState<ApiAnnouncement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'Tümü'|AnnouncementPriority>('Tümü');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const publishCounts = (next: AnnouncementCounts) => {
    setCounts(next);
    onUnreadChange?.(next.unread);
  };

  const load = async (nextBox: AnnouncementBox = box) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAnnouncements(nextBox);
      setAnnouncements(result.announcements);
      publishCounts(result.counts);
      setCanPublish(result.canPublish);
      setAudiences(result.audiences);
      if (selected && !result.announcements.some(item => item.id === selected.id)) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyurular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(box); }, [box]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    return announcements.filter(item => {
      if (priorityFilter !== 'Tümü' && item.priority !== priorityFilter) return false;
      if (!needle) return true;
      return `${item.title} ${item.content} ${item.createdBy} ${item.audience}`
        .toLocaleLowerCase('tr-TR').includes(needle);
    });
  }, [announcements, query, priorityFilter]);

  const open = async (item: ApiAnnouncement) => {
    setError('');
    try {
      const result = await fetchAnnouncement(item.id);
      setSelected(result.announcement);
      setCounts(current => {
        const next = { ...current, unread: result.unread };
        onUnreadChange?.(next.unread);
        return next;
      });
      setAnnouncements(current => current.map(row =>
        row.id === item.id ? { ...result.announcement, isUnread: false } : row
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyuru açılamadı.');
    }
  };

  const changeState = async (item: ApiAnnouncement, action: 'archive'|'restore') => {
    setError('');
    try {
      const result = await changeAnnouncementState(item.id, action);
      setCounts(current => {
        const next = { ...current, unread: result.unread };
        onUnreadChange?.(next.unread);
        return next;
      });
      setSelected(null);
      await load(box);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duyuru durumu güncellenemedi.');
    }
  };

  const startCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const startEdit = (item: ApiAnnouncement) => {
    if (!item.canManage || item.isArchived) return;
    setEditing(item);
    setShowForm(true);
  };

  return <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">KURUMSAL YAYIN</div>
        <h1>Duyurular</h1>
        <p>Yönetim duyurularını hedef kitleye güvenli biçimde yayınlayın ve arşivleyin.</p>
      </div>
      <div className="page-heading-actions">
        <span className="heading-chip"><BellRing size={16}/> {counts.unread} okunmamış</span>
        {canPublish&&<button className="primary-button" onClick={startCreate}><Plus size={16}/> Yeni Duyuru</button>}
      </div>
    </div>

    <div className="announcement-summary-grid">
      <button className={`panel announcement-summary-card ${box==='active'?'active':''}`} onClick={()=>{setBox('active');setSelected(null)}}>
        <span><Megaphone size={18}/></span><div><strong>{counts.active}</strong><small>Aktif Duyuru</small></div>
      </button>
      <div className="panel announcement-summary-card urgent">
        <span><BellRing size={18}/></span><div><strong>{announcements.filter(item=>!item.isArchived&&['Acil','Yuksek'].includes(item.priority)).length}</strong><small>Acil / Yüksek</small></div>
      </div>
      <div className="panel announcement-summary-card">
        <span><CalendarDays size={18}/></span><div><strong>{announcements.filter(item=>Date.now()-new Date(item.publishedAt).getTime()<=7*24*60*60*1000).length}</strong><small>Bu Hafta</small></div>
      </div>
      <button className={`panel announcement-summary-card ${box==='archive'?'active':''}`} onClick={()=>{setBox('archive');setSelected(null)}}>
        <span><Archive size={18}/></span><div><strong>{counts.archived}</strong><small>Arşiv</small></div>
      </button>
    </div>

    {error&&<div className="panel announcement-error"><span>{error}</span><button className="secondary-button" onClick={()=>void load()}><RefreshCw size={14}/> Yenile</button></div>}

    <div className="announcement-toolbar">
      <div className="search-box"><Search size={16}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Başlık, içerik veya yayınlayanda ara..."/></div>
      <select value={priorityFilter} onChange={event=>setPriorityFilter(event.target.value as any)}>
        <option value="Tümü">Tüm öncelikler</option>
        {priorities.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <div className="announcement-box-toggle">
        <button className={box==='active'?'active':''} onClick={()=>{setBox('active');setSelected(null)}}>Aktif</button>
        <button className={box==='archive'?'active':''} onClick={()=>{setBox('archive');setSelected(null)}}>Arşiv</button>
      </div>
    </div>

    <div className="announcement-layout">
      <section className="announcement-card-grid">
        {loading&&<div className="panel empty-state">Duyurular yükleniyor...</div>}
        {!loading&&visible.map(item=><button key={item.id} className={`panel announcement-card priority-card-${item.priority.toLowerCase()} ${item.isUnread?'unread':''} ${selected?.id===item.id?'selected':''}`} onClick={()=>void open(item)}>
          <div className="announcement-card-top">
            <span className={`announcement-priority priority-${item.priority.toLowerCase()}`}>{priorityLabel(item.priority)}</span>
            <time>{dateTime(item.publishedAt)}</time>
          </div>
          <h3>{item.title}</h3>
          <p>{item.content}</p>
          <div className="announcement-card-footer">
            <span><ShieldCheck size={13}/>{item.audience}</span>
            <span>{item.createdBy}</span>
          </div>
          {item.isUnread&&<i className="announcement-unread-dot"/>}
        </button>)}
        {!loading&&visible.length===0&&<div className="panel empty-state">Bu filtreye uygun duyuru bulunamadı.</div>}
      </section>

      <aside className="panel announcement-detail">
        {!selected&&<div className="announcement-detail-empty"><Megaphone size={30}/><strong>Bir duyuru seçin</strong><span>İçerik ve yönetim işlemleri burada görüntülenecek.</span></div>}
        {selected&&<>
          <div className="announcement-detail-head">
            <div><span className={`announcement-priority priority-${selected.priority.toLowerCase()}`}>{priorityLabel(selected.priority)}</span><h2>{selected.title}</h2></div>
            <time>{dateTime(selected.publishedAt)}</time>
          </div>
          <div className="announcement-detail-meta">
            <span><ShieldCheck size={14}/> Hedef: <strong>{selected.audience}</strong></span>
            <span>Yayınlayan: <strong>{selected.createdBy}</strong></span>
          </div>
          <div className="announcement-detail-body">{selected.content}</div>
          {selected.canManage&&<div className="announcement-detail-actions">
            {!selected.isArchived&&<button className="secondary-button" onClick={()=>startEdit(selected)}><PencilLine size={15}/> Düzenle</button>}
            {selected.isArchived
              ? <button className="secondary-button" onClick={()=>void changeState(selected,'restore')}><ArchiveRestore size={15}/> Arşivden Çıkar</button>
              : <button className="secondary-button" onClick={()=>void changeState(selected,'archive')}><Archive size={15}/> Arşivle</button>}
          </div>}
        </>}
      </aside>
    </div>

    {showForm&&<AnnouncementForm
      item={editing}
      audiences={audiences}
      onClose={()=>{setShowForm(false);setEditing(null)}}
      onSaved={async()=>{setShowForm(false);setEditing(null);setSelected(null);await load('active');setBox('active')}}
    />}
  </>;
}

function AnnouncementForm({
  item,
  audiences,
  onClose,
  onSaved
}: {
  item: ApiAnnouncement|null;
  audiences: AnnouncementAudience[];
  onClose: ()=>void;
  onSaved: ()=>Promise<void>;
}) {
  const [title,setTitle]=useState(item?.title??'');
  const [content,setContent]=useState(item?.content??'');
  const [priority,setPriority]=useState<AnnouncementPriority>(item?.priority??'Normal');
  const [audience,setAudience]=useState<AnnouncementAudience>(item?.audience??audiences[0]??'Tümü');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);setError('');
    try{
      const input={title:title.trim(),content:content.trim(),priority,audience};
      if(item) await updateAnnouncement(item.id,input);
      else await createAnnouncement(input);
      await onSaved();
    }catch(err){
      setError(err instanceof Error?err.message:'Duyuru kaydedilemedi.');
      setBusy(false);
    }
  };

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <form className="announcement-form-modal" onSubmit={submit}>
      <div className="modal-head"><div><span className="panel-kicker">{item?'DUYURU YÖNETİMİ':'YENİ DUYURU'}</span><h2>{item?'Duyuruyu düzenle':'Yeni duyuru yayınla'}</h2></div><button type="button" aria-label="Kapat" onClick={onClose} disabled={busy}><X size={20}/></button></div>
      <p className="announcement-form-note">Hedef kitle, yetki kapsamınızdaki kullanıcılara sunucu tarafında uygulanır. Duyuru yayınlandığında alıcılara bildirim oluşturulur.</p>
      {error&&<div className="project-management-error">{error}</div>}
      <div className="announcement-form-grid">
        <label className="announcement-span-two"><span>Başlık</span><input required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="8. Sınıf Matematik soru teslimi"/></label>
        <label><span>Hedef kitle</span><select value={audience} onChange={e=>setAudience(e.target.value as AnnouncementAudience)}>{audiences.map(value=><option key={value}>{value}</option>)}</select></label>
        <label><span>Öncelik</span><select value={priority} onChange={e=>setPriority(e.target.value as AnnouncementPriority)}>{priorities.map(value=><option key={value.value} value={value.value}>{value.label}</option>)}</select></label>
        <label className="announcement-span-two"><span>İçerik</span><textarea required minLength={3} maxLength={6000} value={content} onChange={e=>setContent(e.target.value)} placeholder="Duyuru içeriğini yazın..."/></label>
      </div>
      <div className="project-management-footer"><span/><div className="project-save-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Vazgeç</button><button type="submit" className="primary-button" disabled={busy||title.trim().length<3||content.trim().length<3}><Megaphone size={15}/>{busy?'Kaydediliyor...':item?'Değişiklikleri Kaydet':'Duyuruyu Yayınla'}</button></div></div>
    </form>
  </div>;
}
