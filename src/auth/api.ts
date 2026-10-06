import { AuthUser } from './types';
import { Role } from '../demo/model';

export const validateRole = (role: any): Role | null => {
  const validRoles: Role[] = [
    'GENEL_KOORDINATOR',
    'BOLGE_KOORDINATORU',
    'IL_KOORDINATORU',
    'EDITOR',
    'YAZAR',
    'MUHASEBE'
  ];
  if (typeof role === 'string' && validRoles.includes(role as Role)) {
    return role as Role;
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
    throw new Error('Sunucu hatası, lütfen daha sonra tekrar deneyin.');
  }

  const data = await res.json();
  if (!data || !data.user) {
    throw new Error('Geçersiz yanıt formatı');
  }

  const { id, email, fullName, role, provinceId = null, assignedRegion = null } = data.user;

  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Geçersiz kullanıcı ID');
  }

  if (typeof email !== 'string' || email.trim() === '') {
    throw new Error('Geçersiz e-posta');
  }

  if (typeof fullName !== 'string' || fullName.trim() === '') {
    throw new Error('Geçersiz ad soyad');
  }

  const validatedRole = validateRole(role);
  if (!validatedRole) {
    throw new Error('Geçersiz veya yetkisiz rol');
  }

  if (provinceId !== null && (typeof provinceId !== 'number' || !Number.isSafeInteger(provinceId) || provinceId <= 0)) {
    throw new Error('Geçersiz il ID');
  }

  if (assignedRegion !== null && (typeof assignedRegion !== 'string' || assignedRegion.trim() === '')) {
    throw new Error('Geçersiz bölge');
  }

  return {
    id,
    email,
    fullName,
    role: validatedRole,
    provinceId: provinceId ?? null,
    assignedRegion: assignedRegion ?? null
  };
};

export const logout = async (): Promise<void> => {
  const res = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    throw new Error('Çıkış yapılamadı');
  }
};

export const login = async (email: string, password: string): Promise<void> => {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('E-posta veya şifre hatalı.');
    } else {
      throw new Error('Sunucu hatası, lütfen daha sonra tekrar deneyin.');
    }
  }
};
