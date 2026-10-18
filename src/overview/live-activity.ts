import type { ApiAuditLog } from '../audit/types';
import type { ApiQuestion } from '../questions/types';
import type { ApiPayment } from '../payments/types';

/**
 * Live home cards must NEVER read src/demo/model.ts seed/localStorage events.
 * The labels below describe a current status/snapshot, not an invented event.
 */
const questionStatuses: Record<ApiQuestion['status'], string> = {
  TASLAK: 'Taslak',
  INCELEMEDE: 'İncelemede',
  REVIZYON: 'Revizyonda',
  ONAYLANDI: 'Onaylandı',
  REDDEDILDI: 'Reddedildi'
};

const paymentStatuses: Record<ApiPayment['status'], string> = {
  Bekliyor: 'Bekliyor',
  Onaylandi: 'Onaylandı',
  Odendi: 'Ödendi',
  Iptal: 'İptal'
};

function safeTime(value: string): number {
  const date = Date.parse(value);
  return Number.isFinite(date) ? date : 0;
}

export function latestScopedQuestions(questions: ApiQuestion[], limit = 4) {
  return questions.filter(question => !question.isArchived).slice()
    .sort((a, b) => safeTime(b.updatedAt) - safeTime(a.updatedAt) || b.id - a.id)
    .slice(0, limit)
    .map(question => ({
      id: question.id,
      title: `Soru #${question.id} · ${questionStatuses[question.status]}`,
      secondary: question.project?.title || 'Genel Soru Havuzu',
      actor: question.author?.fullName || 'Yazar bilgisi yok',
      timestamp: question.updatedAt
    }));
}

export function latestScopedPayments(payments: ApiPayment[], limit = 4) {
  return payments.slice()
    .sort((a, b) => safeTime(b.updatedAt) - safeTime(a.updatedAt) || b.id - a.id)
    .slice(0, limit)
    .map(payment => ({
      id: payment.id,
      title: `Ödeme #${payment.id} · ${paymentStatuses[payment.status]}`,
      secondary: payment.beneficiary?.fullName || payment.author?.fullName || 'Hak sahibi bilgisi yok',
      amount: payment.amount,
      timestamp: payment.updatedAt
    }));
}

export function latestAuthorizedAudit(logs: ApiAuditLog[], limit = 4) {
  return logs.slice()
    .sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt) || b.id - a.id)
    .slice(0, limit);
}
