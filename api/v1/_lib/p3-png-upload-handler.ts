import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSecret } from './auth.js';
import { isQuestionArchived } from './question-archive.js';
import { verifyGeometryWriteAccess } from './geometry-write-access.js';
import { verifyAndNormalizeGeometryPng, MAX_GEOMETRY_PNG_BYTES } from './geometry-png-validation.js';
import { isP3IsolatedPngUploadEnvironment } from './p3-png-upload-environment.js';
import { privateGeometryPngKey, putVerifiedPngInPrivateBucket } from './p3-png-s3.js';
import { issueP3PrivatePngReceipt } from './p3-png-receipt.js';

/**
 * Experimental P3 Preview-only action on the existing question serverless route.
 * Returns no private bucket URL and performs no database attachment mutation.
 * Upload receipts will be redeemed in a separate transactional bind phase.
 */
export async function handleP3IsolatedGeometryUpload(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isP3IsolatedPngUploadEnvironment(process.env)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const host = req.headers.host;
  if (typeof host !== 'string' ||
      req.headers.origin !== 'https://' + host ||
      !/^application\/json(?:\s*;.*)?$/i.test(String(req.headers['content-type'] ?? ''))) {
    return res.status(403).json({ error: 'Invalid upload origin' });
  }
  const requestLength = Number(req.headers['content-length'] ?? 0);
  if (!Number.isFinite(requestLength) || requestLength < 0 || requestLength > 760_000) {
    return res.status(413).json({ error: 'Image request is too large' });
  }
  const rawId = req.query.id;
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
    return res.status(400).json({ error: 'Invalid question ID' });
  }
  const questionId = Number(rawId);
  if (!Number.isSafeInteger(questionId)) {
    return res.status(400).json({ error: 'Invalid question ID' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      body.action !== 'geometryUpload' ||
      typeof body.pngBase64 !== 'string' ||
      typeof body.expectedUpdatedAt !== 'string' ||
      body.pngBase64.length > Math.ceil(MAX_GEOMETRY_PNG_BYTES / 3) * 4 + 8 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(body.pngBase64)) {
    return res.status(400).json({ error: 'Invalid image upload payload' });
  }
  // Reject non-canonical encodings and base64 aliases before decoding/storing.
  const encodedPng = Buffer.from(body.pngBase64, 'base64');
  if (encodedPng.toString('base64') !== body.pngBase64) {
    return res.status(400).json({ error: 'Noncanonical image upload encoding' });
  }
  let png;
  try {
    png = verifyAndNormalizeGeometryPng(encodedPng);
  } catch {
    return res.status(415).json({ error: 'Only safe bounded PNG diagrams are supported' });
  }

  const access = await verifyGeometryWriteAccess(req, questionId);
  if (!access.allowed) return res.status(403).json({ error: 'Question is not editable by this author' });
  if (!['TASLAK', 'REVIZYON'].includes(access.questionStatus) ||
      access.questionUpdatedAt !== body.expectedUpdatedAt ||
      await isQuestionArchived(questionId)) {
    return res.status(409).json({ error: 'Question revision is locked, archived, or stale' });
  }

  const objectKey = privateGeometryPngKey(access.ownerUserId, questionId, png.sha256);
  try {
    await putVerifiedPngInPrivateBucket(objectKey, png.bytes, {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    });
  } catch {
    // Do not disclose storage endpoint or signing details to the browser.
    return res.status(503).json({ error: 'Private image storage temporarily unavailable' });
  }
  return res.status(201).json({
    storedPrivate: true,
    linkedToQuestion: false,
    receipt: issueP3PrivatePngReceipt(access.ownerUserId, questionId, png.sha256, getSecret()),
    sha256: png.sha256,
    width: png.width,
    height: png.height,
    receiptExpiresInSeconds: 600
  });
}
