import { useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  FileQuestion,
  Printer,
  Users,
  Wallet
} from 'lucide-react';
import type { ApiProject } from '../projects/types';
import type { ApiQuestion } from '../questions/types';
import type { ApiTask } from '../tasks/types';
import type { ApiAuthor } from '../authors/types';
import type { ApiPayment } from '../payments/types';
import type { Role } from '../demo/model';
import { roleLabels } from '../demo/model';
import { toKurus } from '../payments/money';
import './reports.css';

type FilterValue = 'all' | string;

type ReportsCenterProps = {
  projects: ApiProject[];
  questions: ApiQuestion[];
  tasks: ApiTask[];
  authors: ApiAuthor[];
  payments: ApiPayment[];
  role: Role;
  tasksLoading: boolean;
  tasksError: string;
  authorsError: string;
};

const money = (kurus: number) =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(kurus / 100);

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(value.includes('T') ? value : `${value}T12:00:00`));

const questionStatusMeta = [
  { key: 'TASLAK', label: 'Taslak' },
  { key: 'INCELEMEDE', label: 'İncelemede' },
  { key: 'REVIZYON', label: 'Revizyon' },
  { key: 'ONAYLANDI', label: 'Onaylandı' },
  { key: 'REDDEDILDI', label: 'Reddedildi' }
] as const;

const taskStatusMeta = [
  { key: 'Bekliyor', label: 'Bekleyen' },
  { key: 'Devam_Ediyor', label: 'Devam Eden' },
  { key: 'Kontrol_Bekliyor', label: 'İnceleme Bekleyen' },
  { key: 'Tamamlandi', label: 'Tamamlanan' },
  { key: 'Gecikti', label: 'Geciken' }
] as const;

