import type { Prisma } from '../../../generated/prisma/client.js';

export const paymentSelect = {
  id: true,
  contractNo: true,
  amount: true,
  status: true,
  paymentDate: true,
  createdAt: true,
  updatedAt: true,
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
    project: payment.project ? {
      id: payment.project.id,
      title: payment.project.title,
      code: payment.project.code
    } : null
  };
}
