import { createHmac, randomBytes } from 'node:crypto';
import type { VercelRequest } from '@vercel/node';

export const GENERAL_RECOVERY_NOTICE = 'Hesap uygunsa, kayıtlı e-posta adresinize kurtarma bağlantısı gönderilir.';
export const RECOVERY_UNAVAILABLE_NOTICE = 'Güvenli hesap kurtarma hizmeti henüz yapılandırılmadı.';
export const TOKEN_LIFETIME_MS = 15 * 60 * 1000;

export function isActiveAccount(status: string | null | undefined): boolean {
  // A password reset must never be a passive-account activation path.
  return status?.toUpperCase() === 'AKTIF';
}

export function isValidPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 14 && password.length <= 128 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

export function isTokenShape(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);
}

export function canConsumeToken(
  token: { usedAt: Date | null; expiresAt: Date },
  now: Date
): boolean {
  return token.usedAt === null && token.expiresAt.getTime() > now.getTime();
}

export function previewOrigin(origin: string | undefined, target: string | undefined): boolean {
  if (target !== 'preview' || !origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && !url.username && !url.password &&
      url.port === '' && url.pathname === '/' && !url.search && !url.hash &&
      /^prolig-[a-z0-9-]+-salih22\.vercel\.app$/i.test(url.hostname);
  } catch { return false; }
}

export function recoveryConfig(): { origin: string; secret: string; apiKey: string; from: string } | null {
  const origin = process.env.UX03_PUBLIC_ORIGIN;
  const secret = process.env.UX03_TOKEN_PEPPER;
  const apiKey = process.env.UX03_RESEND_API_KEY;
  const from = process.env.UX03_RESET_FROM;
  if (process.env.UX03_RECOVERY_ENABLED !== 'true' || !previewOrigin(origin, process.env.VERCEL_ENV) ||
      !secret || secret.length < 32 || !apiKey || !from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) return null;
  return { origin: origin!, secret, apiKey, from };
}

export function requestFromTrustedOrigin(req: VercelRequest, origin: string): boolean {
  return req.headers.origin === origin &&
    (req.headers['content-type'] || '').toString().toLowerCase().startsWith('application/json');
}

export function newResetToken(): string {
  return randomBytes(32).toString('hex');
}
export function hashSecret(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}
export function recoveryLink(origin: string, token: string): string {
  // Token in URL fragment: browsers do not send it in the request or referrer.
  return origin + '/#ux03-reset=' + token;
}

// Rate-limit by network, network+destination and destination independently,
// including nonexistent accounts. Rate keys remain opaque HMAC digests.
// Never trust a client-controlled X-Forwarded-For header.
export function requestRateKeys(req: VercelRequest, email: string, pepper: string): [string, string, string] {
  const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown').slice(0, 120);
  const destination = email.trim().toLowerCase();
  return [
    hashSecret('ip:' + ip, pepper),
    hashSecret('pair:' + ip + ':' + destination, pepper),
    hashSecret('email:' + destination, pepper)
  ];
}

export async function sendResetEmail(input: {
  apiKey: string; from: string; to: string; link: string;
}): Promise<boolean> {
  const result = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + input.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: 'PRO-LİG hesap şifresi yenileme',
      text: 'Şifrenizi yenilemek için 15 dakika içinde bu bağlantıyı açın:\n' + input.link +
        '\nBu isteği siz yapmadıysanız bağlantıyı kullanmayın.'
    }),
    signal: AbortSignal.timeout(8000)
  });
  // Provider acceptance is not proof of user mailbox control or delivery.
  return result.ok;
}
