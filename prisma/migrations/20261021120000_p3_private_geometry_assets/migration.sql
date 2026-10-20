-- P3-W ADDITIVE metadata table; apply only to explicitly approved isolated P3 DB.
-- No existing QuestionAsset URLs are made public, migrated or rewritten.
CREATE TABLE "PrivateGeometryAsset" (
  "id" SERIAL NOT NULL,
  "questionId" INTEGER NOT NULL,
  "ownerUserId" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "placement" TEXT NOT NULL DEFAULT 'STEM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivateGeometryAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PrivateGeometryAsset_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PrivateGeometryAsset_dimensions_check" CHECK ("width" BETWEEN 1 AND 1024 AND "height" BETWEEN 1 AND 1024),
  CONSTRAINT "PrivateGeometryAsset_sha256_check" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "PrivateGeometryAsset_placement_check" CHECK ("placement" = 'STEM')
);
CREATE UNIQUE INDEX "PrivateGeometryAsset_objectKey_key" ON "PrivateGeometryAsset"("objectKey");
CREATE UNIQUE INDEX "PrivateGeometryAsset_questionId_sha256_key" ON "PrivateGeometryAsset"("questionId", "sha256");
CREATE INDEX "PrivateGeometryAsset_ownerUserId_questionId_idx" ON "PrivateGeometryAsset"("ownerUserId", "questionId");
