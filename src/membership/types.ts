import type { Role } from '../demo/model';

export type ApplicationStatus = 'ALINDI' | 'INCELEMEDE' | 'UYGUN' | 'ONAYLANDI' | 'REDDEDILDI';

export interface ProvinceOption { id: number; name: string; region: string; }
export interface BranchOption { id: number; name: string; category?: string; }

export interface MembershipApplication {
  id: number;
  fullName: string;
  email: string;
  phone?: string | null;
  provinceId: number;
  province: ProvinceOption;
  districtName?: string | null;
  institutionName?: string | null;
  requestedRole?: 'YAZAR' | 'EDITOR' | null;
  requestedBranch?: string | null;
  motivation?: string | null;
  status: ApplicationStatus;
  reviewNote?: string | null;
  reviewedByName?: string | null;
  createdAt: string;
}

export interface ManagedUser {
  id: number;
  email: string;
  fullName: string;
  status: 'Aktif' | 'Pasif' | string;
  role: Role;
  assignedRegion?: string | null;
  province?: ProvinceOption | null;
  editorGrade?: string | null;
  branchIds: number[];
  authorProfile?: { id: number; branchId: number; provinceId: number } | null;
}
