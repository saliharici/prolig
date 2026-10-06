const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(
  '  status     QuestionStatus @default(TASLAK)',
  '  options       String[] @default([])\n  correctAnswer String?\n  explanation   String?\n\n  status     QuestionStatus @default(TASLAK)'
);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
