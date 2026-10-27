import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, FileQuestion, Users } from 'lucide-react';
import type { ApiAuthor } from '../authors/types';
import type { ApiProject } from '../projects/types';
import type { ApiQuestion } from '../questions/types';
import type { ApiTask } from '../tasks/types';
import { fetchTasks } from '../tasks/api';
import type { Role } from '../demo/model';
import { overdueProjects } from './coordinator-analytics';
import './coordinator-workboard.css';

type CoordinatorRole = Extract<Role, 'GENEL_KOORDINATOR' | 'BRANS_KOORDINATORU'>;
type Branch = { id: number; name: string };

type Props = {
  role: CoordinatorRole;
  assignedBranches: Branch[];
  projects: ApiProject[];
  projectsLoading: boolean;
  projectsError: string;
  questions: ApiQuestion[];
  questionsLoading: boolean;
  questionsError: string;
  authors: ApiAuthor[];
  authorsLoading: boolean;
  authorsError: string;
  onProjects: () => void;
  onOpenProject: (id: number) => void;
  onQuestionsForProject: (id: number) => void;
  onTasksForProject: (id: number) => void;
  onTasks: () => void;
  onReviewQuestions: () => void;
  onAuthors: () => void;
  onReports: () => void;
};

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

/**
 * A read-only navigation workboard over existing scoped APIs, never demo/localStorage data.
 * Server-side authorization remains authoritative; the additional branch filter is UX-only.
 */
