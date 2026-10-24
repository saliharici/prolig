import { VercelRequest, VercelResponse } from '@vercel/node';
import { parse, serialize } from 'cookie';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'prolig_session';

export function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured.');
  }
  return secret;
}

export function setSessionCookie(res: VercelResponse, userId: number, version: number) {
  const secret = getSecret();
  const token = jwt.sign({ sub: String(userId), v: version }, secret, { expiresIn: '7d', algorithm: 'HS256' });
  
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res: VercelResponse) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.VERCEL_ENV === 'preview' || process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function getSessionClaims(req: VercelRequest): { userId: number; version: number | null } | null {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  
  try {
    const secret = getSecret();
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as any;
    
    if (!payload || typeof payload !== 'object' || !('sub' in payload)) {
      return null;
    }

    const sub = payload.sub;
    let userId: number;
    
    if (typeof sub === 'number') {
      userId = sub;
    } else if (typeof sub === 'string') {
      // Must match digits exactly
      if (!/^\d+$/.test(sub)) {
        return null;
      }
      userId = parseInt(sub, 10);
    } else {
      return null;
    }

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return null;
    }

    return { userId, version: typeof payload.v === 'number' && Number.isSafeInteger(payload.v) && payload.v >= 0 ? payload.v : null };
  } catch (error) {
    return null;
  }
}

export function getSessionUserId(req: VercelRequest): number | null {
  return getSessionClaims(req)?.userId ?? null;
}

export function hasCurrentSessionVersion(
  claims: { userId: number; version: number | null } | null,
  authVersion: number
): boolean {
  if (!claims) return false;
  // Mandatory regardless of recovery mail flag or deployment environment.
  // Fail closed for legacy JWTs without v: first release requires re-login.
  return Number.isSafeInteger(authVersion) && authVersion >= 0 &&
    claims.version !== null && claims.version === authVersion;
}
