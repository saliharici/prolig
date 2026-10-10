-- CreateEnum
CREATE TYPE "PaymentPeriodStatus" AS ENUM ('TASLAK', 'HAZIR', 'ONAYLANDI', 'KAPANDI', 'IPTAL');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paymentPeriodId" INTEGER;

-- AlterTable
ALTER TABLE "CompensationEntry" ADD COLUMN     "paymentId" INTEGER,
ADD COLUMN     "paymentPeriodId" INTEGER;

-- CreateTable
CREATE TABLE "PaymentPeriod" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PaymentPeriodStatus" NOT NULL DEFAULT 'TASLAK',
    "createdByUserId" INTEGER NOT NULL,
    "approvedByUserId" INTEGER,
    "closedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPeriod_code_key" ON "PaymentPeriod"("code");

-- CreateIndex
CREATE INDEX "PaymentPeriod_status_periodStart_idx" ON "PaymentPeriod"("status", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentPeriodId_authorUserId_key" ON "Payment"("paymentPeriodId", "authorUserId");

-- CreateIndex
CREATE INDEX "CompensationEntry_paymentId_idx" ON "CompensationEntry"("paymentId");

-- CreateIndex
CREATE INDEX "CompensationEntry_paymentPeriodId_status_idx" ON "CompensationEntry"("paymentPeriodId", "status");

-- CreateIndex
CREATE INDEX "CompensationEntry_status_earnedAt_idx" ON "CompensationEntry"("status", "earnedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentPeriodId_fkey" FOREIGN KEY ("paymentPeriodId") REFERENCES "PaymentPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationEntry" ADD CONSTRAINT "CompensationEntry_paymentPeriodId_fkey" FOREIGN KEY ("paymentPeriodId") REFERENCES "PaymentPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompensationEntry" ADD CONSTRAINT "CompensationEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Local validation also enforced at the database boundary (exclusive end).
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_valid_bounds" CHECK ("periodStart" < "periodEnd");
