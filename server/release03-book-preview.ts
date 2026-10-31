import {
  assertRelease03DbEnvironment,
  RELEASE03_REF,
  type Release03Environment,
} from './release03-db-policy.js';

/** Separate RELEASE-03 book gate: no P3 allowlist, no Production changes. */
export function isRelease03BookPreviewAllowed(env: Release03Environment): boolean {
  if (env.PROLIG_BOOKS_V2_ENABLED !== 'true' ||
      env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview' ||
      env.VERCEL_GIT_COMMIT_REF !== RELEASE03_REF ||
      env.VERCEL_GIT_REPO_OWNER !== 'saliharici' ||
      env.VERCEL_GIT_REPO_SLUG !== 'prolig' ||
      !/^[a-f0-9]{40}$/.test(env.VERCEL_GIT_COMMIT_SHA ?? '')) return false;
  try {
    return assertRelease03DbEnvironment(env) === true;
  } catch { return false; }
}
