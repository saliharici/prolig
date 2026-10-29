-- Additive workflow change. Preview first; Production requires separately approved rollout.
ALTER TABLE "Task" ADD COLUMN "targetQuestionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Question" ADD COLUMN "taskId" INTEGER;
ALTER TABLE "Question" ADD CONSTRAINT "Question_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Question_taskId_idx" ON "Question"("taskId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_targetQuestionCount_nonnegative" CHECK ("targetQuestionCount" BETWEEN 0 AND 10000);
