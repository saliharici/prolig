import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ClipboardList, PencilLine, Plus, RefreshCw } from 'lucide-react';
import type { Role } from '../demo/model';
import { fetchProductionPlan, saveProductionUnit, type ProductionPlan, type ProductionUnit } from './production-plan-api';
import './production-plan-panel.css';

const managerRoles=new Set<Role>(['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU']);
const dateOnly=(s:string|null)=>s ? new Date(s).toISOString().slice(0,10):'';

export function ProductionPlanPanel({projectId,role,onOpenTasks,onPrepareBook}:{
  projectId:number;role:Role;onOpenTasks:()=>void;onPrepareBook:()=>void;
}){
  const [plan,setPlan]=useState<ProductionPlan|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [editing,setEditing]=useState<number|null|undefined>(undefined);
  const [title,setTitle]=useState('');
  const [target,setTarget]=useState(20);
  const [dueDate,setDueDate]=useState('');
  const [busy,setBusy]=useState(false);
  const canSee=managerRoles.has(role);
  const load=useCallback(async()=>{
    if(!canSee)return;
    setLoading(true);
    try{setPlan(await fetchProductionPlan(projectId));setError('');}
    catch(e){setError(e instanceof Error?e.message:'Üretim planı getirilemedi.');}
    finally{setLoading(false);}
  },[projectId,canSee]);
  useEffect(()=>{void load()},[load]);

  if(!canSee)return null;

  const begin=(unit:ProductionUnit|null)=>{
    setEditing(unit?.id??null);
    setTitle(unit?.title??'');
    setTarget(unit?.target??20);
    setDueDate(dateOnly(unit?.dueDate??null));
    setError('');
  };
  const submit=async(e:FormEvent)=>{
    e.preventDefault();
    setBusy(true);setError('');
    try{
      await saveProductionUnit(projectId,{
        ...(editing?{unitId:editing}:{}),title:title.trim(),target,dueDate:dueDate||null
      });
      setEditing(undefined);
      await load();
    }catch(err){setError(err instanceof Error?err.message:'Ünite kaydedilemedi.');}
    finally{setBusy(false);}
  };
  const summary=plan?.summary;
  const missing=summary?.missing??0;
  return <section className="v4-production-plan" aria-label="Kitap üretim planı ve eksik soru raporu">
    <div className="v4-plan-head">
      <div><span className="panel-kicker">YAYINCILIK · 5 AŞAMALI PLAN</span>
        <h3>Kitap Üretim Planı</h3>
        <p>Bölümleri planlayın, yazarlara dağıtın ve onaylı soru hedeflerini gerçek üretimden takip edin.</p>
      </div>
      <div className="v4-plan-head-actions">
        <button type="button" className="secondary-button" onClick={()=>void load()} disabled={loading}><RefreshCw size={14}/> Yenile</button>
        {plan?.canManage&&<button type="button" className="primary-button" disabled={Boolean(editing!==undefined)|| (plan?.units.length??0)>=30}
          onClick={()=>begin(null)}><Plus size={14}/> Bölüm ekle</button>}
      </div>
    </div>
    {loading&&<p role="status">Ünite planı ve üretim raporu yükleniyor…</p>}
    {error&&<p role="alert" className="v4-plan-error">{error}</p>}
    {!loading&&plan&&<>
      <div className="v4-plan-summary">
        <div><span>Planlanan soru</span><strong>{summary?.totalTarget??0}</strong></div>
        <div><span>Onaylanan</span><strong>{summary?.approved??0}</strong></div>
        <div className={missing>0?'v4-plan-shortage':''}><span>Eksik soru</span><strong>{missing}</strong></div>
        <div><span>Geciken ünite</span><strong>{summary?.overdueUnits??0}</strong></div>
      </div>
      {summary?.unallocatedTasks ? <p className="v4-plan-warning"><AlertTriangle size={15}/>
        {summary.unallocatedTasks} hedefli yazar görevi bir üniteye atanmamış. Görev Takibi'nden ünitesini seçin.
        Bunların soruları ünite hedeflerine kendiliğinden eklenmez.</p>:null}
      {!plan.units.length&&<p className="v4-plan-empty">
        Henüz bölüm planı yok. Önce üniteyi ve hedef sayısını belirleyin; sonra Görev Takibi'nden yazarları bu üniteye atayın.
        Eski görevlerin soruları, ünite seçilmeden hesaba katılmaz.
      </p>}
      {plan.units.map(unit=><article className="v4-plan-unit" key={unit.id}>
        <div className="v4-plan-unit-head">
          <div><span className="v4-plan-number">{unit.sortOrder+1}. BÖLÜM</span>
            <h4>{unit.title}</h4>
            <small><CalendarDays size={13}/> {unit.dueDate?dateOnly(unit.dueDate):'Termin tanımlanmadı'}</small>
          </div>
          {plan.canManage&&<button type="button" className="secondary-button" disabled={editing!==undefined}
            onClick={()=>begin(unit)}><PencilLine size={13}/> Düzenle</button>}
        </div>
        <div className="v4-plan-unit-stats">
          <span>Hedef <strong>{unit.target}</strong></span>
          <span>Yazarlara dağıtılan <strong>{unit.assigned}</strong></span>
          <span>Yazılan <strong>{unit.written}</strong></span>
          <span>Onaylanan <strong>{unit.approved}</strong></span>
          <span>İncelemede <strong>{unit.inReview}</strong></span>
          <span>Revizyonda <strong>{unit.revision}</strong></span>
          <span className={unit.missing>0?'short':''}>Eksik <strong>{unit.missing}</strong></span>
        </div>
        <div className="v4-plan-progress"><i style={{width:unit.completionPercent+'%'}} /></div>
        {(unit.overdue||unit.allocationGap>0||unit.overAllocated>0)&&<p className="v4-plan-warning">
          <AlertTriangle size={14}/>
          {[
            unit.overdue?'Termin geçti':null,
            unit.allocationGap>0?'Henüz dağıtılmayan '+unit.allocationGap+' soru':null,
            unit.overAllocated>0?'Plan hedefinin '+unit.overAllocated+' üzerinde görev dağıtıldı':null
          ].filter(Boolean).join(' · ')}
        </p>}
        {unit.tasks.length>0?<div className="v4-plan-task-list">
          {unit.tasks.map(t=><div key={t.id}>
            <span><strong>{t.writer??'Atanmamış'} · #{t.id}</strong><small>{t.title}</small></span>
            <span>Hedef {t.target} · Yazılan {t.written} · Onay {t.approved} · Kalan {Math.max(0,t.target-t.approved)}</span>
          </div>)}
        </div>:<p className="v4-plan-empty-small">Bu bölüme atanmış yazar görevi henüz yok.</p>}
      </article>)}
      {editing!==undefined&&plan.canManage&&<form className="v4-plan-form" onSubmit={e=>void submit(e)}>
        <h4>{editing?'Bölüm hedefini güncelle':'Yeni kitap bölümü'}</h4>
        <label>Bölüm / ünite adı<input required minLength={3} maxLength={120} value={title}
          onChange={e=>setTitle(e.target.value)} placeholder="1. Ünite · Tam Sayılar"/></label>
        <label>Hedef soru<input type="number" min={1} max={10000} step={1} required value={target}
          onChange={e=>setTarget(Number(e.target.value))}/></label>
        <label>Son teslim tarihi<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
        <div><button type="button" className="secondary-button" onClick={()=>setEditing(undefined)} disabled={busy}>İptal</button>
          <button className="primary-button" disabled={busy||!title.trim()||target<1||target>10000}>{busy?'Kaydediliyor…':'Kaydet'}</button>
        </div>
      </form>}
      <div className="v4-plan-readiness">
        {summary?.ready?<><CheckCircle2 size={19}/><span><strong>Ünite üretim hedefleri tamamlandı.</strong>
          Kitap taslağı seçimi ve dizgi incelemesi yapılabilir; bu nihai yayın onayı değildir.</span></>
          :<><AlertTriangle size={19}/><span><strong>Kitap üretim planında eksikler bulunuyor.</strong>
            {missing} onaylı soru eksik · {summary?.unallocatedTasks??0} ünitesiz görev. Eksikler bitmeden de kısmi kitap taslağı hazırlanabilir; hazır/yayımlandı sayılmaz.</span></>}
      </div>
      <div className="v4-plan-footer">
        <button className="secondary-button" onClick={onOpenTasks}><ClipboardList size={14}/> Yazarlara görev dağıt <ArrowRight size={13}/></button>
        {role==='GENEL_KOORDINATOR'&&<button className="primary-button" onClick={onPrepareBook}>
          <BookOpen size={14}/> Kitap hazırlığına geç <ArrowRight size={13}/></button>}
      </div>
    </>}
  </section>;
}
