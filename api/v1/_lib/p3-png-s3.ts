import { createHash, createHmac } from 'node:crypto';
import { P3_ISOLATED_STORAGE_URL, P3_PRIVATE_PNG_BUCKET } from './p3-png-upload-environment.js';

function hash(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}
function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

export function privateGeometryPngKey(ownerId: number, questionId: number, sha256: string): string {
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0 ||
      !Number.isSafeInteger(questionId) || questionId <= 0 ||
      !/^[a-f0-9]{64}$/.test(sha256)) {
    throw new Error('Invalid private image identity');
  }
  return 'authors/' + ownerId + '/questions/' + questionId + '/geometry/' + sha256 + '.png';
}

export interface S3PngUploadCredentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export function signP3PngUpload(
  key: string,
  bytes: Buffer,
  credentials: S3PngUploadCredentials,
  time: Date = new Date()
): { url: string; headers: Record<string, string> } {
  if (!/^authors\/[1-9]\d*\/questions\/[1-9]\d*\/geometry\/[a-f0-9]{64}\.png$/.test(key) ||
      !credentials.accessKeyId || !credentials.secretAccessKey ||
      !Number.isFinite(time.getTime()) || !Buffer.isBuffer(bytes) || bytes.length === 0) {
    throw new Error('Invalid isolated PNG upload request');
  }
  if (!/^[a-zA-Z0-9_-]{3,128}$/.test(credentials.accessKeyId)) {
    throw new Error('Invalid storage credential identity');
  }
  const amzDate = time.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const region = 'eu-central-1';
  const scope = date + '/' + region + '/s3/aws4_request';
  const host = new URL(P3_ISOLATED_STORAGE_URL).host;
  const canonicalUri = '/' + [P3_PRIVATE_PNG_BUCKET, ...key.split('/')].map(encodeURIComponent).join('/');
  const bodyHash = hash(bytes);
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = 'content-type:image/png\n' +
    'host:' + host + '\n' +
    'x-amz-content-sha256:' + bodyHash + '\n' +
    'x-amz-date:' + amzDate + '\n';
  const canonicalRequest = [
    'PUT', canonicalUri, '', canonicalHeaders, signedHeaders, bodyHash
  ].join('\n');
  const toSign = 'AWS4-HMAC-SHA256\n' + amzDate + '\n' + scope + '\n' + hash(canonicalRequest);
  const dateKey = hmac('AWS4' + credentials.secretAccessKey, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  const signingKey = hmac(serviceKey, 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(toSign).digest('hex');
  return {
    url: P3_ISOLATED_STORAGE_URL + canonicalUri,
    headers: {
      'content-type': 'image/png',
      'x-amz-date': amzDate,
      'x-amz-content-sha256': bodyHash,
      authorization: 'AWS4-HMAC-SHA256 Credential=' + credentials.accessKeyId +
        '/' + scope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature
    }
  };
}

/** No public URL, presign, or raw credential is returned to the caller. */
export async function putVerifiedPngInPrivateBucket(
  key: string,
  bytes: Buffer,
  credentials: S3PngUploadCredentials,
  send: typeof fetch = fetch
): Promise<void> {
  const signed = signP3PngUpload(key, bytes, credentials);
  const response = await send(signed.url, {
    method: 'PUT',
    headers: signed.headers,
    body: new Uint8Array(bytes),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Private geometry storage write failed');
}


/**
 * Server-side authenticated private object retrieval.
 * Never expose a signed S3 URL to the client. Object key is generated from
 * the trusted owner, question and checksum, not arbitrary request text.
 */
export function signP3PngRead(
  key: string,
  credentials: S3PngUploadCredentials,
  time: Date = new Date()
): { url: string; headers: Record<string, string> } {
  if (!/^authors\/[1-9]\d*\/questions\/[1-9]\d*\/geometry\/[a-f0-9]{64}\.png$/.test(key) ||
      !credentials.accessKeyId || !credentials.secretAccessKey || !Number.isFinite(time.getTime())) {
    throw new Error('Invalid private PNG read request');
  }
  const amzDate = time.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const region = 'eu-central-1';
  const date = amzDate.slice(0, 8);
  const scope = date + '/' + region + '/s3/aws4_request';
  const host = new URL(P3_ISOLATED_STORAGE_URL).host;
  const path = '/' + [P3_PRIVATE_PNG_BUCKET, ...key.split('/')].map(encodeURIComponent).join('/');
  const emptyHash = hash('');
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = 'host:' + host + '\n' +
    'x-amz-content-sha256:' + emptyHash + '\n' +
    'x-amz-date:' + amzDate + '\n';
  const canonicalRequest = ['GET', path, '', canonicalHeaders, signedHeaders, emptyHash].join('\n');
  const toSign = 'AWS4-HMAC-SHA256\n' + amzDate + '\n' + scope + '\n' + hash(canonicalRequest);
  const keyDate = hmac('AWS4' + credentials.secretAccessKey, date);
  const keyRegion = hmac(keyDate, region);
  const keyService = hmac(keyRegion, 's3');
  const signature = createHmac('sha256', hmac(keyService, 'aws4_request')).update(toSign).digest('hex');
  return {
    url: P3_ISOLATED_STORAGE_URL + path,
    headers: {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': emptyHash,
      authorization: 'AWS4-HMAC-SHA256 Credential=' + credentials.accessKeyId +
        '/' + scope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature
    }
  };
}

export async function readVerifiedPrivatePng(
  key: string,
  expectedSha256: string,
  credentials: S3PngUploadCredentials,
  send: typeof fetch = fetch
): Promise<import('./geometry-png-validation.js').VerifiedGeometryPng> {
  if (!/^[a-f0-9]{64}$/.test(expectedSha256) || !key.endsWith('/' + expectedSha256 + '.png')) {
    throw new Error('Invalid private PNG checksum');
  }
  const signed = signP3PngRead(key, credentials);
  const response = await send(signed.url, {
    method: 'GET', headers: signed.headers, signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Private PNG object is unavailable');
  const maxBytes = 512 * 1024;
  if (Number(response.headers.get('content-length') ?? '0') > maxBytes) {
    await response.body?.cancel();
    throw new Error('Private PNG object too large');
  }
  if (!response.body) throw new Error('Missing private PNG payload');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.length;
      if (length > maxBytes) throw new Error('Private PNG object too large');
      parts.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const { verifyAndNormalizeGeometryPng } = await import('./geometry-png-validation.js');
  const png = verifyAndNormalizeGeometryPng(Buffer.concat(parts.map(part => Buffer.from(part))));
  if (png.sha256 !== expectedSha256) throw new Error('Private PNG checksum mismatch');
  return png;
}
