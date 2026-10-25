-- CORE-01A ONLY. Additive. Approved isolated TEST migration only; never run on Production.
CREATE TABLE "QuestionSet" (
  "id" SERIAL NOT NULL,
  "ownerUserId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "QuestionSetItem" (
  "id" SERIAL NOT NULL,
  "setId" INTEGER NOT NULL,
  "questionId" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "QuestionSetItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuestionSet_ownerUserId_updatedAt_idx" ON "QuestionSet"("ownerUserId", "updatedAt");
CREATE UNIQUE INDEX "QuestionSetItem_setId_questionId_key" ON "QuestionSetItem"("setId","questionId");
CREATE UNIQUE INDEX "QuestionSetItem_setId_sortOrder_key" ON "QuestionSetItem"("setId","sortOrder");
CREATE INDEX "QuestionSetItem_questionId_idx" ON "QuestionSetItem"("questionId");
ALTER TABLE "QuestionSet" ADD CONSTRAINT "QuestionSet_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionSetItem" ADD CONSTRAINT "QuestionSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "QuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionSetItem" ADD CONSTRAINT "QuestionSetItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
