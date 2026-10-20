import { describe, expect, it } from 'vitest';
import { GEOMETRY_BUCKET, prepareGeometryObject } from '../api/v1/_lib/geometry-storage-contract';

describe('P3-N isolated private geometry object contract', () => {
  it('produces deterministic, owner-scoped and content-hashed keys', () => {
    const a = prepareGeometryObject('triangle', 17);
    const b = prepareGeometryObject('triangle', 17);
    const other = prepareGeometryObject('triangle', 18);
    expect(a.bucket).toBe(GEOMETRY_BUCKET);
    expect(a.objectKey).toBe(b.objectKey);
    expect(a.objectKey).not.toBe(other.objectKey);
    expect(a.objectKey).toMatch(/^authors\/17\/geometry\/[a-f0-9]{64}\.svg$/);
    expect(a.contentType).toBe('image/svg+xml');
    expect(a.bytes.toString('utf8')).toContain('</svg>');
  });
  it('rejects invalid owner and untrusted shape', () => {
    expect(() => prepareGeometryObject('triangle', 0)).toThrow();
    expect(() => prepareGeometryObject('triangle', -1)).toThrow();
    expect(() => prepareGeometryObject('hexagon' as never, 17)).toThrow();
  });
});
