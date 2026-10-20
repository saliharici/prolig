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
