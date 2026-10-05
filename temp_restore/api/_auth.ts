import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
const cookie = require('cookie');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev';
const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://pro-lig.vercel.app'];

export function authenticate(req: VercelRequest, res: VercelResponse): any | null {
  // CSRF Origin / Referer Strict Validation
  if (req.method !== 'GET') {
    const source = req.headers.origin || req.headers.referer;
    if (!source) {
      res.status(403).json({ error: 'CSRF Protection: Missing Origin or Referer' });
      return null;
    }
    try {
      const parsedOrigin = new URL(source).origin;
      if (!ALLOWED_ORIGINS.includes(parsedOrigin)) {
        res.status(403).json({ error: 'CSRF Protection: Invalid Origin' });
        return null;
      }
    } catch (e) {
      res.status(403).json({ error: 'CSRF Protection: Malformed Origin' });
      return null;
    }
  }

  const cookies = cookie.parse(req.headers.cookie || '');
  if (!cookies.auth_token) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return null;
  }

  try {
    return jwt.verify(cookies.auth_token, JWT_SECRET) as { id: number; email: string; role: string };
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
    return null;
  }
}

export function authorize(req: VercelRequest, res: VercelResponse, allowedRoles: string[]): any | null {
  const user = authenticate(req, res);
  if (!user) return null;

  if (!allowedRoles.includes(user.role) && user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Forbidden: Insufficient role' });
    return null;
  }

  return user;
}
