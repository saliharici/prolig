import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';
import {
  isP1DPreviewSandboxTarget,
  P1D_SANDBOX_DATABASE
} from './_lib/p1d-preview-identity.js';

/**
 * P1-D Preview ONLY: read-only runtime database identity check.
 * Returns only verification state, never account records or connection details.
 * It fails closed on Production, unrelated branches, or unexpected DB URLs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ sandboxVerified: false });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!isP1DPreviewSandboxTarget({
    vercelEnv: process.env.VERCEL_ENV,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    databaseUrl: connectionString
  })) {
    // Do not even attempt a connection to the Production or unknown database.
    return res.status(404).json({ sandboxVerified: false });
  }

  const client = new Client({ connectionString, connectionTimeoutMillis: 6000 });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    await client.query('BEGIN READ ONLY');
    const result = await client.query<{
      database_name: string;
      migration_applied: boolean;
      sandbox_project_found: boolean;
    }>(`
      SELECT
        current_database() AS database_name,
        EXISTS (
          SELECT 1 FROM public."_prisma_migrations"
          WHERE migration_name = '20261011115000_question_media_assets'
            AND finished_at IS NOT NULL AND rolled_back_at IS NULL
        ) AS migration_applied,
        EXISTS (
          SELECT 1 FROM public."Project"
          WHERE code = 'PILOT-MAT-8-001'
        ) AS sandbox_project_found
    `);
    const first = result.rows[0];
    const sandboxVerified = (
      first?.database_name === P1D_SANDBOX_DATABASE &&
      first.migration_applied === true &&
      first.sandbox_project_found === true
    );
    return res.status(sandboxVerified ? 200 : 503).json({ sandboxVerified, readOnly: true });
  } catch {
    // No error details, SQL output or secrets must be returned to callers.
    return res.status(503).json({ sandboxVerified: false });
  } finally {
    if (connected) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    await client.end().catch(() => undefined);
  }
}
