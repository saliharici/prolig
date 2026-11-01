-- RELEASE-05: additive. Existing projectId NULL questions remain public publisher-pool records.
ALTER TABLE "Question" ADD COLUMN "isPersonal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Question" ADD COLUMN "personalSubject" TEXT;
ALTER TABLE "Question" ADD COLUMN "personalTopic" TEXT;
CREATE INDEX "Question_authorUserId_isPersonal_idx" ON "Question"("authorUserId", "isPersonal");

CREATE TABLE "PersonalQuestionSet" (
  "id" SERIAL NOT NULL,
  "authorUserId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalQuestionSet_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PersonalQuestionSet_authorUserId_idx" ON "PersonalQuestionSet"("authorUserId");
ALTER TABLE "PersonalQuestionSet" ADD CONSTRAINT "PersonalQuestionSet_authorUserId_fkey"
  FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PersonalQuestionSetItem" (
  "id" SERIAL NOT NULL,
  "setId" INTEGER NOT NULL,
  "questionId" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  CONSTRAINT "PersonalQuestionSetItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PersonalQuestionSetItem_setId_questionId_key" ON "PersonalQuestionSetItem"("setId","questionId");
CREATE UNIQUE INDEX "PersonalQuestionSetItem_setId_sortOrder_key" ON "PersonalQuestionSetItem"("setId","sortOrder");
CREATE INDEX "PersonalQuestionSetItem_questionId_idx" ON "PersonalQuestionSetItem"("questionId");
ALTER TABLE "PersonalQuestionSetItem" ADD CONSTRAINT "PersonalQuestionSetItem_setId_fkey"
  FOREIGN KEY ("setId") REFERENCES "PersonalQuestionSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonalQuestionSetItem" ADD CONSTRAINT "PersonalQuestionSetItem_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
