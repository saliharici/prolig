-- PRO-LIG Publishing V2 candidate migration. DO NOT APPLY to Production without
-- a separately approved backup, deployment plan, and authorization tests.
-- All changes are additive; Book and Question records are preserved unchanged.

ALTER TABLE "Book"
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "layoutColumns" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "createdByUserId" INTEGER;

CREATE TABLE "BookChapter" (
  "id" SERIAL NOT NULL,
  "bookId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookChapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookQuestion" (
  "id" SERIAL NOT NULL,
  "chapterId" INTEGER NOT NULL,
  "questionId" INTEGER,
  "sortOrder" INTEGER NOT NULL,
  "sourceQuestionUpdatedAt" TIMESTAMP(3) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Book_projectId_idx" ON "Book"("projectId");
CREATE INDEX "BookChapter_bookId_idx" ON "BookChapter"("bookId");
CREATE UNIQUE INDEX "BookChapter_bookId_sortOrder_key" ON "BookChapter"("bookId", "sortOrder");
CREATE INDEX "BookQuestion_questionId_idx" ON "BookQuestion"("questionId");
CREATE UNIQUE INDEX "BookQuestion_chapterId_sortOrder_key" ON "BookQuestion"("chapterId", "sortOrder");

ALTER TABLE "Book"
  ADD CONSTRAINT "Book_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BookChapter"
  ADD CONSTRAINT "BookChapter_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookQuestion"
  ADD CONSTRAINT "BookQuestion_chapterId_fkey"
  FOREIGN KEY ("chapterId") REFERENCES "BookChapter"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookQuestion"
  ADD CONSTRAINT "BookQuestion_questionId_fkey"
  FOREIGN KEY ("questionId") REFERENCES "Question"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Book"
  ADD CONSTRAINT "Book_layoutColumns_check" CHECK ("layoutColumns" IN (1, 2)),
  ADD CONSTRAINT "Book_revision_positive_check" CHECK ("revision" >= 1);

ALTER TABLE "BookChapter"
  ADD CONSTRAINT "BookChapter_sortOrder_positive_check" CHECK ("sortOrder" >= 0);

ALTER TABLE "BookQuestion"
  ADD CONSTRAINT "BookQuestion_sortOrder_positive_check" CHECK ("sortOrder" >= 0),
  ADD CONSTRAINT "BookQuestion_snapshot_object_check" CHECK (jsonb_typeof("snapshot") = 'object');
