import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive, ArchiveRestore, ArrowLeft, Inbox, Mail, MailOpen, MessageSquareReply,
  Plus, RefreshCw, Search, Send, X
} from 'lucide-react';
import { roleLabels } from '../demo/model';
import {
  changeMessageState, fetchMessage, fetchMessageRecipients, fetchMessages, sendMessage
} from './api';
import type { ApiMessage, Mailbox, MessageCounts, MessagePerson } from './types';

const emptyCounts: MessageCounts = { inbox: 0, unread: 0, archived: 0, sent: 0 };

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0,2).toLocaleUpperCase('tr-TR');
}

function otherPerson(message: ApiMessage) {
  return message.direction === 'sent' ? message.receiver : message.sender;
}

export function MessageCenter({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const [box, setBox] = useState<Mailbox>('inbox');
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [counts, setCounts] = useState<MessageCounts>(emptyCounts);
  const [selected, setSelected] = useState<ApiMessage | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [replySeed, setReplySeed] = useState<{ receiverId: number; subject: string } | null>(null);

  const publishCounts = (next: MessageCounts) => {
    setCounts(next);
    onUnreadChange?.(next.unread);
  };

  const load = async (nextBox: Mailbox = box) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchMessages(nextBox);
      setMessages(result.messages);
      publishCounts(result.counts);
      if (selected && !result.messages.some(message => message.id === selected.id)) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesajlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(box); }, [box]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return messages;
    return messages.filter(message => {
      const person = otherPerson(message);
      return `${message.subject} ${message.body} ${person.fullName}`.toLocaleLowerCase('tr-TR').includes(needle);
    });
  }, [messages, query]);

  const openMessage = async (message: ApiMessage) => {
    setError('');
    try {
      const result = await fetchMessage(message.id);
      setSelected(result.message);
      publishCounts(result.counts);
      setMessages(current => current.map(item => item.id === result.message.id ? result.message : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj açılamadı.');
    }
  };

  const changeState = async (action: 'read'|'unread'|'archive'|'restore') => {
    if (!selected) return;
    setError('');
    try {
      const result = await changeMessageState(selected.id, action);
      publishCounts(result.counts);
      if (action === 'archive' || action === 'restore') {
        setSelected(null);
        await load(box);
      } else {
        setSelected(result.message);
        setMessages(current => current.map(item => item.id === result.message.id ? result.message : item));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj durumu güncellenemedi.');
    }
  };

  const compose = (seed?: { receiverId: number; subject: string }) => {
    setReplySeed(seed ?? null);
    setShowCompose(true);
  };

  const reply = () => {
    if (!selected) return;
    const receiver = selected.direction === 'sent' ? selected.receiver : selected.sender;
    const subject = selected.subject.startsWith('Ynt:') ? selected.subject : `Ynt: ${selected.subject}`;
    compose({ receiverId: receiver.id, subject });
  };

  const boxItems: Array<{ id: Mailbox; label: string; icon: typeof Inbox; count: number }> = [
    { id: 'inbox', label: 'Gelen Kutusu', icon: Inbox, count: counts.inbox },
    { id: 'sent', label: 'Gönderilenler', icon: Send, count: counts.sent },
    { id: 'archive', label: 'Arşiv', icon: Archive, count: counts.archived }
  ];

  return <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">KURUMSAL İLETİŞİM</div>
        <h1>Mesajlar</h1>
        <p>Yetki kapsamınızdaki ekip üyeleriyle kayıtlı ve kontrollü iletişim kurun.</p>
      </div>
      <div className="page-heading-actions">
        <span className="heading-chip"><Mail size={16}/> {counts.unread} okunmamış</span>
        <button className="primary-button" onClick={()=>compose()}><Plus size={16}/> Yeni Mesaj</button>
      </div>
    </div>

    {error && <div className="panel message-error"><span>{error}</span><button className="secondary-button" onClick={()=>void load()}><RefreshCw size={14}/> Yenile</button></div>}

    <div className="message-center-shell">
      <aside className="panel message-mailboxes">
        <button className="message-compose-mobile primary-button" onClick={()=>compose()}><Plus size={15}/> Yeni Mesaj</button>
        {boxItems.map(item=>{
          const Icon=item.icon;
          return <button key={item.id} className={box===item.id?'active':''} onClick={()=>{setBox(item.id);setSelected(null)}}>
            <span><Icon size={16}/>{item.label}</span><em>{item.id==='inbox'&&counts.unread>0?counts.unread:item.count}</em>
          </button>;
        })}
      </aside>

      <section className="panel message-list-panel">
        <div className="message-search"><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Kişi, konu veya içerikte ara..."/></div>
        <div className="message-list">
          {loading && <div className="empty-state">Mesajlar yükleniyor...</div>}
          {!loading && filtered.map(message=>{
            const person=otherPerson(message);
            const unread=message.direction==='received'&&!message.isRead;
            return <button key={message.id} className={`message-row ${selected?.id===message.id?'selected':''} ${unread?'unread':''}`} onClick={()=>void openMessage(message)}>
              <span className="message-avatar">{initials(person.fullName)}</span>
              <span className="message-row-copy">
                <span className="message-row-top"><strong>{person.fullName}</strong><time>{formatDate(message.createdAt)}</time></span>
                <span className="message-row-subject">{message.subject}</span>
                <span className="message-row-preview">{message.body}</span>
              </span>
              {unread&&<i className="message-unread-dot"/>}
            </button>;
          })}
          {!loading&&filtered.length===0&&<div className="empty-state">Bu kutuda mesaj bulunamadı.</div>}
        </div>
      </section>

      <section className="panel message-detail-panel">
        {!selected&&<div className="message-detail-empty"><MailOpen size={30}/><strong>Bir mesaj seçin</strong><span>Mesajın içeriği ve işlemleri burada görüntülenecek.</span></div>}
        {selected&&<>
          <div className="message-detail-head">
            <button className="message-mobile-back" onClick={()=>setSelected(null)}><ArrowLeft size={15}/></button>
            <div><span className="panel-kicker">{selected.direction==='sent'?'GÖNDERİLEN MESAJ':'GELEN MESAJ'}</span><h2>{selected.subject}</h2></div>
          </div>
          <div className="message-person-card">
            <span className="message-avatar large">{initials(otherPerson(selected).fullName)}</span>
            <div><strong>{otherPerson(selected).fullName}</strong><span>{roleLabels[otherPerson(selected).role.code]}{otherPerson(selected).province ? ' · '+otherPerson(selected).province!.name : ''}</span></div>
            <time>{formatDate(selected.createdAt)}</time>
          </div>
          <div className="message-body">{selected.body}</div>
          <div className="message-detail-actions">
            <button className="primary-button" onClick={reply}><MessageSquareReply size={15}/> Yanıtla</button>
            {selected.direction==='received'&&<>
              {selected.isArchived
                ? <button className="secondary-button" onClick={()=>void changeState('restore')}><ArchiveRestore size={15}/> Arşivden Çıkar</button>
                : <button className="secondary-button" onClick={()=>void changeState('archive')}><Archive size={15}/> Arşivle</button>}
              <button className="secondary-button" onClick={()=>void changeState(selected.isRead?'unread':'read')}>{selected.isRead?<Mail size={15}/>:<MailOpen size={15}/>} {selected.isRead?'Okunmadı İşaretle':'Okundu İşaretle'}</button>
            </>}
          </div>
        </>}
      </section>
    </div>

    {showCompose&&<ComposeMessage
      seed={replySeed}
      onClose={()=>{setShowCompose(false);setReplySeed(null)}}
      onSent={async(nextCounts)=>{publishCounts(nextCounts);setShowCompose(false);setReplySeed(null);setBox('sent');setSelected(null);await load('sent')}}
    />}
  </>;
}

function ComposeMessage({
  seed,
  onClose,
  onSent
}: {
  seed: { receiverId: number; subject: string } | null;
  onClose: ()=>void;
  onSent: (counts: MessageCounts)=>Promise<void>;
}) {
  const [recipients,setRecipients]=useState<MessagePerson[]>([]);
  const [receiverId,setReceiverId]=useState(seed?.receiverId??0);
  const [subject,setSubject]=useState(seed?.subject??'');
  const [body,setBody]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    fetchMessageRecipients()
      .then(items=>{if(active)setRecipients(items)})
      .catch(err=>{if(active)setError(err instanceof Error?err.message:'Alıcılar yüklenemedi.')})
      .finally(()=>{if(active)setLoading(false)});
    return()=>{active=false};
  },[]);

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);setError('');
    try{
      const result=await sendMessage({receiverId,subject:subject.trim(),body:body.trim()});
      await onSent(result.counts);
    }catch(err){
      setError(err instanceof Error?err.message:'Mesaj gönderilemedi.');
      setBusy(false);
    }
  };

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <form className="message-compose-modal" onSubmit={submit}>
      <div className="modal-head"><div><span className="panel-kicker">KURUMSAL MESAJ</span><h2>Yeni Mesaj</h2></div><button type="button" aria-label="Kapat" onClick={onClose} disabled={busy}><X size={20}/></button></div>
      {error&&<div className="project-management-error">{error}</div>}
      <div className="message-compose-fields">
        <label><span>Alıcı</span><select required value={receiverId||''} onChange={e=>setReceiverId(Number(e.target.value))} disabled={loading}><option value="">{loading?'Alıcılar yükleniyor...':'Alıcı seçin'}</option>{recipients.map(person=><option key={person.id} value={person.id}>{person.fullName} · {roleLabels[person.role.code]}{person.province?' · '+person.province.name:''}</option>)}</select></label>
        <label><span>Konu</span><input required minLength={2} maxLength={180} value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Mesaj konusu"/></label>
        <label><span>Mesaj</span><textarea required minLength={2} maxLength={5000} value={body} onChange={e=>setBody(e.target.value)} placeholder="Mesajınızı yazın..."/></label>
      </div>
      <div className="project-management-footer"><span/><div className="project-save-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Vazgeç</button><button type="submit" className="primary-button" disabled={busy||!receiverId||subject.trim().length<2||body.trim().length<2}><Send size={15}/>{busy?'Gönderiliyor...':'Gönder'}</button></div></div>
    </form>
  </div>;
}
