-- Additive project/unit production planning. TEST Preview first, Production needs separate authorization.
CREATE TABLE "ProjectUnitPlan" (
 "id" SERIAL NOT NULL,
 "projectId" INTEGER NOT NULL,
 "title" TEXT NOT NULL,
 "sortOrder" INTEGER NOT NULL,
 "targetQuestionCount" INTEGER NOT NULL,
 "dueDate" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ProjectUnitPlan_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ProjectUnitPlan_target_positive" CHECK ("targetQuestionCount" BETWEEN 1 AND 10000),
 CONSTRAINT "ProjectUnitPlan_sort_nonnegative" CHECK ("sortOrder" >= 0)
);
CREATE UNIQUE INDEX "ProjectUnitPlan_projectId_title_key" ON "ProjectUnitPlan"("projectId","title");
CREATE UNIQUE INDEX "ProjectUnitPlan_projectId_sortOrder_key" ON "ProjectUnitPlan"("projectId","sortOrder");
CREATE INDEX "ProjectUnitPlan_projectId_idx" ON "ProjectUnitPlan"("projectId");
ALTER TABLE "ProjectUnitPlan" ADD CONSTRAINT "ProjectUnitPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD COLUMN "unitPlanId" INTEGER;
ALTER TABLE "Task" ADD CONSTRAINT "Task_unitPlanId_fkey" FOREIGN KEY ("unitPlanId") REFERENCES "ProjectUnitPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Task_unitPlanId_idx" ON "Task"("unitPlanId");
