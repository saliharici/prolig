export type PaymentStatus = 'Bekliyor' | 'Onaylandi' | 'Odendi' | 'Iptal';

export interface ApiPayment {
  id: number;
  contractNo: string | null;
  amount: string;
  status: PaymentStatus;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
  beneficiary?: { id: number; fullName: string } | null;
  paymentPeriod?: { id: number; code: string; name: string } | null;
  entries?: Array<{ id: number; roleCode: string; earningType: string; questionId: number | null; sourceKey: string; quantity: number; unitPrice: string; amount: string; status: string; earnedAt: string; paidAt: string | null; project: { id: number; code: string; title: string } | null }>;
  author: {
    id: number;
    fullName: string;
  } | null;
  project: {
    id: number;
    title: string;
    code: string;
  } | null;
}

