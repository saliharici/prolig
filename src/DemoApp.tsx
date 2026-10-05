import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Activity as ActivityIcon, ArrowRight, ArrowUpRight, BookOpen,
  Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock3,
  FileQuestion, Filter, LayoutDashboard, LockKeyhole, MapPinned, Menu, Plus, RotateCcw,
  Search, ShieldCheck, Sparkles, Users, Wallet, X,
} from 'lucide-react';
import {
  actionPermissions, dataScopes, loadDemoData, permissions, resetDemoData, roleLabels, rolePeople, saveDemoData,
  sectionLabels, type DemoData, type Question, type QuestionStatus, type Role, type Section,
} from './demo/model';
import { AuthorMap } from './demo/AuthorMap';
import './demo.css';

const sections: { id: Section; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'grades', icon: GraduationCap },
  { id: 'questions', icon: FileQuestion },
  { id: 'projects', icon: BookOpen },
  { id: 'authors', icon: MapPinned },
  { id: 'payments', icon: Wallet },
  { id: 'roles', icon: ShieldCheck },
  { id: 'audit', icon: ActivityIcon },
];
const roles = Object.keys(roleLabels) as Role[];
const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
const todayHeading = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'long' }).format(new Date()).toLocaleUpperCase('tr-TR');

function Status({ value }: { value: string }) {
  const slug = ({ 'İncelemede': 'review', 'Onaylandı': 'approved', 'Ödendi': 'paid', 'Revizyon': 'revision', 'Reddedildi': 'rejected', 'Taslak': 'draft', 'Bekliyor': 'pending', 'Aktif': 'approved', 'Davet edildi': 'pending', 'Üretimde': 'review', 'Editörde': 'revision', 'Planlama': 'draft', 'Tamamlandı': 'approved' } as Record<string, string>)[value] || 'draft';
  return <span className={`demo-status ${slug}`}><i />{value}</span>;
}

function StatCard({ label, value, note, icon: Icon, tone }: { label: string; value: string | number; note: string; icon: typeof Users; tone: string }) {
  return <div className="stat-card">
    <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={18} strokeWidth={2} /></span></div>
    <strong>{value}</strong><small>{note}</small>
  </div>;
}

function FinanceOverview({ data, onNavigate }: { data: DemoData; onNavigate: (section: Section) => void }) {
  const total = (status: 'Bekliyor' | 'Onaylandı' | 'Ödendi') => data.payments.filter(payment => payment.status === status).reduce((sum, payment) => sum + payment.amount, 0);
  return <>
    <div className="page-heading"><div><div className="eyebrow">{todayHeading}</div><h1>Merhaba, Mert <span className="wave">✳</span></h1><p>Hakedişleri takip edin ve ödeme akışını yönetin.</p></div><span className="heading-chip"><ShieldCheck size={16} /> Muhasebe görünümü</span></div>
    <div className="stats-grid"><StatCard label="Bekleyen hakediş" value={money(total('Bekliyor'))} note="Onay sırasındaki tutar" icon={Clock3} tone="amber" /><StatCard label="Onaylanan" value={money(total('Onaylandı'))} note="Ödeme sırasındaki tutar" icon={CheckCircle2} tone="blue" /><StatCard label="Ödenen" value={money(total('Ödendi'))} note="Tamamlanan ödeme" icon={Wallet} tone="green" /><StatCard label="Toplam kayıt" value={data.payments.length} note="Örnek hakediş" icon={ClipboardList} tone="purple" /></div>
    <div className="overview-grid"><section className="panel"><div className="panel-head"><div><span className="panel-kicker">FİNANS AKIŞI</span><h2>Hakediş süreci</h2></div><button className="text-button" onClick={() => onNavigate('payments')}>Tüm hakedişler <ArrowRight size={16} /></button></div><p className="panel-sub">Örnek kayıtları onaylayın ve ödendi olarak işaretleyin.</p><div className="pipeline" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{(['Bekliyor', 'Onaylandı', 'Ödendi'] as const).map((status, index) => <div key={status} className="pipeline-step"><span className={`pipeline-dot dot-${index + 1}`}><span>{data.payments.filter(payment => payment.status === status).length}</span></span><strong>{status}</strong><small>{index === 0 ? 'Kontrol edilir' : index === 1 ? 'Ödeme sırasına alınır' : 'Süreç tamamlanır'}</small>{index < 2 && <ArrowRight className="pipeline-arrow" size={17} />}</div>)}</div><div className="panel-action"><div className="action-icon"><Wallet size={20} /></div><div><strong>Ödeme sürecini deneyin</strong><span>Hakediş listesindeki işlemleri kullanın.</span></div><button onClick={() => onNavigate('payments')}><ArrowUpRight size={18} /></button></div></section>
    <section className="panel activity-panel"><div className="panel-head"><div><span className="panel-kicker">SON HAREKETLER</span><h2>Finans akışı</h2></div><ActivityIcon size={19} className="muted-icon" /></div><div className="activity-list">{data.activities.filter(item => item.type === 'payment').slice(0, 4).map(item => <div className="activity-item" key={item.id}><span className="activity-glyph payment"><Wallet size={16} /></span><div><strong>{item.text}</strong><small>{item.actor} · {item.at}</small></div></div>)}</div></section></div>
    <section className="panel projects-preview"><div className="panel-head"><div><span className="panel-kicker">PROJE BAĞLAMI</span><h2>Hakedişe bağlı projeler</h2></div><button className="text-button" onClick={() => onNavigate('projects')}>Projeleri görüntüle <ArrowRight size={16} /></button></div><div className="project-mini-grid">{data.projects.slice(0, 3).map(project => <div className="project-mini" key={project.id}><div className="project-mini-top"><span className="subject-icon">{project.subject.slice(0, 1)}</span><Status value={project.status} /></div><strong>{project.name}</strong><small><Clock3 size={14} /> {date(project.deadline)}</small><div className="progress-line"><span style={{ width: `${project.progress}%` }} /></div><div className="progress-caption"><span>İlerleme</span><strong>%{project.progress}</strong></div></div>)}</div></section>
  </>;
}

