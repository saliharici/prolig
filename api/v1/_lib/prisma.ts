import { createRelease03GuardedPool } from '../../../server/release03-db-connection.js';
import { createRelease05PreviewPool, isRelease05Preview } from '../../../server/release05-preview-db.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

// RELEASE-05 uses a separately pinned isolated Neon Preview; all other branches retain RELEASE-03 policy.
const pool = isRelease05Preview(process.env)
  ? createRelease05PreviewPool({ connectionString })
  : createRelease03GuardedPool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
