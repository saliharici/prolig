/**
 * P3-V uploads are deliberately Preview-only, bound to the dedicated P3
 * isolated database + private Neon storage branch. Fail closed in Production,
 * unknown previews, local environments, or missing secrets.
 */
export const P3_PNG_PREVIEW_BRANCH = 'feat/p3v-isolated-png-upload-20261021';
export const P3_ISOLATED_DB_HOST = 'ep-ancient-art-bap633lq.c-8.eu-central-1.aws.neon.tech';
export const P3_ISOLATED_STORAGE_URL =
  'https://br-misty-base-bac3oqzr.storage.c-8.eu-central-1.aws.neon.tech';
export const P3_PRIVATE_PNG_BUCKET = 'prolig-p3-geometry-test';

export interface P3StorageEnvironment {
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
  PROLIG_P3_PNG_UPLOAD_ENABLED?: string;
  DATABASE_URL?: string;
  AWS_ENDPOINT_URL_S3?: string;
  AWS_REGION?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
}

export function isP3IsolatedPngUploadEnvironment(env: P3StorageEnvironment): boolean {
  if (env.VERCEL_ENV !== 'preview' ||
      env.VERCEL_GIT_COMMIT_REF !== P3_PNG_PREVIEW_BRANCH ||
      env.PROLIG_P3_PNG_UPLOAD_ENABLED !== 'true' ||
      env.AWS_REGION !== 'eu-central-1' ||
      env.AWS_ENDPOINT_URL_S3 !== P3_ISOLATED_STORAGE_URL ||
      !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.DATABASE_URL) return false;
  try {
    const db = new URL(env.DATABASE_URL);
    if (!['postgresql:', 'postgres:'].includes(db.protocol) ||
        !db.username || !db.password || db.port ||
        !['neondb'].includes(db.pathname.slice(1))) return false;
    const hostname = db.hostname;
    return hostname === P3_ISOLATED_DB_HOST ||
      hostname === P3_ISOLATED_DB_HOST.replace('.c-8.', '-pooler.c-8.');
  } catch {
    return false;
  }
}
