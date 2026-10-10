import { Role } from '../demo/model';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  provinceId: number | null;
  assignedRegion: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  province?: { id: number; name: string; region: string } | null;
  editorGrade?: string | null;
  editorBranches?: { id: number; name: string }[];
  authorProfile?: {
    title: string;
    experienceYears: number;
    biography: string | null;
    province: { id: number; name: string; region: string };
    district: { id: number; name: string } | null;
    branch: { id: number; name: string };
    institution: { id: number; name: string } | null;
  } | null;
}

export interface UpdateMyProfileInput {
  fullName?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  title?: string;
  experienceYears?: number;
  biography?: string | null;
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error'; message: string };
