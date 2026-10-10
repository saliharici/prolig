import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, EyeOff, LockKeyhole, Mail, MapPin, PencilLine, Plus, RefreshCw, Search, Trash2, UserCheck, UserPlus, UserRound, UsersRound, UserX, X } from 'lucide-react';
import type { AuthUser } from '../auth/types';
import type { Role } from '../demo/model';
import { roleLabels } from '../demo/model';
import { changeManagedUserLifecycle, createManagedUser, deleteManagedUser, fetchApplications, fetchManagedUsers, fetchMembershipMetadata, reviewApplication, updateManagedUser } from './api';
import type { BranchOption, ManagedUser, MembershipApplication, ProvinceOption } from './types';
import { districtsForProvince } from '../../shared/district-catalog';

const REGIONS = ['Akdeniz','Doğu Anadolu','Ege','Güneydoğu Anadolu','İç Anadolu','Karadeniz','Marmara'];

type FormState = {
  id?: number;
  applicationId?: number;
  fullName: string;
  email: string;
  password: string;
  role: Role;
  provinceId: string;
  districtName: string;
  assignedRegion: string;
  editorGrade: string;
  branchIds: number[];
  status: 'Aktif'|'Pasif';
};

const emptyForm = (role: Role = 'YAZAR'): FormState => ({
  fullName:'', email:'', password:'', role, provinceId:'', districtName:'', assignedRegion:'', editorGrade:'', branchIds:[], status:'Aktif'
});

