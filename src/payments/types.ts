export type PaymentStatus = 'Bekliyor' | 'Onaylandi' | 'Odendi' | 'Iptal';

export interface ApiPayment {
  id: number;
  contractNo: string | null;
  amount: string;
  status: PaymentStatus;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
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
