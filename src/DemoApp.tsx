import { toKurus } from './payments/money';
import { AuthUser } from './auth/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  GraduationCap,
  Activity as ActivityIcon, Archive, ArchiveRestore, ArrowRight, ArrowUpRight, BarChart3, BookOpen,
  Bold, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock3,
  FileQuestion, Filter, ImagePlus, Italic, LayoutDashboard, Link, List, ListOrdered, MessageSquareText,
  LockKeyhole, MapPinned, Menu, Plus, RotateCcw, Search, ShieldCheck, Sigma, Sparkles, Globe2,
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
import { ALL_GRADES, buildGradeDetail, levelForGrade, projectQuestionStats } from './projects/integration';
import { ProjectManagementModal } from './projects/ProjectManagementModal';
import { TaskTracking } from './tasks/TaskTracking';
import { fetchTasks } from './tasks/api';
import type { ApiTask } from './tasks/types';
import { MessageCenter } from './messages/MessageCenter';
import { fetchMessages } from './messages/api';
import { fetchPayments as loadApiPayments, approvePayment, payPayment } from './payments/api';
import type { ApiPayment as Payment } from './payments/types';
import { fetchAuthors } from './authors/api';
import type { ApiAuthor } from './authors/types';
import { fetchAuditLogs } from './audit/api';
import type { ApiAuditLog } from './audit/types';
import { PaymentPeriodsPanel } from './compensation/PaymentPeriodsPanel';
import { CompensationRulesPanel } from './compensation/CompensationRulesPanel';
import { CompensationEntriesPanel } from './compensation/CompensationEntriesPanel';
import { ReportsCenter } from './reports/ReportsCenter';
import { MemberManagement } from './membership/MemberManagement';
import { ProfileModal } from './profile/ProfileModal';
import { buildGradeLevelSummary } from './demo/grade-summary';
import './demo.css';

const sections: { id: Section; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'grades', icon: GraduationCap },
  { id: 'questions', icon: FileQuestion },
  { id: 'projects', icon: BookOpen },
  { id: 'tasks', icon: ClipboardList },
  { id: 'messages', icon: MessageSquareText },
  { id: 'authors', icon: MapPinned },
  { id: 'reports', icon: BarChart3 },
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
  const slug = ({ 'İncelemede': 'review', 'Onaylandı': 'approved', 'Ödendi': 'paid', 'Revizyon': 'revision', 'Reddedildi': 'rejected', 'Taslak': 'draft', 'Bekliyor': 'pending', 'Aktif': 'approved', 'Davet edildi': 'pending', 'Üretimde': 'review', 'Editörde': 'revision', 'Planlama': 'draft', 'Tamamlandı': 'approved', 'İptal': 'rejected' } as Record<string, string>)[value] || 'draft';
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
    <div className="page-heading"><div><div className="eyebrow">{todayHeading}</div><h1>Merhaba, {currentUser.fullName.split(' ')[0]} <span className="wave">✳</span></h1><p>Telif ve ödeme kayıtlarını takip edin, ödeme akışını yönetin.</p></div><span className="heading-chip"><ShieldCheck size={16} /> Muhasebe görünümü</span></div>
    <div className="stats-grid">
      <StatCard label="Bekleyen telif" value={moneyKurus(sumPayments(apiPayments, 'Bekliyor'))} note="Onay sırasındaki tutar" icon={Clock3} tone="amber" />
      <StatCard label="Onaylanan" value={moneyKurus(sumPayments(apiPayments, 'Onaylandi'))} note="Ödeme sırasındaki tutar" icon={CheckCircle2} tone="blue" />
      <StatCard label="Ödenen" value={moneyKurus(sumPayments(apiPayments, 'Odendi'))} note="Tamamlanan ödeme" icon={Wallet} tone="green" />
      <StatCard label="Toplam kayıt" value={apiPayments.length} note="Pilot telif/ödeme kaydı" icon={ClipboardList} tone="purple" />
    </div>
    <div className="overview-grid">
      <section className="panel"><div className="panel-head"><div><span className="panel-kicker">FİNANS AKIŞI</span><h2>Telif ve ödeme süreci</h2></div><button className="text-button" onClick={() => onNavigate('payments')}>Tüm telif ve ödemeler <ArrowRight size={16} /></button></div><p className="panel-sub">Gerçek Pilot verisi onay ve ödeme adımları.</p><div className="pipeline" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>{(['Bekliyor', 'Onaylandi', 'Odendi'] as const).map((status, index) => <div key={status} className="pipeline-step"><span className={`pipeline-dot dot-${index + 1}`}><span>{apiPayments.filter(payment => payment.status === status).length}</span></span><strong>{status === 'Onaylandi' ? 'Onaylandı' : status === 'Odendi' ? 'Ödendi' : 'Bekliyor'}</strong><small>{index === 0 ? 'Kontrol edilir' : index === 1 ? 'Ödeme sırasına alınır' : 'Süreç tamamlanır'}</small>{index < 2 && <ArrowRight className="pipeline-arrow" size={17} />}</div>)}</div><div className="panel-action"><div className="action-icon"><Wallet size={20} /></div><div><strong>Ödeme sürecini yönetin</strong><span>Telif ve ödeme listesindeki işlemleri kullanın.</span></div><button onClick={() => onNavigate('payments')}><ArrowUpRight size={18} /></button></div></section>
      <section className="panel activity-panel"><div className="panel-head"><div><span className="panel-kicker">SON HAREKETLER (ÖRNEK)</span><h2>İşlem Geçmişi</h2></div><ActivityIcon size={19} className="muted-icon" /></div><div className="activity-list">{data.activities.filter(item => item.type === 'payment').slice(0, 4).map(item => <div className="activity-item" key={item.id}><span className="activity-glyph payment"><Wallet size={16} /></span><div><strong>{item.text}</strong><small>{item.actor} · {item.at}</small></div></div>)}</div></section>
    </div>
  </>;
}



const auditActionLabels: Record<string, string> = {
  PAYMENT_APPROVED: 'Telif/ödeme kaydı onaylandı',
  PAYMENT_PAID: 'Ödeme tamamlandı',
  PAYMENT_CANCELLED: 'Ödeme iptal edildi',
  PAYMENT_CREATED_FROM_SETTLEMENT: 'Dönemden ödeme oluşturuldu',
  PAYMENT_PERIOD_CREATED: 'Ödeme dönemi oluşturuldu',
  PAYMENT_PERIOD_PREPARED: 'Kazanımlar ödeme dönemine ayrıldı',
  PAYMENT_PERIOD_SETTLED: 'Ödeme paketi oluşturuldu',
  PAYMENT_PERIOD_CLOSED: 'Ödeme dönemi kapatıldı',
  PAYMENT_PERIOD_CANCELLED: 'Ödeme dönemi iptal edildi',
  COMPENSATION_RULE_CREATED: 'Ücret tarifesi oluşturuldu',
  COMPENSATION_RULE_REPLACED: 'Ücret tarifesi güncellendi',
  COMPENSATION_RULE_DEACTIVATED: 'Ücret tarifesi pasifleştirildi',
  USER_CREATED_AND_ASSIGNED: 'Kullanıcı oluşturuldu ve kapsam atandı',
  USER_ACTIVATED: 'Kullanıcı etkinleştirildi',
  USER_DEACTIVATED: 'Kullanıcı pasifleştirildi',
  USER_DELETED: 'Kullanıcı silindi',
  USER_ROLE_SCOPE_UPDATED: 'Kullanıcı rolü veya kapsamı güncellendi',
  MEMBERSHIP_APPLICATION_REVIEWED: 'Üyelik başvurusu değerlendirildi',
  MESSAGE_SENT: 'Kurumsal mesaj gönderildi',
  MESSAGE_ARCHIVED: 'Mesaj arşivlendi',
  MESSAGE_RESTORED: 'Mesaj arşivden çıkarıldı',
  TASK_CREATED: 'Görev oluşturuldu',
  TASK_UPDATED: 'Görev güncellendi',
  TASK_COMPLETED: 'Görev tamamlandı',
  QUESTION_SUBMITTED: 'Soru incelemeye gönderildi',
  QUESTION_APPROVED: 'Soru onaylandı',
  QUESTION_REVISION_REQUESTED: 'Soru için revizyon istendi',
  QUESTION_REJECTED: 'Soru reddedildi',
  QUESTION_ARCHIVED: 'Soru arşivlendi',
  QUESTION_RESTORED: 'Soru arşivden çıkarıldı',
  QUESTION_DELETED: 'Soru silindi'
};

