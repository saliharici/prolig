import { toKurus } from './payments/money';
import { AuthUser } from './auth/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GraduationCap,
  Activity as ActivityIcon, Archive, ArchiveRestore, ArrowRight, ArrowUpRight, BookOpen,
  Bold, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock3,
  FileQuestion, Filter, ImagePlus, Italic, LayoutDashboard, Link, List, ListOrdered, MessageSquareText,
  LockKeyhole, MapPinned, Menu, Plus, RotateCcw, Search, ShieldCheck, Sigma, Sparkles,
  PencilLine, Trash2, Underline, Users, Wallet, X,
} from 'lucide-react';
import {
  actionPermissions, dataScopes, loadDemoData, permissions, resetDemoData, roleLabels, rolePeople, saveDemoData,
  sectionLabels, type DemoData, type Question, type QuestionStatus, type Role, type Section,
} from './demo/model';
import { AuthorMap } from './demo/AuthorMap';
import { fetchQuestions, createQuestion, patchQuestion, runQuestionWorkflow, changeQuestionArchive, deleteQuestion, ApiError } from './questions/api';
import { buildQuestionEditPatch, hasFourValidQuestionOptions, isValidCorrectAnswer, normalizeQuestionOptions, requireCompleteQuestionAnswers } from './questions/edit';
import type { ApiQuestion, QuestionStatus as ApiQuestionStatus, QuestionWorkflowAction } from './questions/types';
import { fetchProjects } from './projects/api';
import type { ApiProject, ProjectStatus as ApiProjectStatus } from './projects/types';
import { fetchPayments as loadApiPayments, approvePayment, payPayment } from './payments/api';
import type { ApiPayment as Payment } from './payments/types';
import { fetchAuthors } from './authors/api';
import type { ApiAuthor } from './authors/types';
import { MemberManagement } from './membership/MemberManagement';
import { ProfileModal } from './profile/ProfileModal';
import { buildGradeLevelSummary } from './demo/grade-summary';
import './demo.css';

const sections: { id: Section; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'grades', icon: GraduationCap },
  { id: 'questions', icon: FileQuestion },
  { id: 'projects', icon: BookOpen },
  { id: 'authors', icon: MapPinned },
  { id: 'payments', icon: Wallet },
  { id: 'members', icon: Users },
  { id: 'roles', icon: ShieldCheck },
  { id: 'audit', icon: ActivityIcon },
];
const roles = Object.keys(roleLabels) as Role[];
const gradesByLevel: Record<string, string[]> = {
  İlkokul: ['1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf'],
  Ortaokul: ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'],
  Lise: ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'],
  Mezun: ['Mezun'],
};
const moneyKurus = (kurus: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kurus / 100);
const sumPayments = (payments: Payment[], status: string) => payments.filter(p => p.status === status).reduce((sum, p) => sum + toKurus(p.amount), 0);
const money = (value: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const date = (value: string) => new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value.includes('T') ? value : `${value}T12:00:00`));
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

function FinanceOverview({ apiPayments, onNavigate, currentUser, data }: { apiPayments: Payment[]; onNavigate: (section: Section) => void; currentUser: AuthUser; data: DemoData }) {
  return <>
    <div className="page-heading"><div><div className="eyebrow">{todayHeading}</div><h1>Merhaba, {currentUser.fullName.split(' ')[0]} <span className="wave">✳</span></h1><p>Hakedişleri takip edin ve ödeme akışını yönetin.</p></div><span className="heading-chip"><ShieldCheck size={16} /> Muhasebe görünümü</span></div>
    <div className="stats-grid">
      <StatCard label="Bekleyen hakediş" value={moneyKurus(sumPayments(apiPayments, 'Bekliyor'))} note="Onay sırasındaki tutar" icon={Clock3} tone="amber" />
      <StatCard label="Onaylanan" value={moneyKurus(sumPayments(apiPayments, 'Onaylandi'))} note="Ödeme sırasındaki tutar" icon={CheckCircle2} tone="blue" />
      <StatCard label="Ödenen" value={moneyKurus(sumPayments(apiPayments, 'Odendi'))} note="Tamamlanan ödeme" icon={Wallet} tone="green" />
      <StatCard label="Toplam kayıt" value={apiPayments.length} note="Pilot hakediş" icon={ClipboardList} tone="purple" />
    </div>
    <div className="overview-grid">
      <section className="panel"><div className="panel-head"><div><span className="panel-kicker">FİNANS AKIŞI</span><h2>Hakediş süreci</h2></div><button className="text-button" onClick={() => onNavigate('payments')}>Tüm hakedişler <ArrowRight size={16} /></button></div><p className="panel-sub">Gerçek Pilot verisi onay ve ödeme adımları.</p><div className="pipeline" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{(['Bekliyor', 'Onaylandi', 'Odendi'] as const).map((status, index) => <div key={status} className="pipeline-step"><span className={`pipeline-dot dot-${index + 1}`}><span>{apiPayments.filter(payment => payment.status === status).length}</span></span><strong>{status === 'Onaylandi' ? 'Onaylandı' : status === 'Odendi' ? 'Ödendi' : 'Bekliyor'}</strong><small>{index === 0 ? 'Kontrol edilir' : index === 1 ? 'Ödeme sırasına alınır' : 'Süreç tamamlanır'}</small>{index < 2 && <ArrowRight className="pipeline-arrow" size={17} />}</div>)}</div><div className="panel-action"><div className="action-icon"><Wallet size={20} /></div><div><strong>Ödeme sürecini yönetin</strong><span>Hakediş listesindeki işlemleri kullanın.</span></div><button onClick={() => onNavigate('payments')}><ArrowUpRight size={18} /></button></div></section>
      <section className="panel activity-panel"><div className="panel-head"><div><span className="panel-kicker">SON HAREKETLER (ÖRNEK)</span><h2>İşlem Geçmişi</h2></div><ActivityIcon size={19} className="muted-icon" /></div><div className="activity-list">{data.activities.filter(item => item.type === 'payment').slice(0, 4).map(item => <div className="activity-item" key={item.id}><span className="activity-glyph payment"><Wallet size={16} /></span><div><strong>{item.text}</strong><small>{item.actor} · {item.at}</small></div></div>)}</div></section>
    </div>
  </>;
}

function PermissionDetails({ currentRole }: { currentRole: Role }) {
  return <div className="permission-details">
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">İŞLEM YETKİLERİ</span><h2>Kim hangi adımı uygulayabilir?</h2></div><ShieldCheck size={19} className="muted-icon" /></div><div className="table-wrap"><table className="matrix action-matrix"><thead><tr><th>İŞLEM</th>{roles.map(item => <th key={item} className={currentRole === item ? 'current-role' : ''}>{roleLabels[item]}</th>)}</tr></thead><tbody>{actionPermissions.map(action => <tr key={action.label}><td><strong>{action.label}</strong></td>{roles.map(persona => <td key={persona} className={currentRole === persona ? 'current-role' : ''}>{action.roles.includes(persona) ? <span className="matrix-yes"><Check size={17} /></span> : <span className="matrix-no">—</span>}</td>)}</tr>)}</tbody></table></div></section>
    <section className="panel scope-panel"><div className="panel-head"><div><span className="panel-kicker">VERİ KAPSAMI</span><h2>Görülen kayıtların sınırı</h2></div></div><div className="scope-list">{roles.map(persona => <div className={persona === currentRole ? 'selected' : ''} key={persona}><span className="small-avatar">{rolePeople[persona].split(' ').map(part => part[0]).join('')}</span><div><strong>{roleLabels[persona]}</strong><small>{dataScopes[persona]}</small></div></div>)}</div></section>
  </div>;
}

