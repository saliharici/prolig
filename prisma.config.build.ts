/**
 * Offline Prisma Client generation for Vercel/CI builds only.
 *
 * The release03 default Prisma config deliberately gates every Preview
 * Prisma command. "prisma generate" does not connect to a database:
 * use this separate generate-only config so a non-release03 feature branch
 * can compile without weakening migration/seed/db-push protections.
 *
 * No connection string, host, password or migration path is provided.
 */
import { defineConfig } from 'prisma/config';

if (!process.argv.slice(2).includes('generate')) {
  throw new Error('PRISMA_BUILD_CONFIG_GENERATE_ONLY');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: '' }
});
