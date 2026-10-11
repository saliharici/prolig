const allowedPlacements = new Set(['STEM', 'OPTION_A', 'OPTION_B', 'OPTION_C', 'OPTION_D', 'EXPLANATION']);
const allowedTypes = new Set(['IMAGE', 'VIDEO_URL', 'LINK']);

export interface NormalizedQuestionAsset {
  placement: string;
  assetType: string;
  url: string;
  title: string | null;
  altText: string | null;
  sortOrder: number;
}

export function parseQuestionAssets(raw: unknown): { ok: true; assets: NormalizedQuestionAsset[] } | { ok: false; error: string } {
  if (raw === undefined) return { ok: true, assets: [] };
  if (raw === null) return { ok: true, assets: [] };
  if (!Array.isArray(raw)) return { ok: false, error: 'Assets must be an array' };
  if (raw.length > 12) return { ok: false, error: 'Too many assets' };

  const assets: NormalizedQuestionAsset[] = [];

  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== 'object') return { ok: false, error: 'Invalid asset' };
    const asset = item as Record<string, unknown>;

    if (typeof asset.placement !== 'string' || !allowedPlacements.has(asset.placement)) {
      return { ok: false, error: 'Invalid asset placement' };
    }

    if (typeof asset.assetType !== 'string' || !allowedTypes.has(asset.assetType)) {
      return { ok: false, error: 'Invalid asset type' };
    }

    if (typeof asset.url !== 'string' || asset.url.trim().length === 0 || asset.url.trim().length > 1000) {
      return { ok: false, error: 'Invalid asset url' };
    }

    try {
      const parsed = new URL(asset.url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, error: 'Invalid asset url' };
      }
    } catch {
      return { ok: false, error: 'Invalid asset url' };
    }

    const title = asset.title === undefined || asset.title === null ? null : String(asset.title).trim();
    if (title && title.length > 120) return { ok: false, error: 'Invalid asset title' };

    const altText = asset.altText === undefined || asset.altText === null ? null : String(asset.altText).trim();
    if (altText && altText.length > 240) return { ok: false, error: 'Invalid asset altText' };

    const sortOrder = Number.isSafeInteger(asset.sortOrder) ? Number(asset.sortOrder) : index;
    if (sortOrder < 0 || sortOrder > 99) return { ok: false, error: 'Invalid asset sortOrder' };

    assets.push({
      placement: asset.placement,
      assetType: asset.assetType,
      url: asset.url.trim(),
      title: title || null,
      altText: altText || null,
      sortOrder
    });
  }

  return { ok: true, assets };
}
