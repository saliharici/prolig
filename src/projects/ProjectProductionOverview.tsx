import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, FileQuestion, Wallet } from 'lucide-react';
import type { ApiQuestion } from '../questions/types';
import type { Role } from '../demo/model';
import { fetchCompensationSummary } from '../compensation/api';
import type { CompensationSummary } from '../compensation/types';
import { toKurus } from '../payments/money';
import { projectQuestionStats } from './integration';
import './project-production-overview.css';

type Props = {
  projectId: number;
  production?: import('./types').ApiProject['production'];
  questions: ApiQuestion[];
  questionsLoading: boolean;
  questionsError: string;
  role: Role;
  onOpenQuestions: () => void;
  onOpenQuestionsByStatus: (status: string) => void;
};

const states = [
  { key: 'draft', label: 'Taslak', filter: 'Taslak' },
  { key: 'review', label: 'İncelemede', filter: 'İncelemede' },
  { key: 'revision', label: 'Revizyonda', filter: 'Revizyon' },
  { key: 'approved', label: 'Onaylandı', filter: 'Onaylandı' },
  { key: 'rejected', label: 'Reddedildi', filter: 'Reddedildi' }
] as const;

export function canSeeProjectFinance(role: Role) {
  return role === 'GENEL_KOORDINATOR' || role === 'MUHASEBE';
}

const amount = (value: string) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(toKurus(value) / 100);

export function ProjectProductionOverview({
  projectId, production, questions, questionsLoading, questionsError, role, onOpenQuestions, onOpenQuestionsByStatus
}: Props) {
  const stats = useMemo(() => projectQuestionStats(projectId, questions), [projectId, questions]);
  const financeAllowed = canSeeProjectFinance(role);
  const [summary, setSummary] = useState<CompensationSummary | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState('');

  useEffect(() => {
    let active = true;
    if (!financeAllowed) {
      setSummary(null);
      setFinanceLoading(false);
      setFinanceError('');
      return () => { active = false; };
    }

    setSummary(null);
    setFinanceError('');
    setFinanceLoading(true);
    void fetchCompensationSummary([projectId])
      .then(value => { if (active) setSummary(value); })
      .catch(error => {
        if (active) setFinanceError(error instanceof Error ? error.message : 'Proje telif özeti yüklenemedi.');
      })
      .finally(() => { if (active) setFinanceLoading(false); });
    return () => { active = false; };
  }, [projectId, financeAllowed]);

  return <section className="project-production-overview" aria-label="Proje üretim ve telif özeti">
    <div className="project-production-heading">
      <div><span className="panel-kicker">PROJE İŞ AKIŞI</span><h3>Soru üretimi ve editör süreci</h3></div>
      <button type="button" className="text-button" onClick={onOpenQuestions}>
        Proje sorularını aç <ArrowRight size={14} />
      </button>
    </div>

    {questionsLoading ? <p className="project-production-feedback">Soru durumları yükleniyor…</p>
      : questionsError ? <p className="project-production-feedback" role="alert">{questionsError}</p>
      : <>
        {production && production.target > 0 && <div className="project-production-summary" role="status">
          <strong>Gerçek üretim ilerlemesi: %{production.completionPercent ?? 0}</strong>
          <span>Hedef {production.target} · Göreve bağlı {production.written} · Onaylı {production.approved} · İncelemede {production.inReview} · Revizyonda {production.revision}</span>
          {production.overdueTasks > 0 && <small>{production.overdueTasks} geciken ve hedefi tamamlanmamış görev</small>}
        </div>}
        <div className="project-production-pipeline">
          {states.map(item => <button type="button" key={item.key} className="project-production-stage"
            title={`${item.label} durumundaki proje sorularını aç`}
            onClick={() => onOpenQuestionsByStatus(item.filter)}>
            <strong>{stats[item.key]}</strong><span>{item.label}</span>
            <small>Soruları gör <ArrowRight size={11}/></small>
          </button>)}
        </div>
        <div className="project-production-progress">
          <span>Onaylanan / toplam soru</span>
          <strong>{stats.approved} / {stats.total}</strong>
          <div className="project-production-progress-track">
            <span style={{ width: stats.total ? `${Math.round(stats.approved / stats.total * 100)}%` : '0%' }} />
          </div>
        </div>
        <p className="project-production-note"><FileQuestion size={13} /> Aşamalara tıklayarak ilgili proje sorularını açabilirsiniz. Bu sayılar yalnız yetkili kayıtları kapsar; editör kararları ayrı yetki gerektirir.</p>
      </>}

    {financeAllowed && <div className="project-production-finance">
      <div className="project-production-heading">
        <div><span className="panel-kicker">PROJE BAZLI TELİF</span><h3>Kazanılmış ücretler</h3></div>
        <Wallet size={17} aria-hidden="true" />
      </div>
      {financeLoading ? <p className="project-production-feedback">Projenin tahakkukları yükleniyor…</p>
        : financeError ? <p className="project-production-feedback" role="alert">{financeError}</p>
        : summary && <div className="project-production-fees">
            <div><span>Hak edilen / bekleyen</span><strong>{amount(summary.waiting)}</strong></div>
            <div><span>Ödeme sürecinde</span><strong>{amount(summary.inProcess)}</strong></div>
            <div><span>Ödenen</span><strong>{amount(summary.paid)}</strong></div>
            <div className="project-production-fees-total"><span>Toplam tahakkuk</span><strong>{amount(summary.total)}</strong></div>
          </div>}
      <p className="project-production-note"><CheckCircle2 size={13} /> İptal edilen kazanımlar toplam dışıdır. Tahakkuk, ödeme hareketiyle ikinci kez toplanmaz; henüz ücret tarifesi olmayan onaylı sorular tahakkuk oluşturmayabilir.</p>
    </div>}
  </section>;
}
