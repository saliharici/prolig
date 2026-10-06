const fs = require('fs');
let sql = fs.readFileSync('prisma/migrations/20261006224751_question_api_foundation/migration.sql', 'utf8');
if (!sql.includes('User_editorBranchId_idx')) {
  sql += '\n-- CreateIndex\nCREATE INDEX "User_editorBranchId_idx" ON "User"("editorBranchId");\n';
  fs.writeFileSync('prisma/migrations/20261006224751_question_api_foundation/migration.sql', sql, 'utf8');
}
