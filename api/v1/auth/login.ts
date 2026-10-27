import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { prisma } from '../_lib/prisma.js';
import { setSessionCookie } from '../_lib/auth.js';


const TEST_BRANCH = 'feat/branch-coordinator-v3-20261027';
const TEST_ADMIN_EMAIL = 'preview-admin@prolig.invalid';

function testBootstrapEnabled() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.PROLIG_TEST_ADMIN_SETUP !== 'enabled') return false;
  if (process.env.VERCEL_GIT_COMMIT_REF && process.env.VERCEL_GIT_COMMIT_REF !== TEST_BRANCH) return false;
  try {
    const host = new URL(process.env.DATABASE_URL || '').hostname;
    return !!host && host === process.env.PROLIG_TEST_DATABASE_HOST;
  } catch { return false; }
}

async function setupIsolatedTestAdmin(req: VercelRequest, res: VercelResponse) {
  if (!testBootstrapEnabled()) return res.status(404).json({ error: 'Not found' });
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    return res.status(400).json({ error: 'TEST şifresi 10-128 karakter olmalı.' });
  }
  const target = await prisma.$queryRaw<Array<{ name: string; db_user: string }>>`
    SELECT current_database() AS name, current_user AS db_user
  `;
  if (target[0]?.name !== 'ux02_test' || target[0]?.db_user !== 'ux02_owner') {
    return res.status(403).json({ error: 'Not an isolated TEST database' });
  }
  const hash = await bcrypt.hash(password, 10);
  const created = await prisma.$transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { email: TEST_ADMIN_EMAIL }, select: { id: true } });
    if (existing) return null;
    let role = await tx.role.findUnique({ where: { code: 'GENEL_KOORDINATOR' } });
    if (!role) role = await tx.role.create({
      data: { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör', description: 'İzole TEST yönetici hesabı' }
    });
    return tx.user.create({ data: {
      username: TEST_ADMIN_EMAIL, email: TEST_ADMIN_EMAIL, passwordHash: hash,
      fullName: 'PRO-LIG TEST Genel Koordinatör', status: 'Aktif', roleId: role.id
    }});
  });
  if (!created) return res.status(409).json({ error: 'TEST hesabı zaten var. Normal giriş yapın.' });
  setSessionCookie(res, created.id);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({ created: true, email: TEST_ADMIN_EMAIL });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.body?.testAdminSetup === true) {
      return await setupIsolatedTestAdmin(req, res);
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { email, password } = req.body;
    
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password must be strings' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail || !password.trim()) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true }
    });

    if (!user || user.status?.toUpperCase() !== 'AKTIF' || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    setSessionCookie(res, user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role.code,
        provinceId: user.provinceId,
        assignedRegion: user.assignedRegion
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