const auditEntityLabels: Record<string, string> = {
  Payment: 'Telif / Ödeme',
  PaymentPeriod: 'Ödeme Dönemi',
  CompensationRule: 'Ücret Tarifesi',
  CompensationEntry: 'Ücret Kazanımı',
  User: 'Kullanıcı',
  Question: 'Soru',
  Project: 'Proje',
  Task: 'Görev',
  Message: 'Mesaj',
  Announcement: 'Duyuru',
  MembershipApplication: 'Üyelik Başvurusu'
};

function humanizeAuditAction(action: string) {
  return auditActionLabels[action] || action.split('_').map(part => part.charAt(0) + part.slice(1).toLocaleLowerCase('tr-TR')).join(' ');
}

function auditDetailSummary(details: string | null) {
  if (!details) return '';
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    const entries = Object.entries(parsed).slice(0, 4);
    return entries.map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`).join(' · ');
  } catch {
    return details;
  }
}

function AuditLogCenter({
  logs,
  loading,
  error,
  onRetry
}: {
  logs: ApiAuditLog[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [auditSearch, setAuditSearch] = useState('');
  const [auditType, setAuditType] = useState('Tümü');

  const types = useMemo(
    () => ['Tümü', ...Array.from(new Set(logs.map(log => log.entityType))).sort((a, b) => a.localeCompare(b, 'tr-TR'))],
    [logs]
  );

  const filtered = useMemo(() => {
    const term = auditSearch.trim().toLocaleLowerCase('tr-TR');
    return logs.filter(log => {
      if (auditType !== 'Tümü' && log.entityType !== auditType) return false;
      if (!term) return true;
      return `${log.userName} ${humanizeAuditAction(log.action)} ${auditEntityLabels[log.entityType] || log.entityType} ${auditDetailSummary(log.details)}`
        .toLocaleLowerCase('tr-TR')
        .includes(term);
    });
  }, [logs, auditSearch, auditType]);

  return <>
    <div className="page-heading audit-page-heading">
      <div>
        <div className="eyebrow">DENETİM İZİ</div>
        <h1>İşlem Geçmişi</h1>
        <p>Sistemde gerçekleşen kritik işlemleri gerçek veritabanı kayıtları üzerinden inceleyin.</p>
      </div>
      <span className="heading-chip"><ActivityIcon size={16}/> {logs.length} kayıt</span>
    </div>

    <section className="panel audit-workbench">
      <div className="audit-workbench-head">
        <div>
          <span className="panel-kicker">SİSTEM AKTİVİTESİ</span>
          <h2>Son işlemler</h2>
          <p>En yeni kayıtlar üstte gösterilir. Bu alan yalnız Genel Koordinatör tarafından görüntülenebilir.</p>
        </div>
        <button className="secondary-button" onClick={onRetry}><RotateCcw size={15}/> Yenile</button>
      </div>

      <div className="audit-toolbar">
        <div className="search-box audit-search">
          <Search size={17}/>
          <input
            value={auditSearch}
            onChange={event => setAuditSearch(event.target.value)}
            placeholder="Kullanıcı, işlem veya kayıt türü ara..."
            aria-label="İşlem geçmişinde ara"
          />
        </div>
        <div className="audit-type-tabs">
          {types.map(type => (
            <button key={type} className={auditType === type ? 'active' : ''} onClick={() => setAuditType(type)}>
              {type === 'Tümü' ? type : (auditEntityLabels[type] || type)}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="audit-state"><RotateCcw size={18} className="spin"/> İşlem geçmişi yükleniyor...</div>}
      {error && !loading && <div className="audit-state audit-state-error"><strong>{error}</strong><button className="secondary-button" onClick={onRetry}><RotateCcw size={15}/> Tekrar Dene</button></div>}
      {!loading && !error && <div className="table-wrap audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>ZAMAN</th><th>İŞLEM</th><th>UYGULAYAN</th><th>KAYIT TÜRÜ</th><th>DETAY</th></tr></thead>
          <tbody>{filtered.map(log => (
            <tr key={log.id}>
              <td><div className="audit-time"><strong>{date(log.createdAt)}</strong><small>{new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(new Date(log.createdAt))}</small></div></td>
              <td><div className="audit-action"><span><ActivityIcon size={14}/></span><strong>{humanizeAuditAction(log.action)}</strong></div></td>
              <td><strong>{log.userName}</strong></td>
              <td><span className="audit-entity-chip">{auditEntityLabels[log.entityType] || log.entityType}{log.entityId ? ` #${log.entityId}` : ''}</span></td>
              <td><span className="audit-detail">{auditDetailSummary(log.details) || '—'}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {filtered.length === 0 && <div className="audit-empty"><ActivityIcon size={24}/><strong>{logs.length ? 'Bu filtrede kayıt bulunamadı' : 'Henüz işlem kaydı yok'}</strong><span>{logs.length ? 'Arama veya kayıt türü filtresini değiştirin.' : 'Sistemde denetlenebilir bir işlem gerçekleştiğinde burada görünecek.'}</span></div>}
      </div>}
    </section>
  </>;
}


