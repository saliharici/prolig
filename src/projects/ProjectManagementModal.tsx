import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, BookOpen, CalendarDays, Check, Gauge, Save, Trash2, Users, X } from 'lucide-react';
import type { ApiAuthor } from '../authors/types';
import type { AuthUser } from '../auth/types';
import './project-assignment-v3.css';
import { fetchMembershipMetadata } from '../membership/api';
import type { BranchOption } from '../membership/types';
import { ALL_GRADES } from './integration';
import { changeProjectLifecycle, createProject, deleteProject, ProjectApiError, updateProject } from './api';
import type { ApiProject, ProjectPriority, ProjectStatus } from './types';

const statusOptions: Array<{ value: Exclude<ProjectStatus, 'Arsiv'>; label: string }> = [
  { value: 'Taslak', label: 'Taslak' },
  { value: 'Planlama', label: 'Planlama' },
  { value: 'Devam_Ediyor', label: 'Devam Ediyor' },
  { value: 'Kontrol', label: 'Kontrol' },
  { value: 'Tamamlandi', label: 'Tamamlandı' }
];

const priorityOptions: Array<{ value: ProjectPriority; label: string }> = [
  { value: 'Dusuk', label: 'Düşük' },
  { value: 'Normal', label: 'Normal' },
  { value: 'Yuksek', label: 'Yüksek' },
  { value: 'Acil', label: 'Acil' }
];

