/**
 * RELEASE-04 local ephemeral Postgres CI verifier only.
 * A successful CI does not authorize Production writes.
 * The production candidate is staged separately without P3 by
 * scripts/release04-stage-production-migrations.mjs.
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.env.DIRECT_URL ?? '';
let url;
try { url = new URL(source); } catch { throw new Error('RELEASE04_LOCAL_CI_DB_REQUIRED'); }
if (process.env.CI !== 'true' ||
    !['127.0.0.1','localhost'].includes(url.hostname) ||
    url.pathname !== '/prolig_release03_ci' ||
    !existsSync(resolve('prisma/.release04-production-migrations/migration_lock.toml'))) {
  throw new Error('RELEASE04_EPHEMERAL_CI_ONLY');
}
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/.release04-production-migrations' },
  datasource: { url: source }
});
