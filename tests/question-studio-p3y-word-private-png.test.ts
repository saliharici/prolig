import { describe, expect, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { verifyAndNormalizeGeometryPng } from '../api/v1/_lib/geometry-png-validation';
import {
  exportBookDocx, exportBookDocxWithVerifiedPrivateGeometry, DocxExportError
} from '../api/v1/_lib/book-docx';
import type { FrozenBookQuestionV1 } from '../src/publishing/book-draft-contract';

function crc(bytes: Buffer): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer) {
  const tag = Buffer.from(name);
  const prefix = Buffer.alloc(8);
  prefix.writeUInt32BE(data.length, 0);
  tag.copy(prefix, 4);
  const suffix = Buffer.alloc(4);
  suffix.writeUInt32BE(crc(Buffer.concat([tag, data])), 0);
  return Buffer.concat([prefix, data, suffix]);
}
function validImage() {
  const ihdr = Buffer.from([0,0,0,1,0,0,0,1,8,6,0,0,0]);
  const bytes = Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.from([0,200,100,50,255]))),
    chunk('IEND', Buffer.alloc(0))
  ]);
  return verifyAndNormalizeGeometryPng(bytes);
}
const png = validImage();
const question = (): FrozenBookQuestionV1 => ({
  schemaVersion: 1, sourceQuestionId: 10, sourceQuestionUpdatedAt: '2026-10-21T00:00:00.000Z',
  content: 'Özel çizime göre problemi çözünüz.', imageUrl: null,
  grade: '8', objectiveCode: null, difficulty: null, questionType: 'MULTIPLE_CHOICE',
  options: ['A seçeneği', 'B seçeneği', 'C seçeneği', 'D seçeneği'],
  correctAnswer: 'A', booleanAnswer: null, modelAnswer: null, explanation: null,
  scoringRubric: null, evaluationCriteria: null, authorName: null, assets: [],
  privateGeometryAssets: [{ assetId: 3, sha256: png.sha256, width: 1, height: 1, placement: 'STEM' }]
});
function book(snapshot = question()) {
  return { id: 1, title: 'Geometri test kitabı', layoutColumns: 1,
    chapters: [{ title: 'Geometri', sortOrder: 0, questions: [{ sortOrder: 0, snapshot }] }] };
}
function media() {
  return [{ sourceQuestionId: 10, assetId: 3, sha256: png.sha256,
    width: 1, height: 1, bytes: png.bytes }];
}

describe('P3-Y verified private PNG in Word document', () => {
  it('embeds actual PNG bytes and a native Word image relationship', () => {
    const zip = exportBookDocxWithVerifiedPrivateGeometry(book(), false, media());
    const text = zip.toString('latin1'); // STORE ZIP exposes XML and tiny PNG payload.
    expect(text).toContain('word/media/p3-1.png');
    expect(text).toContain('Target="media/p3-1.png"');
    expect(text).toContain('ContentType="image/png"');
    expect(text).toContain('<pic:pic>');
    expect(text).toContain('r:embed="rId4"');
    expect(text).toContain('xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"');
    expect(zip.includes(png.bytes)).toBe(true);
    expect(text).not.toContain('[[prolig-geometry:v1:');
  });

  it('refuses silent picture loss in the ordinary Word entry point', () => {
    expect(() => exportBookDocx(book(), false)).toThrow(DocxExportError);
  });

  it('refuses modified bytes, unrecorded assets and cross-question substitutions', () => {
    const invalid = { ...media()[0], sha256: 'a'.repeat(64) };
    expect(() => exportBookDocxWithVerifiedPrivateGeometry(book(), false, [invalid])).toThrow(DocxExportError);
    expect(() => exportBookDocxWithVerifiedPrivateGeometry(book(), false,
      [{ ...media()[0], sourceQuestionId: 11 }])).toThrow(DocxExportError);
    expect(() => exportBookDocxWithVerifiedPrivateGeometry(book(), false,
      [{ ...media()[0], assetId: 17 }])).toThrow(DocxExportError);
    expect(() => exportBookDocxWithVerifiedPrivateGeometry(book(), false,
      [media()[0], media()[0]])).toThrow(DocxExportError);
    expect(() => exportBookDocxWithVerifiedPrivateGeometry(book({
      ...question(), privateGeometryAssets: undefined
    }), false, media())).toThrow(DocxExportError);
  });
});
