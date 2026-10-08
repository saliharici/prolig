import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { submitMembershipApplication } from './api';
import { PROVINCES } from './provinces';

export function MembershipApplicationScreen({ onBack }: { onBack: () => void }) {
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', provinceId:'25', districtName:'', institutionName:'', requestedRole:'YAZAR', requestedBranch:'', motivation:'' });
  const [status, setStatus] = useState<'idle'|'sending'|'done'>('idle');
  const [error, setError] = useState('');
  const change=(key:string,value:string)=>setForm(prev=>({...prev,[key]:value}));
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setStatus('sending'); setError('');
    try {
      await submitMembershipApplication({ ...form, provinceId:Number(form.provinceId) });
      setStatus('done');
    } catch(err:any) { setError(err.message || 'Başvuru gönderilemedi.'); setStatus('idle'); }
  };
  if(status==='done') return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f8fafc',padding:24}}>
    <div className="panel" style={{maxWidth:540,padding:36,textAlign:'center'}}>
      <CheckCircle2 size={52} color="#16a34a" style={{margin:'0 auto 16px'}}/>
      <h2>Başvurunuz alındı</h2>
      <p style={{color:'#64748b',lineHeight:1.6}}>Başvurunuz ilinizdeki İl Koordinatörü, bağlı bulunduğunuz Bölge Koordinatörü ve Genel Koordinatörün değerlendirme ekranına düştü.</p>
      <button className="primary-button" onClick={onBack}>Ana sayfaya dön</button>
    </div>
  </div>;
  return <div style={{minHeight:'100vh',background:'#f8fafc',padding:'28px 18px'}}>
    <div style={{maxWidth:760,margin:'0 auto'}}>
      <button className="secondary-button" onClick={onBack}><ArrowLeft size={16}/> Geri</button>
      <div className="panel" style={{marginTop:18,padding:30}}>
        <div className="eyebrow">PRO-LİG ÜYELİK</div>
        <h1 style={{margin:'8px 0'}}>Üyelik Başvurusu</h1>
        <p style={{color:'#64748b'}}>Başvurunuz hesap açmaz. Yetkili koordinatörler değerlendirdikten sonra rol ve kapsam atanır.</p>
        <form onSubmit={submit} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginTop:24}}>
          <label>Ad Soyad<input required value={form.fullName} onChange={e=>change('fullName',e.target.value)} /></label>
          <label>E-posta<input required type="email" value={form.email} onChange={e=>change('email',e.target.value)} /></label>
          <label>Telefon<input value={form.phone} onChange={e=>change('phone',e.target.value)} /></label>
          <label>İl<select value={form.provinceId} onChange={e=>change('provinceId',e.target.value)}>{PROVINCES.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
          <label>İlçe<input value={form.districtName} onChange={e=>change('districtName',e.target.value)} /></label>
          <label>Kurum / Okul<input value={form.institutionName} onChange={e=>change('institutionName',e.target.value)} /></label>
          <label>Talep edilen görev<select value={form.requestedRole} onChange={e=>change('requestedRole',e.target.value)}><option value="YAZAR">Yazar</option><option value="EDITOR">Editör</option></select></label>
          <label>Branş<input required value={form.requestedBranch} onChange={e=>change('requestedBranch',e.target.value)} placeholder="Örn. Matematik" /></label>
          <label style={{gridColumn:'1 / -1'}}>Kısa açıklama<textarea value={form.motivation} onChange={e=>change('motivation',e.target.value)} rows={4} /></label>
          {error && <div style={{gridColumn:'1 / -1',color:'#b91c1c'}}>{error}</div>}
          <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end'}}><button className="primary-button" disabled={status==='sending'}>{status==='sending'?'Gönderiliyor...':'Başvuruyu Gönder'} <Send size={15}/></button></div>
        </form>
      </div>
    </div>
  </div>;
}
