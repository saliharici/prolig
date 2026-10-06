import { AuthUser } from './types';
import { RoleCode } from '../types';

export const validateRole = (role: any): RoleCode | null => {
  const validRoles: RoleCode[] = [
    'GENEL_KOORDINATOR',
    'BOLGE_KOORDINATORU',
    'IL_KOORDINATORU',
    'EDITOR',
    'YAZAR',
    'MUHASEBE'
  ];
  if (typeof role === 'string' && validRoles.includes(role as RoleCode)) {
    return role as RoleCode;
  }
  return null;
};

export const fetchMe = async (): Promise<AuthUser | null> => {
  const res = await fetch('/api/v1/auth/me', {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    credentials: 'include'
  });

  if (!res.ok) {
    if (res.status === 401) {
      return null;
    }
    throw new Error('Service error');
  }

  const data = await res.json();
  if (!data || !data.user) {
    throw new Error('Invalid response format');
  }

  const role = validateRole(data.user.role);
  if (!role) {
    throw new Error('Unknown or unauthorized role');
  }

  return {
    id: data.user.id,
    email: data.user.email,
    fullName: data.user.fullName,
    role: role,
    provinceId: data.user.provinceId ?? null,
    assignedRegion: data.user.assignedRegion ?? null
  };
};

export const logout = async (): Promise<void> => {
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Logout failed');
  }
};
