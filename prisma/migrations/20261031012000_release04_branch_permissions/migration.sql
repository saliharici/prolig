-- RELEASE-04 EXPAND; additive, no user role conversion, no historical payments changed.
-- Empty permissions deny every BRANS capability until a General/Regional manager explicitly grants rights.
ALTER TABLE "User" ADD COLUMN "branchPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
