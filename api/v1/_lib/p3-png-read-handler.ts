import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { getCurrentUser } from './current-user.js';
import { buildQuestionReadScope } from './question-access.js';
import { isP3IsolatedPngUploadEnvironment } from './p3-png-upload-environment.js';
import { privateGeometryPngKey, readVerifiedPrivatePng } from './p3-png-s3.js';

/** Private PNG bytes are only emitted after fresh session+DB read-scope checks. */
export async function handleP3PrivateGeometryRead(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!isP3IsolatedPngUploadEnvironment(process.env)) return res.status(404).json({ error: 'Not found' });
  const host = req.headers.host;
  if (typeof host !== 'string' || req.headers.origin !== 'https://' + host ||
      !/^application\/json(?:\s*;.*)?$/i.test(String(req.headers['content-type'] ?? ''))) {
    return res.status(403).json({ error: 'Invalid origin' });
  }
  const rawId = req.query.id;
  const assetId = req.body?.assetId;
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId) ||
      !Number.isSafeInteger(Number(rawId)) || !Number.isSafeInteger(assetId) || assetId <= 0) {
    return res.status(400).json({ error: 'Invalid asset request' });
  }
  const questionId = Number(rawId);
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Do not rely on the caller's authorUserId or on the asset's questionId alone.
  const question = await prisma.question.findFirst({
    where: { AND: [{ id: questionId }, buildQuestionReadScope(user)] },
    select: { id: true, authorUserId: true }
  });
  if (!question) return res.status(404).json({ error: 'Not found' });

  const asset = await prisma.privateGeometryAsset.findFirst({
    where: { id: assetId, questionId, ownerUserId: question.authorUserId },
    select: { sha256: true, objectKey: true, width: true, height: true, placement: true }
  });
  if (!asset || asset.placement !== 'STEM') return res.status(404).json({ error: 'Not found' });

  let expectedKey: string;
  try {
    expectedKey = privateGeometryPngKey(question.authorUserId, questionId, asset.sha256);
  } catch {
    return res.status(404).json({ error: 'Not found' });
  }
  if (asset.objectKey !== expectedKey) return res.status(404).json({ error: 'Not found' });
  try {
    const image = await readVerifiedPrivatePng(expectedKey, asset.sha256, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    });
    if (image.width !== asset.width || image.height !== asset.height) throw new Error('Size mismatch');
    return res.status(200).json({
      assetId, contentType: 'image/png', width: image.width, height: image.height,
      pngBase64: image.bytes.toString('base64')
    });
  } catch {
    return res.status(503).json({ error: 'Verified private image temporarily unavailable' });
  }
}