function localDate(value: string | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function ProjectManagementModal({
  project,
  authors,
  currentUser,
  onClose,
  onChanged
}: {
  project: ApiProject | null;
  authors: ApiAuthor[];
  currentUser: AuthUser;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const editing = Boolean(project);
  const archived = project?.status === 'Arsiv';
  const isBranchCoordinator = currentUser.role === 'BRANS_KOORDINATORU';
  const assignedBranches = currentUser.editorBranches ?? [];
  const grantedBranchIds = new Set(assignedBranches.map((branch) => branch.id));
  const singleBranchId = isBranchCoordinator && assignedBranches.length === 1 ? assignedBranches[0].id : 0;

  const [title, setTitle] = useState(project?.title ?? '');
  const [code, setCode] = useState(project?.code ?? '');
  const [projectType, setProjectType] = useState(project?.projectType ?? 'Soru Bankası');
  const [deadline, setDeadline] = useState(localDate(project?.deadline));
  const [priority, setPriority] = useState<ProjectPriority>(project?.priority ?? 'Normal');
  const [targetGrade, setTargetGrade] = useState(project?.targetGrade ?? '8. Sınıf');
  const [branchId, setBranchId] = useState<number>(project?.branch.id ?? singleBranchId);
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<Exclude<ProjectStatus, 'Arsiv'>>(
    project && project.status !== 'Arsiv' ? project.status : 'Planlama'
  );
  const [progress, setProgress] = useState(project?.progress ?? 0);
  const [authorProfileIds, setAuthorProfileIds] = useState<number[]>(
    project?.authors.map((author) => author.authorProfileId) ?? []
  );
  const [branches, setBranches] = useState<BranchOption[]>(() => {
    const map = new Map<number, BranchOption>();
    authors.forEach((author) => map.set(author.branch.id, author.branch));
    if (project) map.set(project.branch.id, project.branch);
    // The coordinator can create a project even before the first writer exists.
    assignedBranches.forEach((branch) => map.set(branch.id, branch));
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [metadataNote, setMetadataNote] = useState('');
  const [authorSearch, setAuthorSearch] = useState('');

  useEffect(() => {
    let active = true;
    fetchMembershipMetadata()
      .then(({ branches: fetched }) => {
        if (!active) return;
        setBranches(fetched);
      })
      .catch(() => {
        if (!active) return;
        setMetadataNote('Branş kataloğu yüklenemedi; erişilebilir yazar ve mevcut proje branşları kullanılıyor.');
      });
    return () => { active = false; };
  }, []);

  // Server authorization remains authoritative. The form shows only usable scope.
  const visibleBranches = branches.filter(
    (branch) => !isBranchCoordinator || grantedBranchIds.has(branch.id)
  );
  const branchInScope = branchId > 0 && visibleBranches.some((branch) => branch.id === branchId);
  const eligibleAuthors = useMemo(
    () => authors.filter((author) => author.branch.id === branchId && author.status === 'Aktif'),
    [authors, branchId]
  );
  const visibleAuthors = useMemo(() => {
    const needle = authorSearch.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return eligibleAuthors;
    return eligibleAuthors.filter((author) =>
      `${author.fullName} ${author.province.name} ${author.district?.name ?? ''} ${author.institution?.name ?? ''}`
        .toLocaleLowerCase('tr-TR').includes(needle)
    );
  }, [eligibleAuthors, authorSearch]);
  const selectedEligibleCount = eligibleAuthors.filter((author) => authorProfileIds.includes(author.id)).length;
  const allVisibleSelected = visibleAuthors.length > 0 && visibleAuthors.every((author) => authorProfileIds.includes(author.id));

  const toggleVisibleAuthors = () => {
    const visibleIds = new Set(visibleAuthors.map((author) => author.id));
    setAuthorProfileIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.has(id))
      : [...new Set([...current, ...visibleIds])]
    );
  };

  const changeBranch = (value: string) => {
    const nextBranchId = Number(value);
    setBranchId(nextBranchId);
    setAuthorSearch('');
    const eligible = new Set(authors.filter((author) => author.branch.id === nextBranchId && author.status === 'Aktif').map((author) => author.id));
    setAuthorProfileIds((current) => current.filter((id) => eligible.has(id)));
  };

  const toggleAuthor = (authorProfileId: number) => {
    setAuthorProfileIds((current) =>
      current.includes(authorProfileId)
        ? current.filter((id) => id !== authorProfileId)
        : [...current, authorProfileId]
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (archived) return;
    if (!branchInScope) {
      setError('Lütfen yetki kapsamınızdaki bir branş seçin.');
      return;
    }
    setBusy(true);
    setError('');

    try {
      if (editing && project) {
        await updateProject(project.id, {
          title: title.trim(),
          code: code.trim().toUpperCase(),
          projectType: projectType.trim(),
          deadline,
          priority,
          targetGrade,
          branchId,
          description: description.trim() || null,
          authorProfileIds,
          status,
          progress
        });
      } else {
        await createProject({
          title: title.trim(),
          code: code.trim().toUpperCase(),
          projectType: projectType.trim(),
          deadline,
          priority,
          targetGrade,
          branchId,
          description: description.trim() || null,
          authorProfileIds
        });
      }

      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const lifecycle = async (action: 'archive' | 'restore') => {
    if (!project) return;
    const verb = action === 'archive' ? 'arşivlemek' : 'arşivden çıkarmak';
    if (!window.confirm(`${project.title} projesini ${verb} istediğinize emin misiniz?`)) return;

    setBusy(true);
    setError('');
    try {
      await changeProjectLifecycle(project.id, action);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proje yaşam döngüsü güncellenemedi.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!project) return;
    if (!window.confirm(`${project.title} projesini KALICI olarak silmek istediğinize emin misiniz? Geçmiş kaydı varsa sistem silmeyi reddedecektir.`)) return;

    setBusy(true);
    setError('');
    try {
      await deleteProject(project.id);
      await onChanged();
      onClose();
    } catch (err) {
      if (err instanceof ProjectApiError && err.status === 409) {
        setError(`${err.message} Projeyi arşivde tutmak güvenli seçenektir.`);
      } else {
        setError(err instanceof Error ? err.message : 'Proje silinemedi.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <form className="project-management-modal" onSubmit={submit}>
        <div className="modal-head project-management-head">
          <div>
            <span className="panel-kicker">{editing ? 'PROJE YÖNETİMİ' : 'YENİ PROJE'}</span>
            <h2>{editing ? project?.title : 'Yeni proje oluştur'}</h2>
            <p>{editing ? 'Proje kapsamını, üretim durumunu ve yazar ekibini yönetin.' : 'Projenin temel kapsamını belirleyin; yazar atamasını şimdi veya daha sonra yapabilirsiniz.'}</p>
          </div>
          <button type="button" aria-label="Kapat" onClick={onClose} disabled={busy}><X size={20}/></button>
        </div>

        {error && <div className="project-management-error">{error}</div>}
        {archived && <div className="project-archive-notice"><Archive size={16}/><div><strong>Bu proje arşivde.</strong><span>Düzenlemek için önce arşivden çıkarın.</span></div></div>}
        {metadataNote && <div className="field-help project-metadata-note">{metadataNote}</div>}
        {isBranchCoordinator && <div className="project-assignment-scope" role="note">
          <BookOpen size={16} aria-hidden="true"/>
          <span>{assignedBranches.length > 0
            ? `Branş sorumluluğunuz: ${assignedBranches.map(branch => branch.name).join(', ')}. Projeyi yalnız bu branşlarda açabilirsiniz.`
            : 'Henüz branş atamanız bulunmuyor. Genel Koordinatörün branş ataması yapması gerekiyor.'}</span>
        </div>}

        <fieldset disabled={busy || archived} className="project-management-fields">
          <div className="project-form-grid">
            <label>
              <span>Proje adı <em>*</em></span>
              <input required minLength={3} maxLength={200} value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="8. Sınıf Matematik Soru Bankası" />
            </label>
            <label>
              <span>Proje kodu <em>*</em></span>
              <input required minLength={3} maxLength={60} value={code} onChange={(e)=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9._-]/g,''))} placeholder="MAT-8-2027" />
            </label>
            <label>
              <span>Proje türü <em>*</em></span>
              <input required minLength={2} maxLength={100} value={projectType} onChange={(e)=>setProjectType(e.target.value)} />
            </label>
            <label>
              <span>Branş <em>*</em></span>
              <select required value={branchId || ''} onChange={(e)=>changeBranch(e.target.value)}>
                <option value="">Branş seçin</option>
                {visibleBranches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              <span>Hedef sınıf <em>*</em></span>
              <select required value={targetGrade} onChange={(e)=>setTargetGrade(e.target.value)}>
                {ALL_GRADES.map((grade)=><option key={grade}>{grade}</option>)}
              </select>
            </label>
            <label>
              <span>Son teslim <em>*</em></span>
              <span className="project-input-icon"><CalendarDays size={16}/><input type="date" required value={deadline} onChange={(e)=>setDeadline(e.target.value)} /></span>
            </label>
            <label>
              <span>Öncelik</span>
              <select value={priority} onChange={(e)=>setPriority(e.target.value as ProjectPriority)}>
                {priorityOptions.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            {editing && <label>
              <span>Durum</span>
              <select value={status} onChange={(e)=>setStatus(e.target.value as Exclude<ProjectStatus,'Arsiv'>)}>
                {statusOptions.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>}
            {editing && <label className="project-span-two">
              <span>İlerleme</span>
              <div className="project-progress-control"><Gauge size={16}/><input type="range" min={0} max={100} value={progress} onChange={(e)=>setProgress(Number(e.target.value))}/><strong>%{progress}</strong></div>
            </label>}
            <label className="project-span-two">
              <span>Açıklama</span>
              <textarea maxLength={2000} value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Projenin amacı, kapsamı ve üretim notları..." />
            </label>
          </div>

          <section className="project-author-picker">
            <div className="project-author-picker-head">
              <div><Users size={17}/><div><strong>Proje yazarları</strong><span>Yalnız seçili branştaki aktif yazarlar listelenir.</span></div></div>
              <span>{selectedEligibleCount} / {eligibleAuthors.length} seçili</span>
            </div>
            {!branchInScope ? <div className="grade-detail-empty">{isBranchCoordinator && !assignedBranches.length ? 'Branş ataması bekleniyor.' : 'Önce yetki kapsamınızdaki bir branş seçin.'}</div>
              : eligibleAuthors.length === 0 ? <div className="grade-detail-empty">Bu branşta aktif yazar bulunmuyor. Projeyi yazarsız Taslak olarak oluşturabilir, daha sonra yazar atayabilirsiniz.</div>
              : <>
                <div className="project-assignment-toolbar">
                  <label htmlFor="project-author-search">Yazar ara
                    <input id="project-author-search" type="search" value={authorSearch}
                      onChange={event => setAuthorSearch(event.target.value)}
                      placeholder="Ad, il, ilçe veya kurum…" />
                  </label>
                  <button type="button" className="secondary-button" disabled={!visibleAuthors.length} onClick={toggleVisibleAuthors}>
                    {allVisibleSelected ? 'Görünen seçimi kaldır' : 'Görünenleri seç'}
                  </button>
                </div>
                {visibleAuthors.length === 0 ? <div className="grade-detail-empty">Aramanıza uygun yazar yok. Filtreyi değiştirin.</div>
                  : <div className="project-author-picker-grid">{visibleAuthors.map((author)=>{
                      const selected=authorProfileIds.includes(author.id);
                      return <button type="button" key={author.id} className={selected?'selected':''}
                        aria-pressed={selected} onClick={()=>toggleAuthor(author.id)}>
                        <span className="project-author-check">{selected?<Check size={13}/>:null}</span>
                        <span><strong>{author.fullName}</strong><small>{author.province.name}{author.district?.name ? ' · '+author.district.name : ''}{author.activeProjectCount ? ` · ${author.activeProjectCount} aktif proje` : ''}</small></span>
                      </button>;
                    })}</div>}
                <p className="project-assignment-footer">{selectedEligibleCount} yazar görevlendirme için seçildi. Kayıt sonrasında yalnız seçtiğiniz yazarlar projeye atanır.</p>
              </>}
          </section>
        </fieldset>

        <div className="project-management-footer">
          <div className="project-danger-actions">
            {project && (archived
              ? <button type="button" className="secondary-button" onClick={()=>lifecycle('restore')} disabled={busy}><ArchiveRestore size={15}/> Arşivden Çıkar</button>
              : <button type="button" className="secondary-button" onClick={()=>lifecycle('archive')} disabled={busy}><Archive size={15}/> Arşivle</button>)}
            {project && ['Taslak','Arsiv'].includes(project.status) && <button type="button" className="danger-button" onClick={remove} disabled={busy}><Trash2 size={15}/> Kalıcı Sil</button>}
          </div>
          <div className="project-save-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Vazgeç</button>
            {!archived && <button type="submit" className="primary-button" disabled={busy || !branchInScope}><Save size={16}/>{busy?'Kaydediliyor...':editing?'Değişiklikleri Kaydet':'Projeyi Oluştur'}</button>}
          </div>
        </div>
      </form>
    </div>
  );
}
