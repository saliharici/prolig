-- UX-04 BRANS KOORDINATORU: Only migrate on an explicitly isolated Preview database.
-- Existing IL coordinator role identities and financial rule ownership are preserved.
-- A migrated coordinator receives NO automatic branch assignments (fail closed).
ALTER TYPE "RoleCode" RENAME VALUE 'IL_KOORDINATORU' TO 'BRANS_KOORDINATORU';
UPDATE "Role" SET "name"='Branş Koordinatörü', "description"='Atandığı branşlardaki projeleri ve yazarların üretim süreçlerini koordine eder.' WHERE "code"='BRANS_KOORDINATORU';
UPDATE "CompensationRule" SET "roleCode"='BRANS_KOORDINATORU' WHERE "roleCode"='IL_KOORDINATORU';
UPDATE "CompensationEntry" SET "roleCode"='BRANS_KOORDINATORU' WHERE "roleCode"='IL_KOORDINATORU';
-- The historical earning type PROJECT_PROVINCE_COORDINATOR is retained as an
-- internal accounting discriminator; its human-readable label becomes Branch.
