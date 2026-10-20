import { createHmac, timingSafeEqual } from 'node:crypto';
import { privateGeometryPngKey } from './p3-png-s3.js';

const RECEIPT_TTL_MS = 10 * 60 * 1000;

/**
 * Upload receipt is NOT an authorization grant: binding still requires a
 * fresh, server-side owner/revision lookup and a private object existence check.
 */
export function issueP3PrivatePngReceipt(
  ownerId: number,
  questionId: number,
  sha256: string,
  secret: string,
  now = Date.now()
): string {
  privateGeometryPngKey(ownerId, questionId, sha256);
  if (!secret || !Number.isSafeInteger(now) || now < 0) throw new Error('Invalid receipt parameters');
  const message = ['p3v1', ownerId, questionId, sha256, now].join('.');
  const mac = createHmac('sha256', secret).update(message).digest('hex');
  return message + '.' + mac;
}

export function verifyP3PrivatePngReceipt(
  token: string,
  ownerId: number,
  questionId: number,
  secret: string,
  now = Date.now()
): { objectKey: string; sha256: string } | null {
  if (typeof token !== 'string' || token.length > 300 || !secret) return null;
  const match = /^p3v1\.([1-9]\d*)\.([1-9]\d*)\.([a-f0-9]{64})\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) !== ownerId || Number(match[2]) !== questionId) return null;
  const issued = Number(match[4]);
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(issued) ||
      issued > now || now - issued > RECEIPT_TTL_MS) return null;
  const message = token.slice(0, -65);
  const expected = createHmac('sha256', secret).update(message).digest();
  const supplied = Buffer.from(match[5], 'hex');
  if (!timingSafeEqual(expected, supplied)) return null;
  return { objectKey: privateGeometryPngKey(ownerId, questionId, match[3]), sha256: match[3] };
}
