import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, BookOpen, CalendarDays, Check, Gauge, Save, Trash2, Users, X } from 'lucide-react';
import type { ApiAuthor } from '../authors/types';
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
  onClose,
  onChanged
}: {
  project: ApiProject | null;
  authors: ApiAuthor[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const editing = Boolean(project);
  const archived = project?.status === 'Arsiv';

  const [title, setTitle] = useState(project?.title ?? '');
  const [code, setCode] = useState(project?.code ?? '');
  const [projectType, setProjectType] = useState(project?.projectType ?? 'Soru Bankası');
  const [deadline, setDeadline] = useState(localDate(project?.deadline));
  const [priority, setPriority] = useState<ProjectPriority>(project?.priority ?? 'Normal');
  const [targetGrade, setTargetGrade] = useState(project?.targetGrade ?? '8. Sınıf');
  const [branchId, setBranchId] = useState<number>(project?.branch.id ?? 0);
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
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [metadataNote, setMetadataNote] = useState('');

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

  const eligibleAuthors = useMemo(
    () => authors.filter((author) => author.branch.id === branchId),
    [authors, branchId]
  );

  const changeBranch = (value: string) => {
    const nextBranchId = Number(value);
    setBranchId(nextBranchId);
    const eligible = new Set(authors.filter((author) => author.branch.id === nextBranchId).map((author) => author.id));
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
                {branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
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
              <div><Users size={17}/><div><strong>Proje yazarları</strong><span>Seçili branştaki ve yetki kapsamınızdaki aktif yazarlar.</span></div></div>
              <span>{authorProfileIds.length} seçili</span>
            </div>
            {!branchId ? <div className="grade-detail-empty">Önce branş seçin.</div> : eligibleAuthors.length === 0 ? <div className="grade-detail-empty">Bu branşta yetki kapsamınızda aktif yazar bulunmuyor. Projeyi yazarsız Taslak olarak oluşturabilirsiniz.</div> :
              <div className="project-author-picker-grid">{eligibleAuthors.map((author)=>{
                const selected=authorProfileIds.includes(author.id);
                return <button type="button" key={author.id} className={selected?'selected':''} onClick={()=>toggleAuthor(author.id)}>
                  <span className="project-author-check">{selected?<Check size={13}/>:null}</span>
                  <span><strong>{author.fullName}</strong><small>{author.province.name}{author.district?.name ? ' · '+author.district.name : ''}</small></span>
                </button>;
              })}</div>}
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
            {!archived && <button type="submit" className="primary-button" disabled={busy || !branchId}><Save size={16}/>{busy?'Kaydediliyor...':editing?'Değişiklikleri Kaydet':'Projeyi Oluştur'}</button>}
          </div>
        </div>
      </form>
    </div>
  );
}
