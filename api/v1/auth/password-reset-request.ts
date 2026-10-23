import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../_lib/prisma.js';
import {
  GENERAL_RECOVERY_NOTICE, RECOVERY_UNAVAILABLE_NOTICE, TOKEN_LIFETIME_MS,
  hashSecret, isActiveAccount, newResetToken, recoveryConfig, recoveryLink,
  requestFromTrustedOrigin, requestRateKeys, sendResetEmail
} from '../_lib/password-recovery.js';

// All account states, including nonexistent and Pasif, get the same success response.
// No recovery channel => fail closed for everybody, never imply delivery.
async function charge(key: string, limit: number, now: Date): Promise<boolean> {
  await prisma.passwordResetRate.updateMany({
    where: { key, windowStart: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
    data: { attempts: 0, windowStart: now }
  });
  const record = await prisma.passwordResetRate.upsert({
    where: { key },
    create: { key, attempts: 1, windowStart: now },
    update: { attempts: { increment: 1 } }
  });
  return record.attempts <= limit;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const config = recoveryConfig();
  if (!config) return res.status(503).json({ error: RECOVERY_UNAVAILABLE_NOTICE });
  if (!requestFromTrustedOrigin(req, config.origin)) return res.status(403).json({ error: 'Forbidden' });

  const email = req.body?.email;
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Geçerli e-posta adresi giriniz.' });
  }
  const normalized = email.trim().toLowerCase();
  const reply = () => res.status(202).json({ message: GENERAL_RECOVERY_NOTICE });
  const now = new Date();

  try {
    const [ipKey, pairKey] = requestRateKeys(req, normalized, config.secret);
    // Independent network and address limits also apply to nonexistent accounts.
    const permittedIp = await charge(ipKey, 30, now);
    const permittedPair = await charge(pairKey, 5, now);
    if (!permittedIp || !permittedPair) return res.status(429).json({ error: 'Çok fazla istek. Daha sonra deneyin.' });

    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, status: true }
    });
    if (!user || !isActiveAccount(user.status)) return reply();

    const raw = newResetToken();
    const tokenHash = hashSecret(raw, config.secret);
    await prisma.$transaction(async (tx) => {
      // Issuing a new token revokes older unused tokens for this user.
      await tx.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS) }
      });
      await tx.activityLog.create({
        data: {
          userName: 'UX03_RECOVERY_SERVICE', action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'User', entityId: user.id, details: '{"channel":"verified-email"}'
        }
      });
    });
    // Fixed approved provider + configured verified sender: no arbitrary URLs or mailboxes.
    let accepted = false;
    try {
      accepted = await sendResetEmail({
        apiKey: config.apiKey, from: config.from, to: user.email,
        link: recoveryLink(config.origin, raw)
      });
    } catch {
      // Avoid exposing recipient, token, or provider details.
    }
    if (!accepted) {
      await prisma.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null }, data: { usedAt: new Date() }
      });
    }
    return reply();
  } catch {
    // No success claim if persistence or delivery-configuration prerequisites fail.
    return res.status(503).json({ error: RECOVERY_UNAVAILABLE_NOTICE });
  }
}
