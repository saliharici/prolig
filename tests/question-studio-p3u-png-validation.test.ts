import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import {
  MAX_GEOMETRY_PNG_BYTES,
  verifyAndNormalizeGeometryPng
} from '../api/v1/_lib/geometry-png-validation';

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(name: string, body: Buffer) {
  const type = Buffer.from(name);
  const prefix = Buffer.alloc(8);
  prefix.writeUInt32BE(body.length, 0);
  type.copy(prefix, 4);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([type, body])), 0);
  return Buffer.concat([prefix, body, crc]);
}
const signature = Buffer.from([137,80,78,71,13,10,26,10]);
const header = Buffer.from([0,0,0,1,0,0,0,1,8,6,0,0,0]);
const pixel = Buffer.from([0,254,1,2,255]); // filter 0, RGBA.
function png(options: { chunks?: Array<[string, Buffer]>; pixels?: Buffer; header?: Buffer } = {}) {
  const chunks: Array<[string, Buffer]> = options.chunks ?? [
    ['IHDR', options.header ?? header],
    ['IDAT', deflateSync(options.pixels ?? pixel)],
    ['IEND', Buffer.alloc(0)]
  ];
  return Buffer.concat([signature, ...chunks.map(([name, body]) => chunk(name, body))]);
}
describe('P3-U server-side PNG inspection and normalization', () => {
  it('accepts a real bounded RGBA PNG and strips all noncanonical bytes', () => {
    const verified = verifyAndNormalizeGeometryPng(png());
    expect(verified.width).toBe(1);
    expect(verified.height).toBe(1);
    expect(verified.contentType).toBe('image/png');
    expect(verified.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyAndNormalizeGeometryPng(verified.bytes).sha256).toBe(verified.sha256);
  });
  it('rejects fake headers, corrupt CRC, and appended polyglot payloads', () => {
    expect(() => verifyAndNormalizeGeometryPng(Buffer.from('<svg onload="alert(1)"/>'))).toThrow();
    expect(() => verifyAndNormalizeGeometryPng(Buffer.alloc(MAX_GEOMETRY_PNG_BYTES + 1))).toThrow();
    const corrupted = png();
    corrupted[corrupted.length - 9] ^= 0x01;
    expect(() => verifyAndNormalizeGeometryPng(corrupted)).toThrow();
    expect(() => verifyAndNormalizeGeometryPng(Buffer.concat([png(), Buffer.from('<script>')]))).toThrow();
  });
  it('rejects metadata, APNG, palette, unknown chunks and excessive dimensions', () => {
    for (const name of ['tEXt', 'acTL', 'PLTE', 'iTXt']) {
      expect(() => verifyAndNormalizeGeometryPng(png({ chunks: [
        ['IHDR', header], [name, Buffer.alloc(0)],
        ['IDAT', deflateSync(pixel)], ['IEND', Buffer.alloc(0)]
      ] }))).toThrow();
    }
    const tooWide = Buffer.from(header);
    tooWide.writeUInt32BE(4096, 0);
    expect(() => verifyAndNormalizeGeometryPng(png({ header: tooWide }))).toThrow();
    const palette = Buffer.from(header);
    palette[9] = 3;
    expect(() => verifyAndNormalizeGeometryPng(png({ header: palette }))).toThrow();
  });
  it('rejects a decompression bomb, nonmatching pixels, and unsupported filters', () => {
    expect(() => verifyAndNormalizeGeometryPng(png({ pixels: Buffer.alloc(100_000) }))).toThrow();
    expect(() => verifyAndNormalizeGeometryPng(png({ pixels: Buffer.alloc(4) }))).toThrow();
    expect(() => verifyAndNormalizeGeometryPng(png({ pixels: Buffer.from([5,0,0,0,0]) }))).toThrow();
  });
});
