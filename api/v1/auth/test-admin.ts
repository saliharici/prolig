import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { prisma } from '../_lib/prisma.js';
import { setSessionCookie } from '../_lib/auth.js';

const TEST_BRANCH = 'feat/branch-coordinator-v3-20261027';
const EMAIL = 'preview-admin@prolig.invalid';

// One-time initial setup for the disposable, isolated Vercel Preview branch.
// Disabled for all Production deployments, other branches, and other databases.
function isAllowedPreview() {
  if (process.env.VERCEL_ENV !== 'preview'
      || process.env.PROLIG_TEST_ADMIN_SETUP !== 'enabled') return false;
  if (process.env.VERCEL_GIT_COMMIT_REF && process.env.VERCEL_GIT_COMMIT_REF !== TEST_BRANCH) return false;
  try {
    const host = new URL(process.env.DATABASE_URL || '').hostname;
    return Boolean(host) && host === process.env.PROLIG_TEST_DATABASE_HOST;
  } catch { return false; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAllowedPreview()) return res.status(404).json({ error: 'Not found' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!req.body || typeof req.body.password !== 'string'
      || req.body.password.length < 10 || req.body.password.length > 128) {
    return res.status(400).json({ error: 'TEST şifresi 10-128 karakter olmalı.' });
  }
  try {
    const identity = await prisma.$queryRaw<Array<{ name: string; db_user: string }>>`
      SELECT current_database() AS name, current_user AS db_user
    `;
    if (identity[0]?.name !== 'ux02_test' || identity[0]?.db_user !== 'ux02_owner') {
      return res.status(403).json({ error: 'Not an isolated TEST database' });
    }
    const hash = await bcrypt.hash(req.body.password, 10);
    const newUser = await prisma.$transaction(async tx => {
      // Never replace an existing login or change its password.
      const existing = await tx.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
      if (existing) return null;
      let role = await tx.role.findUnique({ where: { code: 'GENEL_KOORDINATOR' } });
      if (!role) {
        role = await tx.role.create({
          data: { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör', description: 'İzole TEST yönetici hesabı' }
        });
      }
      return tx.user.create({
        data: { username: EMAIL, email: EMAIL, fullName: 'PRO-LIG TEST Genel Koordinatör',
          roleId: role.id, status: 'Aktif', passwordHash: hash }
      });
    });
    if (!newUser) return res.status(409).json({ error: 'TEST hesabı zaten var. Normal giriş yapın.' });
    setSessionCookie(res, newUser.id);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({ created: true, email: EMAIL });
  } catch (error) {
    console.error('Isolated test admin setup failed', error instanceof Error ? error.name : 'UNKNOWN');
    return res.status(500).json({ error: 'TEST yöneticisi açılamadı. Bağlantıyı kontrol edin.' });
  }
}
