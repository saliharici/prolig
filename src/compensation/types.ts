export type CompensationRole =
  | 'YAZAR'
  | 'EDITOR'
  | 'IL_KOORDINATORU'
  | 'BOLGE_KOORDINATORU'
  | 'GENEL_KOORDINATOR';

export type CompensationEarningType =
  | 'QUESTION_AUTHOR'
  | 'QUESTION_EDITOR'
  | 'PROJECT_PROVINCE_COORDINATOR'
  | 'PROJECT_REGION_COORDINATOR'
  | 'PROJECT_GENERAL_COORDINATOR';

export type CompensationUnitType = 'QUESTION' | 'PROJECT' | 'PERIOD';

export interface CompensationRule {
  id: number;
  roleCode: CompensationRole;
  earningType: CompensationEarningType;
  unitType: CompensationUnitType;
  unitPrice: string;
  projectId: number | null;
  project: {
    id: number;
    title: string;
    code: string;
    status: string;
  } | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    fullName: string;
  };
}

export interface CompensationRuleInput {
  roleCode: CompensationRole;
  unitPrice: string;
  projectId: number | null;
}


export type CompensationEntryStatus =
  | 'HAK_EDILDI'
  | 'ODEME_BEKLIYOR'
  | 'ODEMEYE_ALINDI'
  | 'ODENDI'
  | 'IPTAL';

export interface CompensationEntry {
  id: number;
  roleCode: CompensationRole;
  earningType: CompensationEarningType;
  quantity: number;
  unitPrice: string;
  amount: string;
  status: CompensationEntryStatus;
  earnedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  paymentPeriod: { id: number; code: string; name: string } | null;
  payment: { id: number; status: string; paymentDate: string | null } | null;
  sourceKey: string;
  questionId: number | null;
  unitType: CompensationUnitType;
  user: { id: number; fullName: string };
  project: { id: number; title: string; code: string } | null;
}


export interface CompensationSummary {
  count: number;
  total: string;
  waiting: string;
  inProcess: string;
  paid: string;
  writer: string;
  editor: string;
  coordinator: string;
}

export interface CompensationPage {
  entries: CompensationEntry[];
  nextCursor: number | null;
  summary: CompensationSummary;
}

export type PaymentPeriodStatus = 'TASLAK' | 'HAZIR' | 'ONAYLANDI' | 'KAPANDI' | 'IPTAL';
export interface PaymentPeriod {
  id: number;
  code: string;
  name: string;
  status: PaymentPeriodStatus;
  startDate: string;
  endDate: string;
  approvedAt: string | null;
  closedAt: string | null;
  entryCount: number;
  beneficiaryCount: number;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  payments: import('../payments/types').ApiPayment[];
}
