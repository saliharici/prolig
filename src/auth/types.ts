import { Role } from '../demo/model';

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  provinceId: number | null;
  assignedRegion: string | null;
}

export type AuthState = 
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'error'; message: string };
