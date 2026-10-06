const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
schema = schema.replace(
  '  @@index([roleId])',
  '  @@index([roleId])\n  @@index([editorBranchId])'
);
fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
