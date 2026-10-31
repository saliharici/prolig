/**
 * RELEASE-04 FUTURE PRODUCTION RUNNER CONFIG — no database calls on import.
 * This file is NOT used by Vercel builds, default prisma.config.ts, or CI.
 * An authorized 02 CANLI release must invoke it explicitly with --config,
 * after a separate approved rollback plan and Neon target verification.
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

function block(): never { throw new Error('RELEASE04_PRODUCTION_MIGRATION_NOT_AUTHORIZED'); }
const releaseApproval = process.env.RELEASE04_EXPLICIT_PRODUCTION_APPROVAL;
const approvedSha = process.env.RELEASE04_APPROVED_RELEASE_SHA;
const repository = process.env.GITHUB_REPOSITORY;
const branch = process.env.GITHUB_REF;
const actualSha = process.env.GITHUB_SHA;
if (releaseApproval !== 'RELEASE04_APPROVED_WITH_ROLLBACK' ||
    repository !== 'saliharici/prolig' ||
    branch !== 'refs/heads/main' ||
    !approvedSha || !actualSha || approvedSha !== actualSha ||
    !/^[a-f0-9]{40}$/.test(actualSha)) block();

const uri = process.env.DIRECT_URL;
const expectedHost = process.env.RELEASE04_APPROVED_PRODUCTION_DB_HOST;
let target: URL;
try { target = new URL(uri ?? ''); } catch { block(); }
if (!uri || !expectedHost || !expectedHost.endsWith('.neon.tech') ||
    !['postgresql:', 'postgres:'].includes(target!.protocol) ||
    target!.hostname !== expectedHost ||
    target!.pathname !== '/neondb' ||
    target!.searchParams.getAll('sslmode').length !== 1 ||
    target!.searchParams.get('sslmode') !== 'verify-full' ||
    !target!.username || !target!.password ||
    target!.searchParams.has('uselibpqcompat')) block();

const path = resolve('prisma/.release04-production-migrations');
const manifestPath = join(path, 'RELEASE04_MANIFEST.json');
if (!existsSync(manifestPath)) block();
let manifest: Record<string, unknown>;
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { block(); }
if (manifest!.policy !== 'RELEASE04_PRODUCTION_CANDIDATE_NO_P3' ||
    manifest!.historicalChecksumCertified !== true ||
    !Array.isArray(manifest!.historical) || manifest!.historical.length !== 9 ||
    !Array.isArray(manifest!.pending) || manifest!.pending.length !== 3 ||
    !Array.isArray(manifest!.excluded) ||
    !manifest!.excluded.includes('20261021120000_p3_private_geometry_assets') ||
    !Array.isArray(manifest!.approved) || manifest!.approved.length !== 12) block();
const approved = manifest!.approved as string[];
const checksums = manifest!.checksums as Record<string, string>;
if (!checksums || typeof checksums !== 'object' ||
    approved.includes('20261021120000_p3_private_geometry_assets') ||
    existsSync(join(path, '20261021120000_p3_private_geometry_assets'))) block();
for (const name of approved) {
  if (!/^[0-9]{14}_[a-z0-9_]+$/.test(name)) block();
  const sql = join(path, name, 'migration.sql');
  if (!existsSync(sql)) block();
  const checksum = createHash('sha256').update(readFileSync(sql)).digest('hex');
  if (checksum !== checksums[name]) block();
}
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path },
  datasource: { url: uri }
});
