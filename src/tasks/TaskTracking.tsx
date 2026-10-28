import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpen, CalendarDays, CheckCircle2, ChevronRight, CircleDashed, ClipboardList,
  Clock3, Columns3, List, PencilLine, Plus, RotateCcw, Save, Search, Trash2, UserRound, X
} from 'lucide-react';
import type { AuthUser } from '../auth/types';
import type { ApiAuthor } from '../authors/types';
import { roleLabels } from '../demo/model';
import { fetchManagedUsers } from '../membership/api';
import type { ManagedUser } from '../membership/types';
import type { ApiProject } from '../projects/types';
import { createTask, deleteTask, fetchTasks, updateTask } from './api';
import type { ApiTask, TaskPriority, TaskStatus } from './types';
import './task-assignment-v3.css';

type TaskView = 'kanban' | 'list';
type QuickFilter = 'all' | 'mine' | 'overdue' | 'week';

const managerRoles = new Set(['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU']);
const statusColumns: Array<{ status: Exclude<TaskStatus,'Gecikti'>; label: string }> = [
  { status: 'Bekliyor', label: 'Bekliyor' },
  { status: 'Devam_Ediyor', label: 'Devam Ediyor' },
  { status: 'Kontrol_Bekliyor', label: 'Kontrol Bekliyor' },
  { status: 'Tamamlandi', label: 'Tamamlandı' }
];
const priorities: Array<{ value: TaskPriority; label: string }> = [
  { value: 'Dusuk', label: 'Düşük' },
  { value: 'Normal', label: 'Normal' },
  { value: 'Yuksek', label: 'Yüksek' },
  { value: 'Acil', label: 'Acil' }
];

function trStatus(status: TaskStatus) {
  return ({
    Bekliyor: 'Bekliyor',
    Devam_Ediyor: 'Devam Ediyor',
    Kontrol_Bekliyor: 'Kontrol Bekliyor',
    Tamamlandi: 'Tamamlandı',
    Gecikti: 'Gecikti'
  } as Record<TaskStatus,string>)[status];
}

function trPriority(priority: TaskPriority) {
  return priorities.find(item => item.value === priority)?.label ?? priority;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function inputDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0,10);
}

function assigneeName(task: ApiTask) {
  return task.assignedAuthor?.fullName ?? task.assignedUser?.fullName ?? 'Atanmamış';
}

function workflowColumn(status: TaskStatus) {
  return status === 'Gecikti' ? 'Devam_Ediyor' : status;
}

