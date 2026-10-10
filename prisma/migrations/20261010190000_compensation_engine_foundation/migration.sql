CREATE TYPE "CompensationEarningType" AS ENUM (
  'QUESTION_AUTHOR',
  'QUESTION_EDITOR',
  'PROJECT_PROVINCE_COORDINATOR',
  'PROJECT_REGION_COORDINATOR',
  'PROJECT_GENERAL_COORDINATOR'
);

CREATE TYPE "CompensationUnitType" AS ENUM (
  'QUESTION',
  'PROJECT',
  'PERIOD'
);

CREATE TYPE "CompensationEntryStatus" AS ENUM (
  'HAK_EDILDI',
  'ODEME_BEKLIYOR',
  'ODEMEYE_ALINDI',
  'ODENDI',
  'IPTAL'
);

CREATE TABLE "CompensationRule" (
  "id" SERIAL NOT NULL,
  "roleCode" "RoleCode" NOT NULL,
  "earningType" "CompensationEarningType" NOT NULL,
  "unitType" "CompensationUnitType" NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "projectId" INTEGER,
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "validTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdByUserId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompensationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompensationEntry" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "roleCode" "RoleCode" NOT NULL,
  "earningType" "CompensationEarningType" NOT NULL,
  "projectId" INTEGER,
  "questionId" INTEGER,
  "ruleId" INTEGER NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "CompensationEntryStatus" NOT NULL DEFAULT 'HAK_EDILDI',
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CompensationEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompensationRule_roleCode_earningType_isActive_idx"
ON "CompensationRule"("roleCode","earningType","isActive");

CREATE INDEX "CompensationRule_projectId_isActive_idx"
ON "CompensationRule"("projectId","isActive");

CREATE INDEX "CompensationRule_validFrom_idx"
ON "CompensationRule"("validFrom");

CREATE UNIQUE INDEX "CompensationEntry_sourceKey_key"
ON "CompensationEntry"("sourceKey");

CREATE INDEX "CompensationEntry_userId_status_idx"
ON "CompensationEntry"("userId","status");

CREATE INDEX "CompensationEntry_projectId_status_idx"
ON "CompensationEntry"("projectId","status");

CREATE INDEX "CompensationEntry_questionId_idx"
ON "CompensationEntry"("questionId");

CREATE INDEX "CompensationEntry_earningType_earnedAt_idx"
ON "CompensationEntry"("earningType","earnedAt");

ALTER TABLE "CompensationRule"
ADD CONSTRAINT "CompensationRule_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompensationRule"
ADD CONSTRAINT "CompensationRule_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompensationEntry"
ADD CONSTRAINT "CompensationEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompensationEntry"
ADD CONSTRAINT "CompensationEntry_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompensationEntry"
ADD CONSTRAINT "CompensationEntry_questionId_fkey"
FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompensationEntry"
ADD CONSTRAINT "CompensationEntry_ruleId_fkey"
FOREIGN KEY ("ruleId") REFERENCES "CompensationRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
