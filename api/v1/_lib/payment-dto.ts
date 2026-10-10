import type { Prisma } from '../../../generated/prisma/client.js';

export const paymentSelect = {
  id: true,
  contractNo: true,
  amount: true,
  status: true,
  paymentDate: true,
  createdAt: true,
  updatedAt: true,
  paymentPeriod: { select: { id: true, code: true, name: true } },
  compensationEntries: { select: { id: true, roleCode: true, earningType: true, questionId: true, sourceKey: true, quantity: true, unitPrice: true, amount: true, status: true, earnedAt: true, paidAt: true, project: { select: { id: true, code: true, title: true } } } },
  authorUser: { select: { id: true, fullName: true } },
  project: { select: { id: true, title: true, code: true } }
} satisfies Prisma.PaymentSelect;

export type SelectedPayment = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

export function formatPaymentDto(payment: SelectedPayment) {
  return {
    id: payment.id,
    contractNo: payment.contractNo,
    amount: payment.amount.toFixed(2),
    status: payment.status,
    paymentDate: payment.paymentDate,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    author: payment.authorUser ? {
      id: payment.authorUser.id,
      fullName: payment.authorUser.fullName
    } : null,
    beneficiary: payment.authorUser ? { id: payment.authorUser.id, fullName: payment.authorUser.fullName } : null,
    paymentPeriod: payment.paymentPeriod ?? null,
    entries: (payment.compensationEntries ?? []).map(entry => ({ ...entry, unitPrice: entry.unitPrice.toFixed(2), amount: entry.amount.toFixed(2) })),
    project: payment.project ? {
      id: payment.project.id,
      title: payment.project.title,
      code: payment.project.code
    } : null
  };
}

