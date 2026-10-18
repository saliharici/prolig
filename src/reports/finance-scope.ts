import type { ApiPayment } from '../payments/types';
import { toKurus } from '../payments/money';

export type ReportPaymentTotals = {
  pending: number;
  approved: number;
  paid: number;
};

/**
 * Payment periods group earnings by beneficiary, not by project. Their Payment
 * records commonly have no direct projectId. Project-filtered reporting must
 * sum the underlying earning snapshots instead of omitting the whole payment
 * or attributing its full amount to one selected project.
 *
 * An empty project set means zero; null means no project filter.
 * Legacy payments without earning links still use the original project.
 */
export function paymentTotalsForReport(
  payments: ReadonlyArray<ApiPayment>,
  selectedProjectIds: ReadonlySet<number> | null
): ReportPaymentTotals {
  const totals: ReportPaymentTotals = { pending: 0, approved: 0, paid: 0 };

  for (const payment of payments) {
    if (payment.status === 'Iptal') continue;

    const amount = selectedProjectIds === null
      ? toKurus(payment.amount)
      : payment.entries?.length
        ? payment.entries.reduce((sum, entry) =>
            sum + (entry.project && selectedProjectIds.has(entry.project.id) ? toKurus(entry.amount) : 0), 0)
        : payment.project && selectedProjectIds.has(payment.project.id)
          ? toKurus(payment.amount)
          : 0;

    if (payment.status === 'Bekliyor') totals.pending += amount;
    else if (payment.status === 'Onaylandi') totals.approved += amount;
    else if (payment.status === 'Odendi') totals.paid += amount;
  }

  return totals;
}
