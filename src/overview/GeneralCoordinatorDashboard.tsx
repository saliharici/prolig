import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, ClipboardCheck, Users, Wallet } from 'lucide-react';
import type { ApiProject } from '../projects/types';
import type { ApiQuestion } from '../questions/types';
import type { Role } from '../demo/model';
import { fetchCompensationSummary } from '../compensation/api';
import type { CompensationSummary } from '../compensation/types';
import { fetchAuthorPerformanceReport, formatKurus, parseKurus } from '../reports/author-performance';
import type { AuthorPerformanceReport } from '../reports/author-performance';
import { overdueProjects, reviewQueue, topAuthorProductivity } from './coordinator-analytics';
import './general-coordinator-dashboard.css';

type Props = {
  role: Role;
  userId: number;
  projects: ApiProject[];
  projectsLoading: boolean;
  projectsError: string;
  questions: ApiQuestion[];
  questionsLoading: boolean;
  questionsError: string;
  onProjects: () => void;
  onOpenProject: (id: number) => void;
  onReviewQuestions: () => void;
  onReports: () => void;
  onPayments: () => void;
};

const shortDate = (value: string) => {
  const part = value.slice(0, 10);
  const date = new Date(part + 'T12:00:00');
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export function GeneralCoordinatorDashboard({
  role, userId, projects, projectsLoading, projectsError,
  questions, questionsLoading, questionsError,
  onProjects, onOpenProject, onReviewQuestions, onReports, onPayments
}: Props) {
  const authorized = role === 'GENEL_KOORDINATOR';
  const [authorReport, setAuthorReport] = useState<AuthorPerformanceReport | null>(null);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [authorError, setAuthorError] = useState('');
  const [fees, setFees] = useState<CompensationSummary | null>(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesError, setFeesError] = useState('');

  useEffect(() => {
    let active = true;
    setAuthorReport(null);
    setFees(null);
    setAuthorError('');
    setFeesError('');
    if (!authorized) {
      setAuthorLoading(false);
      setFeesLoading(false);
      return () => { active = false; };
    }
    setAuthorLoading(true);
    setFeesLoading(true);
    void fetchAuthorPerformanceReport()
      .then(result => { if (active) setAuthorReport(result); })
      .catch(error => {
        if (active) setAuthorError(error instanceof Error ? error.message : 'Yazar raporu yüklenemedi.');
      })
      .finally(() => { if (active) setAuthorLoading(false); });
    void fetchCompensationSummary()
      .then(result => { if (active) setFees(result); })
      .catch(error => {
        if (active) setFeesError(error instanceof Error ? error.message : 'Telif özeti yüklenemedi.');
      })
      .finally(() => { if (active) setFeesLoading(false); });
    return () => { active = false; };
  }, [authorized, userId]);

  const overdue = useMemo(() => overdueProjects(projects), [projects]);
  const pending = useMemo(() => reviewQueue(questions), [questions]);
  const topAuthors = useMemo(() =>
    topAuthorProductivity(authorReport?.rows ?? []).slice(0, 5), [authorReport]);
  const pendingRoyalties = fees
    ? formatKurus(parseKurus(fees.waiting) + parseKurus(fees.inProcess)) : null;

  if (!authorized) return null;

  return <section className="coordinator-dashboard" aria-label="Genel Koordinatör Üretim ve Yönetim Paneli">
    <div className="coordinator-dashboard-heading">
      <div>
        <span className="panel-kicker">GENEL KOORDİNATÖR · OPERASYON ÖZETİ</span>
        <h2>Üretim ve Yönetim Paneli</h2>
        <p>Geciken işler, editör kuyruğu, yazar üretimi ve ödenmemiş telifler bir arada.</p>
      </div>
      <button type="button" className="secondary-button" onClick={onReports}>
        Ayrıntılı raporlar <ArrowRight size={15}/>
      </button>
    </div>

    <div className="coordinator-dashboard-metrics">
      <article>
        <span><AlertTriangle size={15}/> Geciken proje</span>
        <strong>{projectsLoading || projectsError ? '—' : overdue.length}</strong>
        <small>{projectsLoading ? 'Projeler yükleniyor' : projectsError ? 'Veri alınamadı' : 'Tamamlanmamış, tarihi geçen'}</small>
      </article>
      <article>
        <span><ClipboardCheck size={15}/> Editör incelemesinde</span>
        <strong>{questionsLoading || questionsError ? '—' : pending.length}</strong>
        <small>{questionsLoading ? 'Sorular yükleniyor' : questionsError ? 'Veri alınamadı' : 'Aktif soru kuyruğu'}</small>
      </article>
      <article>
        <span><Users size={15}/> Üreten yazar</span>
        <strong>{authorLoading || authorError || !authorReport ? '—'
          : topAuthorProductivity(authorReport.rows).filter(author => author.total > 0).length}</strong>
        <small>{authorLoading ? 'Performans yükleniyor' : authorError ? 'Veri alınamadı' : 'En az bir aktif proje sorusu'}</small>
      </article>
      <article>
        <span><Wallet size={15}/> Ödenmemiş tahakkuk</span>
        <strong>{feesLoading || feesError || !fees ? '—' : pendingRoyalties}</strong>
        <small>{feesLoading ? 'Telifler yükleniyor' : feesError ? 'Veri alınamadı' : 'Bekleyen + ödeme sürecindeki'}</small>
      </article>
    </div>

    <div className="coordinator-dashboard-grid">
      <section className="panel coordinator-dashboard-card">
        <div className="panel-head">
          <div><span className="panel-kicker">TAKVİM RİSKLERİ</span><h3>Geciken projeler</h3></div>
          <button className="text-button" type="button" onClick={onProjects}>Tüm projeler <ArrowRight size={14}/></button>
        </div>
        {projectsLoading ? <p className="coordinator-dashboard-notice">Projeler yükleniyor…</p>
          : projectsError ? <p className="coordinator-dashboard-notice" role="alert">{projectsError}</p>
          : overdue.length ? <div className="coordinator-dashboard-list">
              {overdue.slice(0, 5).map(({ project, overdueDays }) =>
                <button key={project.id} type="button" onClick={() => onOpenProject(project.id)}>
                  <span><strong>{project.title}</strong><small>{project.code} · {project.branch.name} · Son teslim {shortDate(project.deadline)}</small></span>
                  <em>{overdueDays} gün</em>
                  <ArrowRight size={15}/>
                </button>)}
            </div>
          : <p className="coordinator-dashboard-notice">Son teslim tarihi geçmiş aktif proje yok.</p>}
        {overdue.length > 5 && !projectsLoading && !projectsError && <p className="coordinator-dashboard-footnote">İlk 5 risk gösteriliyor. Diğerleri Projeler bölümünde.</p>}
      </section>

      <section className="panel coordinator-dashboard-card">
        <div className="panel-head">
          <div><span className="panel-kicker">EDITÖR KUYRUĞU</span><h3>Karar bekleyen sorular</h3></div>
          <button className="text-button" type="button" onClick={onReviewQuestions}>Soru havuzu <ArrowRight size={14}/></button>
        </div>
        {questionsLoading ? <p className="coordinator-dashboard-notice">Soru kuyruğu yükleniyor…</p>
          : questionsError ? <p className="coordinator-dashboard-notice" role="alert">{questionsError}</p>
          : pending.length ? <div className="coordinator-dashboard-list">
              {pending.slice(0, 5).map(question =>
                <button key={question.id} type="button" onClick={onReviewQuestions}>
                  <span><strong>#{question.id} · {question.project?.title || 'Genel Soru Havuzu'}</strong>
                    <small>{question.author?.fullName || 'Yazar bilinmiyor'} · Son güncelleme {shortDate(question.updatedAt)}</small></span>
                  <ArrowRight size={15}/>
                </button>)}
            </div>
          : <p className="coordinator-dashboard-notice">İncelemede bekleyen aktif soru yok.</p>}
        <p className="coordinator-dashboard-footnote">Sıralama son güncelleme tarihine göredir; gönderim zamanı olarak yorumlanmaz.</p>
      </section>

      <section className="panel coordinator-dashboard-card">
        <div className="panel-head">
          <div><span className="panel-kicker">YAZAR ÜRETİMİ</span><h3>Performans özeti</h3></div>
          <button className="text-button" type="button" onClick={onReports}>Yazar raporları <ArrowRight size={14}/></button>
        </div>
        {authorLoading ? <p className="coordinator-dashboard-notice">Yazar üretimi yükleniyor…</p>
          : authorError ? <p className="coordinator-dashboard-notice" role="alert">{authorError}</p>
          : authorReport && topAuthors.length ? <div className="coordinator-dashboard-authors">
              {topAuthors.map(author => <div key={author.userId}>
                <span><strong>{author.name}</strong><small>{author.projectCount} proje · {author.total} aktif soru</small></span>
                <span><strong>{author.approved}</strong><small>onaylı</small></span>
              </div>)}
            </div>
          : <p className="coordinator-dashboard-notice">Projelerde yazar üretim kaydı bulunamadı.</p>}
        <p className="coordinator-dashboard-footnote">Yazar başına bir satır; aynı yazarın farklı projelerdeki soruları birlikte sayılır.</p>
      </section>

      <section className="panel coordinator-dashboard-card">
        <div className="panel-head">
          <div><span className="panel-kicker">TELİF YÜKÜMLÜLÜKLERİ</span><h3>Tahakkuk ve ödeme durumu</h3></div>
          <button className="text-button" type="button" onClick={onPayments}>Telif ve ödemeler <ArrowRight size={14}/></button>
        </div>
        {feesLoading ? <p className="coordinator-dashboard-notice">Tahakkuklar yükleniyor…</p>
          : feesError ? <p className="coordinator-dashboard-notice" role="alert">{feesError}</p>
          : fees && <div className="coordinator-dashboard-fees">
              <div><span>Hak edilen / ödeme bekleyen</span><strong>{formatKurus(parseKurus(fees.waiting))}</strong></div>
              <div><span>Ödeme sürecinde</span><strong>{formatKurus(parseKurus(fees.inProcess))}</strong></div>
              <div><span>Ödenmiş hakedişler</span><strong>{formatKurus(parseKurus(fees.paid))}</strong></div>
              <div className="coordinator-dashboard-fees-total"><span>Toplam geçerli tahakkuk</span><strong>{formatKurus(parseKurus(fees.total))}</strong></div>
            </div>}
        <p className="coordinator-dashboard-footnote">İptal edilenler toplam dışında. Bu tutarlar tahakkuktur; ayrı ödeme kayıtlarıyla tekrar toplanmaz.</p>
      </section>
    </div>
    <p className="coordinator-dashboard-disclaimer"><BookOpen size={13}/> Bu panel mevcut yetkili verilerin salt-okunur özetidir; hiçbir soruyu onaylamaz veya ödeme gerçekleştirmez.</p>
  </section>;
}