export default function DemoApp({ currentUser, onLogoutRequest, onProfileUpdated }: { currentUser: AuthUser; onLogoutRequest: () => void; onProfileUpdated: () => Promise<void> }) {
  const [data, setData] = useState<DemoData>(loadDemoData);
  const [showProfile, setShowProfile] = useState(false);
  const [apiQuestions, setApiQuestions] = useState<ApiQuestion[]>([]);
  const [archivedQuestions, setArchivedQuestions] = useState<ApiQuestion[]>([]);
  const [questionView, setQuestionView] = useState<'active' | 'archived'>('active');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiProjects, setApiProjects] = useState<ApiProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [apiAuthors, setApiAuthors] = useState<ApiAuthor[]>([]);
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorsError, setAuthorsError] = useState('');
  const [apiPayments, setApiPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  
  const fetchPayments = async () => {
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      setApiPayments(await loadApiPayments());
    } catch (e: any) {
      setPaymentsError(e.message || 'Hakedişler yüklenemedi.');
    } finally {
      setPaymentsLoading(false);
    }
  };
  
  useEffect(() => {
    if (['MUHASEBE', 'GENEL_KOORDINATOR'].includes(currentUser.role)) {
      fetchPayments();
    }
  }, [currentUser.role]);


  const loadApiQuestions = async () => {
    setApiLoading(true);
    setApiError('');
    try {
      const result = await fetchQuestions('active');
      setApiQuestions(result);
      return result;
    } catch (e: any) {
      setApiError(e.message || 'Soru havuzu yüklenemedi.');
      return [];
    } finally {
      setApiLoading(false);
    }
  };

  const loadArchivedQuestions = async () => {
    setApiLoading(true);
    setApiError('');
    try {
      const result = await fetchQuestions('archived');
      setArchivedQuestions(result);
      return result;
    } catch (e: any) {
      setApiError(e.message || 'Arşiv yüklenemedi.');
      return [];
    } finally {
      setApiLoading(false);
    }
  };

  const loadApiProjects = async () => {
    setProjectsLoading(true);
    setProjectsError('');
    try {
      setApiProjects(await fetchProjects());
    } catch (error: any) {
      setProjectsError(error.message || 'Projeler yüklenemedi.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadApiAuthors = async () => {
    setAuthorsLoading(true);
    setAuthorsError('');
    try {
      setApiAuthors(await fetchAuthors());
    } catch (error: any) {
      setAuthorsError(error.message || 'Yazar ağı yüklenemedi.');
    } finally {
      setAuthorsLoading(false);
    }
  };

  useEffect(() => {
    loadApiQuestions();
    loadApiProjects();
    loadApiAuthors();
  }, []);
    const [section, setSection] = useState<Section>('overview');
    const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [authorProvince, setAuthorProvince] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionLevel, setQuestionLevel] = useState('Ortaokul');
  const [questionGrade, setQuestionGrade] = useState('8. Sınıf');
  const [questionProjectId, setQuestionProjectId] = useState<number | null>(null);
  const [originalQuestionProjectId, setOriginalQuestionProjectId] = useState<number | null>(null);
    const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
  const [questionCorrectAnswer, setQuestionCorrectAnswer] = useState('A');
  const [questionExplanation, setQuestionExplanation] = useState('');
      const [editorNote, setEditorNote] = useState('');
  const [reviewAction, setReviewAction] = useState<QuestionWorkflowAction | ''>('');
  const [editingQuestion, setEditingQuestion] = useState<ApiQuestion | null>(null);
  const [reviewingQuestion, setReviewingQuestion] = useState<ApiQuestion | null>(null);
  const [toast, setToast] = useState('');
  const questionEditorRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => { saveDemoData(data); }, [data]);
  useEffect(() => { if (toast) { const timer = window.setTimeout(() => setToast(''), 3800); return () => window.clearTimeout(timer); } }, [toast]);

  const allowed = permissions[currentUser.role];
  const demoActivityProjects = useMemo(() => currentUser.role === 'IL_KOORDINATORU' ? data.projects.filter(p => p.province === 'İstanbul') : currentUser.role === 'YAZAR' ? data.projects.filter(p => p.id === 1) : data.projects, [data.projects, currentUser.role]);
  
  const authorMapAuthors = useMemo(() => apiAuthors.map(author => ({
    id: author.id,
    name: author.fullName,
    initials: author.fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toLocaleUpperCase('tr-TR'),
    subject: author.branch.name,
    province: author.province.name,
    activeProjects: author.activeProjectCount,
    levels: Object.entries(gradesByLevel).filter(([, grades]) => author.projectGrades.some(grade => grades.includes(grade))).map(([level]) => level),
    status: author.status
  })), [apiAuthors]);
  const visibleActivities = useMemo(() => data.activities.filter(item => {
    if (currentUser.role === 'GENEL_KOORDINATOR') return true;
    if (item.type !== 'question') return false;
    if (currentUser.role === 'EDITOR') return true;
    if (currentUser.role === 'YAZAR') return item.authorId === 1 || (!item.authorId && item.actor === currentUser.fullName);
    return currentUser.role === 'IL_KOORDINATORU' && demoActivityProjects.some(project => project.id === item.projectId);
  }), [data.activities, currentUser.role, demoActivityProjects]);
  const pendingQuestions = apiQuestions.filter(q => q.status === 'INCELEMEDE').length;
  const activeProjects = apiProjects.filter(project => !['Tamamlandi', 'Arsiv'].includes(project.status)).length;
  const questionLevels = Object.keys(gradesByLevel);
  const questionGrades = gradesByLevel[questionLevel] || [];
  
  const navigate = (target: Section) => {
    if (!allowed.includes(target)) return;
    setSection(target); setQuery(''); setAuthorProvince(''); setStatusFilter('Tümü'); setMobileMenu(false);
  };
    const log = (text: string, type: 'question' | 'payment', projectId: number, authorId?: number) => ({ id: Math.max(0, ...data.activities.map(item => item.id)) + 1, text, actor: currentUser.fullName, at: 'Az önce', type, projectId, authorId });
  
  const handleCreateQuestion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (currentUser.role !== 'YAZAR' || !questionTitle.trim() || questionTitle.trim().length < 10) return;
    try {
      if (editingQuestion) {
        const input = buildQuestionEditPatch(editingQuestion, {
          content: questionTitle,
          grade: questionGrade,
          explanation: questionExplanation,
          projectId: questionProjectId,
          options: questionOptions,
          correctAnswer: questionCorrectAnswer
        });
        await patchQuestion(editingQuestion.id, input);
        setToast('Soru düzeltmeleri kaydedildi.');
      } else {
        const answers = requireCompleteQuestionAnswers(questionOptions, questionCorrectAnswer);
        await createQuestion({
          content: questionTitle.trim(),
          grade: questionGrade,
          options: answers.options,
          correctAnswer: answers.correctAnswer,
          explanation: questionExplanation.trim() || null,
          projectId: questionProjectId
        });
        setToast('Taslak oluşturuldu. İncelemeye gönderebilirsiniz.');
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionTitle(''); 
      setQuestionOptions(['', '', '', '']); 
      setQuestionExplanation(''); 
      setQuestionProjectId(null);
      setOriginalQuestionProjectId(null);
            loadApiQuestions();
    } catch (e: any) {
      setToast(e.message || 'Bir hata oluştu.');
      if (e instanceof ApiError && e.status === 409 && editingQuestion) {
        const latestQuestions = await loadApiQuestions();
        const latestQuestion = latestQuestions.find(question => question.id === editingQuestion.id);
        if (latestQuestion && ['TASLAK', 'REVIZYON'].includes(latestQuestion.status)) openYazarEdit(latestQuestion);
      }
    }
  };
  const openQuestionForm = () => {
    setQuestionLevel('Ortaokul');
    setQuestionGrade('8. Sınıf');
    setQuestionProjectId(null);
    setOriginalQuestionProjectId(null);
    setQuestionOptions(['', '', '', '']);
    setQuestionCorrectAnswer('A');
    setQuestionExplanation('');
    setShowQuestionForm(true);
  };
  const changeQuestionLevel = (level: string) => {
    setQuestionLevel(level);
    setQuestionGrade(gradesByLevel[level]?.[0] || '');
  };
  const changeQuestionGrade = (grade: string) => {
    setQuestionGrade(grade);
  };
  const applyQuestionMarkup = (before: string, after = before, placeholder = 'metin') => {
    const editor = questionEditorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = questionTitle.slice(start, end) || placeholder;
    const nextValue = `${questionTitle.slice(0, start)}${before}${selected}${after}${questionTitle.slice(end)}`;
    setQuestionTitle(nextValue);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };
  const applyQuestionList = (ordered: boolean) => {
    const editor = questionEditorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = questionTitle.slice(start, end) || 'Madde';
    const formatted = selected.split('\n').map((line, index) => `${ordered ? `${index + 1}.` : '•'} ${line}`).join('\n');
    setQuestionTitle(`${questionTitle.slice(0, start)}${formatted}${questionTitle.slice(end)}`);
    window.requestAnimationFrame(() => editor.focus());
  };
  const updateQuestionOption = (index: number, value: string) => setQuestionOptions(current => current.map((option, optionIndex) => optionIndex === index ? value : option));
  const openEditorReview = (question: ApiQuestion) => {
    if (['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && question.status === 'INCELEMEDE') {
      setReviewingQuestion(question);
      setEditorNote('');
      setReviewAction('');
    }
  };
  
  const saveEditorReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewingQuestion || !reviewAction) return;
    try {
      await runQuestionWorkflow(reviewingQuestion.id, reviewAction as QuestionWorkflowAction, editorNote.trim() || undefined);
      setToast('İşlem başarıyla tamamlandı.');
      setReviewingQuestion(null);
      setReviewAction('');
      setEditorNote('');
      loadApiQuestions();
    } catch (e: any) {
      setToast(e.message || 'Hata oluştu.');
      if (e.status === 409) loadApiQuestions();
    }
  };
  
  const handleYazarSubmit = async (question: ApiQuestion) => {
    try {
      await runQuestionWorkflow(question.id, 'submit');
      setToast('Soru incelemeye gönderildi.');
      loadApiQuestions();
    } catch (e: any) {
      setToast(e.message || 'Hata oluştu.');
      if (e.status === 409) loadApiQuestions();
    }
  };
  
  const openYazarEdit = (question: ApiQuestion) => {
    if (question.status !== 'TASLAK' && question.status !== 'REVIZYON') return;
    setEditingQuestion(question);
    setQuestionTitle(question.content);
    
    const grade = question.grade || '8. Sınıf';
    let level = 'Ortaokul';
    for (const [lvl, grades] of Object.entries(gradesByLevel)) {
      if (grades.includes(grade)) {
        level = lvl;
        break;
      }
    }
    setQuestionLevel(level);
    setQuestionGrade(grade);

    setQuestionOptions(normalizeQuestionOptions(question.options));
    setQuestionCorrectAnswer(isValidCorrectAnswer(question.correctAnswer) ? question.correctAnswer : '');
    setQuestionExplanation(question.explanation || '');
    setQuestionProjectId(question.projectId);
    setOriginalQuestionProjectId(question.projectId);
    setShowQuestionForm(true);
  };
    const updatePayment = async (id: number, currentStatus: string) => {
    if (!['MUHASEBE', 'GENEL_KOORDINATOR'].includes(currentUser.role)) return;
    try {
      if (currentStatus === 'Bekliyor') {
        await approvePayment(id);
        setToast('Hakediş onaylandı.');
      } else if (currentStatus === 'Onaylandi') {
        await payPayment(id);
        setToast('Hakediş ödendi.');
      }
      fetchPayments();
    } catch (e: any) {
      setToast(e.message || 'İşlem başarısız.');
      if (e.status === 409) fetchPayments();
    }
  };
  const reset = () => { setData(resetDemoData()); setToast('Örnek veriler başlangıç durumuna döndürüldü'); };

  const canArchiveQuestionUi = (q: ApiQuestion) => {
    if (currentUser.role === 'GENEL_KOORDINATOR') return true;
    if (['BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(currentUser.role)) return q.status !== 'INCELEMEDE';
    if (currentUser.role === 'EDITOR') return ['ONAYLANDI','REDDEDILDI'].includes(q.status);
    if (currentUser.role === 'YAZAR') return q.author?.id === currentUser.id && ['TASLAK','REVIZYON','REDDEDILDI'].includes(q.status);
    return false;
  };

  const canRestoreQuestionUi = (q: ApiQuestion) => {
    if (currentUser.role === 'GENEL_KOORDINATOR') return true;
    if (['BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(currentUser.role)) return true;
    if (currentUser.role === 'EDITOR') return ['ONAYLANDI','REDDEDILDI'].includes(q.status);
    if (currentUser.role === 'YAZAR') return q.author?.id === currentUser.id && ['TASLAK','REVIZYON','REDDEDILDI'].includes(q.status);
    return false;
  };

  const canDeleteQuestionUi = (q: ApiQuestion) => {
    if (currentUser.role === 'GENEL_KOORDINATOR') return true;
    if (['BOLGE_KOORDINATORU','IL_KOORDINATORU'].includes(currentUser.role)) return q.isArchived && ['TASLAK','REVIZYON','REDDEDILDI'].includes(q.status);
    if (currentUser.role === 'EDITOR') return q.isArchived && q.status === 'REDDEDILDI';
    if (currentUser.role === 'YAZAR') return q.author?.id === currentUser.id && ['TASLAK','REVIZYON','REDDEDILDI'].includes(q.status);
    return false;
  };

  const handleQuestionArchive = async (q: ApiQuestion) => {
    const action = q.isArchived ? 'restore' : 'archive';
    const verb = action === 'archive' ? 'arşivlemek' : 'arşivden çıkarmak';
    if (!window.confirm(`#${q.id} numaralı soruyu ${verb} istediğinize emin misiniz?`)) return;
    try {
      await changeQuestionArchive(q.id, action);
      setToast(action === 'archive' ? 'Soru arşivlendi.' : 'Soru arşivden çıkarıldı.');
      await Promise.all([loadApiQuestions(), loadArchivedQuestions()]);
    } catch (e: any) {
      setToast(e.message || 'Soru arşiv işlemi başarısız.');
    }
  };

  const handleQuestionDelete = async (q: ApiQuestion) => {
    if (!window.confirm(`#${q.id} numaralı soruyu KALICI olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
      await deleteQuestion(q.id);
      setToast('Soru kalıcı olarak silindi.');
      await Promise.all([loadApiQuestions(), loadArchivedQuestions()]);
    } catch (e: any) {
      setToast(e.message || 'Soru silinemedi.');
    }
  };

  const questionList = questionView === 'archived' ? archivedQuestions : apiQuestions;
  const filteredQuestions = questionList.filter(q => {
    const authorName = q.author?.fullName || '';
    const branchName = q.author?.branchName || '';
    const projectTitle = q.project?.title || 'Genel Soru Havuzu';
    const statusLabel = statusDisplay(q.status);
    
    return (statusFilter === 'Tümü' || statusLabel === statusFilter) &&
      `${q.content} ${q.grade} ${q.objectiveCode || ''} ${authorName} ${branchName} ${projectTitle}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'));
  });
  
  function statusDisplay(status: ApiQuestionStatus) {
    const map: Record<ApiQuestionStatus, string> = {
      TASLAK: 'Taslak',
      INCELEMEDE: 'İncelemede',
      REVIZYON: 'Revizyon',
      ONAYLANDI: 'Onaylandı',
      REDDEDILDI: 'Reddedildi'
    };
    return map[status] || status;
  }
  function projectStatusDisplay(status: ApiProjectStatus) {
    const map: Record<ApiProjectStatus, string> = {
      Taslak: 'Taslak',
      Planlama: 'Planlama',
      Devam_Ediyor: 'Devam Ediyor',
      Kontrol: 'Kontrol',
      Tamamlandi: 'Tamamlandı',
      Arsiv: 'Arşiv'
    };
    return map[status];
  }
  const filteredProjects = apiProjects.filter(project =>
    `${project.title} ${project.code} ${project.branch.name} ${project.targetGrade} ${project.status}`
      .toLocaleLowerCase('tr-TR')
      .includes(query.toLocaleLowerCase('tr-TR'))
  );
  const filteredAuthors = apiAuthors.filter(author => (!authorProvince || author.province.name === authorProvince) && `${author.fullName} ${author.branch.name} ${author.province.name} ${author.institution?.name || ''}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR')));
  
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
      <div className="sidebar-bottom"><div className="sidebar-help"><Sparkles size={18} /><div><strong>Pilot çalışma alanı</strong><p>Oturum, Soru Havuzu, Projeler ve Yazar Ağı gerçek Pilot verisini kullanır. Hakedişler gerçek Pilot verileridir.</p></div></div><button className="reset-link" onClick={reset}><RotateCcw size={16} /> Örnek verileri sıfırla</button></div>
    </aside>
    {mobileMenu && <button className="mobile-shade" aria-label="Menüyü kapat" onClick={() => setMobileMenu(false)} />}
    <div className="demo-main">
      <header className="topbar">
  <div className="topbar-left">
    <button className="mobile-toggle" aria-label="Menüyü aç" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
    <div className="breadcrumbs"><span>Çalışma Alanı</span><ArrowRight size={14} /><strong>{sectionLabels[section]}</strong></div>
  </div>
  <div className="topbar-right">
    <span className="preview-badge"><span /> ETKİLEŞİMLİ ÖNİZLEME</span>
    <div className="topbar-profile">
      <button type="button" className="topbar-profile-main" onClick={() => setShowProfile(true)} title="Profilimi düzenle">
        <span className="profile-badge">
          {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="" /> : currentUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0,2)}
        </span>
        <span className="profile-info">
          <strong>{currentUser.fullName}</strong>
          <small>{roleLabels[currentUser.role]}</small>
        </span>
        <PencilLine size={14} className="profile-edit-glyph" />
      </button>
      <button className="logout-button" onClick={onLogoutRequest} title="Çıkış Yap" aria-label="Çıkış Yap">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  </div>
</header>
      <main className="content">
        <div className="demo-notice">
  <div><Sparkles size={17} /><strong>Pro Lig test ortamı</strong><span>Oturum, Soru Havuzu, Projeler ve Yazar Ağı gerçek Pilot verisini kullanır. Hakedişler gerçek Pilot verileridir.</span></div>
  <button onClick={() => navigate('roles')}>Rolleri incele <ArrowRight size={15} /></button>
</div>
        {section === 'overview' && currentUser.role === 'MUHASEBE' && <FinanceOverview apiPayments={apiPayments} data={data} onNavigate={navigate} currentUser={currentUser} />}
        {section === 'overview' && currentUser.role !== 'MUHASEBE' && <>
          <div className="page-heading"><div><div className="eyebrow">{todayHeading}</div><h1>Merhaba, {currentUser.fullName.split(' ')[0]} <span className="wave">✳</span></h1><p>{currentUser.role === 'YAZAR' ? 'Sorularınızı hazırlayın, editör değerlendirmesini takip edin.' : 'Üretim sürecindeki son durumu tek yerden takip edin.'}</p></div><span className="heading-chip"><ShieldCheck size={16} /> {roleLabels[currentUser.role]} görünümü</span></div>
          <div className="stats-grid">
            <StatCard label="Aktif projeler" value={activeProjects} note="Üretim takviminde" icon={BookOpen} tone="blue" />
            <StatCard label={currentUser.role === 'YAZAR' ? 'Sorularım' : 'İncelemede'} value={currentUser.role === 'YAZAR' ? apiQuestions.length : pendingQuestions} note={currentUser.role === 'YAZAR' ? 'Soru havuzunda' : 'Editör kararı bekliyor'} icon={FileQuestion} tone="amber" />
            {currentUser.role === 'EDITOR' ? <StatCard label="Revizyon bekleyen" value={apiQuestions.filter(q => q.status === 'REVIZYON').length} note="Yazara iletilen sorular" icon={RotateCcw} tone="purple" /> : currentUser.role === 'YAZAR' ? <StatCard label="Revizyonlarım" value={apiQuestions.filter(q => q.status === 'REVIZYON').length} note="Düzenleme bekleyen" icon={RotateCcw} tone="purple" /> : <StatCard label="Yazar ağı" value={apiAuthors.length.toString().padStart(2, '0')} note="Kapsamınızdaki yazarlar" icon={Users} tone="purple" />}
            <StatCard label="Tamamlanan sorular" value={apiQuestions.filter(q => q.status === 'ONAYLANDI').length.toString().padStart(2, '0')} note="Yayın hazırlığında" icon={CheckCircle2} tone="green" />
          </div>
          <div className="overview-grid"><section className="panel"><div className="panel-head"><div><span className="panel-kicker">İŞ AKIŞI</span><h2>Soru üretim hattı</h2></div><button className="text-button" onClick={() => navigate('questions')}>Tüm sorular <ArrowRight size={16} /></button></div><p className="panel-sub">Taslaklardan onaya uzanan süreci rolünüze göre deneyin.</p><div className="pipeline">{[{label: 'Taslak', code: 'TASLAK'}, {label: 'İncelemede', code: 'INCELEMEDE'}, {label: 'Revizyon', code: 'REVIZYON'}, {label: 'Onaylandı', code: 'ONAYLANDI'}].map((status, index) => <div key={status.code} className="pipeline-step"><span className={`pipeline-dot dot-${index}`}><span>{apiQuestions.filter(q => q.status === status.code).length}</span></span><strong>{status.label}</strong><small>{index === 0 ? 'Yazar hazırlar' : index === 1 ? 'Editör inceler' : index === 2 ? 'Yazar düzenler' : 'Yayına hazır'}</small>{index < 3 && <ArrowRight className="pipeline-arrow" size={17} />}</div>)}</div><div className="panel-action"><div className="action-icon"><CircleHelp size={20} /></div><div><strong>Rolünüzde neler yapabilirsiniz?</strong><span>Yetki matrisinde ekran ve işlem kapsamını görün.</span></div><button onClick={() => navigate('roles')}><ArrowUpRight size={18} /></button></div></section>
          <section className="panel activity-panel"><div className="panel-head"><div><span className="panel-kicker">SON HAREKETLER</span><h2>Güncel akış</h2></div><ActivityIcon size={19} className="muted-icon" /></div><div className="activity-list">{visibleActivities.slice(0, 4).map(item => <div className="activity-item" key={item.id}><span className={`activity-glyph ${item.type}`}>{item.type === 'payment' ? <Wallet size={16} /> : <FileQuestion size={16} />}</span><div><strong>{item.text}</strong><small>{item.actor} · {item.at}</small></div></div>)}</div></section></div>
          <section className="panel projects-preview"><div className="panel-head"><div><span className="panel-kicker">YAKLAŞAN TESLİMLER</span><h2>Devam eden projeler</h2></div><button className="text-button" onClick={() => navigate('projects')}>Projeleri görüntüle <ArrowRight size={16} /></button></div>{projectsLoading && <div className="empty-state">Projeler yükleniyor...</div>}{projectsError && !projectsLoading && <div className="empty-state">{projectsError}</div>}{!projectsLoading && !projectsError && <div className="project-mini-grid">{apiProjects.slice(0, 3).map(project => <div className="project-mini" key={project.id}><div className="project-mini-top"><span className="subject-icon">{project.branch.name.slice(0, 1)}</span><Status value={projectStatusDisplay(project.status)} /></div><strong>{project.title}</strong><small><Clock3 size={14} /> {date(project.deadline)}</small><div className="progress-line"><span style={{ width: `${project.progress}%` }} /></div><div className="progress-caption"><span>İlerleme</span><strong>%{project.progress}</strong></div></div>)}</div>}</section>
        </>}
        {section === 'questions' && <><div className="page-heading"><div><div className="eyebrow">İÇERİK ÜRETİMİ</div><h1>Soru Havuzu</h1><p>{currentUser.role === 'YAZAR' ? 'Taslak oluşturun ve sorularınızı editör incelemesine gönderin.' : 'Soruları inceleyin; onay, revizyon ve ret kararlarını yönetin.'}</p></div>{currentUser.role === 'YAZAR' && questionView === 'active' && <button className="primary-button" onClick={() => { setEditingQuestion(null); openQuestionForm(); }}><Plus size={18} /> Yeni soru taslağı</button>}</div><div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Sorularda ara" placeholder="Soru, branş veya yazar ara..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filter-box"><Filter size={16} /><select aria-label="Duruma göre filtrele" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{['Tümü', 'Taslak', 'İncelemede', 'Revizyon', 'Onaylandı', 'Reddedildi'].map(item => <option key={item}>{item}</option>)}</select></div><div className="question-view-toggle"><button className={questionView==='active'?'active':''} onClick={()=>setQuestionView('active')}><FileQuestion size={14}/> Aktif</button><button className={questionView==='archived'?'active':''} onClick={async()=>{setQuestionView('archived');if(archivedQuestions.length===0) await loadArchivedQuestions();}}><Archive size={14}/> Arşiv</button></div></div><div className="panel table-panel"><div className="table-heading"><strong>{filteredQuestions.length} soru</strong><span>Canlı Pilot verisi · Kayıtlar oturum rolünüzün sunucu kapsamına göre listelenir.</span></div>
{apiLoading && <div className="loading-state" style={{padding: '2rem', textAlign: 'center'}}>Sorular yükleniyor...</div>}
{apiError && !apiLoading && <div className="error-state" style={{padding: '2rem', textAlign: 'center', color: '#ef4444'}}><div>{apiError}</div><button className="secondary-button" onClick={loadApiQuestions} style={{marginTop: '1rem'}}><RotateCcw size={16} /> Tekrar Dene</button></div>}
{!apiLoading && !apiError && <div className="table-wrap"><table><thead><tr><th>SORU / KAZANIM</th><th>YAZAR</th><th>BRANŞ</th><th>PROJE</th><th>DURUM</th><th>GÜNCELLEME</th><th>İŞLEM</th></tr></thead><tbody>{filteredQuestions.map(q => {
  const canEdit = !q.isArchived && currentUser.role === 'YAZAR' && ['TASLAK', 'REVIZYON'].includes(q.status);
  const canReview = !q.isArchived && ['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && q.status === 'INCELEMEDE';
  const canArchive = q.isArchived ? canRestoreQuestionUi(q) : canArchiveQuestionUi(q);
  const canDelete = canDeleteQuestionUi(q);
  const hasAction = canEdit || canReview || canArchive || canDelete;
  return <tr key={q.id}><td><strong>{q.content}</strong><small>{q.objectiveCode || 'Kazanım yok'} · {q.grade} · #{q.id}</small>{q.editorNote && <small className="review-note"><MessageSquareText size={12} /> Editör notu: {q.editorNote}</small>}</td><td>{q.author?.fullName}</td><td>{q.author?.branchName || '-'}</td><td>{q.project?.title || 'Genel Soru Havuzu'}</td><td><Status value={statusDisplay(q.status)} /></td><td>{new Date(q.updatedAt).toLocaleDateString('tr-TR')}</td><td><div className="row-actions">{canEdit && <><button onClick={() => openYazarEdit(q)} title="Düzenle"><PencilLine size={15} /></button><button onClick={() => handleYazarSubmit(q)}>İncelemeye gönder <ArrowRight size={14} /></button></>}{canReview && <button onClick={() => openEditorReview(q)} title="Değerlendir"><CheckCircle2 size={15} /> İncele</button>}{canArchive && <button onClick={() => handleQuestionArchive(q)} title={q.isArchived?'Arşivden çıkar':'Arşivle'}>{q.isArchived?<ArchiveRestore size={15}/>:<Archive size={15}/>} {q.isArchived?'Geri al':'Arşivle'}</button>}{canDelete && <button className="danger-action" onClick={() => handleQuestionDelete(q)} title="Kalıcı sil"><Trash2 size={15}/> Sil</button>}{!hasAction && <span className="no-action">—</span>}</div></td></tr>;
})}</tbody></table>{filteredQuestions.length === 0 && <div className="empty-state">Bu filtreye uygun soru bulunamadı.</div>}</div>}</div></>}
          {section === 'projects' && <><div className="page-heading"><div><div className="eyebrow">YAYIN TAKVİMİ</div><h1>Projeler</h1><p>Sunucu kapsamınızdaki gerçek Pilot projelerinin ilerlemesini takip edin.</p></div><span className="heading-chip"><BookOpen size={16} /> {apiProjects.length} proje</span></div><div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Projelerde ara" placeholder="Proje, kod, branş veya sınıf ara..." value={query} onChange={e => setQuery(e.target.value)} /></div></div>{projectsLoading && <div className="panel empty-state">Projeler yükleniyor...</div>}{projectsError && !projectsLoading && <div className="panel empty-state"><div>{projectsError}</div><button className="secondary-button" onClick={loadApiProjects} style={{marginTop: '1rem'}}><RotateCcw size={16} /> Tekrar Dene</button></div>}{!projectsLoading && !projectsError && <div className="project-grid">{filteredProjects.map(project => <div className="panel project-card" key={project.id}><div className="project-card-top"><span className="subject-icon">{project.branch.name.slice(0, 1)}</span><Status value={projectStatusDisplay(project.status)} /></div><span className="project-code">{project.code}</span><h2>{project.title}</h2><p>{project.branch.name} · {project.targetGrade} · {project.projectType}</p><div className="project-meta"><span><Clock3 size={16} /> Son teslim</span><strong>{date(project.deadline)}</strong></div><div className="progress-line"><span style={{ width: `${project.progress}%` }} /></div><div className="progress-caption"><span>Tamamlanma</span><strong>%{project.progress}</strong></div></div>)}</div>}{!projectsLoading && !projectsError && filteredProjects.length === 0 && <div className="panel empty-state">Proje bulunamadı.</div>}</>}
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
                const summary = buildGradeLevelSummary(gradesByLevel[lvl] ?? [], apiAuthors, apiProjects, apiQuestions);
                return (
                  <div key={lvl} className="panel stat-card grade-level-card">
                    <div className="stat-top">
                      <strong>{lvl}</strong>
                      <div className="stat-icon" style={{background: '#eff6ff', color: '#3b82f6'}}><GraduationCap size={18} /></div>
                    </div>
                    <div className="grade-level-metrics">
                      <div><strong>{summary.authorsCount}</strong><span>Yazar</span></div>
                      <div><strong>{summary.activeProjectsCount}</strong><span>Aktif Proje</span></div>
                      <div><strong>{summary.questionsCount}</strong><span>Soru Havuzu</span></div>
                    </div>
                    <div className="grade-level-note">
                      {summary.unassignedQuestionsCount > 0
                        ? `${summary.unassignedQuestionsCount} soru henüz bir projeye bağlanmamış.`
                        : summary.questionsCount > 0
                          ? 'Bu kademedeki sorular proje kapsamıyla tutarlı.'
                          : 'Bu kademede henüz içerik bulunmuyor.'}
                    </div>
                  </div>
                );
              })}
            </div>
          </>}

        {section === 'authors' && <>
          <div className="page-heading"><div><div className="eyebrow">UZMAN AĞI · COĞRAFİ GÖRÜNÜM</div><h1>Türkiye Yazar Ağı</h1><p>Oturum kapsamınızdaki yazarların illere, branşlara ve proje kademelerine dağılımını inceleyin.</p></div><span className="heading-chip"><Users size={16} /> {apiAuthors.length} yazar</span></div>
          {authorsLoading && <div className="panel empty-state">Yazar ağı yükleniyor...</div>}
          {authorsError && !authorsLoading && <div className="panel empty-state"><div>{authorsError}</div><button className="secondary-button" onClick={loadApiAuthors} style={{marginTop: '1rem'}}><RotateCcw size={16} /> Tekrar Dene</button></div>}
          {!authorsLoading && !authorsError && <>
            <AuthorMap authors={authorMapAuthors} onShowAuthors={showAuthorsForProvince} />
            <section id="author-list" className="author-network-list">
              <div className="author-network-list-heading"><div><span className="panel-kicker">YAZAR REHBERİ</span><h2>{authorProvince ? `${authorProvince} yazarları` : 'Tüm yazarlar'}</h2><p>Haritadan bir il seçip listeyi süzebilir veya yazar ve branş arayabilirsiniz.</p></div><span className="heading-chip">{filteredAuthors.length} kayıt</span></div>
              <div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Yazarlarda ara" placeholder="Yazar, branş veya il ara..." value={query} onChange={event => setQuery(event.target.value)} /></div>{authorProvince && <button className="author-network-clear" onClick={() => setAuthorProvince('')}>{authorProvince} filtresini kaldır <X size={14} /></button>}</div>
              <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>YAZAR</th><th>BRANŞ</th><th>KADEME</th><th>İL</th><th>AKTİF PROJE</th><th>DURUM</th></tr></thead><tbody>{filteredAuthors.map(author => <tr key={author.id}><td><div className="person-cell"><span className="small-avatar">{author.fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toLocaleUpperCase('tr-TR')}</span><div><strong>{author.fullName}</strong><small>{author.title}{author.institution ? ` · ${author.institution.name}` : ''}</small></div></div></td><td><strong>{author.branch.name}</strong></td><td><div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>{author.projectGrades.length > 0 ? author.projectGrades.map(grade => <span key={grade} style={{background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#334155', border: '1px solid #e2e8f0'}}>{grade}</span>) : '—'}</div></td><td>{author.province.name}</td><td>{author.activeProjectCount}</td><td><Status value={author.status} /></td></tr>)}</tbody></table>{filteredAuthors.length === 0 && <div className="empty-state">{apiAuthors.length === 0 ? 'Oturum kapsamınızda yazar bulunamadı.' : 'Bu filtreye uygun yazar bulunamadı.'}</div>}</div></div>
            </section>
          </>}
        </>}
        {section === 'payments' && <><div className="page-heading"><div><div className="eyebrow">FİNANS AKIŞI</div><h1>Hakedişler</h1><p>Gerçek Pilot hakediş kayıtlarını onaylayın ve ödendi olarak işaretleyin.</p></div><span className="heading-chip"><Wallet size={16} /> Pilot verisi</span></div><div className="stats-grid payments-stats"><StatCard label="Bekleyen" value={moneyKurus(sumPayments(apiPayments, 'Bekliyor'))} note="Onay bekleyen hakediş" icon={Clock3} tone="amber" /><StatCard label="Onaylanan" value={moneyKurus(sumPayments(apiPayments, 'Onaylandi'))} note="Ödeme sırasına alınan" icon={CheckCircle2} tone="blue" /><StatCard label="Ödenen" value={moneyKurus(sumPayments(apiPayments, 'Odendi'))} note="Tamamlanan işlemler" icon={Wallet} tone="green" /></div><div className="panel table-panel"><div className="table-heading"><strong>Hakediş listesi</strong><span>Gerçek Pilot kayıtları</span></div>{paymentsLoading && <div className="loading-state" style={{padding: '2rem'}}>Yükleniyor...</div>}{paymentsError && !paymentsLoading && <div className="error-state" style={{padding: '2rem'}}><div>{paymentsError}</div><button className="secondary-button" onClick={fetchPayments} style={{marginTop: '1rem'}}><RotateCcw size={16} /> Tekrar Dene</button></div>}{!paymentsLoading && !paymentsError && <div className="table-wrap"><table><thead><tr><th>YAZAR</th><th>PROJE</th><th>TUTAR</th><th>ÖDEME TARİHİ</th><th>DURUM</th><th>İŞLEM</th></tr></thead><tbody>{apiPayments.map(payment => <tr key={payment.id}><td><strong>{payment.author?.fullName}</strong></td><td>{payment.project?.title || payment.contractNo}</td><td><strong>{moneyKurus(toKurus(payment.amount))}</strong></td><td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('tr-TR') : '-'}</td><td><Status value={payment.status === 'Onaylandi' ? 'Onaylandı' : payment.status === 'Odendi' ? 'Ödendi' : 'Bekliyor'} /></td><td><div className="row-actions">{payment.status !== 'Odendi' && payment.status !== 'Iptal' ? <button onClick={() => updatePayment(payment.id, payment.status)}>{payment.status === 'Bekliyor' ? 'Onayla' : 'Ödendi işaretle'} <ArrowRight size={14} /></button> : <span className="no-action">Tamamlandı</span>}</div></td></tr>)}</tbody></table>{apiPayments.length === 0 && <div className="empty-state">Hakediş kaydı bulunamadı.</div>}</div>}</div></>}
        {section === 'roles' && <><div className="page-heading"><div><div className="eyebrow">ERİŞİM MODELİ</div><h1>Rol ve Yetkiler</h1><p>Şu an Pilot oturumu ile {roleLabels[currentUser.role]} rolündesiniz.</p></div><span className="heading-chip"><LockKeyhole size={16} /> 6 Kanonik Rol</span></div><div className="roles-intro panel"><div className="roles-intro-icon"><ShieldCheck size={28} /></div><div><h2>Her rol için odaklanmış bir çalışma alanı</h2><p>Soru Havuzu, Projeler ve Yazar Ağı sunucu tarafında oturum rolünüze göre kapsamlanır. Hakedişler gerçek Pilot verileridir.</p></div></div><div className="panel matrix-panel"><div className="panel-head"><div><span className="panel-kicker">YETKİ MATRİSİ</span><h2>Görüntüleme kapsamı</h2></div></div><div className="table-wrap"><table className="matrix"><thead><tr><th>MODÜL</th>{roles.map(item => <th key={item} className={currentUser.role === item ? 'current-role' : ''}>{roleLabels[item]}</th>)}</tr></thead><tbody>{sections.map(item => <tr key={item.id}><td><strong>{sectionLabels[item.id]}</strong></td>{roles.map(persona => <td key={persona} className={currentUser.role === persona ? 'current-role' : ''}>{permissions[persona].includes(item.id) ? <span className="matrix-yes"><Check size={17} /></span> : <span className="matrix-no">—</span>}</td>)}</tr>)}</tbody></table></div></div><div className="roles-detail"><div className="panel"><span className="panel-kicker">SORU İŞLEMLERİ</span><h3>Yazar → Editör</h3><p>Yazar kendi taslağını incelemeye gönderir. Editör gelen soruyu onaylar, revizyona yollar veya reddeder.</p><button className="text-button" onClick={() => navigate('questions')}>Akışı dene <ArrowRight size={16} /></button></div><div className="panel"><span className="panel-kicker">FİNANS İŞLEMLERİ</span><h3>Onay → Ödeme</h3><p>Muhasebe ve Genel Koordinatör Pilot hakedişleri onaylayıp ödendi olarak işaretleyebilir.</p><button className="text-button" onClick={() => navigate('payments')}>Hakediş listesine git <ArrowRight size={16} /></button></div></div></>}
        {section === 'members' && <><div className="page-heading"><div><div className="eyebrow">ÜYELİK VE KULLANICI YÖNETİMİ</div><h1>Üye Yönetimi</h1><p>Başvuruları coğrafi yetki kapsamınıza göre değerlendirin ve izin verilen rollerde kullanıcı hesapları oluşturun.</p></div><span className="heading-chip"><Users size={16} /> Hiyerarşik kapsam</span></div><MemberManagement currentUser={currentUser} /></>}
        {section === 'roles' && currentUser.role === 'GENEL_KOORDINATOR' && <PermissionDetails currentRole={currentUser.role} />}
        {section === 'audit' && currentUser.role === 'GENEL_KOORDINATOR' && <><div className="page-heading"><div><div className="eyebrow">DENETİM İZİ</div><h1>İşlem Geçmişi</h1><p>Bu tarayıcıdaki örnek soru ve hakediş adımlarını izleyin.</p></div><span className="heading-chip"><ActivityIcon size={16} /> {data.activities.length} kayıt</span></div><div className="panel table-panel"><div className="table-heading"><strong>Son işlemler</strong><span>Demo verisi · Yerel tarayıcı kaydı</span></div><div className="table-wrap"><table><thead><tr><th>İŞLEM</th><th>UYGULAYAN</th><th>TÜR</th><th>ZAMAN</th></tr></thead><tbody>{data.activities.map(item => <tr key={item.id}><td><strong>{item.text}</strong></td><td>{item.actor}</td><td>{item.type === 'payment' ? 'Hakediş' : item.type === 'project' ? 'Proje' : 'Soru'}</td><td>{item.at}</td></tr>)}</tbody></table></div></div></>}
      </main>
    </div>
    {showQuestionForm && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowQuestionForm(false); setEditingQuestion(null); } }}><form className="question-modal pro-editor-modal" onSubmit={handleCreateQuestion}>
        <div className="modal-head"><div><span className="panel-kicker">PROFESYONEL SORU EDİTÖRÜ</span><h2>{editingQuestion ? 'Soruyu Düzenle' : 'Yeni soru taslağı'}</h2></div><button type="button" aria-label="Kapat" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}><X size={20} /></button></div>
        <p>Soru gövdesini hazırlayın, cevap seçeneklerini ve doğru yanıtı belirleyin.</p>
        <div className="question-context-grid"><label>Eğitim kademesi<select aria-label="Eğitim kademesi" value={questionLevel} onChange={event => changeQuestionLevel(event.target.value)}>{questionLevels.map(level => <option key={level}>{level}</option>)}</select></label><label>Sınıf<select aria-label="Sınıf" value={questionGrade} onChange={event => changeQuestionGrade(event.target.value)}>{questionGrades.map(grade => <option key={grade}>{grade}</option>)}</select></label></div>
        <label>Proje<select aria-label="Proje" value={questionProjectId ?? ''} disabled={projectsLoading} onChange={event => setQuestionProjectId(event.target.value ? Number(event.target.value) : null)}><option value="">{projectsLoading ? 'Projeler yükleniyor...' : 'Genel Soru Havuzu'}</option>{editingQuestion && originalQuestionProjectId !== null && !apiProjects.some(project => project.id === originalQuestionProjectId) && <option value={originalQuestionProjectId} disabled>Mevcut proje erişim kapsamınızda değil</option>}{!projectsError && apiProjects.map(project => <option key={project.id} value={project.id}>{project.code} · {project.title} · {project.targetGrade}</option>)}</select>{projectsError ? <small className="field-help" style={{color: '#b45309'}}>Atanmış projeler yüklenemedi; soru genel havuza kaydedilebilir.</small> : <small className="field-help">Genel havuzu veya size atanmış gerçek bir projeyi seçin.</small>}</label>
        <label className="question-editor-label">Soru gövdesi</label>
        <div className="question-editor-shell">
          <div className="question-editor-toolbar" aria-label="Metin biçimlendirme araçları">
            <button type="button" title="Kalın" aria-label="Kalın" onClick={() => applyQuestionMarkup('**')}><Bold size={16} /></button><button type="button" title="İtalik" aria-label="İtalik" onClick={() => applyQuestionMarkup('_')}><Italic size={16} /></button><button type="button" title="Altı çizili" aria-label="Altı çizili" onClick={() => applyQuestionMarkup('<u>', '</u>')}><Underline size={16} /></button><span />
            <button type="button" title="Madde işaretli liste" aria-label="Madde işaretli liste" onClick={() => applyQuestionList(false)}><List size={16} /></button><button type="button" title="Numaralı liste" aria-label="Numaralı liste" onClick={() => applyQuestionList(true)}><ListOrdered size={16} /></button><span />
            <button type="button" title="Formül ekle" aria-label="Formül ekle" onClick={() => applyQuestionMarkup('$', '$', 'formül')}><Sigma size={16} /></button><button type="button" title="Bağlantı ekle" aria-label="Bağlantı ekle" onClick={() => applyQuestionMarkup('[', '](https://)', 'bağlantı metni')}><Link size={16} /></button>
          </div>
          <textarea ref={questionEditorRef} autoFocus minLength={10} maxLength={1200} placeholder="Sorunun yönergesini ve içeriğini yazın..." value={questionTitle} onChange={event => setQuestionTitle(event.target.value)} required />
          <div className="question-editor-footer"><span></span><strong>{questionTitle.length} / 1200</strong></div>
        </div>
        <div className="question-answer-head"><div><strong>Cevap seçenekleri</strong><span>Doğru cevabı soldaki işaretle belirleyin.</span></div><span className="answer-key">Doğru cevap: {questionCorrectAnswer}</span></div>
        <div className="question-options-grid">{questionOptions.map((option, index) => { const letter = String.fromCharCode(65 + index); return <label className={`question-option ${questionCorrectAnswer === letter ? 'correct' : ''}`} key={letter}><input type="radio" name="correct-answer" checked={questionCorrectAnswer === letter} onChange={() => setQuestionCorrectAnswer(letter)} aria-label={`${letter} seçeneğini doğru cevap yap`} /><span>{letter}</span><input type="text" value={option} onChange={event => updateQuestionOption(index, event.target.value)} placeholder={`${letter} seçeneğini yazın`} required={!editingQuestion || hasFourValidQuestionOptions(editingQuestion.options)} /></label>; })}</div>
        <label>Çözüm ve açıklama <span className="optional-label">İsteğe bağlı</span><textarea className="question-explanation" maxLength={600} value={questionExplanation} onChange={event => setQuestionExplanation(event.target.value)} placeholder="Doğru cevabın gerekçesini veya editör notunu yazın..." /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}>Vazgeç</button><button type="submit" className="primary-button"><Plus size={17} /> Taslağı kaydet</button></div>
      </form></div>}
      {reviewingQuestion && ['EDITOR', 'GENEL_KOORDINATOR'].includes(currentUser.role) && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setReviewingQuestion(null); }}><form className="question-modal editor-review-modal" onSubmit={saveEditorReview}>
        <div className="modal-head"><div><span className="panel-kicker">EDİTÖR DEĞERLENDİRMESİ</span><h2>Soruyu İncele</h2></div><button type="button" aria-label="Kapat" onClick={() => setReviewingQuestion(null)}><X size={20} /></button></div>
        <p>Bu soru için değerlendirme kararınızı ve yazar için varsa notunuzu girin.</p>
        <div className="editor-review-context" style={{marginBottom: '1rem'}}><span>{reviewingQuestion.grade}</span><span>{reviewingQuestion.author?.fullName}</span></div>
        <div style={{background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0', fontSize: '0.9rem', whiteSpace: 'pre-wrap'}}>{reviewingQuestion.content}</div>
        <label>Aksiyon<select required value={reviewAction} onChange={e => { const val = e.target.value as QuestionWorkflowAction | ''; setReviewAction(val); if (val === 'approve') setEditorNote(''); }}><option value="">Seçiniz...</option><option value="approve">Onayla</option><option value="request_revision">Revizyon İste</option><option value="reject">Reddet</option></select></label>
        {reviewAction !== 'approve' && <label className="editor-note-box"><span><MessageSquareText size={15} /> Yazara editör notu</span><textarea maxLength={600} value={editorNote} onChange={event => setEditorNote(event.target.value)} placeholder="Revizyon ve ret işlemleri için zorunludur..." required={reviewAction === 'request_revision' || reviewAction === 'reject'} /><small className="editor-note-hint">Bu not, yazarın soru listesindeki ilgili kayıtta görünür.</small></label>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setReviewingQuestion(null)}>Vazgeç</button><button type="submit" className="primary-button" disabled={!reviewAction}><Check size={17} /> Kararı Kaydet</button></div>
      </form></div>}
      {showProfile && <ProfileModal user={currentUser} onClose={() => setShowProfile(false)} onSaved={async () => { await onProfileUpdated(); setToast('Profil bilgileriniz güncellendi.'); }} />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}</div>}
  </div>;
}