export function TaskTracking({
  currentUser,
  projects,
  authors,
  initialProjectId,
  onProjectFilterChange,
  onOpenProjectQuestions,
  onStartProjectDraft,
  onProductionUpdated
}: {
  currentUser: AuthUser;
  projects: ApiProject[];
  authors: ApiAuthor[];
  initialProjectId?: number | null;
  onProjectFilterChange?: (projectId: number | null) => void;
  onOpenProjectQuestions: (projectId: number, status?: string) => void;
  onStartProjectDraft: (taskId: number, projectId: number) => void;
  onProductionUpdated: () => Promise<void>;
}) {
  const canCreate = managerRoles.has(currentUser.role);
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<TaskView>('kanban');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [projectFilter, setProjectFilter] = useState<number | null>(initialProjectId ?? null);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);

  const load = async (projectId = projectFilter) => {
    setLoading(true);
    setError('');
    try {
      setTasks(await fetchTasks(projectId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görevler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(projectFilter); }, [projectFilter]);

  useEffect(() => {
    const next = initialProjectId ?? null;
    setProjectFilter(next);
  }, [initialProjectId]);

  useEffect(() => {
    // Branch coordinators coordinate existing project authors; user administration is restricted.
    if (!canCreate || currentUser.role === 'BRANS_KOORDINATORU') return;
    fetchManagedUsers()
      .then(({ users }) => setManagedUsers(users))
      .catch(() => setManagedUsers([]));
  }, [canCreate, currentUser.role]);

  const visibleTasks = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    const needle = query.trim().toLocaleLowerCase('tr-TR');

    return tasks.filter(task => {
      const mine = task.assignedAuthor?.id === currentUser.id || task.assignedUser?.id === currentUser.id;
      if (quickFilter === 'mine' && !mine) return false;
      if (quickFilter === 'overdue' && !task.isOverdue) return false;
      if (quickFilter === 'week') {
        const due = new Date(task.dueDate).getTime();
        if (due < now || due > week) return false;
      }
      if (needle && !`${task.title} ${task.description ?? ''} ${task.project.title} ${assigneeName(task)}`.toLocaleLowerCase('tr-TR').includes(needle)) {
        return false;
      }
      return true;
    });
  }, [tasks, quickFilter, query, currentUser.id]);

  const previewApiUnavailable = error.includes('API not available in isolated P1-D browser preview');

  const summary = useMemo(() => ({
    open: tasks.filter(task => task.status !== 'Tamamlandi').length,
    review: tasks.filter(task => task.status === 'Kontrol_Bekliyor').length,
    overdue: tasks.filter(task => task.isOverdue).length,
    done: tasks.filter(task => task.status === 'Tamamlandi').length
  }), [tasks]);

  const setProject = (value: string) => {
    const next = value ? Number(value) : null;
    setProjectFilter(next);
    onProjectFilterChange?.(next);
  };

  const openNew = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const openEdit = (task: ApiTask) => {
    if (!task.canManage) return;
    setEditingTask(task);
    setShowForm(true);
  };

  const advance = async (task: ApiTask) => {
    let next: 'Devam_Ediyor'|'Kontrol_Bekliyor'|'Tamamlandi'|null = null;
    if (task.status === 'Bekliyor') next = 'Devam_Ediyor';
    else if (task.status === 'Devam_Ediyor' || task.status === 'Gecikti') next = 'Kontrol_Bekliyor';
    else if (task.status === 'Kontrol_Bekliyor' && task.canManage) next = 'Tamamlandi';
    if (!next) return;

    try {
      await updateTask(task.id, { status: next });
      await Promise.all([load(), onProductionUpdated()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görev durumu güncellenemedi.');
    }
  };

  return <>
    <div className="page-heading">
      <div>
        <div className="eyebrow">OPERASYON TAKİBİ</div>
        <h1>Görev Takibi</h1>
        <p>Proje işlerini, sorumluları ve termin durumlarını gerçek görev kayıtları üzerinden yönetin.</p>
      </div>
      <div className="page-heading-actions">
        <span className="heading-chip"><ClipboardList size={16}/> {loading || error ? '—' : tasks.length} görev</span>
        {canCreate && <button className="primary-button" onClick={openNew}><Plus size={16}/> Yeni Görev</button>}
      </div>
    </div>

    <div className="task-workflow-link" role="note">
      <span><BookOpen size={17} aria-hidden="true"/> Görev → Soru üretimi → Editör incelemesi → Yayın onayı</span>
      {projectFilter!==null && projects.some(p=>p.id===projectFilter) && <button type="button" onClick={()=>onOpenProjectQuestions(projectFilter)}>Seçili projenin soruları <ChevronRight size={14}/></button>}
      <small>Görev ve sorular proje üzerinden izlenir. Görevin tamamlanması bir sorunun onaylandığı anlamına gelmez.</small>
    </div>
    {!loading && !error && <div className="task-summary-grid">
      <div className="panel task-summary-card"><span><CircleDashed size={17}/></span><div><strong>{summary.open}</strong><small>Açık Görev</small></div></div>
      <div className="panel task-summary-card"><span><Clock3 size={17}/></span><div><strong>{summary.review}</strong><small>Kontrol Bekleyen</small></div></div>
      <div className="panel task-summary-card overdue"><span><AlertTriangle size={17}/></span><div><strong>{summary.overdue}</strong><small>Geciken</small></div></div>
      <div className="panel task-summary-card"><span><CheckCircle2 size={17}/></span><div><strong>{summary.done}</strong><small>Tamamlanan</small></div></div>
    </div>}

    {!loading && !error && <div className="task-toolbar">
      <div className="search-box"><Search size={17}/><input aria-label="Görevlerde ara" placeholder="Görev, proje veya kişi ara..." value={query} onChange={event=>setQuery(event.target.value)}/></div>
      <select aria-label="Görev proje filtresi" value={projectFilter ?? ''} onChange={event=>setProject(event.target.value)}>
        <option value="">Tüm projeler</option>
        {projects.map(project=><option key={project.id} value={project.id}>{project.code} · {project.title}</option>)}
      </select>
      <div className="task-quick-filters">
        {([
          ['all','Tümü'],
          ['mine','Bana Atanan'],
          ['overdue','Geciken'],
          ['week','Bu Hafta']
        ] as Array<[QuickFilter,string]>).map(([key,label])=><button key={key} className={quickFilter===key?'active':''} onClick={()=>setQuickFilter(key)}>{label}</button>)}
      </div>
      <div className="task-view-toggle">
        <button className={view==='kanban'?'active':''} onClick={()=>setView('kanban')} title="Kanban"><Columns3 size={15}/></button>
        <button className={view==='list'?'active':''} onClick={()=>setView('list')} title="Liste"><List size={15}/></button>
      </div>
    </div>}

    {loading && <div className="panel empty-state">Görevler yükleniyor...</div>}
    {error && !loading && (previewApiUnavailable
      ? <section className="panel corporate-task-preview-note" role="status">
          <div className="corporate-task-preview-symbol"><ClipboardList size={24} aria-hidden="true" /></div>
          <div><span className="corporate-task-preview-label">SALT OKUNUR ÖNİZLEME</span><h2>Görev kayıtları bu ortamda görüntülenemiyor</h2><p>İzole P1-D önizlemesinde Görev Takibi API erişimi kapalıdır. Bu, görev sayısının sıfır olduğu anlamına gelmez. Gerçek kayıtları yetkili çalışma ortamında inceleyebilirsiniz.</p></div>
        </section>
      : <div className="panel task-error-state" role="alert"><span>{error}</span><button className="secondary-button" onClick={()=>void load()}><RotateCcw size={14}/> Tekrar Dene</button></div>)}

    {!loading && !error && tasks.length === 0 && <section className="panel corporate-task-empty"><ClipboardList size={27} aria-hidden="true" /><h2>Henüz görev kaydı bulunmuyor</h2><p>{canCreate ? 'Bu çalışma alanında ilk görev oluşturulduğunda iş akışı burada görünecek.' : 'Size görev atandığında, sorumluluklarınız ve teslim tarihleri burada listelenecek.'}</p>{canCreate && <button className="primary-button" onClick={openNew}><Plus size={15}/> İlk görevi oluştur</button>}</section>}

    {!loading && !error && tasks.length > 0 && view === 'kanban' && <div className="task-kanban">
      {statusColumns.map(column=>{
        const columnTasks=visibleTasks.filter(task=>workflowColumn(task.status)===column.status);
        return <section key={column.status} className="task-kanban-column">
          <header><strong>{column.label}</strong><span>{columnTasks.length}</span></header>
          <div className="task-kanban-stack">
            {columnTasks.map(task=><TaskCard key={task.id} task={task} onEdit={openEdit} onAdvance={advance}
              currentUserId={currentUser.id} canWrite={currentUser.role==='YAZAR'}
              onStartProjectDraft={onStartProjectDraft} onOpenProjectQuestions={onOpenProjectQuestions}/>)}
            {columnTasks.length===0&&<div className="task-column-empty">Görev yok</div>}
          </div>
        </section>;
      })}
    </div>}

    {!loading && !error && tasks.length > 0 && view === 'list' && <div className="panel table-panel task-list-panel">
      <div className="table-wrap"><table><thead><tr><th>GÖREV</th><th>PROJE</th><th>SORUMLU</th><th>ÖNCELİK</th><th>TERMİN</th><th>DURUM</th><th>İŞLEM</th></tr></thead><tbody>
        {visibleTasks.map(task=><tr key={task.id} className={task.isOverdue?'task-overdue-row':''}>
          <td><strong>{task.title}</strong>{task.targetQuestionCount > 0 && <small className="task-table-note">Hedef {task.targetQuestionCount} · Yazılan {task.production?.written ?? 0} · Onay {task.production?.approved ?? 0}</small>}{task.description&&<small className="task-table-note">{task.description}</small>}</td>
          <td>{task.project.code}<small className="task-table-note">{task.project.title}</small></td>
          <td>{assigneeName(task)}</td>
          <td><span className={`task-priority priority-${task.priority.toLowerCase()}`}>{trPriority(task.priority)}</span></td>
          <td>{shortDate(task.dueDate)}{task.isOverdue&&<small className="task-overdue-text">Gecikti</small>}</td>
          <td><span className={`task-status task-status-${task.status.toLowerCase()}`}>{trStatus(task.status)}</span></td>
          <td><div className="row-actions">
            {currentUser.role==='YAZAR' && task.assignedAuthor?.id===currentUser.id &&
              <button type="button" className="task-write-question" onClick={()=>onStartProjectDraft(task.id,task.project.id)}>
                <Plus size={14}/> Soru yaz
              </button>}
            <button type="button" title="Proje sorularını aç" onClick={()=>onOpenProjectQuestions(task.project.id)}><BookOpen size={14}/> Sorular</button>{task.canManage&&<button title="Düzenle" onClick={()=>openEdit(task)}><PencilLine size={14}/></button>}{task.canUpdateStatus&&task.status!=='Tamamlandi'&&!(task.status==='Kontrol_Bekliyor'&&!task.canManage)&&<button onClick={()=>void advance(task)}>İlerle <ChevronRight size={13}/></button>}</div></td>
        </tr>)}
      </tbody></table>{visibleTasks.length===0&&<div className="empty-state">Bu filtreye uygun görev bulunamadı.</div>}</div>
    </div>}

    {showForm && <TaskForm
      task={editingTask}
      currentUser={currentUser}
      projects={projects}
      authors={authors}
      managedUsers={managedUsers}
      existingTasks={tasks}
      defaultProjectId={projectFilter}
      onClose={()=>{setShowForm(false);setEditingTask(null)}}
      onSaved={async()=>{setShowForm(false);setEditingTask(null);await Promise.all([load(),onProductionUpdated()])}}
    />}
  </>;
}

function TaskCard({ task, onEdit, onAdvance, onOpenProjectQuestions, currentUserId, canWrite, onStartProjectDraft }: {
  task: ApiTask; onEdit: (task: ApiTask)=>void; onAdvance: (task: ApiTask)=>void;
  onOpenProjectQuestions: (projectId: number, status?: string)=>void;
  currentUserId: number; canWrite: boolean; onStartProjectDraft: (taskId: number, projectId: number)=>void;
}) {
  return <article className={`task-card ${task.isOverdue?'overdue':''}`}>
    <div className="task-card-top"><span className={`task-priority priority-${task.priority.toLowerCase()}`}>{trPriority(task.priority)}</span>{task.isOverdue&&<span className="task-overdue-badge"><AlertTriangle size={12}/> Gecikti</span>}</div>
    <h3>{task.title}</h3>
    <p>{task.project.code} · {task.project.title}</p>
    {task.targetQuestionCount > 0 && <div className="task-production-chip">
      <strong>{task.production?.approved ?? 0} / {task.targetQuestionCount}</strong> onaylı soru
      <small>Yazılan {task.production?.written ?? 0} · İncelemede {task.production?.submitted ?? 0} · Revizyon {task.production?.revision ?? 0}</small>
    </div>}
    <div className="task-card-meta"><span><UserRound size={13}/>{assigneeName(task)}</span><span><CalendarDays size={13}/>{shortDate(task.dueDate)}</span></div>
    <div className="task-card-actions">
      {canWrite && task.assignedAuthor?.id===currentUserId && <button type="button" className="task-write-question" onClick={()=>onStartProjectDraft(task.id,task.project.id)}>
        <Plus size={13}/> Soru taslağı oluştur
      </button>}
      <button type="button" onClick={()=>onOpenProjectQuestions(task.project.id)}><BookOpen size={13}/> Proje soruları</button>
      {task.canManage&&<button onClick={()=>onEdit(task)}><PencilLine size={13}/> Düzenle</button>}
      {task.canUpdateStatus&&task.status!=='Tamamlandi'&&!(task.status==='Kontrol_Bekliyor'&&!task.canManage)&&<button className="advance" onClick={()=>onAdvance(task)}>İlerle <ChevronRight size={13}/></button>}
    </div>
  </article>;
}

function TaskForm({
  task,
  currentUser,
  projects,
  authors,
  managedUsers,
  existingTasks,
  defaultProjectId,
  onClose,
  onSaved
}: {
  task: ApiTask | null;
  currentUser: AuthUser;
  projects: ApiProject[];
  authors: ApiAuthor[];
  managedUsers: ManagedUser[];
  existingTasks: ApiTask[];
  defaultProjectId: number | null;
  onClose: ()=>void;
  onSaved: ()=>Promise<void>;
}) {
  const editing=Boolean(task);
  const isBranchCoordinator=currentUser.role==='BRANS_KOORDINATORU';
  const manageableProjects=projects.filter(project=>project.canManage!==false);
  const initialProjectId=task?.project.id ?? defaultProjectId ?? manageableProjects[0]?.id ?? 0;
  const initialAssigneeType=task?.assignedUser ? 'user' : 'author';
  const [title,setTitle]=useState(task?.title??'');
  const [description,setDescription]=useState(task?.description??'');
  const [projectId,setProjectId]=useState(initialProjectId);
  const [priority,setPriority]=useState<TaskPriority>(task?.priority??'Normal');
  const [targetQuestionCount,setTargetQuestionCount]=useState<number>(task?.targetQuestionCount ?? 0);
  const [startDate,setStartDate]=useState(inputDate(task?.startDate) || new Date().toISOString().slice(0,10));
  const [dueDate,setDueDate]=useState(inputDate(task?.dueDate));
  const [status,setStatus]=useState<Exclude<TaskStatus,'Gecikti'>>(task?.status==='Gecikti'?'Devam_Ediyor':task?.status??'Bekliyor');
  const [assigneeType,setAssigneeType]=useState<'author'|'user'>(initialAssigneeType);
  const [assigneeId,setAssigneeId]=useState<number>(
    task?.assignedAuthor?.authorProfileId ?? task?.assignedUser?.id ?? 0
  );
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const selectedProject=projects.find(project=>project.id===projectId)??null;
  const projectAuthorIds=new Set(selectedProject?.authors.map(author=>author.authorProfileId)??[]);
  const eligibleAuthors=authors.filter(author=>projectAuthorIds.has(author.id)&&author.status==='Aktif');
  // Counts are derived only from tasks already returned by the scoped task API.
  const authorOpenTasks=new Map<number,number>();
  for(const row of existingTasks){
    if(row.project.id!==projectId || row.status==='Tamamlandi' || !row.assignedAuthor) continue;
    const authorId=row.assignedAuthor.authorProfileId;
    authorOpenTasks.set(authorId,(authorOpenTasks.get(authorId)??0)+1);
  }
  const selectedWriter=eligibleAuthors.find(author=>author.id===assigneeId);
  const assignedCount=selectedProject?.authors.length??0;

  const currentAsManaged: ManagedUser = {
    id: currentUser.id,
    email: currentUser.email,
    fullName: currentUser.fullName,
    status: 'Aktif',
    role: currentUser.role,
    assignedRegion: currentUser.assignedRegion,
    province: currentUser.province ?? null,
    branchIds: [],
    authorProfile: null
  };
  const userMap=new Map<number,ManagedUser>();
  [currentAsManaged,...managedUsers].forEach(user=>{
    if (['GENEL_KOORDINATOR','BOLGE_KOORDINATORU','BRANS_KOORDINATORU','EDITOR'].includes(user.role)&&user.status==='Aktif') userMap.set(user.id,user);
  });
  const eligibleUsers=[...userMap.values()].sort((a,b)=>a.fullName.localeCompare(b.fullName,'tr-TR'));

  const changeProject=(value:string)=>{
    const next=Number(value);
    setProjectId(next);
    setAssigneeId(0);
  };

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);
    setError('');
    try{
      const common={
        title:title.trim(),
        description:description.trim()||null,
        priority,
        startDate,
        dueDate,
        targetQuestionCount: assigneeType === 'author' ? targetQuestionCount : 0,
        assignedAuthorProfileId:assigneeType==='author'?assigneeId:null,
        assignedUserId:assigneeType==='user'?assigneeId:null
      };
      if(task){
        await updateTask(task.id,{...common,status});
      }else{
        await createTask({...common,projectId});
      }
      await onSaved();
    }catch(err){
      setError(err instanceof Error?err.message:'Görev kaydedilemedi.');
    }finally{
      setBusy(false);
    }
  };

  const remove=async()=>{
    if(!task||!window.confirm('Bu bekleyen görevi kalıcı olarak silmek istediğinize emin misiniz?')) return;
    setBusy(true);setError('');
    try{await deleteTask(task.id);await onSaved();}
    catch(err){setError(err instanceof Error?err.message:'Görev silinemedi.');setBusy(false);}
  };

  return <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose()}}>
    <form className="task-form-modal" onSubmit={submit}>
      <div className="modal-head"><div><span className="panel-kicker">{editing?'GÖREV YÖNETİMİ':'YENİ GÖREV'}</span><h2>{editing?'Görevi düzenle':'Yeni görev oluştur'}</h2></div><button type="button" aria-label="Kapat" onClick={onClose} disabled={busy}><X size={20}/></button></div>
      <p className="task-form-intro">Görevi bir projeye bağlayın, sorumluyu ve termin tarihini belirleyin.</p>
      {isBranchCoordinator&&<div className="task-assignment-scope" role="note">
        Branş Koordinatörü olarak yalnız sorumlu olduğunuz branşların projelerine ve projeye atanmış yazarlara görev verebilirsiniz.
      </div>}
      {error&&<div className="project-management-error">{error}</div>}
      <div className="task-form-grid">
        <label className="task-span-two"><span>Görev başlığı</span><input required minLength={3} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="1. ünite için 30 soru hazırla"/></label>
        <label className="task-span-two"><span>Proje</span><select required value={projectId||''} disabled={editing} onChange={e=>changeProject(e.target.value)}><option value="">Proje seçin</option>{manageableProjects.filter(project=>!['Tamamlandi','Arsiv'].includes(project.status)||project.id===task?.project.id).map(project=><option key={project.id} value={project.id}>{project.code} · {project.title} · {project.branch.name}</option>)}</select></label>
        {selectedProject&&<div className="task-assignment-context task-span-two">
          <BookOpen size={17} aria-hidden="true"/>
          <span><strong>{selectedProject.branch.name} · {selectedProject.targetGrade}</strong>
            <small>{assignedCount} atanmış yazar · {eligibleAuthors.length} aktif görev adayı</small>
          </span>
        </div>}
        <label><span>Öncelik</span><select value={priority} onChange={e=>setPriority(e.target.value as TaskPriority)}>{priorities.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        {editing&&<label><span>Durum</span><select value={status} onChange={e=>setStatus(e.target.value as Exclude<TaskStatus,'Gecikti'>)}>{statusColumns.map(item=><option key={item.status} value={item.status}>{item.label}</option>)}</select></label>}
        <label><span>Başlangıç</span><input required type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label>
        <label><span>Son teslim</span><input required type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
        {assigneeType==='author'&&<label><span>Hedef soru adedi</span>
          <input type="number" min={0} max={10000} step={1} value={targetQuestionCount}
            onChange={e=>setTargetQuestionCount(Number(e.target.value))}/>
          <small className="field-help">0 = eski görev. Pozitif hedef = otomatik üretim takibi.</small>
        </label>}
        <div className="task-span-two task-assignee-type"><button type="button" className={assigneeType==='author'?'active':''} onClick={()=>{setAssigneeType('author');setAssigneeId(0)}}>Projeye atanmış yazar</button><button type="button" className={assigneeType==='user'?'active':''} onClick={()=>{setAssigneeType('user');setAssigneeId(0)}}>{isBranchCoordinator?'Kendime görev':'Koordinatör / Editör'}</button></div>
        <label className="task-span-two"><span>Sorumlu</span><select required value={assigneeId||''} onChange={e=>setAssigneeId(Number(e.target.value))}><option value="">Sorumlu seçin</option>{assigneeType==='author'
          ?eligibleAuthors.map(author=><option key={author.id} value={author.id}>{author.fullName} · {author.province.name} · {authorOpenTasks.get(author.id)??0} açık görev</option>)
          :(isBranchCoordinator?[currentAsManaged]:eligibleUsers).map(user=><option key={user.id} value={user.id}>{user.fullName} · {roleLabels[user.role]}</option>)}</select><small className="field-help">{assigneeType==='author'
          ?'Yalnız seçili projeye atanmış aktif yazarlar gösterilir. Açık görev sayıları bu proje içindir.'
          :isBranchCoordinator?'Kendinize koordinasyon görevi tanımlayabilirsiniz.':'Yetki kapsamınızdaki koordinatör ve editörler gösterilir.'}</small></label>
        {assigneeType==='author'&&selectedWriter&&<div className="task-assignment-writer task-span-two">
          <Users size={16}/><span><strong>{selectedWriter.fullName}</strong> · {authorOpenTasks.get(selectedWriter.id)??0} açık görev · {selectedWriter.activeProjectCount} aktif proje</span>
        </div>}
        {assigneeType==='author'&&!eligibleAuthors.length&&<p className="task-assignment-empty task-span-two">
          Bu proje için aktif yazar bulunmuyor. Önce Projeler bölümünden yazar atayın.
        </p>}
        <label className="task-span-two"><span>Açıklama</span><textarea maxLength={1500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Beklenen çıktı, kontrol ölçütü veya çalışma notu..."/></label>
      </div>
      <div className="project-management-footer">
        <div>{task?.status==='Bekliyor'&&<button type="button" className="danger-button" onClick={remove} disabled={busy}><Trash2 size={14}/> Sil</button>}</div>
        <div className="project-save-actions"><button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Vazgeç</button><button className="primary-button" type="submit" disabled={busy||!projectId||!assigneeId||!dueDate}><Save size={15}/>{busy?'Kaydediliyor...':editing?'Kaydet':'Görevi Oluştur'}</button></div>
      </div>
    </form>
  </div>;
}
