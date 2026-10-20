import { createHash } from 'node:crypto';
import type { GeometryShape } from '../../src/questions/geometry-svg.js';
import { geometrySvg } from '../../src/questions/geometry-svg.js';

/**
 * Private-object-storage contract for P3 geometry diagrams.
 * Deliberately does not grant upload privileges or create a public URL.
 * Upload authorization, ownership and metadata transactions are separate gates.
 */
export const GEOMETRY_BUCKET = 'prolig-p3-geometry-test';
export const GEOMETRY_CONTENT_TYPE = 'image/svg+xml';

export function prepareGeometryObject(shape: GeometryShape, ownerUserId: number) {
  if (!Number.isSafeInteger(ownerUserId) || ownerUserId <= 0) {
    throw new Error('Invalid geometry owner');
  }
  if (!['triangle', 'circle', 'square'].includes(shape)) {
    throw new Error('Unsupported geometry shape');
  }
  const svg = geometrySvg(shape);
  const bytes = Buffer.from(svg, 'utf8');
  if (bytes.byteLength > 16_384) {
    throw new Error('Geometry asset exceeds size limit');
  }
  const checksum = createHash('sha256').update(bytes).digest('hex');
  return {
    bucket: GEOMETRY_BUCKET,
    objectKey: 'authors/' + ownerUserId + '/geometry/' + checksum + '.svg',
    bytes,
    checksum,
    contentType: GEOMETRY_CONTENT_TYPE
  };
}
