const fs = require('fs');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Update User
schema = schema.replace(
  '  assignedRegion String? // Bölge Koordinatörünün sorumlu olduğu bölge (örn: \'Marmara\')',
  '  assignedRegion String? // Bölge Koordinatörünün sorumlu olduğu bölge (örn: \'Marmara\')\n\n  editorBranchId Int?\n  editorBranch   Branch? @relation("EditorBranch", fields: [editorBranchId], references: [id], onDelete: SetNull)\n  editorGrade    String?'
);

// Update Branch
schema = schema.replace(
  '  projects       Project[]',
  '  projects       Project[]\n  editorBranchUsers User[] @relation("EditorBranch")'
);

// Update Question
schema = schema.replace(
  '  difficulty    String? // Zorluk (örn: Kolay, Orta, Zor)',
  '  difficulty    String? // Zorluk (örn: Kolay, Orta, Zor)\n\n  options       String[] @default([])\n  correctAnswer String?\n  explanation   String?'
);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