export function CoordinatorWorkboard({
  role, assignedBranches, projects, projectsLoading, projectsError,
  questions, questionsLoading, questionsError, authors, authorsLoading, authorsError,
  onProjects, onOpenProject, onQuestionsForProject, onTasksForProject,
  onTasks, onReviewQuestions, onAuthors, onReports
}: Props) {
  const isGeneral = role === 'GENEL_KOORDINATOR';
  const branchKey = assignedBranches.map(branch => branch.id).sort((a, b) => a - b).join(',');
  const branchIds = useMemo(
    () => new Set(assignedBranches.map(branch => branch.id)),
    [branchKey]
  );
  const branchNames = useMemo(
    () => new Set(assignedBranches.map(branch => branch.name)),
    [branchKey]
  );
  const hasScope = isGeneral || branchIds.size > 0;
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!hasScope) {
      setTasks([]);
      setTasksLoading(false);
      setTasksError('');
      return () => { mounted = false; };
    }
    setTasksLoading(true);
    setTasksError('');
    void fetchTasks().then(rows => {
      if (mounted) setTasks(rows);
    }).catch(error => {
      if (mounted) {
        setTasks([]);
        setTasksError(error instanceof Error ? error.message : 'Görev özeti alınamadı.');
      }
    }).finally(() => {
      if (mounted) setTasksLoading(false);
    });
    return () => { mounted = false; };
  }, [hasScope, role, branchKey]);

  const scopedProjects = useMemo(
    () => isGeneral ? projects : projects.filter(project => branchIds.has(project.branch.id)),
    [projects, isGeneral, branchIds]
  );
  const scopedProjectIds = useMemo(
    () => new Set(scopedProjects.map(project => project.id)),
    [scopedProjects]
  );
  const scopedQuestions = useMemo(
    () => isGeneral ? questions : questions.filter(question =>
      question.projectId !== null
        ? scopedProjectIds.has(question.projectId)
        : branchNames.has(question.author?.branchName ?? '')
    ),
    [questions, isGeneral, scopedProjectIds, branchNames]
  );
  const scopedAuthors = useMemo(
    () => isGeneral ? authors : authors.filter(author => branchIds.has(author.branch.id)),
    [authors, isGeneral, branchIds]
  );
  const scopedTasks = useMemo(
    () => isGeneral ? tasks : tasks.filter(task => branchIds.has(task.project.branch.id)),
    [tasks, isGeneral, branchIds]
  );

  const overdue = useMemo(() => overdueProjects(scopedProjects), [scopedProjects]);
  const activeProjects = scopedProjects.filter(project => !['Tamamlandi', 'Arsiv'].includes(project.status));
  const waitingQuestions = scopedQuestions.filter(question => !question.isArchived && question.status === 'INCELEMEDE');
  const openTasks = scopedTasks.filter(task => task.status !== 'Tamamlandi');
  const lateTasks = openTasks.filter(task => task.isOverdue);
  const highlightedProjects = activeProjects.slice().sort((a, b) =>
    a.deadline.localeCompare(b.deadline) || a.id - b.id
  ).slice(0, 5);
  const highlightedTasks = openTasks.slice().sort((a, b) =>
    Number(b.isOverdue) - Number(a.isOverdue) || a.dueDate.localeCompare(b.dueDate) || a.id - b.id
  ).slice(0, 5);
  const topAuthors = scopedAuthors.slice().sort((a, b) =>
    b.activeProjectCount - a.activeProjectCount || a.fullName.localeCompare(b.fullName, 'tr-TR')
  ).slice(0, 5);

  if (!hasScope) {
    return <section className="coordinator-workboard" aria-label="Branş Koordinatörü çalışma alanı">
      <div className="panel coordinator-workboard-empty">
        <BookOpen size={23} aria-hidden="true" />
        <div><h2>Branş ataması bekleniyor</h2>
          <p>Henüz yetkilendirildiğiniz bir branş bulunmuyor. Genel Koordinatör, Üye Yönetimi üzerinden branş ataması yaptığında çalışma alanınızda yalnız o branşın kayıtları gösterilecek.</p>
        </div>
      </div>
    </section>;
  }

  return <section className="coordinator-workboard" aria-label={isGeneral ? 'Genel Koordinatör üretim çalışma masası' : 'Branş Koordinatörü çalışma masası'}>
    <div className="coordinator-workboard-heading">
      <div>
        <span className="panel-kicker">{isGeneral ? 'GENEL KOORDİNATÖR · ÜRETİM ROTASI' : 'BRANŞ KOORDİNATÖRÜ · ÇALIŞMA ALANI'}</span>
        <h2>{isGeneral ? 'Projelerden görevlere tek geçiş' : 'Branş üretim masası'}</h2>
        <p>{isGeneral ? 'Yayın projelerinin iş dosyalarını, sorularını ve görevlerini aynı yerden açın.' : 'Atanmış branşlarınızın projelerini, yazarlarını ve teslim işlerini takip edin.'}</p>
      </div>
      <button className="secondary-button" type="button" onClick={onReports}>Raporlar <ArrowRight size={14} /></button>
    </div>

    {!isGeneral && <div className="coordinator-workboard-branches" aria-label="Atanan branşlar">
      <strong>Çalışma kapsamım:</strong>
      {assignedBranches.map(branch => <span key={branch.id}>{branch.name}</span>)}
    </div>}

    <div className="coordinator-workboard-metrics">
      <button type="button" onClick={onProjects}>
        <BookOpen size={17} aria-hidden="true"/><span>Aktif proje</span>
        <strong>{projectsLoading || projectsError ? '—' : activeProjects.length}</strong>
      </button>
      <button type="button" onClick={onAuthors}>
        <Users size={17} aria-hidden="true"/><span>Yazar ağı</span>
        <strong>{authorsLoading || authorsError ? '—' : scopedAuthors.length}</strong>
      </button>
      <button type="button" onClick={onReviewQuestions}>
        <FileQuestion size={17} aria-hidden="true"/><span>İncelemede soru</span>
        <strong>{questionsLoading || questionsError ? '—' : waitingQuestions.length}</strong>
      </button>
      <button type="button" onClick={onTasks}>
        <AlertTriangle size={17} aria-hidden="true"/><span>Geciken görev</span>
        <strong>{tasksLoading || tasksError ? '—' : lateTasks.length}</strong>
      </button>
    </div>

    <div className="coordinator-workboard-columns">
      <section className="panel coordinator-workboard-card">
        <div className="panel-head"><div><span className="panel-kicker">PROJE MASASI</span><h3>Öncelikli yayın projeleri</h3></div>
          <button className="text-button" type="button" onClick={onProjects}>Tüm projeler <ArrowRight size={14}/></button></div>
        {projectsLoading ? <p className="coordinator-workboard-notice">Projeler yükleniyor…</p>
          : projectsError ? <p className="coordinator-workboard-notice" role="alert">{projectsError}</p>
          : highlightedProjects.length ? <div className="coordinator-workboard-rows">
            {highlightedProjects.map(project => <div className="coordinator-workboard-row" key={project.id}>
              <div><strong>{project.title}</strong><small>{project.code} · {project.branch.name} · {project.targetGrade}</small>
                <small>{project.authors.length} yazar · {project.taskCount ?? 0} görev · Teslim {shortDate(project.deadline)}</small></div>
              <div className="coordinator-workboard-actions">
                <button type="button" onClick={() => onOpenProject(project.id)}>Proje dosyası</button>
                <button type="button" onClick={() => onQuestionsForProject(project.id)}>Sorular</button>
                <button type="button" onClick={() => onTasksForProject(project.id)}>Görevler</button>
              </div>
            </div>)}
          </div> : <p className="coordinator-workboard-notice">Kapsamınızda devam eden proje bulunmuyor.</p>}
        {!projectsLoading && !projectsError && overdue.length > 0 &&
          <p className="coordinator-workboard-footnote">{overdue.length} projede teslim tarihi geçmiş. Dosyasından ayrıntıları inceleyebilirsiniz.</p>}
      </section>

      <section className="panel coordinator-workboard-card">
        <div className="panel-head"><div><span className="panel-kicker">GÖREV MASASI</span><h3>Takip gerektiren işler</h3></div>
          <button className="text-button" type="button" onClick={onTasks}>Görev takibi <ArrowRight size={14}/></button></div>
        {tasksLoading ? <p className="coordinator-workboard-notice">Görevler yükleniyor…</p>
          : tasksError ? <p className="coordinator-workboard-notice" role="alert">{tasksError}</p>
          : highlightedTasks.length ? <div className="coordinator-workboard-rows">
            {highlightedTasks.map(task => <div key={task.id} className="coordinator-workboard-row">
              <div><strong>{task.title}</strong><small>{task.project.title} · {task.project.branch.name}</small>
                <small>{task.assignedAuthor?.fullName || task.assignedUser?.fullName || 'Atanmamış'} · Teslim {shortDate(task.dueDate)}</small></div>
              <div className="coordinator-workboard-actions">
                {task.isOverdue && <span className="coordinator-workboard-late">Gecikti</span>}
                <button type="button" onClick={() => onTasksForProject(task.project.id)}>Görevleri aç <ArrowRight size={12}/></button>
              </div>
            </div>)}
          </div> : <p className="coordinator-workboard-notice">Bekleyen görev bulunmuyor.</p>}
      </section>
    </div>

    <div className="coordinator-workboard-bottom">
      <section className="panel coordinator-workboard-card">
        <div className="panel-head"><div><span className="panel-kicker">YAZAR AĞI</span><h3>Proje kadrosu</h3></div>
          <button className="text-button" type="button" onClick={onAuthors}>Yazarları aç <ArrowRight size={14}/></button></div>
        {authorsLoading ? <p className="coordinator-workboard-notice">Yazarlar yükleniyor…</p>
          : authorsError ? <p className="coordinator-workboard-notice" role="alert">{authorsError}</p>
          : topAuthors.length ? <div className="coordinator-workboard-rows">
            {topAuthors.map(author => <div className="coordinator-workboard-author" key={author.id}>
              <span><strong>{author.fullName}</strong><small>{author.branch.name} · {author.province.name}</small></span>
              <span>{author.activeProjectCount} aktif proje</span>
            </div>)}
          </div> : <p className="coordinator-workboard-notice">Bu kapsamda yazar kaydı bulunmuyor.</p>}
      </section>
      <div className="coordinator-workboard-note"><CheckCircle2 size={15} aria-hidden="true"/>
        <span>Bu görünüm mevcut API kayıtlarını özetler. Soru onayı, kullanıcı yetkisi veya ödeme işlemi burada yapılmaz; ayrıntılar ilgili modülde açılır.</span>
      </div>
    </div>
  </section>;
}
