import { createHash } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';

/**
 * Server-side P3-U content verification, not a filename/MIME-only check.
 * Only PNG RGBA 8-bit noninterlaced pixels from a canvas are accepted.
 * Rebuild from decoded scanlines and discard ALL untrusted metadata chunks.
 * SVG/XML, JPEG, APNG and arbitrary PNG ancillary content fail closed.
 */
export const MAX_GEOMETRY_PNG_BYTES = 512 * 1024;
export const MAX_GEOMETRY_PNG_DIMENSION = 1024;
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, 'ascii');
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  name.copy(result, 4);
  data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return result;
}

export interface VerifiedGeometryPng {
  bytes: Buffer;
  sha256: string;
  width: number;
  height: number;
  contentType: 'image/png';
}

export function verifyAndNormalizeGeometryPng(payload: Buffer): VerifiedGeometryPng {
  if (!Buffer.isBuffer(payload) || payload.length < 57 || payload.length > MAX_GEOMETRY_PNG_BYTES ||
      !payload.subarray(0, 8).equals(SIGNATURE)) throw new Error('Invalid PNG upload');

  let offset = 8;
  let width = 0;
  let height = 0;
  let phase: 'header' | 'image' | 'end' = 'header';
  let firstImage = false;
  let imageDone = false;
  const imageParts: Buffer[] = [];
  let imageBytes = 0;

  while (offset < payload.length) {
    if (offset + 12 > payload.length) throw new Error('Truncated PNG chunk');
    const size = payload.readUInt32BE(offset);
    if (size > MAX_GEOMETRY_PNG_BYTES || size > payload.length - offset - 12) {
      throw new Error('Oversized PNG chunk');
    }
    const type = payload.toString('ascii', offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type)) throw new Error('Invalid PNG chunk type');
    const data = payload.subarray(offset + 8, offset + 8 + size);
    const expectedCrc = payload.readUInt32BE(offset + 8 + size);
    if (crc32(payload.subarray(offset + 4, offset + 8 + size)) !== expectedCrc) {
      throw new Error('Corrupt PNG chunk checksum');
    }
    offset += size + 12;

    if (type === 'IHDR' && phase === 'header') {
      if (size !== 13) throw new Error('Invalid PNG header');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (width < 1 || height < 1 ||
          width > MAX_GEOMETRY_PNG_DIMENSION || height > MAX_GEOMETRY_PNG_DIMENSION ||
          data[8] !== 8 || data[9] !== 6 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
        throw new Error('Only bounded RGBA8 noninterlaced PNG is supported');
      }
      phase = 'image';
    } else if (type === 'IDAT' && phase === 'image' && !imageDone) {
      imageBytes += size;
      if (imageBytes > MAX_GEOMETRY_PNG_BYTES) throw new Error('Oversized PNG image data');
      imageParts.push(Buffer.from(data));
      firstImage = true;
    } else if (type === 'IEND' && phase === 'image' && firstImage && size === 0) {
      phase = 'end';
      if (offset !== payload.length) throw new Error('Trailing PNG bytes');
      break;
    } else {
      // Explicitly reject PLTE, tEXt, iTXt, APNG acTL/fcTL, unknown extensions,
      // multiple headers, and nonconsecutive image-data chunks.
      throw new Error('Unsupported PNG chunk');
    }
    if (type !== 'IDAT' && firstImage) imageDone = true;
  }
  if (phase !== 'end' || !firstImage || !width || !height) throw new Error('Incomplete PNG image');
  const scanlineSize = 1 + width * 4;
  const exactLength = scanlineSize * height;
  let pixels: Buffer;
  try {
    pixels = inflateSync(Buffer.concat(imageParts), { maxOutputLength: exactLength + 1 });
  } catch {
    throw new Error('Invalid or oversized PNG pixel data');
  }
  if (pixels.length !== exactLength) throw new Error('Incorrect PNG pixel count');
  for (let row = 0; row < height; row += 1) {
    if (pixels[row * scanlineSize] > 4) throw new Error('Unsupported PNG filter');
  }

  // Re-encode: only signature + newly generated IHDR/IDAT/IEND leave this boundary.
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const normalized = Buffer.concat([
    SIGNATURE, chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  if (normalized.length > MAX_GEOMETRY_PNG_BYTES) throw new Error('Normalized PNG too large');
  return {
    bytes: normalized,
    width,
    height,
    sha256: createHash('sha256').update(normalized).digest('hex'),
    contentType: 'image/png'
  };
}
