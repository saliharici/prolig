import { verifyAndNormalizeGeometryPng } from './geometry-png-validation.js';

export interface TrustedDocxPrivatePng {
  sourceQuestionId: number;
  assetId: number;
  sha256: string;
  width: number;
  height: number;
  bytes: Buffer;
}

export interface FrozenPrivatePngReference {
  assetId: number;
  sha256: string;
  width: number;
  height: number;
  placement: 'STEM';
}

export interface PreparedPrivateDocxPng {
  sourceQuestionId: number;
  assetId: number;
  sha256: string;
  width: number;
  height: number;
  bytes: Buffer;
  filename: string;
  relationshipId: string;
}

const MAX_DOCX_PRIVATE_IMAGES = 30;

function validId(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function prepareTrustedDocxPngs(
  input: ReadonlyArray<TrustedDocxPrivatePng>
): PreparedPrivateDocxPng[] {
  if (!Array.isArray(input) || input.length > MAX_DOCX_PRIVATE_IMAGES) {
    throw new Error('Too many private PNG images for Word export');
  }
  const seen = new Set<string>();
  return input.map((asset, i) => {
    if (!validId(asset.sourceQuestionId) || !validId(asset.assetId) ||
        !Number.isSafeInteger(asset.width) || !Number.isSafeInteger(asset.height) ||
        !/^[0-9a-f]{64}$/.test(asset.sha256) || !Buffer.isBuffer(asset.bytes)) {
      throw new Error('Invalid private Word image metadata');
    }
    const normalized = verifyAndNormalizeGeometryPng(asset.bytes);
    if (normalized.sha256 !== asset.sha256 ||
        normalized.width !== asset.width || normalized.height !== asset.height) {
      throw new Error('Private Word image checksum or dimensions mismatch');
    }
    const key = asset.sourceQuestionId + ':' + asset.assetId;
    if (seen.has(key)) throw new Error('Duplicate private Word image');
    seen.add(key);
    return {
      ...asset,
      bytes: normalized.bytes,
      filename: 'word/media/p3-' + (i + 1) + '.png',
      relationshipId: 'rId' + (i + 4)
    };
  });
}

/** WordprocessingML image using document-scoped, bound, verified r:embed. */
export function privatePngWordDrawing(
  image: PreparedPrivateDocxPng,
  drawingId: number
): string {
  if (!validId(drawingId) || !validId(image.assetId) ||
      !/^rId[4-9]\d*$/.test(image.relationshipId)) {
    throw new Error('Invalid document image identity');
  }
  const max = 1_800_000;
  const cx = Math.round(max * Math.min(1, image.width / image.height));
  const cy = Math.round(max * Math.min(1, image.height / image.width));
  const name = 'PRO-LIG özel çizim ' + image.assetId;
  return '<w:p><w:r><w:drawing>' +
    '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
    '<wp:docPr id="' + drawingId + '" name="' + name + '"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="' + name + '"/>' +
    '<pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="' + image.relationshipId + '"/>' +
    '<a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/>' +
    '<a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic>' +
    '</wp:inline></w:drawing></w:r></w:p>';
}

export function privatePngRelationshipEntries(images: ReadonlyArray<PreparedPrivateDocxPng>): string {
  return images.map(image => '<Relationship Id="' + image.relationshipId + '" ' +
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" ' +
    'Target="media/' + image.filename.split('/').pop() + '"/>').join('');
}