export function MemberManagement({ currentUser }: { currentUser: AuthUser }) {
  const canSee = ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(currentUser.role);
  const canManage = ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(currentUser.role);
  const [applications,setApplications]=useState<MembershipApplication[]>([]);
  const [users,setUsers]=useState<ManagedUser[]>([]);
  const [provinces,setProvinces]=useState<ProvinceOption[]>([]);
  const [branches,setBranches]=useState<BranchOption[]>([]);
  const [form,setForm]=useState<FormState>(emptyForm(currentUser.role==='BOLGE_KOORDINATORU'?'YAZAR':'YAZAR'));
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [branchQuery,setBranchQuery]=useState('');

  const roles = useMemo<Role[]>(()=> currentUser.role==='GENEL_KOORDINATOR'
    ? ['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','IL_KOORDINATORU','EDITOR','YAZAR','MUHASEBE']
    : currentUser.role==='BOLGE_KOORDINATORU'
      ? ['IL_KOORDINATORU','EDITOR','YAZAR']
      : ['EDITOR','YAZAR'], [currentUser.role]);

  const visibleBranches = useMemo(() => {
    const query = branchQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return branches;
    return branches.filter((branch) => branch.name.toLocaleLowerCase('tr-TR').includes(query));
  }, [branches, branchQuery]);

  const canManageLifecycle = (target: ManagedUser) => {
    if (target.id === currentUser.id) return false;
    if (currentUser.role === 'GENEL_KOORDINATOR') return target.role !== 'GENEL_KOORDINATOR';
    if (currentUser.role === 'BOLGE_KOORDINATORU') return ['IL_KOORDINATORU','EDITOR','YAZAR'].includes(target.role);
    if (currentUser.role === 'IL_KOORDINATORU') return ['EDITOR','YAZAR'].includes(target.role);
    return false;
  };

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
    const requestedBranchId = branches.find((branch) => branch.name === app.requestedBranch)?.id;
    setForm({
      ...emptyForm((app.requestedRole || 'YAZAR') as Role),
      applicationId:app.id,
      fullName:app.fullName,
      email:app.email,
      provinceId:String(app.provinceId),
      districtName:app.districtName||'',
      branchIds:requestedBranchId?[requestedBranchId]:[]
    });
    window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  };
  const editUser=(u:ManagedUser)=>{
    setForm({
      id:u.id, fullName:u.fullName, email:u.email, password:'', role:u.role,
      provinceId:u.province?.id?String(u.province.id):'', districtName:u.authorProfile?.district?.name||'', assignedRegion:u.assignedRegion||'',
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
        districtName:form.role==='YAZAR'?(form.districtName||null):null,
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

  const toggleUserStatus=async(user:ManagedUser)=>{
    const action = user.status==='Pasif'?'activate':'deactivate';
    const verb = action==='activate'?'aktifleştirmek':'pasife almak';
    if(!window.confirm(`${user.fullName} kullanıcısını ${verb} istediğinize emin misiniz?`)) return;
    setBusy(true); setError('');
    try{
      await changeManagedUserLifecycle(user.id,action);
      await load();
    }catch(e:any){setError(e.message||'Kullanıcı durumu güncellenemedi.');}
    finally{setBusy(false);}
  };

  const removeUser=async(user:ManagedUser)=>{
    if(!window.confirm(`${user.fullName} kullanıcısını kalıcı olarak silmek istediğinize emin misiniz? Geçmiş kaydı varsa sistem silmeye izin vermeyecektir.`)) return;
    setBusy(true); setError('');
    try{
      await deleteManagedUser(user.id);
      if(form.id===user.id) setForm(emptyForm());
      await load();
    }catch(e:any){setError(e.message||'Kullanıcı silinemedi.');}
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
      <div className="table-wrap"><table><thead><tr><th>AD SOYAD</th><th>İL / İLÇE</th><th>TALEP</th><th>DURUM</th><th>İŞLEM</th></tr></thead><tbody>
        {applications.map(app=><tr key={app.id}><td><strong>{app.fullName}</strong><small>{app.email}</small></td><td>{app.province.name}<small>{app.districtName?`${app.districtName} · ${app.province.region}`:app.province.region}</small></td><td>{app.requestedRole==='EDITOR'?'Editör':'Yazar'}<small>{app.requestedBranch||'Branş belirtilmedi'}</small></td><td>{app.status}</td><td><div className="row-actions">
          {app.status!=='ONAYLANDI'&&<button onClick={()=>review(app,'UYGUN')}><Check size={13}/> Uygun</button>}
          {app.status!=='ONAYLANDI'&&<button onClick={()=>review(app,'REDDEDILDI')}><X size={13}/> Reddet</button>}
          {canManage&&app.status!=='ONAYLANDI'&&<button onClick={()=>startFromApplication(app)}><UserPlus size={13}/> Hesap oluştur</button>}
        </div></td></tr>)}
      </tbody></table>{applications.length===0&&!busy&&<div className="empty-state">Kapsamınızda üyelik başvurusu yok.</div>}</div>
    </div>

    <div className="panel" style={{padding:0,overflow:'hidden',marginTop:18}}>
      <div className="table-heading"><div><strong>Kullanıcılar</strong><span>{currentUser.role==='GENEL_KOORDINATOR'?'Türkiye geneli':currentUser.role==='BOLGE_KOORDINATORU'?'Yalnız kendi bölgeniz':'Yalnız kendi iliniz'}</span></div></div>
      <div className="table-wrap"><table><thead><tr><th>KULLANICI</th><th>ROL</th><th>KAPSAM</th><th>BRANŞ</th><th>DURUM</th><th></th></tr></thead><tbody>
        {users.map(u=><tr key={u.id}><td><strong>{u.fullName}</strong><small>{u.email}</small></td><td>{roleLabels[u.role]}</td><td>{u.assignedRegion||(u.province?`${u.province.name}${u.role==='YAZAR'&&u.authorProfile?.district?.name?` / ${u.authorProfile.district.name}`:''}`:'Türkiye')}</td><td>{u.role==='YAZAR'&&u.authorProfile?branches.find(b=>b.id===u.authorProfile?.branchId)?.name||'-':u.branchIds.map(id=>branches.find(b=>b.id===id)?.name).filter(Boolean).join(', ')||'-'}</td><td>{u.status}</td><td><div className="row-actions">{canManage&&u.id!==currentUser.id&&<button className="text-button" onClick={()=>editUser(u)}><PencilLine size={13}/> Düzenle</button>}{canManage&&canManageLifecycle(u)&&<button className="text-button" onClick={()=>toggleUserStatus(u)}>{u.status==='Pasif'?<UserCheck size={13}/>:<UserX size={13}/>} {u.status==='Pasif'?'Aktifleştir':'Pasife al'}</button>}{canManage&&canManageLifecycle(u)&&<button className="text-button danger-action" onClick={()=>removeUser(u)}><Trash2 size={13}/> Sil</button>}</div></td></tr>)}
      </tbody></table></div>
    </div>

    {canManage&&<form className="panel member-form-card" onSubmit={submitUser}>
      <div className="member-form-head">
        <div className="member-form-heading">
          <span className="member-form-icon"><UserRound size={22}/></span>
          <div>
            <span className="panel-kicker">KULLANICI / ROL ATAMA</span>
            <h2>{form.id?'Kullanıcı yetkisini düzenle':'Yeni kullanıcı oluştur'}</h2>
            <p>{form.id?'Kullanıcının rolünü, coğrafi kapsamını ve çalışma yetkilerini güncelleyin.':'Sisteme erişim sağlayacak yeni bir kullanıcı oluşturun ve uygun rol ile kapsamı atayın.'}</p>
          </div>
        </div>
        {form.id&&<button type="button" className="secondary-button" onClick={()=>setForm(emptyForm())}>İptal</button>}
      </div>

      <div className="member-form-divider"/>

      <div className="member-form-grid">
        <label className="member-field">
          <span className="member-field-label">Ad Soyad <em>*</em></span>
          <span className="member-control">
            <UserRound size={18}/>
            <input required placeholder="Ad Soyad giriniz" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/>
          </span>
        </label>

        <label className="member-field">
          <span className="member-field-label">E-posta <em>*</em></span>
          <span className="member-control">
            <Mail size={18}/>
            <input required type="email" placeholder="ornek@firma.com" disabled={Boolean(form.id)} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          </span>
        </label>

        {!form.id&&<label className="member-field">
          <span className="member-field-label">İlk Şifre <em>*</em></span>
          <span className="member-control member-password-control">
            <LockKeyhole size={18}/>
            <input required minLength={8} type={showPassword?'text':'password'} placeholder="En az 8 karakter" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
            <button type="button" className="member-password-toggle" aria-label={showPassword?'Şifreyi gizle':'Şifreyi göster'} onClick={()=>setShowPassword(value=>!value)}>
              {showPassword?<EyeOff size={17}/>:<Eye size={17}/>}
            </button>
          </span>
        </label>}

        <label className="member-field">
          <span className="member-field-label">Rol <em>*</em></span>
          <span className="member-control member-select-control">
            <UsersRound size={18}/>
            <select value={form.role} onChange={e=>setForm({...form,role:e.target.value as Role,branchIds:[],districtName:e.target.value==='YAZAR'?form.districtName:''})}>{roles.map(r=><option key={r} value={r}>{roleLabels[r]}</option>)}</select>
          </span>
        </label>

        {form.role==='BOLGE_KOORDINATORU'&&<label className="member-field">
          <span className="member-field-label">Bölge <em>*</em></span>
          <span className="member-control member-select-control">
            <MapPin size={18}/>
            <select value={form.assignedRegion} onChange={e=>setForm({...form,assignedRegion:e.target.value})}><option value="">Seçiniz</option>{REGIONS.map(r=><option key={r}>{r}</option>)}</select>
          </span>
        </label>}

        {['IL_KOORDINATORU','YAZAR','EDITOR'].includes(form.role)&&<label className="member-field">
          <span className="member-field-label">İl <em>*</em></span>
          <span className="member-control member-select-control">
            <MapPin size={18}/>
            <select value={form.provinceId} onChange={e=>setForm({...form,provinceId:e.target.value,districtName:'',assignedRegion:e.target.value?'':form.assignedRegion})}><option value="">Seçiniz</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name} · {p.region}</option>)}</select>
          </span>
        </label>}

        {form.role==='YAZAR'&&<label className="member-field">
          <span className="member-field-label">İlçe <em>*</em></span>
          <span className="member-control member-select-control">
            <MapPin size={18}/>
            <select required disabled={!form.provinceId} value={form.districtName} onChange={e=>setForm({...form,districtName:e.target.value})}>
              <option value="">{form.provinceId?'İlçe seçiniz':'Önce il seçiniz'}</option>
              {districtsForProvince(form.provinceId).map(district=><option key={district} value={district}>{district}</option>)}
            </select>
          </span>
        </label>}

        {form.role==='EDITOR'&&<label className="member-field">
          <span className="member-field-label">Editör bölgesi <small>Opsiyonel</small></span>
          <span className="member-control member-select-control">
            <MapPin size={18}/>
            <select value={form.assignedRegion} onChange={e=>setForm({...form,assignedRegion:e.target.value,provinceId:e.target.value?'':form.provinceId})}><option value="">İl bazlı</option>{REGIONS.filter(r=>currentUser.role==='GENEL_KOORDINATOR'||r===currentUser.assignedRegion).map(r=><option key={r}>{r}</option>)}</select>
          </span>
        </label>}

        {form.role==='EDITOR'&&<label className="member-field">
          <span className="member-field-label">Sınıf filtresi <small>Opsiyonel</small></span>
          <span className="member-control">
            <UsersRound size={18}/>
            <input value={form.editorGrade} onChange={e=>setForm({...form,editorGrade:e.target.value})} placeholder="Örn. 8. Sınıf"/>
          </span>
        </label>}

        {form.id&&<label className="member-field">
          <span className="member-field-label">Durum</span>
          <span className="member-control member-select-control">
            <Check size={18}/>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value as 'Aktif'|'Pasif'})}><option>Aktif</option><option>Pasif</option></select>
          </span>
        </label>}

        {['YAZAR','EDITOR'].includes(form.role)&&<div className="member-branch-field">
          <div className="member-branch-head">
            <div><strong>Branş seçimi</strong><span>{form.role==='YAZAR'?'Yazar için tek branş seçin.':'Editör için bir veya daha fazla branş seçebilirsiniz.'}</span></div>
            <span className="member-branch-search"><Search size={15}/><input value={branchQuery} onChange={e=>setBranchQuery(e.target.value)} placeholder="Branş ara..."/></span>
          </div>
          <div className="member-branch-options">{visibleBranches.map(b=><label key={b.id} className={form.branchIds.includes(b.id)?'selected':''}><input type={form.role==='YAZAR'?'radio':'checkbox'} checked={form.branchIds.includes(b.id)} onChange={()=>toggleBranch(b.id)}/><span>{b.name}</span></label>)}{visibleBranches.length===0&&<div className="member-branch-empty">Aramanızla eşleşen branş bulunamadı.</div>}</div>
        </div>}
      </div>

      <div className="member-form-footer">
        <p>Rol ve coğrafi kapsam, oturum açıldığında kullanıcının görebileceği kayıtları belirler.</p>
        <button className="primary-button member-submit-button" disabled={busy}><Plus size={16}/>{form.id?'Yetkiyi Güncelle':'Kullanıcıyı Oluştur'}</button>
      </div>
    </form>}
  </div>;
}
