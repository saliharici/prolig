import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { getSecret } from './auth.js';
import { isQuestionArchived } from './question-archive.js';
import { verifyGeometryWriteAccess } from './geometry-write-access.js';
import { isP3IsolatedPngUploadEnvironment } from './p3-png-upload-environment.js';
import { verifyP3PrivatePngReceipt } from './p3-png-receipt.js';
import { readVerifiedPrivatePng } from './p3-png-s3.js';

/**
 * Redeems P3-V receipt after a fresh owner, active-state and revision check.
 * The authenticated browser never chooses the S3 object key or owner ID.
 * A verified private object is linked inside an optimistic DB transaction.
 */
export async function handleP3PrivateGeometryBind(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isP3IsolatedPngUploadEnvironment(process.env)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const host = req.headers.host;
  if (typeof host !== 'string' || req.headers.origin !== 'https://' + host ||
      !/^application\/json(?:\s*;.*)?$/i.test(String(req.headers['content-type'] ?? ''))) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }
  const rawId = req.query.id;
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({ error: 'Invalid question' });
  }
  const questionId = Number(rawId);
  if (!Number.isSafeInteger(questionId) || typeof req.body !== 'object' ||
      !req.body || Array.isArray(req.body) || req.body.action !== 'geometryBind' ||
      typeof req.body.receipt !== 'string' ||
      typeof req.body.expectedUpdatedAt !== 'string') {
    return res.status(400).json({ error: 'Invalid bind request' });
  }
  const access = await verifyGeometryWriteAccess(req, questionId);
  if (!access.allowed) return res.status(403).json({ error: 'Question is not editable by this author' });
  if (!['TASLAK', 'REVIZYON'].includes(access.questionStatus) ||
      req.body.expectedUpdatedAt !== access.questionUpdatedAt ||
      await isQuestionArchived(questionId)) {
    return res.status(409).json({ error: 'Question is archived, locked or stale' });
  }
  const receipt = verifyP3PrivatePngReceipt(
    req.body.receipt, access.ownerUserId, questionId, getSecret()
  );
  if (!receipt) return res.status(403).json({ error: 'Invalid or expired private image receipt' });

  let verified;
  try {
    verified = await readVerifiedPrivatePng(receipt.objectKey, receipt.sha256, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    });
  } catch {
    return res.status(409).json({ error: 'Verified private image is unavailable' });
  }

  const nextRevision = new Date(Math.max(Date.now(), Date.parse(access.questionUpdatedAt) + 1));
  try {
    const asset = await prisma.$transaction(async tx => {
      const updated = await tx.question.updateMany({
        where: {
          id: questionId, authorUserId: access.ownerUserId,
          status: access.questionStatus,
          updatedAt: new Date(access.questionUpdatedAt)
        },
        data: { updatedAt: nextRevision }
      });
      if (updated.count !== 1) throw new Error('STALE');
      // The CAS above serializes concurrent uploads of the same question.
      // Enforce the server-side cap; the browser's 30-image limit is advisory.
      const existing = await tx.privateGeometryAsset.findUnique({
        where: { questionId_sha256: { questionId, sha256: receipt.sha256 } },
        select: { id: true }
      });
      if (!existing) {
        const imageCount = await tx.privateGeometryAsset.count({ where: { questionId } });
        if (imageCount >= 30) throw new Error('IMAGE_LIMIT');
      }
      return tx.privateGeometryAsset.upsert({
        where: { questionId_sha256: { questionId, sha256: receipt.sha256 } },
        create: {
          questionId, ownerUserId: access.ownerUserId, sha256: receipt.sha256,
          objectKey: receipt.objectKey, width: verified.width, height: verified.height,
          placement: 'STEM'
        },
        update: {
          width: verified.width, height: verified.height,
          objectKey: receipt.objectKey, ownerUserId: access.ownerUserId
        },
        select: { id: true, sha256: true, width: true, height: true, placement: true }
      });
    });
    return res.status(200).json({
      linkedToQuestion: true, questionId, asset, updatedAt: nextRevision.toISOString()
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'STALE') {
      return res.status(409).json({ error: 'Question changed while attaching image' });
    }
    if (error instanceof Error && error.message === 'IMAGE_LIMIT') {
      return res.status(409).json({ error: 'Bu soruya en fazla 30 özel çizim bağlanabilir.' });
    }
    throw error;
  }
}
