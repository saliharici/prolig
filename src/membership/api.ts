import type { BranchOption, ManagedUser, MembershipApplication, ProvinceOption } from './types';

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || 'İşlem başarısız.');
  return body as T;
}

export async function submitMembershipApplication(payload: Record<string, unknown>) {
  return json<{ application: MembershipApplication }>(await fetch('/api/v1/membership/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }));
}
export async function fetchMembershipMetadata() {
  return json<{ provinces: ProvinceOption[]; branches: BranchOption[] }>(await fetch('/api/v1/membership/metadata', { credentials: 'include' }));
}
export async function fetchApplications() {
  return json<{ applications: MembershipApplication[] }>(await fetch('/api/v1/membership/applications', { credentials: 'include' }));
}
export async function reviewApplication(id: number, status: 'INCELEMEDE'|'UYGUN'|'REDDEDILDI', reviewNote = '') {
  return json<{ application: MembershipApplication }>(await fetch(`/api/v1/membership/applications/${id}`, {
    method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewNote })
  }));
}
export async function fetchManagedUsers() {
  return json<{ users: ManagedUser[] }>(await fetch('/api/v1/users', { credentials: 'include' }));
}
export async function createManagedUser(payload: Record<string, unknown>) {
  return json<{ user: ManagedUser }>(await fetch('/api/v1/users', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }));
}
export async function updateManagedUser(id: number, payload: Record<string, unknown>) {
  return json<{ user: ManagedUser }>(await fetch(`/api/v1/users/${id}`, {
    method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }));
}
