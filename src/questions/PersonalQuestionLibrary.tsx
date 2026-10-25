import React, { useEffect, useState } from 'react';
import type { ApiQuestion } from './types';
import './personal-question-library.css';
type PersonalSet = { id:number; title:string; revision:number; questionIds:number[]; };
type Project = { id:number; title:string; targetGrade:string };
async function json<T>(response:Response):Promise<T>{
  if(!response.ok){ const body=await response.json().catch(()=>({}));throw Error(body.error||'İşlem başarısız.'); }
  return response.json() as Promise<T>;
}
const base='/api/v1/personal-question-sets';
export function PersonalQuestionLibrary({questions,projects,onEdit,onRefresh}:{questions:ApiQuestion[];projects:Project[];onEdit:(q:ApiQuestion)=>void;onRefresh:()=>Promise<unknown>}){
  const own=questions.filter(q=>q.projectId===null&&q.status==='TASLAK'&&!q.isArchived);
  const [sets,setSets]=useState<PersonalSet[]>([]);
  const [editing,setEditing]=useState<PersonalSet|null>(null);
  const [title,setTitle]=useState('');
  const [ids,setIds]=useState<number[]>([]);
  const [target,setTarget]=useState<Record<number,string>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const reload=async()=>setSets((await json<{sets:PersonalSet[]}>(await fetch(base,{credentials:'include',cache:'no-store'}))).sets);
  useEffect(()=>{void reload().catch(e=>setError(e.message))},[]);
  const open=async(id:number)=>{
    setError('');setMessage('');
    try{
      const data=await json<{set:PersonalSet}>(await fetch(base+'/'+id,{credentials:'include',cache:'no-store'}));
      setEditing(data.set);setTitle(data.set.title);setIds(data.set.questionIds);
      setMessage('Set sunucudan yeniden açıldı.');
    }catch(e){setError(e instanceof Error?e.message:'Set yüklenemedi.')}
  };
  const toggle=(id:number)=>setIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const move=(id:number,step:number)=>setIds(old=>{const i=old.indexOf(id),j=i+step;if(j<0||j>=old.length)return old;const next=[...old];[next[i],next[j]]=[next[j],next[i]];return next;});
  const save=async()=>{
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch(editing?base+'/'+editing.id:base,{
        method:editing?'PATCH':'POST',credentials:'include',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({title,questionIds:ids,expectedRevision:editing?.revision??null})
      });
      const result=await json<{set:PersonalSet}>(response);
      setEditing(result.set);setTitle(result.set.title);setIds(result.set.questionIds);await reload();
      setMessage('Kişisel soru seti kalıcı kaydedildi. Editör onayı ve telif doğmadı.');
    }catch(e){setError(e instanceof Error?e.message:'Set kaydedilemedi.')}
    finally{setBusy(false)}
  };
  const word=async(answers:boolean)=>{
    if(!editing||busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch(base+'/'+editing.id+'/docx?answers='+(answers?'1':'0'),{credentials:'include',cache:'no-store'});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.error||'Word üretilemedi.')}
      const blob=await response.blob();
      if(blob.type&&!blob.type.includes('wordprocessingml.document'))throw Error('Word dosyası türü geçersiz.');
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='kisisel-set-'+editing.id+(answers?'-cevap-anahtari':'-ogrenci')+'.docx';
      document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage(answers?'Cevap anahtarlı Word indirildi.':'Öğrenci çalışma kâğıdı indirildi.');
    }catch(e){setError(e instanceof Error?e.message:'Word indirilemedi.')}finally{setBusy(false)}
  };
  const copy=async(q:ApiQuestion)=>{
    setBusy(true);setError('');setMessage('');
    try{
      const response=await fetch('/api/v1/personal-questions/'+q.id+'/publish-copy',{
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({projectId:Number(target[q.id])})
      });
      const result=await json<{questionId:number}>(response);await onRefresh();
      setMessage('Yayınevinde ayrı TASLAK #'+result.questionId+' oluştu. Kişisel orijinal korundu; telif ve editör onayı doğmadı.');
    }catch(e){setError(e instanceof Error?e.message:'Projeye kopyalanamadı.')}finally{setBusy(false)}
  };
  return <section className="panel core01a-panel" aria-label="Kişisel sorularım ve setlerim">
    <div className="panel-head"><div><span className="panel-kicker">YAZAR / KİŞİSEL ALAN</span>
      <h2>Kişisel Sorularım ve Çalışma Kâğıtlarım</h2>
      <p>Bu sorular yalnız size aittir. Word kullanımı editör onayı veya telif oluşturmaz.</p>
    </div></div>
    {error&&<p role="alert" className="core01a-error">{error}</p>}
    {message&&<p role="status" className="core01a-notice">{message}</p>}
    <div className="core01a-grid"><div>
      <h3>Kişisel sorular ({own.length})</h3>
      {own.length===0&&<p>Yeni soru taslağında proje seçmeyerek kişisel soru oluşturun.</p>}
      {own.map(q=><div className="core01a-question" key={q.id}>
        <label><input aria-label={'Sete ekle: soru '+q.id} type="checkbox" checked={ids.includes(q.id)} onChange={()=>toggle(q.id)}/>
          <span><strong>#{q.id} · {q.content.slice(0,96)}</strong><small>{q.grade} · Kişisel TASLAK</small></span></label>
        <div className="core01a-actions">
          <button type="button" className="secondary-button" onClick={()=>onEdit(q)}>Düzenle</button>
          <select aria-label={'Soru '+q.id+' için proje'} value={target[q.id]||''}
            onChange={e=>setTarget(prev=>({...prev,[q.id]:e.target.value}))}>
            <option value="">Yayınevi projesi seç</option>
            {projects.filter(p=>p.targetGrade===q.grade).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <button type="button" className="secondary-button" disabled={busy||!target[q.id]} onClick={()=>void copy(q)}>Projeye ayrı taslak kopyala</button>
        </div>
      </div>)}
    </div><div>
      <div className="core01a-toolbar"><h3>Kişisel setler</h3><button type="button" className="secondary-button"
        onClick={()=>{setEditing(null);setTitle('');setIds([]);setMessage('');}}>+ Yeni set</button></div>
      <div className="core01a-set-list">{sets.map(s=><button type="button" key={s.id}
        className={editing?.id===s.id?'active':''} onClick={()=>void open(s.id)}>
        {s.title} <small>{s.questionIds.length} soru · sürüm {s.revision}</small></button>)}</div>
      <label className="core01a-title">Set adı<input maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}
        placeholder="8. sınıf – Hafta 1 alıştırmaları"/></label>
      <h4>Seçilen soru sırası ({ids.length})</h4>
      <ol className="core01a-order">{ids.map((id,i)=><li key={id}>
        <span>#{id} · {own.find(q=>q.id===id)?.content.slice(0,55)||'Artık kişisel olmayan soru'}</span>
        <div className="core01a-actions">
          <button type="button" disabled={i===0} onClick={()=>move(id,-1)} aria-label={id+' yukarı'}>↑</button>
          <button type="button" disabled={i===ids.length-1} onClick={()=>move(id,1)} aria-label={id+' aşağı'}>↓</button>
          <button type="button" onClick={()=>toggle(id)} aria-label={id+' çıkar'}>×</button>
        </div></li>)}</ol>
      <div className="core01a-actions">
        <button type="button" className="primary-button" disabled={busy||ids.length<1||title.trim().length<3} onClick={()=>void save()}>
          {editing?'Seti kaydet':'Set oluştur'}</button>
        <button type="button" className="secondary-button" disabled={!editing||busy} onClick={()=>void word(false)}>Word: Öğrenci</button>
        <button type="button" className="secondary-button" disabled={!editing||busy} onClick={()=>void word(true)}>Word: Cevap anahtarı</button>
      </div><small>Desteklenmeyen medya veya özel PNG içeren sorularda Word aktarımı reddedilir; eksik belge üretilmez.</small>
    </div></div>
  </section>;
}