function PermissionDetails({ currentRole }: { currentRole: Role }) {
  return <div className="permission-details">
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">İŞLEM YETKİLERİ</span><h2>Kim hangi adımı uygulayabilir?</h2></div><ShieldCheck size={19} className="muted-icon" /></div><div className="table-wrap"><table className="matrix action-matrix"><thead><tr><th>İŞLEM</th>{roles.map(item => <th key={item} className={currentRole === item ? 'current-role' : ''}>{roleLabels[item]}</th>)}</tr></thead><tbody>{actionPermissions.map(action => <tr key={action.label}><td><strong>{action.label}</strong></td>{roles.map(persona => <td key={persona} className={currentRole === persona ? 'current-role' : ''}>{action.roles.includes(persona) ? <span className="matrix-yes"><Check size={17} /></span> : <span className="matrix-no">—</span>}</td>)}</tr>)}</tbody></table></div></section>
    <section className="panel scope-panel"><div className="panel-head"><div><span className="panel-kicker">VERİ KAPSAMI</span><h2>Görülen kayıtların sınırı</h2></div></div><div className="scope-list">{roles.map(persona => <div className={persona === currentRole ? 'selected' : ''} key={persona}><span className="small-avatar">{rolePeople[persona].split(' ').map(part => part[0]).join('')}</span><div><strong>{roleLabels[persona]}</strong><small>{dataScopes[persona]}</small></div></div>)}</div></section>
  </div>;
}

