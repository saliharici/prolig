import { FormEvent, useMemo, useState } from 'react';
import { BookOpen, Image, LockKeyhole, MapPin, Phone, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import type { AuthUser, UpdateMyProfileInput } from '../auth/types';
import { updateMyProfile } from '../auth/api';
import { roleLabels } from '../demo/model';

export function ProfileModal({
  user,
  onClose,
  onSaved
}: {
  user: AuthUser;
  onClose: () => void;
  onSaved: (user: AuthUser) => void | Promise<void>;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '');
  const [title, setTitle] = useState(user.authorProfile?.title ?? '');
  const [experienceYears, setExperienceYears] = useState(user.authorProfile?.experienceYears ?? 0);
  const [biography, setBiography] = useState(user.authorProfile?.biography ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const scopeText = useMemo(() => {
    if (user.role === 'GENEL_KOORDINATOR') return 'Türkiye geneli';
    if (user.role === 'BOLGE_KOORDINATORU') return user.assignedRegion || 'Bölge atanmamış';
    if (user.role === 'IL_KOORDINATORU') return user.province?.name || 'İl atanmamış';
    if (user.role === 'EDITOR') {
      const location = user.province?.name || user.assignedRegion || 'Kapsam atanmamış';
      const branches = user.editorBranches?.map((branch) => branch.name).join(', ') || 'Branş atanmamış';
      return `${location} · ${branches}${user.editorGrade ? ` · ${user.editorGrade}` : ''}`;
    }
    if (user.role === 'YAZAR' && user.authorProfile) {
      const district = user.authorProfile.district?.name ? ` / ${user.authorProfile.district.name}` : '';
      return `${user.authorProfile.province.name}${district} · ${user.authorProfile.branch.name}`;
    }
    return 'Sistem kapsamı';
  }, [user]);

  const initials = user.fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('tr-TR');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    const payload: UpdateMyProfileInput = {
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      avatarUrl: avatarUrl.trim() || null
    };

    if (user.role === 'YAZAR') {
      payload.title = title.trim();
      payload.experienceYears = Number(experienceYears);
      payload.biography = biography.trim() || null;
    }

    try {
      const updated = await updateMyProfile(payload);
      await onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Profil güncellenemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="profile-modal" onSubmit={submit}>
        <div className="profile-modal-head">
          <div className="profile-modal-identity">
            <span className="profile-modal-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
            </span>
            <div>
              <span className="panel-kicker">KİŞİSEL PROFİL</span>
              <h2>Profilimi Düzenle</h2>
              <p>Kişisel bilgilerinizi güncelleyebilirsiniz. Yetki ve kapsam alanları güvenlik nedeniyle kilitlidir.</p>
            </div>
          </div>
          <button type="button" className="profile-modal-close" aria-label="Kapat" onClick={onClose}><X size={19}/></button>
        </div>

        {error && <div className="profile-modal-error">{error}</div>}

        <div className="profile-modal-grid">
          <label className="member-field">
            <span className="member-field-label">Ad Soyad <em>*</em></span>
            <span className="member-control"><UserRound size={18}/><input required minLength={2} maxLength={120} value={fullName} onChange={(event)=>setFullName(event.target.value)} /></span>
          </label>

          <label className="member-field">
            <span className="member-field-label">Telefon</span>
            <span className="member-control"><Phone size={18}/><input maxLength={40} value={phone} onChange={(event)=>setPhone(event.target.value)} placeholder="+90 5xx xxx xx xx" /></span>
          </label>

          <label className="member-field profile-span-two">
            <span className="member-field-label">Profil fotoğrafı URL</span>
            <span className="member-control"><Image size={18}/><input type="url" maxLength={500} value={avatarUrl} onChange={(event)=>setAvatarUrl(event.target.value)} placeholder="https://..." /></span>
          </label>

          {user.role === 'YAZAR' && <>
            <label className="member-field">
              <span className="member-field-label">Unvan <em>*</em></span>
              <span className="member-control"><BookOpen size={18}/><input required maxLength={120} value={title} onChange={(event)=>setTitle(event.target.value)} /></span>
            </label>

            <label className="member-field">
              <span className="member-field-label">Deneyim yılı</span>
              <span className="member-control"><BookOpen size={18}/><input type="number" min={0} max={60} value={experienceYears} onChange={(event)=>setExperienceYears(Number(event.target.value))} /></span>
            </label>

            <label className="member-field profile-span-two">
              <span className="member-field-label">Kısa biyografi</span>
              <textarea className="profile-biography" maxLength={1000} value={biography} onChange={(event)=>setBiography(event.target.value)} placeholder="Uzmanlık alanlarınız ve mesleki deneyiminiz..." />
            </label>
          </>}

          <div className="profile-locked-box profile-span-two">
            <div className="profile-locked-title"><LockKeyhole size={16}/><div><strong>Değiştirilemeyen hesap bilgileri</strong><span>Bu alanlar erişim güvenliği ve yetki hiyerarşisi tarafından yönetilir.</span></div></div>
            <div className="profile-locked-grid">
              <div><span>E-posta / Kullanıcı adı</span><strong>{user.email}</strong></div>
              <div><span>Rol</span><strong>{roleLabels[user.role]}</strong></div>
              <div><span>Yetki kapsamı</span><strong><MapPin size={13}/>{scopeText}</strong></div>
              <div><span>Durum</span><strong><ShieldCheck size={13}/>Aktif</strong></div>
            </div>
          </div>
        </div>

        <div className="profile-modal-footer">
          <span>Rol, coğrafi kapsam, branş ve erişim yetkileri yalnız yetkili koordinatörler tarafından değiştirilebilir.</span>
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="primary-button" disabled={busy}><Save size={16}/>{busy ? 'Kaydediliyor...' : 'Profili Kaydet'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
