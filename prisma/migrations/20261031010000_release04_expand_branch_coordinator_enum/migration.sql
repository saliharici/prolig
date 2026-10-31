-- RELEASE-04 EXPAND: additive only. Historical IL_KOORDINATORU enum and accounts remain unchanged.
-- IMPORTANT: this file is NOT permission to run prisma migrate deploy against Production.
-- The P3 isolated Preview migration still precedes this directory chronologically.
ALTER TYPE "RoleCode" ADD VALUE IF NOT EXISTS 'BRANS_KOORDINATORU';
