-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "editorBranchId" INTEGER,
ADD COLUMN     "editorGrade" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_editorBranchId_fkey" FOREIGN KEY ("editorBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
