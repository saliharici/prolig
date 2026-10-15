-- Additive only; apply separately after sandbox approval.
-- NULL questionType identifies legacy questions, read as four-choice MCQ.
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'OPEN_ENDED');
ALTER TABLE "Question"
  ADD COLUMN "questionType" "QuestionType",
  ADD COLUMN "optionCount" INTEGER,
  ADD COLUMN "booleanAnswer" BOOLEAN,
  ADD COLUMN "modelAnswer" TEXT,
  ADD COLUMN "scoringRubric" TEXT,
  ADD COLUMN "evaluationCriteria" TEXT;
