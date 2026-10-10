import type {
  AnnouncementAudience, AnnouncementBox, AnnouncementListResponse,
  AnnouncementPriority, ApiAnnouncement
} from './types';

export class AnnouncementApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'AnnouncementApiError';
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = typeof body?.error === 'string' ? body.error : '';
    if (response.status === 401) throw new AnnouncementApiError(401, 'Oturum süresi dolmuş veya yetkisiz.', body);
    if (response.status === 403) throw new AnnouncementApiError(403, apiMessage || 'Bu duyuru işlemi için yetkiniz yok.', body);
    if (response.status === 404) throw new AnnouncementApiError(404, apiMessage || 'Duyuru bulunamadı.', body);
    if (response.status === 409) throw new AnnouncementApiError(409, apiMessage || 'Duyuru mevcut durumu nedeniyle güncellenemedi.', body);
    if (response.status >= 500) throw new AnnouncementApiError(response.status, 'Duyurular işlenemedi. Lütfen daha sonra tekrar deneyin.', body);
    throw new AnnouncementApiError(response.status, apiMessage || 'Duyuru işlemi başarısız.', body);
  }
  return body as T;
}

export async function fetchAnnouncements(box: AnnouncementBox = 'active'): Promise<AnnouncementListResponse> {
  return parse(await fetch(`/api/v1/announcements?box=${box}`, { credentials: 'include' }));
}

export async function fetchAnnouncement(id: number): Promise<{ announcement: ApiAnnouncement; unread: number }> {
  return parse(await fetch(`/api/v1/announcements/${id}`, { credentials: 'include' }));
}

export async function createAnnouncement(input: {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
}): Promise<{ announcement: ApiAnnouncement; unread: number }> {
  return parse(await fetch('/api/v1/announcements', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  }));
}

export async function updateAnnouncement(id: number, input: {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
}): Promise<{ announcement: ApiAnnouncement; unread: number }> {
  return parse(await fetch(`/api/v1/announcements/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  }));
}

export async function changeAnnouncementState(id: number, action: 'archive'|'restore'): Promise<{ announcement: ApiAnnouncement; unread: number }> {
  return parse(await fetch(`/api/v1/announcements/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  }));
}
