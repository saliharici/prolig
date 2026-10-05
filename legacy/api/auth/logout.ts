import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parse, serialize } from 'cookie';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', serialize('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0), // Expire immediately
    path: '/',
    sameSite: 'strict'
  }));

  return res.status(200).json({ success: true });
}
