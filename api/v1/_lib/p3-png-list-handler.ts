import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma.js';
import { verifyGeometryWriteAccess } from './geometry-write-access.js';
import { isP3IsolatedPngUploadEnvironment } from './p3-png-upload-environment.js';

/** List only private metadata belonging to the authenticated, editable question. */
export async function handleP3PrivateGeometryList(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isP3IsolatedPngUploadEnvironment(process.env)) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (typeof req.headers.host !== 'string' ||
      req.headers.origin !== 'https://' + req.headers.host ||
      !/^application\/json(?:\s*;.*)?$/i.test(String(req.headers['content-type'] ?? ''))) {
    return res.status(403).json({ error: 'Invalid request origin' });
  }
  const raw = req.query.id;
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    return res.status(400).json({ error: 'Invalid question ID' });
  }
  const access = await verifyGeometryWriteAccess(req, Number(raw));
  if (!access.allowed || !['TASLAK','REVIZYON'].includes(access.questionStatus)) {
    return res.status(403).json({ error: 'Not permitted to view image list' });
  }
  const assets = await prisma.privateGeometryAsset.findMany({
    where: { questionId: access.questionId, ownerUserId: access.ownerUserId, placement: 'STEM' },
    select: { id: true, sha256: true, width: true, height: true, createdAt: true },
    orderBy: { id: 'asc' },
    take: 31
  });
  if (assets.length > 30) return res.status(409).json({ error: 'Private image list exceeds maximum' });
  return res.status(200).json({
    questionId: access.questionId, updatedAt: access.questionUpdatedAt,
    images: assets.map(a => ({ assetId: a.id, sha256: a.sha256, width: a.width,
      height: a.height, createdAt: a.createdAt.toISOString() }))
  });
}
