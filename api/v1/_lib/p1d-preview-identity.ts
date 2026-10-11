/**
 * Fail-closed environment gate for the P1-D preview database identity probe.
 * No credentials, hostnames, or connection strings may appear in responses.
 */
export const P1D_PREVIEW_BRANCH = 'feat/question-studio-p1d-safe-roundtrip-20261011';
export const P1D_SANDBOX_DATABASE = 'prolig_p1d_sandbox';

export interface P1DPreviewIdentity {
  vercelEnv?: string;
  gitCommitRef?: string;
  databaseUrl?: string;
}

export function isP1DPreviewSandboxTarget(input: P1DPreviewIdentity): boolean {
  if (input.vercelEnv !== 'preview' || input.gitCommitRef !== P1D_PREVIEW_BRANCH || !input.databaseUrl) {
    return false;
  }
  try {
    const parsed = new URL(input.databaseUrl);
    return (
      (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') &&
      parsed.hostname.endsWith('.neon.tech') &&
      parsed.hostname !== 'neon.tech' &&
      parsed.pathname === '/' + P1D_SANDBOX_DATABASE &&
      !!parsed.username && !!parsed.password
    );
  } catch {
    return false;
  }
}

/**
 * Safe diagnostic code for an unsuccessful Preview-only probe.
 * Never returns any connection-string characters, host, branch name or secret.
 * Do not use this instead of the fail-closed isP1DPreviewSandboxTarget guard.
 */
export function p1dPreviewRefusalCode(input: P1DPreviewIdentity):
  'NOT_PREVIEW' | 'BRANCH_METADATA_MISSING' | 'BRANCH_MISMATCH' |
  'DATABASE_URL_MISSING' | 'DATABASE_TARGET_MISMATCH' {
  if (input.vercelEnv !== 'preview') return 'NOT_PREVIEW';
  if (!input.gitCommitRef) return 'BRANCH_METADATA_MISSING';
  if (input.gitCommitRef !== P1D_PREVIEW_BRANCH) return 'BRANCH_MISMATCH';
  if (!input.databaseUrl) return 'DATABASE_URL_MISSING';
  return 'DATABASE_TARGET_MISMATCH';
}