function csvCell(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

export function ReportsCenter({
  projects,
  questions,
  tasks,
  authors,
  payments,
  role,
  tasksLoading,
  tasksError,
  authorsError
}: ReportsCenterProps) {
  const [projectFilter, setProjectFilter] = useState<FilterValue>('all');
  const [branchFilter, setBranchFilter] = useState<FilterValue>('all');
  const [gradeFilter, setGradeFilter] = useState<FilterValue>('all');

  const canSeeContent = role !== 'MUHASEBE';
  const canSeeTasks = role !== 'MUHASEBE';
  const canSeeAuthors = ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'].includes(role);
  const canSeeFinance = ['GENEL_KOORDINATOR', 'MUHASEBE'].includes(role);

  const branches = useMemo(
    () => [...new Set(projects.map(project => project.branch.name))].sort((a, b) => a.localeCompare(b, 'tr-TR')),
    [projects]
  );

  const grades = useMemo(
    () => [...new Set(projects.map(project => project.targetGrade))].sort((a, b) => a.localeCompare(b, 'tr-TR', { numeric: true })),
    [projects]
  );

  const filteredProjects = useMemo(() => projects.filter(project => {
    if (projectFilter !== 'all' && String(project.id) !== projectFilter) return false;
    if (branchFilter !== 'all' && project.branch.name !== branchFilter) return false;
    if (gradeFilter !== 'all' && project.targetGrade !== gradeFilter) return false;
    return true;
  }), [projects, projectFilter, branchFilter, gradeFilter]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(project => project.id)), [filteredProjects]);
  const hasProjectScopedFilter = projectFilter !== 'all' || branchFilter !== 'all' || gradeFilter !== 'all';

  const filteredQuestions = useMemo(() => questions.filter(question => {
    if (!canSeeContent) return false;
    if (projectFilter !== 'all' && question.projectId !== Number(projectFilter)) return false;
    if (gradeFilter !== 'all' && question.grade !== gradeFilter) return false;
    if (branchFilter !== 'all') {
      const linkedProject = question.projectId ? projects.find(project => project.id === question.projectId) : null;
      const branchName = linkedProject?.branch.name || question.author?.branchName || '';
      if (branchName !== branchFilter) return false;
    }
    return true;
  }), [questions, projects, projectFilter, branchFilter, gradeFilter, canSeeContent]);

  const filteredTasks = useMemo(() => tasks.filter(task => {
    if (!canSeeTasks) return false;
    if (projectFilter !== 'all' && task.project.id !== Number(projectFilter)) return false;
    if (branchFilter !== 'all' && task.project.branch.name !== branchFilter) return false;
    if (gradeFilter !== 'all' && task.project.targetGrade !== gradeFilter) return false;
    return true;
  }), [tasks, projectFilter, branchFilter, gradeFilter, canSeeTasks]);

  const selectedProjectAuthorIds = useMemo(() => {
    if (projectFilter === 'all') return null;
    const project = projects.find(item => item.id === Number(projectFilter));
    return new Set(project?.authors.map(author => author.authorProfileId) || []);
  }, [projects, projectFilter]);

  const filteredAuthors = useMemo(() => authors.filter(author => {
    if (!canSeeAuthors) return false;
    if (selectedProjectAuthorIds && !selectedProjectAuthorIds.has(author.id)) return false;
    if (branchFilter !== 'all' && author.branch.name !== branchFilter) return false;
    if (gradeFilter !== 'all' && !author.projectGrades.includes(gradeFilter)) return false;
    return true;
  }), [authors, canSeeAuthors, selectedProjectAuthorIds, branchFilter, gradeFilter]);

  const filteredPayments = useMemo(() => payments.filter(payment => {
    if (!canSeeFinance) return false;
    if (!hasProjectScopedFilter) return true;
    return payment.project?.id ? filteredProjectIds.has(payment.project.id) : false;
  }), [payments, canSeeFinance, hasProjectScopedFilter, filteredProjectIds]);

  const activeProjects = filteredProjects.filter(project => !['Tamamlandi', 'Arsiv'].includes(project.status));
  const averageProgress = filteredProjects.length
    ? Math.round(filteredProjects.reduce((sum, project) => sum + project.progress, 0) / filteredProjects.length)
    : 0;
  const completedTasks = filteredTasks.filter(task => task.status === 'Tamamlandi').length;
  const completedTaskRate = filteredTasks.length ? Math.round((completedTasks / filteredTasks.length) * 100) : 0;

  const projectRows = useMemo(() => filteredProjects.map(project => {
    const projectQuestions = filteredQuestions.filter(question => question.projectId === project.id);
    const projectTasks = filteredTasks.filter(task => task.project.id === project.id);
    const overdue = projectTasks.filter(task => task.status !== 'Tamamlandi' && (task.isOverdue || task.status === 'Gecikti')).length;
    return {
      ...project,
      questionCount: projectQuestions.length,
      approvedQuestionCount: projectQuestions.filter(question => question.status === 'ONAYLANDI').length,
      taskCountActual: projectTasks.length,
      overdueTaskCount: overdue
    };
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()), [filteredProjects, filteredQuestions, filteredTasks]);

  const authorBranchRows = useMemo(() => {
    const counts = new Map<string, number>();
    filteredAuthors.forEach(author => counts.set(author.branch.name, (counts.get(author.branch.name) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredAuthors]);

  const authorProvinceRows = useMemo(() => {
    const counts = new Map<string, number>();
    filteredAuthors.forEach(author => counts.set(author.province.name, (counts.get(author.province.name) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filteredAuthors]);

  const financeTotals = useMemo(() => ({
    pending: filteredPayments.filter(payment => payment.status === 'Bekliyor').reduce((sum, payment) => sum + toKurus(payment.amount), 0),
    approved: filteredPayments.filter(payment => payment.status === 'Onaylandi').reduce((sum, payment) => sum + toKurus(payment.amount), 0),
    paid: filteredPayments.filter(payment => payment.status === 'Odendi').reduce((sum, payment) => sum + toKurus(payment.amount), 0)
  }), [filteredPayments]);

  const exportCsv = () => {
    const header = ['Proje Kodu', 'Proje', 'Branş', 'Kademe/Sınıf', 'İlerleme %', 'Yazar', 'Soru', 'Onaylı Soru', 'Görev', 'Geciken Görev', 'Son Teslim', 'Durum'];
    const rows = projectRows.map(project => [
      project.code,
      project.title,
      project.branch.name,
      project.targetGrade,
      project.progress,
      project.authors.length,
      project.questionCount,
      project.approvedQuestionCount,
      project.taskCountActual,
      project.overdueTaskCount,
      shortDate(project.deadline),
      project.status
    ]);
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `prolig-rapor-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setProjectFilter('all');
    setBranchFilter('all');
    setGradeFilter('all');
  };

  return (
    <div className="reports-center">
      <div className="page-heading reports-heading">
        <div>
          <div className="eyebrow">YÖNETİMSEL ANALİZ</div>
          <h1>Raporlar</h1>
          <p>Üretim, proje, görev, ekip ve yetkili olduğunuz finans verilerini tek merkezde inceleyin.</p>
        </div>
        <span className="heading-chip"><BarChart3 size={16}/> {roleLabels[role]} kapsamı</span>
      </div>

      <section className="panel reports-filter-panel">
        <div className="reports-filter-grid">
          <label>Proje
            <select value={projectFilter} onChange={event => setProjectFilter(event.target.value)}>
              <option value="all">Tüm projeler</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.code} · {project.title}</option>)}
            </select>
          </label>
          <label>Branş
            <select value={branchFilter} onChange={event => setBranchFilter(event.target.value)}>
              <option value="all">Tüm branşlar</option>
              {branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
            </select>
          </label>
          <label>Kademe / Sınıf
            <select value={gradeFilter} onChange={event => setGradeFilter(event.target.value)}>
              <option value="all">Tüm kademeler</option>
              {grades.map(grade => <option key={grade} value={grade}>{grade}</option>)}
            </select>
          </label>
          <div className="reports-filter-actions">
            <button className="secondary-button" onClick={resetFilters}>Filtreleri Temizle</button>
            <button className="secondary-button" onClick={exportCsv}><Download size={15}/> CSV</button>
            <button className="primary-button" onClick={() => window.print()}><Printer size={15}/> Yazdır / PDF</button>
          </div>
        </div>
      </section>

      <div className="reports-kpi-grid">
        <article className="panel report-kpi"><span className="report-kpi-icon teal"><BookOpen size={18}/></span><div><small>AKTİF PROJE</small><strong>{activeProjects.length}</strong><span>{filteredProjects.length} proje kapsamda</span></div></article>
        {canSeeAuthors && <article className="panel report-kpi"><span className="report-kpi-icon blue"><Users size={18}/></span><div><small>YAZAR</small><strong>{authorsError ? '—' : filteredAuthors.length}</strong><span>{authorsError ? 'Yazar verisi erişilemedi' : 'yetki kapsamındaki yazar'}</span></div></article>}
        {canSeeContent && <article className="panel report-kpi"><span className="report-kpi-icon purple"><FileQuestion size={18}/></span><div><small>SORU ÜRETİMİ</small><strong>{filteredQuestions.length}</strong><span>{filteredQuestions.filter(question => question.status === 'ONAYLANDI').length} onaylandı</span></div></article>}
        {canSeeTasks && <article className="panel report-kpi"><span className="report-kpi-icon amber"><ClipboardList size={18}/></span><div><small>TAMAMLANAN GÖREV</small><strong>{tasksLoading ? '…' : completedTasks}</strong><span>{tasksError ? 'Görev verisi erişilemedi' : `%${completedTaskRate} tamamlanma`}</span></div></article>}
        <article className="panel report-kpi"><span className="report-kpi-icon green"><CheckCircle2 size={18}/></span><div><small>GENEL İLERLEME</small><strong>%{averageProgress}</strong><span>proje ilerleme ortalaması</span></div></article>
      </div>

      <div className="reports-main-grid">
        {canSeeContent && <section className="panel report-chart-card">
          <div className="panel-head"><div><span className="panel-kicker">İÇERİK ÜRETİMİ</span><h2>Soru durumları</h2></div><span>{filteredQuestions.length} soru</span></div>
          <div className="report-bars">
            {questionStatusMeta.map(item => {
              const count = filteredQuestions.filter(question => question.status === item.key).length;
              const pct = filteredQuestions.length ? Math.round((count / filteredQuestions.length) * 100) : 0;
              return <div className="report-bar-row" key={item.key}><span>{item.label}</span><i><b style={{width: `${pct}%`}} /></i><strong>{count}</strong><small>%{pct}</small></div>;
            })}
          </div>
        </section>}

        {canSeeTasks && <section className="panel report-chart-card">
          <div className="panel-head"><div><span className="panel-kicker">GÖREV PERFORMANSI</span><h2>Görev durumları</h2></div><span>{tasksLoading ? 'Yükleniyor' : `${filteredTasks.length} görev`}</span></div>
          {tasksError ? <div className="reports-inline-error">{tasksError}</div> : <div className="report-bars task-report-bars">
            {taskStatusMeta.map(item => {
              const count = item.key === 'Gecikti'
                ? filteredTasks.filter(task => task.status !== 'Tamamlandi' && (task.status === 'Gecikti' || task.isOverdue)).length
                : filteredTasks.filter(task => task.status === item.key && !(item.key !== 'Tamamlandi' && task.isOverdue)).length;
              const pct = filteredTasks.length ? Math.round((count / filteredTasks.length) * 100) : 0;
              return <div className="report-bar-row" key={item.key}><span>{item.label}</span><i><b style={{width: `${pct}%`}} /></i><strong>{count}</strong><small>%{pct}</small></div>;
            })}
          </div>}
        </section>}
      </div>

      <section className="panel reports-project-panel">
        <div className="panel-head"><div><span className="panel-kicker">PROJE PERFORMANSI</span><h2>Proje bazlı ilerleme</h2></div><span>{projectRows.length} proje</span></div>
        <div className="reports-project-list">
          {projectRows.map(project => {
            const deadlineMs = new Date(project.deadline).getTime();
            const daysLeft = Math.ceil((deadlineMs - Date.now()) / 86400000);
            const late = daysLeft < 0 && project.status !== 'Tamamlandi';
            return <article key={project.id} className="report-project-row">
              <div className="report-project-main">
                <span className="report-project-code">{project.code}</span>
                <div><strong>{project.title}</strong><small>{project.branch.name} · {project.targetGrade}</small></div>
              </div>
              <div className="report-project-progress"><span><b style={{width: `${project.progress}%`}} /></span><strong>%{project.progress}</strong></div>
              <div className="report-project-metrics"><span><strong>{project.authors.length}</strong><small>Yazar</small></span><span><strong>{project.questionCount}</strong><small>Soru</small></span><span><strong>{project.taskCountActual}</strong><small>Görev</small></span></div>
              <div className={`report-project-deadline ${late ? 'late' : ''}`}><strong>{shortDate(project.deadline)}</strong><small>{project.status === 'Tamamlandi' ? 'Tamamlandı' : late ? `${Math.abs(daysLeft)} gün gecikti` : `${daysLeft} gün kaldı`}</small></div>
            </article>;
          })}
          {!projectRows.length && <div className="reports-empty">Bu filtrelere uygun proje bulunamadı.</div>}
        </div>
      </section>

      <div className="reports-bottom-grid">
        {canSeeAuthors && <section className="panel reports-network-card">
          <div className="panel-head"><div><span className="panel-kicker">YAZAR AĞI</span><h2>Dağılım özeti</h2></div><span>{authorsError ? 'Veri yok' : `${filteredAuthors.length} yazar`}</span></div>
          {authorsError ? <div className="reports-inline-error">{authorsError}</div> : <div className="reports-network-columns">
            <div><strong>Branşlar</strong>{authorBranchRows.map(([name, count]) => <div key={name}><span>{name}</span><b>{count}</b></div>)}</div>
            <div><strong>İller</strong>{authorProvinceRows.map(([name, count]) => <div key={name}><span>{name}</span><b>{count}</b></div>)}</div>
          </div>}
        </section>}

        {canSeeFinance && <section className="panel reports-finance-card">
          <div className="panel-head"><div><span className="panel-kicker">TELİF VE ÖDEMELER</span><h2>Finans özeti</h2></div><Wallet size={18}/></div>
          <div className="reports-finance-metrics">
            <div><span>Onay bekleyen</span><strong>{money(financeTotals.pending)}</strong></div>
            <div><span>Ödeme sırasında</span><strong>{money(financeTotals.approved)}</strong></div>
            <div><span>Ödenen</span><strong>{money(financeTotals.paid)}</strong></div>
            <div className="total"><span>Toplam</span><strong>{money(financeTotals.pending + financeTotals.approved + financeTotals.paid)}</strong></div>
          </div>
        </section>}
      </div>
    </div>
  );
}
