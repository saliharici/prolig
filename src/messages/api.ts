import type { ApiMessage, Mailbox, MessageCounts, MessageListResponse, MessagePerson } from './types';

export class MessageApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'MessageApiError';
  }
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const apiMessage = typeof body?.error === 'string' ? body.error : '';
    if (response.status === 401) throw new MessageApiError(401, 'Oturum süresi dolmuş veya yetkisiz.', body);
    if (response.status === 403) throw new MessageApiError(403, apiMessage || 'Bu mesaj işlemi için yetkiniz yok.', body);
    if (response.status === 404) throw new MessageApiError(404, apiMessage || 'Mesaj bulunamadı.', body);
    if (response.status >= 500) throw new MessageApiError(response.status, 'Mesajlar işlenemedi. Lütfen daha sonra tekrar deneyin.', body);
    throw new MessageApiError(response.status, apiMessage || 'Mesaj işlemi başarısız.', body);
  }
  return body as T;
}

export async function fetchMessages(box: Mailbox = 'inbox'): Promise<MessageListResponse> {
  return parse<MessageListResponse>(await fetch(`/api/v1/messages?box=${box}`, { credentials: 'include' }));
}

export async function fetchMessage(id: number): Promise<{ message: ApiMessage; counts: MessageCounts }> {
  return parse(await fetch(`/api/v1/messages/${id}`, { credentials: 'include' }));
}

export async function fetchMessageRecipients(): Promise<MessagePerson[]> {
  const response = await parse<{ recipients: MessagePerson[] }>(await fetch('/api/v1/messages/recipients', { credentials: 'include' }));
  return response.recipients;
}

export async function sendMessage(input: { receiverId: number; subject: string; body: string }): Promise<{ message: ApiMessage; counts: MessageCounts }> {
  return parse(await fetch('/api/v1/messages', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  }));
}

export async function changeMessageState(id: number, action: 'read'|'unread'|'archive'|'restore'): Promise<{ message: ApiMessage; counts: MessageCounts }> {
  return parse(await fetch(`/api/v1/messages/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  }));
}
