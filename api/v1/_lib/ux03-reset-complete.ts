import type { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import {
  RECOVERY_UNAVAILABLE_NOTICE, canConsumeToken, hashSecret, isActiveAccount,
  isTokenShape, isValidPassword, recoveryConfig, requestFromTrustedOrigin, requestRateKeys
} from './password-recovery.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const config = recoveryConfig();
  if (!config) return res.status(503).json({ error: RECOVERY_UNAVAILABLE_NOTICE });
  if (!requestFromTrustedOrigin(req, config.origin)) return res.status(403).json({ error: 'Forbidden' });

  const token = req.body?.token;
  const password = req.body?.password;
  if (!isTokenShape(token) || !isValidPassword(password)) {
    return res.status(400).json({ error: 'Bağlantı veya yeni şifre geçersiz.' });
  }
  const now = new Date();
  try {
    // General network throttle; no dependency on account existence or token lookup.
    const [networkKey] = requestRateKeys(req, '', config.secret);
    const key = 'consume:' + networkKey;
    await prisma.passwordResetRate.updateMany({
      where: { key, windowStart: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
      data: { windowStart: now, attempts: 0 }
    });
    const attempts = await prisma.passwordResetRate.upsert({
      where: { key }, create: { key, attempts: 1, windowStart: now },
      update: { attempts: { increment: 1 } }
    });
    if (attempts.attempts > 30) return res.status(429).json({ error: 'Çok fazla istek. Daha sonra deneyin.' });

    const tokenHash = hashSecret(token.toLowerCase(), config.secret);
    const newHash = await bcrypt.hash(password, 12);

    // One serializable transaction: exactly one unexpired token claim, still-active
    // account, password update, all-token invalidation and secret-free audit.
    const result = await prisma.$transaction(async (tx) => {
      const tokenRow = await tx.passwordResetToken.findUnique({
        where: { tokenHash }, select: { userId: true, expiresAt: true, usedAt: true }
      });
      if (!tokenRow || !canConsumeToken(tokenRow, now)) return false;
      const claimed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now }
      });
      if (claimed.count !== 1) return false;
      const user = await tx.user.findUnique({
        where: { id: tokenRow.userId }, select: { id: true, status: true, updatedAt: true }
      });
      if (!user || !isActiveAccount(user.status)) return false;
      const nextTimestamp = new Date(Math.max(Date.now(), user.updatedAt.getTime() + 1));
      const changed = await tx.user.updateMany({
        where: { id: user.id, status: 'Aktif' },
        data: { passwordHash: newHash, updatedAt: nextTimestamp }
      });
      if (changed.count !== 1) throw new Error('RECOVERY_ACCOUNT_CHANGED');
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null }, data: { usedAt: now }
      });
      await tx.activityLog.create({
        data: {
          userName: 'UX03_RECOVERY_SERVICE', action: 'PASSWORD_RESET_COMPLETED',
          entityType: 'User', entityId: user.id, details: '{"otherSessions":"revoked","activation":false}'
        }
      });
      return true;
    }, { isolationLevel: 'Serializable', timeout: 10000 });
    if (!result) return res.status(400).json({ error: 'Bağlantı geçersiz veya süresi dolmuş.' });
    return res.status(200).json({ ok: true, message: 'Şifreniz yenilendi. Yeniden giriş yapabilirsiniz.' });
  } catch {
    return res.status(503).json({ error: RECOVERY_UNAVAILABLE_NOTICE });
  }
}
