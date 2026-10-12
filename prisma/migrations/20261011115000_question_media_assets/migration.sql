-- Add structured media assets for the professional question editor.
CREATE TABLE "QuestionAsset" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "placement" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuestionAsset_questionId_placement_idx" ON "QuestionAsset"("questionId", "placement");

ALTER TABLE "QuestionAsset" ADD CONSTRAINT "QuestionAsset_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
