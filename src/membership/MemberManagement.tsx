import React, { useEffect, useMemo, useState } from 'react';
import { Check, PencilLine, Plus, RefreshCw, UserPlus, X } from 'lucide-react';
import type { AuthUser } from '../auth/types';
import type { Role } from '../demo/model';
import { roleLabels } from '../demo/model';
import { createManagedUser, fetchApplications, fetchManagedUsers, fetchMembershipMetadata, reviewApplication, updateManagedUser } from './api';
import type { BranchOption, ManagedUser, MembershipApplication, ProvinceOption } from './types';

const REGIONS = ['Akdeniz','Doğu Anadolu','Ege','Güneydoğu Anadolu','İç Anadolu','Karadeniz','Marmara'];

type FormState = {
  id?: number;
  applicationId?: number;
  fullName: string;
  email: string;
  password: string;
  role: Role;
  provinceId: string;
  assignedRegion: string;
  editorGrade: string;
  branchIds: number[];
  status: 'Aktif'|'Pasif';
};

const emptyForm = (role: Role = 'YAZAR'): FormState => ({
  fullName:'', email:'', password:'', role, provinceId:'', assignedRegion:'', editorGrade:'', branchIds:[], status:'Aktif'
});

export function MemberManagement({ currentUser }: { currentUser: AuthUser }) {
  const canSee = ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(currentUser.role);
  const canManage = ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU'].includes(currentUser.role);
  const [applications,setApplications]=useState<MembershipApplication[]>([]);
  const [users,setUsers]=useState<ManagedUser[]>([]);
  const [provinces,setProvinces]=useState<ProvinceOption[]>([]);
  const [branches,setBranches]=useState<BranchOption[]>([]);
  const [form,setForm]=useState<FormState>(emptyForm(currentUser.role==='BOLGE_KOORDINATORU'?'YAZAR':'YAZAR'));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);

  const roles = useMemo<Role[]>(()=> currentUser.role==='GENEL_KOORDINATOR'
    ? ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE']
    : ['IL_KOORDINATORU','EDITOR','YAZAR'], [currentUser.role]);

  const load=async()=>{
    if(!canSee) return;
    setBusy(true); setError('');
    try {
      const [a,u,m]=await Promise.all([fetchApplications(),fetchManagedUsers(),fetchMembershipMetadata()]);
      setApplications(a.applications); setUsers(u.users); setProvinces(m.provinces); setBranches(m.branches);
    } catch(e:any){ setError(e.message||'Üye yönetimi yüklenemedi.'); }
    finally{setBusy(false);}
  };
  useEffect(()=>{load();},[currentUser.role]);

  if(!canSee) return null;

  const toggleBranch=(id:number)=>{
    setForm(prev=>{
      if(prev.role==='YAZAR') return {...prev,branchIds:[id]};
      return {...prev,branchIds:prev.branchIds.includes(id)?prev.branchIds.filter(x=>x!==id):[...prev.branchIds,id]};
    });
  };
  const startFromApplication=(app:MembershipApplication)=>{
    setForm({
      ...emptyForm((app.requestedRole || 'YAZAR') as Role),
      applicationId:app.id, fullName:app.fullName, email:app.email, provinceId:String(app.provinceId)
    });
    window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  };
  const editUser=(u:ManagedUser)=>{
    setForm({
      id:u.id, fullName:u.fullName, email:u.email, password:'', role:u.role,
      provinceId:u.province?.id?String(u.province.id):'', assignedRegion:u.assignedRegion||'',
      editorGrade:u.editorGrade||'', branchIds:u.role==='YAZAR'&&u.authorProfile?[u.authorProfile.branchId]:u.branchIds,
      status:(u.status==='Pasif'?'Pasif':'Aktif')
    });
  };
  const submitUser=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!canManage) return;
    setBusy(true); setError('');
    try {
      const payload:any={
        fullName:form.fullName,email:form.email,role:form.role,status:form.status,
        provinceId:form.provinceId?Number(form.provinceId):null,
        assignedRegion:form.assignedRegion||null,
        editorGrade:form.editorGrade||null,
        branchIds:form.branchIds,
        applicationId:form.applicationId
      };
      if(!form.id) payload.password=form.password;
      if(form.id) await updateManagedUser(form.id,payload); else await createManagedUser(payload);
      setForm(emptyForm()); await load();
    } catch(e:any){setError(e.message||'Kullanıcı kaydedilemedi.');}
    finally{setBusy(false);}
  };
  const review=async(app:MembershipApplication,status:'UYGUN'|'REDDEDILDI'|'INCELEMEDE')=>{
    setBusy(true); setError('');
    try{await reviewApplication(app.id,status); await load();}catch(e:any){setError(e.message||'Başvuru güncellenemedi.');}finally{setBusy(false);}
  };

  return <div style={{marginTop:22}}>
    <div className="panel" style={{padding:0,overflow:'hidden'}}>
      <div className="table-heading"><div><strong>Üyelik Başvuruları</strong><span>Rol + coğrafi kapsam + branş değerlendirmesi</span></div><button className="text-button" onClick={load}><RefreshCw size={14}/> Yenile</button></div>
      {error && <div style={{padding:14,color:'#b91c1c'}}>{error}</div>}
      <div className="table-wrap"><table><thead><tr><th>AD SOYAD</th><th>İL / BÖLGE</th><th>TALEP</th><th>DURUM</th><th>İŞLEM</th></tr></thead><tbody>
        {applications.map(app=><tr key={app.id}><td><strong>{app.fullName}</strong><small>{app.email}</small></td><td>{app.province.name}<small>{app.province.region}</small></td><td>{app.requestedRole==='EDITOR'?'Editör':'Yazar'}<small>{app.requestedBranch||'Branş belirtilmedi'}</small></td><td>{app.status}</td><td><div className="row-actions">
          {app.status!=='ONAYLANDI'&&<button onClick={()=>review(app,'UYGUN')}><Check size={13}/> Uygun</button>}
          {app.status!=='ONAYLANDI'&&<button onClick={()=>review(app,'REDDEDILDI')}><X size={13}/> Reddet</button>}
          {canManage&&app.status!=='ONAYLANDI'&&<button onClick={()=>startFromApplication(app)}><UserPlus size={13}/> Hesap oluştur</button>}
        </div></td></tr>)}
      </tbody></table>{applications.length===0&&!busy&&<div className="empty-state">Kapsamınızda üyelik başvurusu yok.</div>}</div>
    </div>

    <div className="panel" style={{padding:0,overflow:'hidden',marginTop:18}}>
      <div className="table-heading"><div><strong>Kullanıcılar</strong><span>{currentUser.role==='GENEL_KOORDINATOR'?'Türkiye geneli':currentUser.role==='BOLGE_KOORDINATORU'?'Yalnız kendi bölgeniz':'Yalnız kendi iliniz'}</span></div></div>
      <div className="table-wrap"><table><thead><tr><th>KULLANICI</th><th>ROL</th><th>KAPSAM</th><th>BRANŞ</th><th>DURUM</th><th></th></tr></thead><tbody>
        {users.map(u=><tr key={u.id}><td><strong>{u.fullName}</strong><small>{u.email}</small></td><td>{roleLabels[u.role]}</td><td>{u.assignedRegion||u.province?.name||'Türkiye'}</td><td>{u.role==='YAZAR'&&u.authorProfile?branches.find(b=>b.id===u.authorProfile?.branchId)?.name||'-':u.branchIds.map(id=>branches.find(b=>b.id===id)?.name).filter(Boolean).join(', ')||'-'}</td><td>{u.status}</td><td>{canManage&&u.id!==currentUser.id&&<button className="text-button" onClick={()=>editUser(u)}><PencilLine size={13}/> Düzenle</button>}</td></tr>)}
      </tbody></table></div>
    </div>

    {canManage&&<form className="panel" onSubmit={submitUser} style={{marginTop:18}}>
      <div className="panel-head"><div><span className="panel-kicker">KULLANICI / ROL ATAMA</span><h2>{form.id?'Kullanıcı yetkisini düzenle':'Yeni kullanıcı oluştur'}</h2></div>{form.id&&<button type="button" className="secondary-button" onClick={()=>setForm(emptyForm())}>İptal</button>}</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12,marginTop:18}}>
        <label>Ad Soyad<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/></label>
        <label>E-posta<input required type="email" disabled={Boolean(form.id)} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        {!form.id&&<label>İlk Şifre<input required minLength={8} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}
        <label>Rol<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as Role,branchIds:[]})}>{roles.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select></label>
        {form.role==='BOLGE_KOORDINATORU'&&<label>Bölge<select value={form.assignedRegion} onChange={e=>setForm({...form,assignedRegion:e.target.value})}><option value="">Seçiniz</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select></label>}
        {['IL_KOORDINATORU','YAZAR','EDITOR'].includes(form.role)&&<label>İl<select value={form.provinceId} onChange={e=>setForm({...form,provinceId:e.target.value,assignedRegion:e.target.value?'':form.assignedRegion})}><option value="">Seçiniz</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name} · {p.region}</option>)}</select></label>}
        {form.role==='EDITOR'&&<label>Editör bölgesi <select value={form.assignedRegion} onChange={e=>setForm({...form,assignedRegion:e.target.value,provinceId:e.target.value?'':form.provinceId})}><option value="">İl bazlı</option>{REGIONS.filter(r=>currentUser.role==='GENEL_KOORDINATOR'||r===currentUser.assignedRegion).map(r=><option key={r}>{r}</option>)}</select></label>}
        {form.role==='EDITOR'&&<label>Sınıf filtresi (opsiyonel)<input value={form.editorGrade} onChange={e=>setForm({...form,editorGrade:e.target.value})} placeholder="Örn. 8. Sınıf"/></label>}
        {['YAZAR','EDITOR'].includes(form.role)&&<div style={{gridColumn:'1 / -1'}}><strong style={{fontSize:12}}>Branş {form.role==='YAZAR'?'(tek)':'(bir veya daha fazla)'}</strong><div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>{branches.map(b=><label key={b.id} style={{display:'inline-flex',alignItems:'center',gap:6,border:'1px solid #dce8e7',borderRadius:8,padding:'8px 10px'}}><input type={form.role==='YAZAR'?'radio':'checkbox'} checked={form.branchIds.includes(b.id)} onChange={()=>toggleBranch(b.id)}/>{b.name}</label>)}</div></div>}
        {form.id&&<label>Durum<select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'Aktif'|'Pasif'})}><option>Aktif</option><option>Pasif</option></select></label>}
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',marginTop:18}}><button className="primary-button" disabled={busy}><Plus size={14}/>{form.id?'Yetkiyi Güncelle':'Kullanıcıyı Oluştur'}</button></div>
    </form>}
  </div>;
}