export default function DemoApp() {
  const [data, setData] = useState<DemoData>(loadDemoData);
  const [role, setRole] = useState<Role>('GENEL_KOORDINATOR');
  const [section, setSection] = useState<Section>('overview');
  const [roleMenu, setRoleMenu] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [authorProvince, setAuthorProvince] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionLevel, setQuestionLevel] = useState('Ortaokul');
  const [questionGrade, setQuestionGrade] = useState('8. Sınıf');
  const [questionProject, setQuestionProject] = useState(1);
  const [toast, setToast] = useState('');

  useEffect(() => { saveDemoData(data); }, [data]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3800); return () => window.clearTimeout(timer); } }, [toast]);

  const allowed = permissions[role];
  const visibleProjects = useMemo(() => role === 'IL_KOORDINATORU' ? data.projects.filter(p => p.province === 'İstanbul') : role === 'YAZAR' ? data.projects.filter(p => p.id === 1) : data.projects, [data.projects, role]);
  const visibleQuestions = useMemo(() => role === 'YAZAR' ? data.questions.filter(q => q.authorId === 1) : role === 'IL_KOORDINATORU' ? data.questions.filter(q => visibleProjects.some(p => p.id === q.projectId)) : data.questions, [data.questions, role, visibleProjects]);
  const visibleAuthors = useMemo(() => role === 'IL_KOORDINATORU' ? data.authors.filter(a => a.province === 'İstanbul') : data.authors, [data.authors, role]);
  const visibleActivities = useMemo(() => data.activities.filter(item => {
    if (role === 'GENEL_KOORDINATOR') return true;
    if (item.type !== 'question') return false;
    if (role === 'EDITOR') return true;
    if (role === 'YAZAR') return item.authorId === 1 || (!item.authorId && item.actor === rolePeople.YAZAR);
    return role === 'IL_KOORDINATORU' && visibleProjects.some(project => project.id === item.projectId);
  }), [data.activities, role, visibleProjects]);
  const pendingQuestions = visibleQuestions.filter(q => q.status === 'İncelemede').length;
  const activeProjects = visibleProjects.filter(p => p.status !== 'Tamamlandı').length;
  const questionLevels = useMemo(() => [...new Set(data.projects.map(project => project.level))], [data.projects]);
  const questionGrades = useMemo(() => [...new Set(data.projects.filter(project => project.level === questionLevel).map(project => project.grade))], [data.projects, questionLevel]);
  const questionProjects = useMemo(() => data.projects.filter(project => project.level === questionLevel && project.grade === questionGrade), [data.projects, questionLevel, questionGrade]);

  const navigate = (target: Section) => {
    if (!allowed.includes(target)) return;
    setSection(target); setQuery(''); setAuthorProvince(''); setStatusFilter('Tümü'); setMobileMenu(false);
  };
  const selectRole = (next: Role) => {
    setRole(next); setRoleMenu(false); setShowQuestionForm(false); setQuery(''); setAuthorProvince(''); setStatusFilter('Tümü');
    if (!permissions[next].includes(section)) setSection('overview');
    setToast(`${roleLabels[next]} görünümüne geçildi`);
  };
  const log = (text: string, type: 'question' | 'payment', projectId: number, authorId?: number) => ({ id: Math.max(0, ...data.activities.map(item => item.id)) + 1, text, actor: rolePeople[role], at: 'Az önce', type, projectId, authorId });
  const updateQuestion = (id: number, status: QuestionStatus) => {
    const q = data.questions.find(item => item.id === id);
    if (!q) return;
    const canSubmit = role === 'YAZAR' && q.authorId === 1 && ['Taslak', 'Revizyon'].includes(q.status) && status === 'İncelemede';
    const canReview = ['EDITOR', 'GENEL_KOORDINATOR'].includes(role) && q.status === 'İncelemede' && ['Onaylandı', 'Revizyon', 'Reddedildi'].includes(status);
    if (!canSubmit && !canReview) return;
    setData(current => ({ ...current, questions: current.questions.map(item => item.id === id ? { ...item, status, updatedAt: new Date().toISOString().slice(0, 10) } : item), activities: [log(`“${q.title}” · ${status.toLocaleLowerCase('tr-TR')}`, 'question', q.projectId, q.authorId), ...current.activities] }));
    setToast(`Soru durumu “${status}” olarak güncellendi`);
  };
  const createQuestion = (event: React.FormEvent) => {
    event.preventDefault();
    if (role !== 'YAZAR' || !questionTitle.trim() || questionTitle.trim().length < 10) return;
    const project = data.projects.find(p => p.id === questionProject);
    if (!project) return;
    const newQuestion: Question = { id: Math.max(...data.questions.map(q => q.id), 100) + 1, title: questionTitle.trim(), subject: project.subject, grade: questionGrade, level: questionLevel, projectId: project.id, authorId: 1, status: 'Taslak', updatedAt: new Date().toISOString().slice(0, 10) };
    setData(current => ({ ...current, questions: [newQuestion, ...current.questions], activities: [log('Yeni soru taslağı oluşturuldu', 'question', project.id, 1), ...current.activities] }));
    setShowQuestionForm(false); setQuestionTitle(''); setToast('Taslak oluşturuldu. İncelemeye gönderebilirsiniz.');
  };
  const openQuestionForm = () => {
    const firstProject = data.projects[0];
    if (!firstProject) return;
    setQuestionLevel(firstProject.level);
    setQuestionGrade(firstProject.grade);
    setQuestionProject(firstProject.id);
    setShowQuestionForm(true);
  };
  const changeQuestionLevel = (level: string) => {
    const firstProject = data.projects.find(project => project.level === level);
    setQuestionLevel(level);
    setQuestionGrade(firstProject?.grade || '');
    setQuestionProject(firstProject?.id || 0);
  };
  const changeQuestionGrade = (grade: string) => {
    const firstProject = data.projects.find(project => project.level === questionLevel && project.grade === grade);
    setQuestionGrade(grade);
    setQuestionProject(firstProject?.id || 0);
  };
  const updatePayment = (id: number) => {
    if (!['MUHASEBE', 'GENEL_KOORDINATOR'].includes(role)) return;
    const payment = data.payments.find(item => item.id === id);
    if (!payment || payment.status === 'Ödendi') return;
    const next = payment.status === 'Bekliyor' ? 'Onaylandı' : 'Ödendi';
    setData(current => ({ ...current, payments: current.payments.map(item => item.id === id ? { ...item, status: next } : item), activities: [log(`${money(payment.amount)} hakediş · ${next.toLocaleLowerCase('tr-TR')}`, 'payment', payment.projectId), ...current.activities] }));
    setToast(`Hakediş “${next}” durumuna geçti`);
  };
  const reset = () => { setData(resetDemoData()); setToast('Örnek veriler başlangıç durumuna döndürüldü'); };

  const filteredQuestions = visibleQuestions.filter(q => {
    const author = data.authors.find(a => a.id === q.authorId)?.name || '';
    return (statusFilter === 'Tümü' || q.status === statusFilter) && `${q.title} ${q.subject} ${author}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'));
  });
  const filteredProjects = visibleProjects.filter(p => `${p.name} ${p.subject}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
  const filteredAuthors = visibleAuthors.filter(a => (!authorProvince || a.province === authorProvince) && `${a.name} ${a.subject} ${a.province}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
  const showAuthorsForProvince = (province: string) => {
    setAuthorProvince(province);
    setQuery('');
    document.getElementById('author-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return <div className="demo-shell">
    <aside className={`demo-sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><span>P</span></div><div><strong>PRO LİG</strong><small>İçerik yönetim platformu</small></div></div>
      <div className="sidebar-caption">ÇALIŞMA ALANI</div>
      <nav aria-label="Ana menü">{sections.filter(item => allowed.includes(item.id)).map(({ id, icon: Icon }) => <button key={id} className={`nav-link ${section === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={19} /><span>{sectionLabels[id]}</span>{id === 'questions' && pendingQuestions > 0 && <em>{pendingQuestions}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><Sparkles size={18} /><div><strong>Demo çalışma alanı</strong><p>Rolleri değiştirin, akışı deneyin. Veriler yalnızca bu tarayıcıda tutulur.</p></div></div><button className="reset-link" onClick={reset}><RotateCcw size={16} /> Örnek verileri sıfırla</button></div>
    </aside>
    {mobileMenu && <button className="mobile-shade" aria-label="Menüyü kapat" onClick={() => setMobileMenu(false)} />}
    <div className="demo-main">
      <header className="topbar"><div className="topbar-left"><button className="mobile-toggle" aria-label="Menüyü aç" onClick={() => setMobileMenu(true)}><Menu size={22} /></button><div className="breadcrumbs"><span>Çalışma Alanı</span><ArrowRight size={14} /><strong>{sectionLabels[section]}</strong></div></div><div className="topbar-right"><span className="preview-badge"><span /> ETKİLEŞİMLİ ÖNİZLEME</span><div className="role-switcher"><button className="role-button" onClick={() => setRoleMenu(open => !open)} aria-expanded={roleMenu} aria-label="Demo rolünü değiştir"><span className="avatar">{rolePeople[role].split(' ').map(part => part[0]).join('')}</span><span className="role-copy"><strong>{rolePeople[role]}</strong><small>{roleLabels[role]}</small></span><ChevronDown size={16} /></button>{roleMenu && <div className="role-popover"><div className="popover-title">Rolü değiştir <small>Yetkileri anında deneyin</small></div>{roles.map(item => <button key={item} className={item === role ? 'selected' : ''} onClick={() => selectRole(item)}><span className="small-avatar">{rolePeople[item].split(' ').map(part => part[0]).join('')}</span><span><strong>{roleLabels[item]}</strong><small>{rolePeople[item]}</small></span>{item === role && <Check size={16} />}</button>)}</div>}</div></div></header>
      <main className="content">
        <div className="demo-notice"><div><Sparkles size={17} /><strong>Pro Lig deneyim alanı</strong><span>Buradaki kişiler, tutarlar ve işlemler örnektir. Değişiklikler yalnızca sizin tarayıcınızda görünür.</span></div><button onClick={() => navigate('roles')}>Rolleri incele <ArrowRight size={15} /></button></div>
        {section === 'overview' && role === 'MUHASEBE' && <FinanceOverview data={data} onNavigate={navigate} />}
        {section === 'overview' && role !== 'MUHASEBE' && <>
          <div className="page-heading"><div><div className="eyebrow">{todayHeading}</div><h1>Merhaba, {rolePeople[role].split(' ')[0]} <span className="wave">✳</span></h1><p>{role === 'YAZAR' ? 'Sorularınızı hazırlayın, editör değerlendirmesini takip edin.' : 'Üretim sürecindeki son durumu tek yerden takip edin.'}</p></div><span className="heading-chip"><ShieldCheck size={16} /> {roleLabels[role]} görünümü</span></div>
          <div className="stats-grid">
            <StatCard label="Aktif projeler" value={activeProjects} note="Üretim takviminde" icon={BookOpen} tone="blue" />
            <StatCard label={role === 'YAZAR' ? 'Sorularım' : 'İncelemede'} value={role === 'YAZAR' ? visibleQuestions.length : pendingQuestions} note={role === 'YAZAR' ? 'Soru havuzunda' : 'Editör kararı bekliyor'} icon={FileQuestion} tone="amber" />
            {role === 'EDITOR' ? <StatCard label="Revizyon bekleyen" value={visibleQuestions.filter(q => q.status === 'Revizyon').length} note="Yazara iletilen sorular" icon={RotateCcw} tone="purple" /> : role === 'YAZAR' ? <StatCard label="Revizyonlarım" value={visibleQuestions.filter(q => q.status === 'Revizyon').length} note="Düzenleme bekleyen" icon={RotateCcw} tone="purple" /> : <StatCard label="Yazar ağı" value={visibleAuthors.length.toString().padStart(2, '0')} note="Kapsamınızdaki yazarlar" icon={Users} tone="purple" />}
            <StatCard label="Tamamlanan sorular" value={visibleQuestions.filter(q => q.status === 'Onaylandı').length.toString().padStart(2, '0')} note="Yayın hazırlığında" icon={CheckCircle2} tone="green" />
          </div>
          <div className="overview-grid"><section className="panel"><div className="panel-head"><div><span className="panel-kicker">İŞ AKIŞI</span><h2>Soru üretim hattı</h2></div><button className="text-button" onClick={() => navigate('questions')}>Tüm sorular <ArrowRight size={16} /></button></div><p className="panel-sub">Taslaklardan onaya uzanan süreci rolünüze göre deneyin.</p><div className="pipeline">{(['Taslak', 'İncelemede', 'Revizyon', 'Onaylandı'] as QuestionStatus[]).map((status, index) => <div key={status} className="pipeline-step"><span className={`pipeline-dot dot-${index}`}><span>{visibleQuestions.filter(q => q.status === status).length}</span></span><strong>{status}</strong><small>{index === 0 ? 'Yazar hazırlar' : index === 1 ? 'Editör inceler' : index === 2 ? 'Yazar düzenler' : 'Yayına hazır'}</small>{index < 3 && <ArrowRight className="pipeline-arrow" size={17} />}</div>)}</div><div className="panel-action"><div className="action-icon"><CircleHelp size={20} /></div><div><strong>Rolünüzde neler yapabilirsiniz?</strong><span>Yetki matrisinde ekran ve işlem kapsamını görün.</span></div><button onClick={() => navigate('roles')}><ArrowUpRight size={18} /></button></div></section>
          <section className="panel activity-panel"><div className="panel-head"><div><span className="panel-kicker">SON HAREKETLER</span><h2>Güncel akış</h2></div><ActivityIcon size={19} className="muted-icon" /></div><div className="activity-list">{visibleActivities.slice(0, 4).map(item => <div className="activity-item" key={item.id}><span className={`activity-glyph ${item.type}`}>{item.type === 'payment' ? <Wallet size={16} /> : <FileQuestion size={16} />}</span><div><strong>{item.text}</strong><small>{item.actor} · {item.at}</small></div></div>)}</div></section></div>
          <section className="panel projects-preview"><div className="panel-head"><div><span className="panel-kicker">YAKLAŞAN TESLİMLER</span><h2>Devam eden projeler</h2></div><button className="text-button" onClick={() => navigate('projects')}>Projeleri görüntüle <ArrowRight size={16} /></button></div><div className="project-mini-grid">{visibleProjects.slice(0, 3).map(project => <div className="project-mini" key={project.id}><div className="project-mini-top"><span className="subject-icon">{project.subject.slice(0, 1)}</span><Status value={project.status} /></div><strong>{project.name}</strong><small><Clock3 size={14} /> {date(project.deadline)}</small><div className="progress-line"><span style={{ width: `${project.progress}%` }} /></div><div className="progress-caption"><span>İlerleme</span><strong>%{project.progress}</strong></div></div>)}</div></section>
        </>}
        {section === 'questions' && <><div className="page-heading"><div><div className="eyebrow">İÇERİK ÜRETİMİ</div><h1>Soru Havuzu</h1><p>{role === 'YAZAR' ? 'Taslak oluşturun ve sorularınızı editör incelemesine gönderin.' : 'Soruları inceleyin; onay, revizyon ve ret kararlarını deneyin.'}</p></div>{role === 'YAZAR' && <button className="primary-button" onClick={openQuestionForm}><Plus size={18} /> Yeni soru taslağı</button>}</div><div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Sorularda ara" placeholder="Soru, branş veya yazar ara..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filter-box"><Filter size={16} /><select aria-label="Duruma göre filtrele" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{['Tümü', 'Taslak', 'İncelemede', 'Revizyon', 'Onaylandı', 'Reddedildi'].map(item => <option key={item}>{item}</option>)}</select></div></div><div className="panel table-panel"><div className="table-heading"><strong>{filteredQuestions.length} soru</strong><span>Örnek içerikler · Rolünüzün kapsamına göre listelenir</span></div><div className="table-wrap"><table><thead><tr><th>SORU / KAZANIM</th><th>YAZAR</th><th>PROJE</th><th>DURUM</th><th>GÜNCELLEME</th><th>İŞLEM</th></tr></thead><tbody>{filteredQuestions.map(q => { const author = data.authors.find(a => a.id === q.authorId); const project = data.projects.find(p => p.id === q.projectId); return <tr key={q.id}><td><strong>{q.title}</strong><small>{q.subject} · {q.grade} · #{q.id}</small>{q.note && <small className="review-note">Editör notu: {q.note}</small>}</td><td>{author?.name}</td><td>{project?.name}</td><td><Status value={q.status} /></td><td>{date(q.updatedAt)}</td><td><div className="row-actions">{role === 'YAZAR' && q.authorId === 1 && ['Taslak', 'Revizyon'].includes(q.status) && <button onClick={() => updateQuestion(q.id, 'İncelemede')}>İncelemeye gönder <ArrowRight size={14} /></button>}{['EDITOR', 'GENEL_KOORDINATOR'].includes(role) && q.status === 'İncelemede' && <><button onClick={() => updateQuestion(q.id, 'Onaylandı')} title="Onayla"><Check size={16} /></button><button onClick={() => updateQuestion(q.id, 'Revizyon')} title="Revizyon iste"><RotateCcw size={15} /></button><button onClick={() => updateQuestion(q.id, 'Reddedildi')} title="Reddet"><X size={16} /></button></>}{!(role === 'YAZAR' && q.authorId === 1 && ['Taslak', 'Revizyon'].includes(q.status)) && !(['EDITOR', 'GENEL_KOORDINATOR'].includes(role) && q.status === 'İncelemede') && <span className="no-action">—</span>}</div></td></tr>; })}</tbody></table>{filteredQuestions.length === 0 && <div className="empty-state">Bu filtreye uygun soru bulunamadı.</div>}</div></div></>}
        {section === 'projects' && <><div className="page-heading"><div><div className="eyebrow">YAYIN TAKVİMİ</div><h1>Projeler</h1><p>Kitap ve içerik üretimindeki ilerlemeyi takip edin.</p></div><span className="heading-chip"><BookOpen size={16} /> {visibleProjects.length} proje</span></div><div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Projelerde ara" placeholder="Proje veya branş ara..." value={query} onChange={e => setQuery(e.target.value)} /></div></div><div className="project-grid">{filteredProjects.map(project => <div className="panel project-card" key={project.id}><div className="project-card-top"><span className="subject-icon">{project.subject.slice(0, 1)}</span><Status value={project.status} /></div><span className="project-code">PROJE #{String(project.id).padStart(3, '0')}</span><h2>{project.name}</h2><p>{project.subject} · {project.grade} · {project.province}</p><div className="project-meta"><span><Clock3 size={16} /> Son teslim</span><strong>{date(project.deadline)}</strong></div><div className="progress-line"><span style={{ width: `${project.progress}%` }} /></div><div className="progress-caption"><span>Tamamlanma</span><strong>%{project.progress}</strong></div></div>)}</div>{filteredProjects.length === 0 && <div className="empty-state">Proje bulunamadı.</div>}</>}
        {section === 'grades' && <>
            <div className="page-heading">
              <div>
                <div className="eyebrow">EĞİTİM KADEMELERİ</div>
                <h1>Sınıflar ve Kademeler</h1>
                <p>İlkokul, Ortaokul, Lise ve Mezun kademelerindeki içerik ve yazar dağılımını inceleyin.</p>
              </div>
              <span className="heading-chip"><GraduationCap size={16} /> 4 Kademe</span>
            </div>
            <div className="stats-grid">
              {['İlkokul', 'Ortaokul', 'Lise', 'Mezun'].map(lvl => {
                const authorsCount = data.authors.filter(a => a.levels?.includes(lvl)).length;
                const projectsCount = data.projects.filter(p => p.level === lvl).length;
                const questionsCount = data.questions.filter(q => q.level === lvl).length;
                return (
                  <div key={lvl} className="panel stat-card">
                    <div className="stat-top">
                      <strong>{lvl}</strong>
                      <div className="stat-icon" style={{background: '#eff6ff', color: '#3b82f6'}}><GraduationCap size={18} /></div>
                    </div>
                    <div style={{marginTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b'}}>
                      <div><strong style={{color: '#0f172a', fontSize: '14px'}}>{authorsCount}</strong> Yazar</div>
                      <div><strong style={{color: '#0f172a', fontSize: '14px'}}>{projectsCount}</strong> Proje</div>
                      <div><strong style={{color: '#0f172a', fontSize: '14px'}}>{questionsCount}</strong> Soru</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>}

          {section === 'authors' && <>
          <div className="page-heading"><div><div className="eyebrow">UZMAN AĞI · COĞRAFİ GÖRÜNÜM</div><h1>Türkiye Yazar Ağı</h1><p>{role === 'IL_KOORDINATORU' ? 'İstanbul kapsamındaki örnek yazarları haritada ve listede keşfedin.' : 'Yazarların illere dağılımını ve branşlarını tek ekranda keşfedin.'}</p></div><span className="heading-chip"><Users size={16} /> {visibleAuthors.length} yazar</span></div>
          <AuthorMap authors={visibleAuthors} scopeProvince={role === 'IL_KOORDINATORU' ? 'İstanbul' : undefined} onShowAuthors={showAuthorsForProvince} />
          <section id="author-list" className="author-network-list">
            <div className="author-network-list-heading"><div><span className="panel-kicker">YAZAR REHBERİ</span><h2>{authorProvince ? `${authorProvince} yazarları` : 'Tüm yazarlar'}</h2><p>Haritadan bir il seçip listeyi süzebilir veya yazar ve branş arayabilirsiniz.</p></div><span className="heading-chip">{filteredAuthors.length} kayıt</span></div>
            <div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Yazarlarda ara" placeholder="Yazar, branş veya il ara..." value={query} onChange={e => setQuery(e.target.value)} /></div>{authorProvince && <button className="author-network-clear" onClick={() => setAuthorProvince('')}>{authorProvince} filtresini kaldır <X size={14} /></button>}</div>
            <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>YAZAR</th><th>BRANŞ</th><th>KADEME</th><th>İL</th><th>AKTİF PROJE</th><th>DURUM</th></tr></thead><tbody>{filteredAuthors.map(author => <tr key={author.id}><td><div className="person-cell"><span className="small-avatar">{author.initials}</span><strong>{author.name}</strong></div></td><td>{author.subject}</td><td><div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>{author.levels?.map(l => <span key={l} style={{background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#334155', border: '1px solid #e2e8f0'}}>{l}</span>)}</div></td><td>{author.province}</td><td>{author.activeProjects}</td><td><Status value={author.status} /></td></tr>)}</tbody></table>{filteredAuthors.length === 0 && <div className="empty-state">Bu filtreye uygun yazar bulunamadı.</div>}</div></div>
          </section>
        </>}
        {section === 'payments' && <><div className="page-heading"><div><div className="eyebrow">FİNANS AKIŞI</div><h1>Hakedişler</h1><p>Örnek ödeme kayıtlarının onay ve ödeme adımlarını deneyin.</p></div><span className="heading-chip"><Wallet size={16} /> Demo tutarlar</span></div><div className="stats-grid payments-stats"><StatCard label="Bekleyen" value={money(data.payments.filter(p => p.status === 'Bekliyor').reduce((sum, p) => sum + p.amount, 0))} note="Onay bekleyen hakediş" icon={Clock3} tone="amber" /><StatCard label="Onaylanan" value={money(data.payments.filter(p => p.status === 'Onaylandı').reduce((sum, p) => sum + p.amount, 0))} note="Ödeme sırasına alınan" icon={CheckCircle2} tone="blue" /><StatCard label="Ödenen" value={money(data.payments.filter(p => p.status === 'Ödendi').reduce((sum, p) => sum + p.amount, 0))} note="Tamamlanan işlemler" icon={Wallet} tone="green" /></div><div className="panel table-panel"><div className="table-heading"><strong>Hakediş listesi</strong><span>İşlemler sadece bu demo tarayıcısını etkiler</span></div><div className="table-wrap"><table><thead><tr><th>YAZAR</th><th>PROJE</th><th>TUTAR</th><th>PLANLANAN TARİH</th><th>DURUM</th><th>İŞLEM</th></tr></thead><tbody>{data.payments.map(payment => <tr key={payment.id}><td><strong>{data.authors.find(a => a.id === payment.authorId)?.name}</strong></td><td>{data.projects.find(p => p.id === payment.projectId)?.name}</td><td><strong>{money(payment.amount)}</strong></td><td>{date(payment.date)}</td><td><Status value={payment.status} /></td><td><div className="row-actions">{payment.status !== 'Ödendi' ? <button onClick={() => updatePayment(payment.id)}>{payment.status === 'Bekliyor' ? 'Onayla' : 'Ödendi işaretle'} <ArrowRight size={14} /></button> : <span className="no-action">Tamamlandı</span>}</div></td></tr>)}</tbody></table></div></div></>}
        {section === 'roles' && <><div className="page-heading"><div><div className="eyebrow">ERİŞİM MODELİ</div><h1>Rol ve Yetkiler</h1><p>Üstteki profil menüsünden rol değiştirerek her deneyimi karşılaştırın.</p></div><span className="heading-chip"><LockKeyhole size={16} /> 5 demo rolü</span></div><div className="roles-intro panel"><div className="roles-intro-icon"><ShieldCheck size={28} /></div><div><h2>Her rol için odaklanmış bir çalışma alanı</h2><p>Ekranlar role göre açılır; örnek sorular ve projeler ilgili kişiye veya ile göre süzülür. Bu önizleme, gerçek kullanıcı oturumu ve sunucu tarafı yetkilendirme yerine rol deneyimini gösterir.</p></div></div><div className="panel matrix-panel"><div className="panel-head"><div><span className="panel-kicker">YETKİ MATRİSİ</span><h2>Görüntüleme kapsamı</h2></div></div><div className="table-wrap"><table className="matrix"><thead><tr><th>MODÜL</th>{roles.map(item => <th key={item} className={role === item ? 'current-role' : ''}>{roleLabels[item]}</th>)}</tr></thead><tbody>{sections.map(item => <tr key={item.id}><td><strong>{sectionLabels[item.id]}</strong></td>{roles.map(persona => <td key={persona} className={role === persona ? 'current-role' : ''}>{permissions[persona].includes(item.id) ? <span className="matrix-yes"><Check size={17} /></span> : <span className="matrix-no">—</span>}</td>)}</tr>)}</tbody></table></div></div><div className="roles-detail"><div className="panel"><span className="panel-kicker">SORU İŞLEMLERİ</span><h3>Yazar → Editör</h3><p>Yazar kendi taslağını incelemeye gönderir. Editör gelen soruyu onaylar, revizyona yollar veya reddeder.</p><button className="text-button" onClick={() => navigate('questions')}>Akışı dene <ArrowRight size={16} /></button></div><div className="panel"><span className="panel-kicker">FİNANS İŞLEMLERİ</span><h3>Onay → Ödeme</h3><p>Muhasebe ve Genel Koordinatör örnek hakedişleri onaylayıp ödendi olarak işaretleyebilir.</p><button className="text-button" onClick={() => selectRole('MUHASEBE')}>Muhasebe rolüne geç <ArrowRight size={16} /></button></div></div></>}
        {section === 'roles' && <PermissionDetails currentRole={role} />}
        {section === 'audit' && role === 'GENEL_KOORDINATOR' && <><div className="page-heading"><div><div className="eyebrow">DENETİM İZİ</div><h1>İşlem Geçmişi</h1><p>Bu tarayıcıdaki örnek soru ve hakediş adımlarını izleyin.</p></div><span className="heading-chip"><ActivityIcon size={16} /> {data.activities.length} kayıt</span></div><div className="panel table-panel"><div className="table-heading"><strong>Son işlemler</strong><span>Demo verisi · Yerel tarayıcı kaydı</span></div><div className="table-wrap"><table><thead><tr><th>İŞLEM</th><th>UYGULAYAN</th><th>TÜR</th><th>ZAMAN</th></tr></thead><tbody>{data.activities.map(item => <tr key={item.id}><td><strong>{item.text}</strong></td><td>{item.actor}</td><td>{item.type === 'payment' ? 'Hakediş' : item.type === 'project' ? 'Proje' : 'Soru'}</td><td>{item.at}</td></tr>)}</tbody></table></div></div></>}
      </main>
    </div>
    {showQuestionForm && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowQuestionForm(false); }}><form className="question-modal" onSubmit={createQuestion}><div className="modal-head"><div><span className="panel-kicker">YENİ TASLAK</span><h2>Soru oluştur</h2></div><button type="button" aria-label="Kapat" onClick={() => setShowQuestionForm(false)}><X size={20} /></button></div><p>Önce eğitim kademesi ve sınıfı seçin; proje listesi bu seçime göre güncellenir.</p><label>Soru başlığı veya kısa içerik<textarea autoFocus minLength={10} maxLength={300} placeholder="Örn. Kesirlerle ilgili günlük yaşam problemi..." value={questionTitle} onChange={event => setQuestionTitle(event.target.value)} required /></label><div className="question-context-grid"><label>Eğitim kademesi<select aria-label="Eğitim kademesi" value={questionLevel} onChange={event => changeQuestionLevel(event.target.value)}>{questionLevels.map(level => <option key={level}>{level}</option>)}</select></label><label>Sınıf<select aria-label="Sınıf" value={questionGrade} onChange={event => changeQuestionGrade(event.target.value)}>{questionGrades.map(grade => <option key={grade}>{grade}</option>)}</select></label></div><label>Proje<select aria-label="Proje" value={questionProject} onChange={event => setQuestionProject(Number(event.target.value))} required>{questionProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select><small className="field-help">Yalnızca seçilen kademe ve sınıfa bağlı projeler gösterilir.</small></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowQuestionForm(false)}>Vazgeç</button><button type="submit" className="primary-button" disabled={!questionProject}><Plus size={17} /> Taslak oluştur</button></div></form></div>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}</div>}
  </div>;
}
