import type { ApiPayment } from './types';

export class PaymentApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PaymentApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) throw new PaymentApiError(401, 'Oturum süresi dolmuş veya yetkisiz.');
    if (response.status === 403) throw new PaymentApiError(403, 'Telif ve ödemeleri görüntüleme yetkiniz yok.');
    if (response.status === 404) throw new PaymentApiError(404, 'Telif/ödeme kaydı bulunamadı.');
    if (response.status === 409) throw new PaymentApiError(409, 'Telif/ödeme kaydının durumu değiştirilmiş, listeyi yenileyin.');
    if (response.status >= 500) throw new PaymentApiError(response.status, 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.');
    throw new PaymentApiError(response.status, 'Bir hata oluştu.');
  }
  return response.json() as Promise<T>;
}

export async function fetchPayments(): Promise<ApiPayment[]> {
  const response = await fetch('/api/v1/payments', { credentials: 'include' });
  return handleResponse<ApiPayment[]>(response);
}

export async function approvePayment(id: number): Promise<void> {
  const response = await fetch(`/api/v1/payments/${id}/approve`, {
    method: 'POST',
    credentials: 'include'
  });
  await handleResponse<{ success: boolean }>(response);
}

export async function payPayment(id: number): Promise<void> {
  const response = await fetch(`/api/v1/payments/${id}/pay`, {
    method: 'POST',
    credentials: 'include'
  });
  await handleResponse<{ success: boolean }>(response);
}
