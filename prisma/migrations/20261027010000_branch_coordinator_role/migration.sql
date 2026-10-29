-- PRO-LIG isolated Preview: rename existing enum; PostgreSQL keeps the identity
-- of RoleCode, so existing User / CompensationRule / CompensationEntry references
-- automatically point to BRANS_KOORDINATORU. Do NOT UPDATE rows to the deleted enum label.
DO $role$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"RoleCode"'::regtype AND enumlabel = 'IL_KOORDINATORU')
     AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = '"RoleCode"'::regtype AND enumlabel = 'BRANS_KOORDINATORU') THEN
    ALTER TYPE "RoleCode" RENAME VALUE 'IL_KOORDINATORU' TO 'BRANS_KOORDINATORU';
  END IF;
END $role$;
UPDATE "Role" SET "name" = 'Branş Koordinatörü',
  "description" = 'Atanan branşlardaki proje ve yazar üretim süreçlerini koordine eder.'
WHERE "code" = 'BRANS_KOORDINATORU';
-- Historical earning type PROJECT_PROVINCE_COORDINATOR intentionally unchanged.
