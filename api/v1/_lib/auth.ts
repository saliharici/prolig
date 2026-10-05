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

export function setSessionCookie(res: VercelResponse, userId: number) {
  const secret = getSecret();
  const token = jwt.sign({ sub: userId }, secret, { expiresIn: '7d' });
  
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res: VercelResponse) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function getSessionUserId(req: VercelRequest): number | null {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  
  try {
    const secret = getSecret();
    const payload = jwt.verify(token, secret) as any;
    return payload.sub ? parseInt(payload.sub, 10) : null;
  } catch (error) {
    return null;
  }
}