function PaymentCenter({
  payments,
  projects,
  loading,
  error,
  onRetry,
  onAdvance,
  currentUser
}: {
  payments: Payment[];
  projects: ApiProject[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onAdvance: (id: number, currentStatus: string) => void;
  currentUser: AuthUser;
}) {
  const [financeTab, setFinanceTab] = useState<'overview' | 'rates' | 'earnings' | 'periods'>('overview');
  const [paymentView, setPaymentView] = useState<'Tümü' | Payment['status']>('Tümü');
  const [paymentSearch, setPaymentSearch] = useState('');

  const activePayments = useMemo(() => payments.filter(payment => payment.status !== 'Iptal'), [payments]);
  const countFor = (status: Payment['status']) => payments.filter(payment => payment.status === status).length;
  const amountFor = (status: Payment['status']) => sumPayments(payments, status);
  const totalVolume = activePayments.reduce((sum, payment) => sum + toKurus(payment.amount), 0);

  const now = new Date();
  const paidThisMonth = payments.filter(payment => {
    if (payment.status !== 'Odendi' || !payment.paymentDate) return false;
    const paidAt = new Date(payment.paymentDate);
    return paidAt.getFullYear() === now.getFullYear() && paidAt.getMonth() === now.getMonth();
  });
  const paidThisMonthAmount = paidThisMonth.reduce((sum, payment) => sum + toKurus(payment.amount), 0);

  const filteredPayments = useMemo(() => {
    const term = paymentSearch.trim().toLocaleLowerCase('tr-TR');
    return payments.filter(payment => {
      if (paymentView !== 'Tümü' && payment.status !== paymentView) return false;
      if (!term) return true;
      return `${payment.author?.fullName || ''} ${payment.project?.title || ''} ${payment.project?.code || ''} ${payment.contractNo || ''}`
        .toLocaleLowerCase('tr-TR')
        .includes(term);
    });
  }, [payments, paymentView, paymentSearch]);

  const workflow = [
    { status: 'Bekliyor' as const, label: 'Onay Bekliyor', note: 'Kontrol edilip onaylanacak', tone: 'amber' },
    { status: 'Onaylandi' as const, label: 'Ödeme Sırasında', note: 'Ödendi olarak kapatılacak', tone: 'blue' },
    { status: 'Odendi' as const, label: 'Tamamlandı', note: 'Ödeme süreci kapandı', tone: 'green' }
  ];

  if (!['MUHASEBE', 'GENEL_KOORDINATOR'].includes(currentUser.role)) return <>
    <div className="page-heading"><div><div className="eyebrow">TELİF VE ÖDEMELER</div><h1>Telif Ekstrem</h1><p>Kendi kazanımlarınızı, ödeme dönemlerinizi ve tamamlanan ödemelerinizi izleyin.</p></div></div>
    <CompensationEntriesPanel personal key={currentUser.id}/>
  </>;

  return <>
    <div className="page-heading payment-page-heading">
      <div>
        <div className="eyebrow">FİNANS OPERASYONU</div>
        <h1>Telif ve Ödeme Merkezi</h1>
        <p>Onay bekleyen kayıtları kontrol edin, ödeme sırasını yönetin ve tamamlanan ödemeleri izleyin.</p>
      </div>
      <span className="heading-chip"><ShieldCheck size={16} /> {roleLabels[currentUser.role]} yetkisi</span>
    </div>

    <div className="payment-module-tabs" role="tablist" aria-label="Telif ve Ödemeler bölümleri">
      <button className={financeTab === 'overview' ? 'active' : ''} onClick={() => setFinanceTab('overview')}>Genel Bakış</button>
      <button className={financeTab === 'rates' ? 'active' : ''} onClick={() => setFinanceTab('rates')}>Ücret Tarifeleri</button>
      <button className={financeTab === 'earnings' ? 'active' : ''} onClick={() => setFinanceTab('earnings')}>Kazanılmış Ücretler</button>
      <button className={financeTab === 'periods' ? 'active' : ''} onClick={() => setFinanceTab('periods')}>Ödeme Dönemleri</button>
    </div>

    {financeTab === 'periods' ? (
      <PaymentPeriodsPanel currentRole={currentUser.role} onPaymentsChanged={onRetry}/>
    ) : financeTab === 'rates' ? (
      <CompensationRulesPanel projects={projects} currentRole={currentUser.role} />
    ) : financeTab === 'earnings' ? (
      <CompensationEntriesPanel />
    ) : <>

    <div className="payment-kpi-grid">
      <article className="panel payment-kpi">
        <span className="payment-kpi-icon amber"><Clock3 size={17}/></span>
        <div><small>ONAY BEKLEYEN</small><strong>{moneyKurus(amountFor('Bekliyor'))}</strong><span>{countFor('Bekliyor')} kayıt kontrol bekliyor</span></div>
      </article>
      <article className="panel payment-kpi">
        <span className="payment-kpi-icon blue"><CheckCircle2 size={17}/></span>
        <div><small>ÖDEME SIRASINDA</small><strong>{moneyKurus(amountFor('Onaylandi'))}</strong><span>{countFor('Onaylandi')} kayıt ödeme bekliyor</span></div>
      </article>
      <article className="panel payment-kpi">
        <span className="payment-kpi-icon green"><Wallet size={17}/></span>
        <div><small>BU AY ÖDENEN</small><strong>{moneyKurus(paidThisMonthAmount)}</strong><span>{paidThisMonth.length} ödeme tamamlandı</span></div>
      </article>
      <article className="panel payment-kpi">
        <span className="payment-kpi-icon purple"><Sigma size={17}/></span>
        <div><small>TOPLAM HACİM</small><strong>{moneyKurus(totalVolume)}</strong><span>{activePayments.length} aktif telif/ödeme kaydı</span></div>
      </article>
    </div>

    <section className="panel payment-flow-panel">
      <div className="panel-head payment-flow-head">
        <div><span className="panel-kicker">İŞLEM AKIŞI</span><h2>Telif ve ödeme durumu</h2></div>
        <span className="payment-flow-note">Bir sonraki işlemi bekleyen kayıtları öne çıkarır.</span>
      </div>
      <div className="payment-flow-grid">
        {workflow.map((step, index) => {
          const count = countFor(step.status);
          const amount = amountFor(step.status);
          const ratio = activePayments.length ? Math.round((count / activePayments.length) * 100) : 0;
          return <button key={step.status} className={`payment-flow-step ${paymentView === step.status ? 'active' : ''}`} onClick={() => setPaymentView(step.status)}>
            <span className={`payment-flow-number ${step.tone}`}>{index + 1}</span>
            <span className="payment-flow-copy"><strong>{step.label}</strong><small>{step.note}</small></span>
            <span className="payment-flow-metrics"><strong>{count}</strong><small>{moneyKurus(amount)}</small></span>
            <i><b style={{width: `${ratio}%`}} /></i>
          </button>;
        })}
      </div>
    </section>

    <section className="panel payment-workbench">
      <div className="payment-workbench-head">
        <div>
          <span className="panel-kicker">İŞLEM KUYRUĞU</span>
          <h2>Telif ve ödeme kayıtları</h2>
          <p>{filteredPayments.length} kayıt gösteriliyor.</p>
        </div>
        <button className="secondary-button payment-refresh" onClick={onRetry}><RotateCcw size={15}/> Yenile</button>
      </div>

      <div className="payment-toolbar">
        <div className="search-box payment-search">
          <Search size={17}/>
          <input
            value={paymentSearch}
            onChange={event => setPaymentSearch(event.target.value)}
            placeholder="Yazar, proje, kod veya sözleşme ara..."
            aria-label="Telif ve ödemelerde ara"
          />
        </div>
        <div className="payment-filter-tabs" aria-label="Telif ve ödeme durum filtresi">
          {(['Tümü', 'Bekliyor', 'Onaylandi', 'Odendi'] as const).map(status => (
            <button key={status} className={paymentView === status ? 'active' : ''} onClick={() => setPaymentView(status)}>
              {status === 'Onaylandi' ? 'Onaylandı' : status === 'Odendi' ? 'Ödendi' : status}
              <span>{status === 'Tümü' ? activePayments.length : countFor(status)}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="payment-state"><RotateCcw size={18} className="spin"/> Telif ve ödeme kayıtları yükleniyor...</div>}
      {error && !loading && <div className="payment-state payment-state-error"><strong>{error}</strong><span>Yetkiniz ve oturumunuz doğrulandıktan sonra tekrar deneyin.</span><button className="secondary-button" onClick={onRetry}><RotateCcw size={15}/> Tekrar Dene</button></div>}
      {!loading && !error && <div className="table-wrap payment-table-wrap">
        <table className="payment-table">
          <thead><tr><th>KAYIT</th><th>HAK SAHİBİ</th><th>PROJE / DÖNEM</th><th>TUTAR</th><th>DURUM</th><th>İŞLEM</th></tr></thead>
          <tbody>{filteredPayments.map(payment => {
            const statusLabel = payment.status === 'Onaylandi' ? 'Onaylandı' : payment.status === 'Odendi' ? 'Ödendi' : payment.status === 'Iptal' ? 'İptal' : 'Bekliyor';
            return <tr key={payment.id}>
              <td><div className="payment-date-cell"><strong>{date(payment.createdAt)}</strong><small>{payment.paymentDate ? `Ödeme: ${date(payment.paymentDate)}` : `#${payment.id}`}</small></div></td>
              <td><div className="person-cell"><span className="small-avatar">{(payment.author?.fullName || '—').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0,2).toLocaleUpperCase('tr-TR')}</span><div><strong>{payment.author?.fullName || 'Atanmamış'}</strong><small>Telif sahibi</small></div></div></td>
              <td><div className="payment-project-cell"><strong>{payment.project?.title || payment.paymentPeriod?.name || payment.contractNo || 'Bağlantısız kayıt'}</strong><small>{payment.project?.code || payment.paymentPeriod?.code || payment.contractNo || '—'}</small></div></td>
              <td><strong className="payment-amount">{moneyKurus(toKurus(payment.amount))}</strong></td>
              <td><Status value={statusLabel} /></td>
              <td><div className="row-actions payment-actions">
                {currentUser.role === 'MUHASEBE' && payment.status === 'Bekliyor' && <button onClick={() => onAdvance(payment.id, payment.status)}>Onayla <ArrowRight size={14}/></button>}
                {currentUser.role === 'MUHASEBE' && payment.status === 'Onaylandi' && <button onClick={() => onAdvance(payment.id, payment.status)}>Ödendi İşaretle <ArrowRight size={14}/></button>}
                {payment.status === 'Odendi' && <span className="no-action"><CheckCircle2 size={13}/> Tamamlandı</span>}
                {payment.status === 'Iptal' && <span className="no-action">İptal</span>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
        {filteredPayments.length === 0 && <div className="payment-empty">
          <Wallet size={24}/>
          <strong>{payments.length === 0 ? 'Henüz telif/ödeme kaydı yok' : 'Bu filtrede kayıt bulunamadı'}</strong>
          <span>{payments.length === 0 ? 'Telif ve ödeme kayıtları oluşturulduğunda finans akışı burada başlayacak.' : 'Arama veya durum filtresini değiştirin.'}</span>
        </div>}
      </div>}
    </section>
    </>}
  </>;
}

function PermissionDetails({ currentRole }: { currentRole: Role }) {
  return <div className="permission-details">
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">İŞLEM YETKİLERİ</span><h2>Kim hangi adımı uygulayabilir?</h2></div><ShieldCheck size={19} className="muted-icon" /></div><div className="table-wrap"><table className="matrix action-matrix"><thead><tr><th>İŞLEM</th>{roles.map(item => <th key={item} className={currentRole === item ? 'current-role' : ''}>{roleLabels[item]}</th>)}</tr></thead><tbody>{actionPermissions.map(action => <tr key={action.label}><td><strong>{action.label}</strong></td>{roles.map(persona => <td key={persona} className={currentRole === persona ? 'current-role' : ''}>{action.roles.includes(persona) ? <span className="matrix-yes"><Check size={17} /></span> : <span className="matrix-no">—</span>}</td>)}</tr>)}</tbody></table></div></section>
    <section className="panel scope-panel"><div className="panel-head"><div><span className="panel-kicker">VERİ KAPSAMI</span><h2>Görülen kayıtların sınırı</h2></div></div><div className="scope-list">{roles.map(persona => <div className={persona === currentRole ? 'selected' : ''} key={persona}><span className="small-avatar">{rolePeople[persona].split(' ').map(part => part[0]).join('')}</span><div><strong>{roleLabels[persona]}</strong><small>{dataScopes[persona]}</small></div></div>)}</div></section>
  </div>;
}


function AuthorNetworkInsights({
  authors,
  tasks,
  onProvinceSelect,
  onOpenTasks,
  onShowDirectory,
  onOpenGrades
}: {
  authors: ApiAuthor[];
  tasks: ApiTask[];
  onProvinceSelect: (province: string) => void;
  onOpenTasks: () => void;
  onShowDirectory: () => void;
  onOpenGrades: () => void;
}) {
  const provinceRows = useMemo(() => {
    const counts = new Map<string, number>();
    authors.forEach(author => counts.set(author.province.name, (counts.get(author.province.name) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr-TR')).slice(0, 5);
  }, [authors]);

  const branchRows = useMemo(() => {
    const counts = new Map<string, number>();
    authors.forEach(author => counts.set(author.branch.name, (counts.get(author.branch.name) || 0) + 1));
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr-TR'));
    const palette = ['#2b6cb0', '#2aa68c', '#f0a43c', '#7c69c8', '#ef6f61', '#49a6c6'];
    const primary = sorted.slice(0, 5).map(([name, count], index) => ({ name, count, color: palette[index] }));
    const remainder = sorted.slice(5).reduce((sum, [, count]) => sum + count, 0);
    if (remainder > 0) primary.push({ name: 'Diğer', count: remainder, color: palette[5] });
    return primary;
  }, [authors]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return tasks
      .filter(task => task.status !== 'Tamamlandi' && new Date(task.dueDate).getTime() >= todayStart)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4)
      .map(task => {
        const due = new Date(task.dueDate);
        const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
        const days = Math.max(0, Math.ceil((dueStart - todayStart) / 86400000));
        return { ...task, days };
      });
  }, [tasks]);

  const recentAuthors = useMemo(
    () => [...authors].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
    [authors]
  );

  const levelRows = useMemo(() => Object.entries(gradesByLevel).map(([level, grades]) => ({
    level,
    count: authors.filter(author => author.projectGrades.some(grade => grades.includes(grade))).length
  })), [authors]);

  const total = authors.length || 1;
  const maxProvince = Math.max(1, ...provinceRows.map(([, count]) => count));
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const donutRows = branchRows.map(item => {
    const fraction = item.count / total;
    const dash = fraction * circumference;
    const row = { ...item, dash, offset: -(accumulated * circumference) };
    accumulated += fraction;
    return row;
  });

  return (
    <section className="author-insights" aria-label="Yazar ağı analitik özeti">
      <article className="panel author-insight-card author-insight-provinces">
        <div className="author-insight-head">
          <div><MapPinned size={16}/><strong>İllere Göre Yazar Dağılımı</strong></div>
          <button onClick={onShowDirectory}>Tümünü Gör</button>
        </div>
        <div className="author-province-bars">
          {provinceRows.length ? provinceRows.map(([province, count]) => (
            <button key={province} className="author-province-row" onClick={() => onProvinceSelect(province)}>
              <span>{province}</span><strong>{count}</strong>
              <i><b style={{ width: `${Math.max(10, Math.round((count / maxProvince) * 100))}%` }} /></i>
            </button>
          )) : <div className="author-insight-empty">İl dağılımı için yazar kaydı yok.</div>}
        </div>
      </article>

      <article className="panel author-insight-card author-insight-branches">
        <div className="author-insight-head">
          <div><ActivityIcon size={16}/><strong>Branşlara Göre Dağılım</strong></div>
          <span>{authors.length} yazar</span>
        </div>
        <div className="author-branch-body">
          <div className="author-donut">
            <svg viewBox="0 0 80 80" aria-label="Branş dağılımı">
              <circle cx="40" cy="40" r={radius} className="author-donut-track" />
              {donutRows.map(item => <circle
                key={item.name}
                cx="40" cy="40" r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="10"
                strokeDasharray={`${item.dash} ${circumference}`}
                strokeDashoffset={item.offset}
              />)}
            </svg>
            <div><strong>{authors.length}</strong><span>yazar</span></div>
          </div>
          <div className="author-branch-legend">
            {branchRows.map(item => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name}</span><strong>{item.count}</strong></div>)}
            {!branchRows.length && <div className="author-insight-empty">Branş verisi yok.</div>}
          </div>
        </div>
      </article>

      <article className="panel author-insight-card author-insight-deadlines">
        <div className="author-insight-head">
          <div><Clock3 size={16}/><strong>Yaklaşan Teslim Tarihleri</strong></div>
          <button onClick={onOpenTasks}>Görevler</button>
        </div>
        <div className="author-deadline-list">
          {upcomingTasks.length ? upcomingTasks.map(task => (
            <button key={task.id} onClick={onOpenTasks}>
              <span className="author-deadline-date">{date(task.dueDate)}</span>
              <span><strong>{task.title}</strong><small>{task.project.title}</small></span>
              <em className={task.days <= 3 ? 'urgent' : task.days <= 7 ? 'soon' : ''}>{task.days === 0 ? 'bugün' : `${task.days} gün`}</em>
            </button>
          )) : <div className="author-insight-empty">Yaklaşan açık görev bulunmuyor.</div>}
        </div>
      </article>

      <article className="panel author-insight-card author-insight-recent">
        <div className="author-insight-head">
          <div><Users size={16}/><strong>Son Eklenen Yazarlar</strong></div>
          <button onClick={onShowDirectory}>Tümünü Gör</button>
        </div>
        <div className="author-recent-list">
          {recentAuthors.length ? recentAuthors.map(author => {
            const initials = author.fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toLocaleUpperCase('tr-TR');
            return <button key={author.id} onClick={onShowDirectory}>
              <span className="small-avatar">{initials}</span>
              <span><strong>{author.fullName}</strong><small>{author.province.name} · {author.branch.name}</small></span>
              <time>{new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(new Date(author.createdAt))}</time>
            </button>;
          }) : <div className="author-insight-empty">Yazar kaydı bulunmuyor.</div>}
        </div>
      </article>

      <article className="panel author-insight-card author-insight-levels">
        <div className="author-insight-head">
          <div><GraduationCap size={16}/><strong>Kademelere Göre Dağılım</strong></div>
          <button onClick={onOpenGrades}>Kademeler</button>
        </div>
        <div className="author-level-list">
          {levelRows.map(({ level, count }) => (
            <button key={level} onClick={onOpenGrades}>
              <span>{level}</span>
              <i><b style={{ width: `${authors.length ? Math.max(count ? 12 : 0, Math.round((count / authors.length) * 100)) : 0}%` }} /></i>
              <strong>{count}</strong>
            </button>
          ))}
          <small>Bir yazar, görev aldığı proje kademelerine göre birden fazla satırda yer alabilir.</small>
        </div>
      </article>
    </section>
  );
}

export default function DemoApp({ currentUser, onLogoutRequest, onProfileUpdated, onPublicSiteRequest }: { currentUser: AuthUser; onLogoutRequest: () => void; onProfileUpdated: () => Promise<void>; onPublicSiteRequest: () => void }) {
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
  const [authorInsightTasks, setAuthorInsightTasks] = useState<ApiTask[]>([]);
  const [reportTasks, setReportTasks] = useState<ApiTask[]>([]);
  const [reportTasksLoading, setReportTasksLoading] = useState(false);
  const [reportTasksError, setReportTasksError] = useState('');
  const [authorsLoading, setAuthorsLoading] = useState(false);
  const [authorsError, setAuthorsError] = useState('');
  const [apiPayments, setApiPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  
  const fetchPayments = async () => {
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      setApiPayments(await loadApiPayments());
    } catch (e: any) {
      setPaymentsError(e.message || 'Telif ve ödeme kayıtları yüklenemedi.');
    } finally {
      setPaymentsLoading(false);
    }
  };
  
  useEffect(() => {
    if (['MUHASEBE', 'GENEL_KOORDINATOR'].includes(currentUser.role)) {
      fetchPayments();
    }
  }, [currentUser.role]);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    setAuditError('');
    try {
      setAuditLogs(await fetchAuditLogs(150));
    } catch (error: any) {
      setAuditError(error.message || 'İşlem geçmişi yüklenemedi.');
    } finally {
      setAuditLoading(false);
    }
  };




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
    fetchMessages('inbox').then(result => setMessageUnreadCount(result.counts.unread)).catch(() => undefined);
  }, []);
    const [section, setSection] = useState<Section>('overview');
    useEffect(() => {
      if (section !== 'audit' || currentUser.role !== 'GENEL_KOORDINATOR') return;
      loadAuditLogs();
    }, [section, currentUser.role]);
    useEffect(() => {
      if (section !== 'authors') return;
      if (!['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'].includes(currentUser.role)) return;
      fetchTasks().then(setAuthorInsightTasks).catch(() => setAuthorInsightTasks([]));
    }, [section, currentUser.role]);
    useEffect(() => {
      if (section !== 'reports' || currentUser.role === 'MUHASEBE') return;
      setReportTasksLoading(true);
      setReportTasksError('');
      fetchTasks()
        .then(setReportTasks)
        .catch((error: any) => {
          setReportTasks([]);
          setReportTasksError(error?.message || 'Görev raporu yüklenemedi.');
        })
        .finally(() => setReportTasksLoading(false));
    }, [section, currentUser.role]);
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
  const [questionProjectFilter, setQuestionProjectFilter] = useState<number | null>(null);
  const [questionGradeFilter, setQuestionGradeFilter] = useState('');
  const [projectGradeFilter, setProjectGradeFilter] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('8. Sınıf');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [taskProjectFilter, setTaskProjectFilter] = useState<number | null>(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [topbarSearch, setTopbarSearch] = useState('');
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
  const selectedProject = selectedProjectId ? apiProjects.find(project => project.id === selectedProjectId) ?? null : null;
  const canCreateProjects = ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'].includes(currentUser.role);
  const selectedGradeDetail = buildGradeDetail(selectedGrade, apiProjects, apiQuestions);
  const questionAssignableProjects = apiProjects.filter(project =>
    !['Tamamlandi', 'Arsiv'].includes(project.status) || project.id === originalQuestionProjectId
  );
  
  const navigate = (target: Section) => {
    if (!allowed.includes(target)) return;
    setSection(target);
    setQuery('');
    setAuthorProvince('');
    setStatusFilter('Tümü');
    setQuestionProjectFilter(null);
    setQuestionGradeFilter('');
    setProjectGradeFilter('');
    setSelectedProjectId(null);
    setTaskProjectFilter(null);
    setMobileMenu(false);
  };

  const openProjectsForGrade = (grade: string) => {
    if (!allowed.includes('projects')) return;
    setProjectGradeFilter(grade);
    setSelectedProjectId(null);
    setQuery('');
    setSection('projects');
    setMobileMenu(false);
  };

  const openQuestionsForProject = (projectId: number) => {
    if (!allowed.includes('questions')) return;
    setQuestionProjectFilter(projectId);
    setQuestionGradeFilter('');
    setQuestionView('active');
    setQuery('');
    setStatusFilter('Tümü');
    setSelectedProjectId(null);
    setSection('questions');
    setMobileMenu(false);
  };

  const openQuestionsForGrade = (grade: string) => {
    if (!allowed.includes('questions')) return;
    setQuestionGradeFilter(grade);
    setQuestionProjectFilter(null);
    setQuestionView('active');
    setQuery('');
    setStatusFilter('Tümü');
    setSection('questions');
    setMobileMenu(false);
  };

  const openTasksForProject = (projectId: number) => {
    if (!allowed.includes('tasks')) return;
    setTaskProjectFilter(projectId);
    setSelectedProjectId(null);
    setSection('tasks');
    setMobileMenu(false);
  };

  const openNewProject = () => {
    if (!canCreateProjects) return;
    setEditingProject(null);
    setShowProjectManager(true);
  };

  const openProjectEdit = (project: ApiProject) => {
    if (!project.canManage) return;
    setEditingProject(project);
    setSelectedProjectId(null);
    setShowProjectManager(true);
  };

  const refreshProjectManagementData = async () => {
    await Promise.all([loadApiProjects(), loadApiAuthors()]);
    setToast('Proje bilgileri güncellendi.');
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
    if (questionProjectId !== null) return;
    setQuestionGrade(grade);
  };

  const changeQuestionProject = (value: string) => {
    const projectId = value ? Number(value) : null;
    setQuestionProjectId(projectId);
    if (projectId === null) return;
    const project = apiProjects.find(item => item.id === projectId);
    if (!project) return;
    const level = levelForGrade(project.targetGrade);
    if (level) setQuestionLevel(level);
    setQuestionGrade(project.targetGrade);
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
    
    const linkedProject = question.projectId ? apiProjects.find(project => project.id === question.projectId) : null;
    const grade = linkedProject?.targetGrade || question.grade || '8. Sınıf';
    const level = levelForGrade(grade) || 'Ortaokul';
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
        setToast('Telif/ödeme kaydı onaylandı.');
      } else if (currentStatus === 'Onaylandi') {
        await payPayment(id);
        setToast('Ödeme tamamlandı.');
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
      (!questionProjectFilter || q.projectId === questionProjectFilter) &&
      (!questionGradeFilter || q.grade === questionGradeFilter || (q.projectId ? apiProjects.find(project => project.id === q.projectId)?.targetGrade === questionGradeFilter : false)) &&
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
    (!projectGradeFilter || project.targetGrade === projectGradeFilter) &&
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

  const runTopbarSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const term = topbarSearch.trim();
    if (!term) return;
    const normalized = term.toLocaleLowerCase('tr-TR');

    const authorMatch = apiAuthors.some(author =>
      `${author.fullName} ${author.branch.name} ${author.province.name} ${author.district?.name || ''} ${author.institution?.name || ''}`
        .toLocaleLowerCase('tr-TR').includes(normalized)
    );
    if (authorMatch && allowed.includes('authors')) {
      setSection('authors');
      setAuthorProvince('');
      setQuery(term);
      setMobileMenu(false);
      return;
    }

    const projectMatch = apiProjects.some(project =>
      `${project.title} ${project.code} ${project.branch.name} ${project.targetGrade}`
        .toLocaleLowerCase('tr-TR').includes(normalized)
    );
    if (projectMatch && allowed.includes('projects')) {
      setSection('projects');
      setProjectGradeFilter('');
      setQuery(term);
      setSelectedProjectId(null);
      setMobileMenu(false);
      return;
    }

    const questionMatch = apiQuestions.some(question =>
      `${question.content} ${question.grade || ''} ${question.author?.fullName || ''} ${question.author?.branchName || ''}`
        .toLocaleLowerCase('tr-TR').includes(normalized)
    );
    if (questionMatch && allowed.includes('questions')) {
      setSection('questions');
      setQuestionView('active');
      setQuestionProjectFilter(null);
      setQuestionGradeFilter('');
      setStatusFilter('Tümü');
      setQuery(term);
      setMobileMenu(false);
      return;
    }

    setToast(`"${term}" için erişilebilir bir sonuç bulunamadı.`);
  };

  const topbarQuickSections = sections.filter(item =>
    ['overview', 'projects', 'tasks', 'messages', 'authors'].includes(item.id) && allowed.includes(item.id)
  );

  return <div className="demo-shell">
    <aside className={`demo-sidebar ${mobileMenu ? 'open' : ''}`}>
      <div className="brand app-brand">
        <img className="app-brand-logo" src="/brand/prolig-logo-inverse.png" alt="PRO-LİG — Yayın ve İçerik Yönetim Platformu" />
      </div>
      <div className="sidebar-caption">ÇALIŞMA ALANI</div>
      <nav aria-label="Ana menü">{sections.filter(item => allowed.includes(item.id)).map(({ id, icon: Icon }) => <button key={id} className={`nav-link ${section === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={19} /><span>{sectionLabels[id]}</span>{id === 'questions' && pendingQuestions > 0 && <em>{pendingQuestions}</em>}{id === 'messages' && messageUnreadCount > 0 && <em>{messageUnreadCount}</em>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><Sparkles size={18} /><div><strong>Pilot çalışma alanı</strong><p>Oturum, Soru Havuzu, Projeler ve Yazar Ağı gerçek Pilot verisini kullanır. Telif ve ödeme kayıtları gerçek Pilot verileridir.</p></div></div><button className="reset-link" onClick={reset}><RotateCcw size={16} /> Örnek verileri sıfırla</button></div>
    </aside>
    {mobileMenu && <button className="mobile-shade" aria-label="Menüyü kapat" onClick={() => setMobileMenu(false)} />}
    <div className="demo-main">
      <header className="topbar topbar-command">
        <div className="topbar-brand-message">
          <button className="mobile-toggle" aria-label="Menüyü aç" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
          <div><strong>Yayın üretiminde</strong><span>daha güçlü ekipler için…</span></div>
        </div>

        <form className="topbar-global-search" onSubmit={runTopbarSearch}>
          <Search size={16}/>
          <input
            value={topbarSearch}
            onChange={event => setTopbarSearch(event.target.value)}
            placeholder="Yazar, il, branş, proje veya soru ara..."
            aria-label="PRO-LİG genel arama"
          />
          <button type="submit" aria-label="Ara"><Search size={16}/></button>
        </form>

        <nav className="topbar-quick-nav" aria-label="Hızlı modül geçişi">
          {topbarQuickSections.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? 'active' : ''}
              onClick={() => navigate(id)}
              title={sectionLabels[id]}
            >
              <span className="topbar-quick-icon">
                <Icon size={17}/>
                {id === 'messages' && messageUnreadCount > 0 && <em>{messageUnreadCount}</em>}
              </span>
              <small>{id === 'overview' ? 'Ana Sayfa' : id === 'tasks' ? 'Görevler' : id === 'authors' ? 'Yazar Ağı' : sectionLabels[id]}</small>
            </button>
          ))}
        </nav>

        <div className="topbar-command-actions">
          <button type="button" className="topbar-site-button" onClick={onPublicSiteRequest} title="Kurumsal Sayfa">
            <Globe2 size={16}/>
          </button>
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
  <div><Sparkles size={17} /><strong>Pro Lig test ortamı</strong><span>Oturum, Soru Havuzu, Projeler ve Yazar Ağı gerçek Pilot verisini kullanır. Telif ve ödeme kayıtları gerçek Pilot verileridir.</span></div>
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
        {section === 'questions' && <><div className="page-heading"><div><div className="eyebrow">İÇERİK ÜRETİMİ</div><h1>Soru Havuzu</h1><p>{currentUser.role === 'YAZAR' ? 'Taslak oluşturun ve sorularınızı editör incelemesine gönderin.' : 'Soruları inceleyin; onay, revizyon ve ret kararlarını yönetin.'}</p></div>{currentUser.role === 'YAZAR' && questionView === 'active' && <button className="primary-button" onClick={() => { setEditingQuestion(null); openQuestionForm(); }}><Plus size={18} /> Yeni soru taslağı</button>}</div><div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Sorularda ara" placeholder="Soru, branş veya yazar ara..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filter-box"><Filter size={16} /><select aria-label="Duruma göre filtrele" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>{['Tümü', 'Taslak', 'İncelemede', 'Revizyon', 'Onaylandı', 'Reddedildi'].map(item => <option key={item}>{item}</option>)}</select></div><div className="question-view-toggle"><button className={questionView==='active'?'active':''} onClick={()=>setQuestionView('active')}><FileQuestion size={14}/> Aktif</button><button className={questionView==='archived'?'active':''} onClick={async()=>{setQuestionView('archived');if(archivedQuestions.length===0) await loadArchivedQuestions();}}><Archive size={14}/> Arşiv</button></div></div>{(questionProjectFilter||questionGradeFilter)&&<div className="context-filter-bar"><span>{questionProjectFilter?apiProjects.find(project=>project.id===questionProjectFilter)?.title||'Proje filtresi':questionGradeFilter}</span><button onClick={()=>{setQuestionProjectFilter(null);setQuestionGradeFilter('')}}>Filtreyi kaldır <X size={13}/></button></div>}<div className="panel table-panel"><div className="table-heading"><strong>{filteredQuestions.length} soru</strong><span>Canlı Pilot verisi · Kayıtlar oturum rolünüzün sunucu kapsamına göre listelenir.</span></div>
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
          {section === 'projects' && <>
            <div className="page-heading">
              <div><div className="eyebrow">YAYIN TAKVİMİ</div><h1>Projeler</h1><p>Sunucu kapsamınızdaki projeleri; sınıf, yazar ve soru üretimiyle birlikte yönetin.</p></div>
              <div className="page-heading-actions"><span className="heading-chip"><BookOpen size={16} /> {filteredProjects.length} proje</span>{canCreateProjects&&<button className="primary-button" onClick={openNewProject}><Plus size={17}/> Yeni Proje</button>}</div>
            </div>
            <div className="toolbar">
              <div className="search-box"><Search size={18} /><input aria-label="Projelerde ara" placeholder="Proje, kod, branş veya sınıf ara..." value={query} onChange={e => setQuery(e.target.value)} /></div>
              {projectGradeFilter && <button className="context-filter-chip" onClick={()=>setProjectGradeFilter('')}>{projectGradeFilter} <X size={13}/></button>}
            </div>
            {projectsLoading && <div className="panel empty-state">Projeler yükleniyor...</div>}
            {projectsError && !projectsLoading && <div className="panel empty-state"><div>{projectsError}</div><button className="secondary-button" onClick={loadApiProjects} style={{marginTop: '1rem'}}><RotateCcw size={16} /> Tekrar Dene</button></div>}
            {!projectsLoading && !projectsError && <div className="project-grid">{filteredProjects.map(project => {
              const stats = projectQuestionStats(project.id, apiQuestions);
              return <button type="button" className="panel project-card project-card-button" key={project.id} onClick={()=>setSelectedProjectId(project.id)}>
                <div className="project-card-top"><span className="subject-icon">{project.branch.name.slice(0, 1)}</span><Status value={projectStatusDisplay(project.status)} /></div>
                <span className="project-code">{project.code}</span>
                <h2>{project.title}</h2>
                <p>{project.branch.name} · {project.targetGrade} · {project.projectType}</p>
                <div className="project-card-counts">
                  <span><Users size={14}/><strong>{project.authors.length}</strong> Yazar</span>
                  <span><FileQuestion size={14}/><strong>{stats.total}</strong> Soru</span>
                  <span><CheckCircle2 size={14}/><strong>{stats.approved}</strong> Onaylı</span>
                  <span><ClipboardList size={14}/><strong>{project.taskCount ?? 0}</strong> Görev</span>
                </div>
                <div className="project-meta"><span><Clock3 size={16} /> Son teslim</span><strong>{date(project.deadline)}</strong></div>
                <div className="progress-line"><span style={{ width: project.progress + '%' }} /></div>
                <div className="progress-caption"><span>Tamamlanma</span><strong>%{project.progress}</strong></div>
                <span className="project-open-hint">Detayı aç <ArrowRight size={14}/></span>
              </button>;
            })}</div>}
            {!projectsLoading && !projectsError && filteredProjects.length === 0 && <div className="panel empty-state">Proje bulunamadı.</div>}
          </>}
        {section === 'tasks' && <TaskTracking currentUser={currentUser} projects={apiProjects} authors={apiAuthors} initialProjectId={taskProjectFilter} onProjectFilterChange={setTaskProjectFilter} />}
        {section === 'messages' && <MessageCenter onUnreadChange={setMessageUnreadCount} />}
        {section === 'grades' && <>
          <div className="page-heading">
            <div>
              <div className="eyebrow">EĞİTİM KADEMELERİ</div>
              <h1>Sınıflar ve Kademeler</h1>
              <p>Kademe özetinden sınıf düzeyine inin; ilgili projeleri, yazarları ve soru üretimini aynı bağlamda görün.</p>
            </div>
            <span className="heading-chip"><GraduationCap size={16} /> 13 Sınıf Düzeyi</span>
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
                      ? summary.unassignedQuestionsCount + ' soru henüz bir projeye bağlanmamış.'
                      : summary.questionsCount > 0
                        ? 'Bu kademedeki sorular proje kapsamıyla tutarlı.'
                        : 'Bu kademede henüz içerik bulunmuyor.'}
                  </div>
                </div>
              );
            })}
          </div>

          <section className="panel grade-directory">
            <div className="panel-head"><div><span className="panel-kicker">SINIF DÜZEYİ</span><h2>1–12. Sınıf ve Mezun</h2></div><span className="heading-chip">{ALL_GRADES.length} düzey</span></div>
            <div className="grade-selector-grid">{ALL_GRADES.map(grade => {
              const detail = buildGradeDetail(grade, apiProjects, apiQuestions);
              return <button key={grade} className={selectedGrade===grade?'active':''} onClick={()=>setSelectedGrade(grade)}>
                <strong>{grade}</strong><span>{detail.activeProjects.length} proje · {detail.questions.length} soru</span>
              </button>;
            })}</div>
          </section>

          <section className="panel grade-detail-panel">
            <div className="grade-detail-head">
              <div><span className="panel-kicker">{selectedGradeDetail.level||'SINIF'}</span><h2>{selectedGrade}</h2><p>Bu sınıfa bağlı gerçek proje, yazar ve aktif soru havuzu özeti.</p></div>
              <div className="grade-detail-actions">
                <button className="secondary-button" onClick={()=>openProjectsForGrade(selectedGrade)}>Projeleri aç <BookOpen size={15}/></button>
                <button className="secondary-button" onClick={()=>openQuestionsForGrade(selectedGrade)}>Soruları aç <FileQuestion size={15}/></button>
              </div>
            </div>
            <div className="grade-detail-stats">
              <div><strong>{selectedGradeDetail.activeProjects.length}</strong><span>Aktif Proje</span></div>
              <div><strong>{selectedGradeDetail.authors.length}</strong><span>Yazar</span></div>
              <div><strong>{selectedGradeDetail.questions.length}</strong><span>Soru</span></div>
              <div><strong>{selectedGradeDetail.approvedQuestions}</strong><span>Onaylı</span></div>
              <div><strong>{selectedGradeDetail.reviewQuestions}</strong><span>İncelemede</span></div>
            </div>
            <div className="grade-detail-columns">
              <div>
                <div className="grade-detail-subhead"><strong>Projeler</strong><span>{selectedGradeDetail.projects.length} kayıt</span></div>
                {selectedGradeDetail.projects.length ? selectedGradeDetail.projects.map(project =>
                  <button key={project.id} className="grade-project-row" onClick={()=>setSelectedProjectId(project.id)}>
                    <span><strong>{project.title}</strong><small>{project.code} · {project.branch.name}</small></span><Status value={projectStatusDisplay(project.status)}/>
                  </button>
                ) : <div className="grade-detail-empty">Bu sınıfta proje yok.</div>}
              </div>
              <div>
                <div className="grade-detail-subhead"><strong>Yazarlar</strong><span>{selectedGradeDetail.authors.length} kişi</span></div>
                {selectedGradeDetail.authors.length ? <div className="grade-author-list">{selectedGradeDetail.authors.map(author =>
                  <span key={author.id}><Users size={13}/>{author.fullName}{author.provinceName ? ' · ' + author.provinceName : ''}</span>
                )}</div> : <div className="grade-detail-empty">Bu sınıfta yazar yok.</div>}
              </div>
              <div>
                <div className="grade-detail-subhead"><strong>Soru akışı</strong><span>{selectedGradeDetail.questions.length} soru</span></div>
                <div className="grade-question-flow">
                  <span>Genel havuz <strong>{selectedGradeDetail.unassignedQuestions}</strong></span>
                  <span>İncelemede <strong>{selectedGradeDetail.reviewQuestions}</strong></span>
                  <span>Onaylı <strong>{selectedGradeDetail.approvedQuestions}</strong></span>
                </div>
              </div>
            </div>
          </section>
        </>}

        {section === 'authors' && <>
          <div className="page-heading"><div><div className="eyebrow">UZMAN AĞI · COĞRAFİ GÖRÜNÜM</div><h1>Türkiye Yazar Ağı</h1><p>Oturum kapsamınızdaki yazarların illere, branşlara ve proje kademelerine dağılımını inceleyin.</p></div><span className="heading-chip"><Users size={16} /> {apiAuthors.length} yazar</span></div>
          {authorsLoading && <div className="panel empty-state">Yazar ağı yükleniyor...</div>}
          {authorsError && !authorsLoading && <div className="panel empty-state"><div>{authorsError}</div><button className="secondary-button" onClick={loadApiAuthors} style={{marginTop: '1rem'}}><RotateCcw size={16} /> Tekrar Dene</button></div>}
          {!authorsLoading && !authorsError && <>
            <AuthorMap authors={authorMapAuthors} onShowAuthors={showAuthorsForProvince} />
            <AuthorNetworkInsights
              authors={apiAuthors}
              tasks={authorInsightTasks}
              onProvinceSelect={showAuthorsForProvince}
              onOpenTasks={() => navigate('tasks')}
              onShowDirectory={() => document.getElementById('author-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              onOpenGrades={() => navigate('grades')}
            />
            <section id="author-list" className="author-network-list">
              <div className="author-network-list-heading"><div><span className="panel-kicker">YAZAR REHBERİ</span><h2>{authorProvince ? `${authorProvince} yazarları` : 'Tüm yazarlar'}</h2><p>Haritadan bir il seçip listeyi süzebilir veya yazar ve branş arayabilirsiniz.</p></div><span className="heading-chip">{filteredAuthors.length} kayıt</span></div>
              <div className="toolbar"><div className="search-box"><Search size={18} /><input aria-label="Yazarlarda ara" placeholder="Yazar, branş veya il ara..." value={query} onChange={event => setQuery(event.target.value)} /></div>{authorProvince && <button className="author-network-clear" onClick={() => setAuthorProvince('')}>{authorProvince} filtresini kaldır <X size={14} /></button>}</div>
              <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>YAZAR</th><th>BRANŞ</th><th>KADEME</th><th>İL</th><th>AKTİF PROJE</th><th>DURUM</th></tr></thead><tbody>{filteredAuthors.map(author => <tr key={author.id}><td><div className="person-cell"><span className="small-avatar">{author.fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toLocaleUpperCase('tr-TR')}</span><div><strong>{author.fullName}</strong><small>{author.title}{author.institution ? ` · ${author.institution.name}` : ''}</small></div></div></td><td><strong>{author.branch.name}</strong></td><td><div style={{display: 'flex', gap: '4px', flexWrap: 'wrap'}}>{author.projectGrades.length > 0 ? author.projectGrades.map(grade => <span key={grade} style={{background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#334155', border: '1px solid #e2e8f0'}}>{grade}</span>) : '—'}</div></td><td>{author.province.name}</td><td>{author.activeProjectCount}</td><td><Status value={author.status} /></td></tr>)}</tbody></table>{filteredAuthors.length === 0 && <div className="empty-state">{apiAuthors.length === 0 ? 'Oturum kapsamınızda yazar bulunamadı.' : 'Bu filtreye uygun yazar bulunamadı.'}</div>}</div></div>
            </section>
          </>}
        </>}
        {section === 'reports' && <ReportsCenter
          projects={apiProjects}
          questions={apiQuestions}
          tasks={reportTasks}
          authors={apiAuthors}
          payments={apiPayments}
          role={currentUser.role}
          tasksLoading={reportTasksLoading}
          tasksError={reportTasksError}
          authorsError={authorsError}
        />}
        {section === 'payments' && <PaymentCenter
          payments={apiPayments}
          projects={apiProjects}
          loading={paymentsLoading}
          error={paymentsError}
          onRetry={fetchPayments}
          onAdvance={updatePayment}
          currentUser={currentUser}
        />}
        {section === 'roles' && <><div className="page-heading"><div><div className="eyebrow">ERİŞİM MODELİ</div><h1>Rol ve Yetkiler</h1><p>Şu an Pilot oturumu ile {roleLabels[currentUser.role]} rolündesiniz.</p></div><span className="heading-chip"><LockKeyhole size={16} /> 6 Kanonik Rol</span></div><div className="roles-intro panel"><div className="roles-intro-icon"><ShieldCheck size={28} /></div><div><h2>Her rol için odaklanmış bir çalışma alanı</h2><p>Soru Havuzu, Projeler ve Yazar Ağı sunucu tarafında oturum rolünüze göre kapsamlanır. Telif ve ödeme kayıtları gerçek Pilot verileridir.</p></div></div><div className="panel matrix-panel"><div className="panel-head"><div><span className="panel-kicker">YETKİ MATRİSİ</span><h2>Görüntüleme kapsamı</h2></div></div><div className="table-wrap"><table className="matrix"><thead><tr><th>MODÜL</th>{roles.map(item => <th key={item} className={currentUser.role === item ? 'current-role' : ''}>{roleLabels[item]}</th>)}</tr></thead><tbody>{sections.map(item => <tr key={item.id}><td><strong>{sectionLabels[item.id]}</strong></td>{roles.map(persona => <td key={persona} className={currentUser.role === persona ? 'current-role' : ''}>{permissions[persona].includes(item.id) ? <span className="matrix-yes"><Check size={17} /></span> : <span className="matrix-no">—</span>}</td>)}</tr>)}</tbody></table></div></div><div className="roles-detail"><div className="panel"><span className="panel-kicker">SORU İŞLEMLERİ</span><h3>Yazar → Editör</h3><p>Yazar kendi taslağını incelemeye gönderir. Editör gelen soruyu onaylar, revizyona yollar veya reddeder.</p><button className="text-button" onClick={() => navigate('questions')}>Akışı dene <ArrowRight size={16} /></button></div><div className="panel"><span className="panel-kicker">FİNANS İŞLEMLERİ</span><h3>Onay → Ödeme</h3><p>Muhasebe ödeme sürecini yürütür; Genel Koordinatör finansal durumu denetler.</p><button className="text-button" onClick={() => navigate('payments')}>Telif ve ödemelere git <ArrowRight size={16} /></button></div></div></>}
        {section === 'members' && <><div className="page-heading"><div><div className="eyebrow">ÜYELİK VE KULLANICI YÖNETİMİ</div><h1>Üye Yönetimi</h1><p>Başvuruları coğrafi yetki kapsamınıza göre değerlendirin ve izin verilen rollerde kullanıcı hesapları oluşturun.</p></div><span className="heading-chip"><Users size={16} /> Hiyerarşik kapsam</span></div><MemberManagement currentUser={currentUser} /></>}
        {section === 'roles' && currentUser.role === 'GENEL_KOORDINATOR' && <PermissionDetails currentRole={currentUser.role} />}
        {section === 'audit' && currentUser.role === 'GENEL_KOORDINATOR' && <AuditLogCenter logs={auditLogs} loading={auditLoading} error={auditError} onRetry={loadAuditLogs} />}
      </main>
    </div>
    {selectedProject && <div className="modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedProjectId(null)}}><div className="project-detail-modal">
      <div className="modal-head"><div><span className="panel-kicker">PROJE DETAYI</span><h2>{selectedProject.title}</h2></div><button type="button" aria-label="Kapat" onClick={()=>setSelectedProjectId(null)}><X size={20}/></button></div>
      <div className="project-detail-summary">
        <div><span>Proje Kodu</span><strong>{selectedProject.code}</strong></div>
        <div><span>Branş</span><strong>{selectedProject.branch.name}</strong></div>
        <div><span>Sınıf</span><strong>{selectedProject.targetGrade}</strong></div>
        <div><span>Durum</span><Status value={projectStatusDisplay(selectedProject.status)}/></div>
      </div>
      <p className="project-detail-description">{selectedProject.description||'Bu proje için açıklama girilmemiş.'}</p>
      {(()=>{const stats=projectQuestionStats(selectedProject.id,apiQuestions);return <div className="project-detail-metrics">
        <div><strong>{selectedProject.authors.length}</strong><span>Yazar</span></div>
        <div><strong>{stats.total}</strong><span>Soru</span></div>
        <div><strong>{stats.review}</strong><span>İncelemede</span></div>
        <div><strong>{stats.approved}</strong><span>Onaylı</span></div>
        <div><strong>{selectedProject.taskCount ?? 0}</strong><span>Görev</span></div>
        <div><strong>%{selectedProject.progress}</strong><span>İlerleme</span></div>
      </div>})()}
      <div className="project-detail-body">
        <div>
          <div className="grade-detail-subhead"><strong>Proje yazarları</strong><span>{selectedProject.authors.length} kişi</span></div>
          {selectedProject.authors.length?<div className="project-author-list">{selectedProject.authors.map(author=><span key={author.id}><span className="small-avatar">{author.fullName.split(' ').filter(Boolean).map(part=>part[0]).join('').slice(0,2).toLocaleUpperCase('tr-TR')}</span><span><strong>{author.fullName}</strong><small>{author.province.name}</small></span></span>)}</div>:<div className="grade-detail-empty">Projeye henüz yazar atanmamış.</div>}
        </div>
        <div>
          <div className="grade-detail-subhead"><strong>Takvim</strong></div>
          <div className="project-timeline-info"><span><Clock3 size={15}/> Son teslim <strong>{date(selectedProject.deadline)}</strong></span><span><GraduationCap size={15}/> Hedef sınıf <strong>{selectedProject.targetGrade}</strong></span></div>
        </div>
      </div>
      <div className="project-detail-footer">
        {selectedProject.canManage&&<button className="secondary-button project-manage-button" onClick={()=>openProjectEdit(selectedProject)}><PencilLine size={15}/> Projeyi Düzenle</button>}
        <button className="secondary-button" onClick={()=>openTasksForProject(selectedProject.id)}>Görevleri aç <ClipboardList size={15}/></button>
        <button className="secondary-button" onClick={()=>{setSelectedGrade(selectedProject.targetGrade);setSelectedProjectId(null);setSection('grades')}}>Sınıfı aç <GraduationCap size={15}/></button>
        <button className="primary-button" onClick={()=>openQuestionsForProject(selectedProject.id)}>Proje sorularını aç <ArrowRight size={15}/></button>
      </div>
    </div></div>}
    {showQuestionForm && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setShowQuestionForm(false); setEditingQuestion(null); } }}><form className="question-modal pro-editor-modal" onSubmit={handleCreateQuestion}>
        <div className="modal-head"><div><span className="panel-kicker">PROFESYONEL SORU EDİTÖRÜ</span><h2>{editingQuestion ? 'Soruyu Düzenle' : 'Yeni soru taslağı'}</h2></div><button type="button" aria-label="Kapat" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}><X size={20} /></button></div>
        <p>Soru gövdesini hazırlayın, cevap seçeneklerini ve doğru yanıtı belirleyin.</p>
        <label>Proje<select aria-label="Proje" value={questionProjectId ?? ''} disabled={projectsLoading} onChange={event => changeQuestionProject(event.target.value)}><option value="">{projectsLoading ? 'Projeler yükleniyor...' : 'Genel Soru Havuzu'}</option>{editingQuestion && originalQuestionProjectId !== null && !apiProjects.some(project => project.id === originalQuestionProjectId) && <option value={originalQuestionProjectId} disabled>Mevcut proje erişim kapsamınızda değil</option>}{!projectsError && questionAssignableProjects.map(project => <option key={project.id} value={project.id}>{project.code} · {project.title} · {project.targetGrade}</option>)}</select>{projectsError ? <small className="field-help" style={{color: '#b45309'}}>Atanmış projeler yüklenemedi; soru genel havuza kaydedilebilir.</small> : questionProjectId ? <small className="field-help project-grade-lock"><LockKeyhole size={12}/> Sınıf, seçilen projenin hedef sınıfından otomatik alınır ve değiştirilemez.</small> : <small className="field-help">Genel havuzu veya size atanmış aktif bir projeyi seçin.</small>}</label>
        <div className="question-context-grid"><label>Eğitim kademesi<select aria-label="Eğitim kademesi" value={questionLevel} disabled={questionProjectId!==null} onChange={event => changeQuestionLevel(event.target.value)}>{questionLevels.map(level => <option key={level}>{level}</option>)}</select></label><label>Sınıf<select aria-label="Sınıf" value={questionGrade} disabled={questionProjectId!==null} onChange={event => changeQuestionGrade(event.target.value)}>{questionGrades.map(grade => <option key={grade}>{grade}</option>)}</select></label></div>
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
      {showProjectManager && <ProjectManagementModal project={editingProject} authors={apiAuthors} onClose={()=>{setShowProjectManager(false);setEditingProject(null)}} onChanged={refreshProjectManagementData} />}
      {showProfile && <ProfileModal user={currentUser} onClose={() => setShowProfile(false)} onSaved={async () => { await onProfileUpdated(); setToast('Profil bilgileriniz güncellendi.'); }} />}
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} /> {toast}</div>}
  </div>;
}

