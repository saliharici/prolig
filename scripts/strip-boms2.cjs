const fs = require('fs');
const files = [
  '.env.example',
  'api/v1/auth/login.ts',
  'api/v1/auth/me.ts',
  '.gitignore',
  'api/v1/_lib/auth.ts',
  'prisma/seed.ts',
  'tests/auth.test.ts',
  'tests/integration/auth-db.test.ts',
  'docs/CANONICAL_ARCHITECTURE.md',
  'docs/PILOT_V1_CONTRACT.md',
  'prisma.config.ts',
  'package.json',
  'tsconfig.api.json'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Stripped BOM from:', file);
    }
  }
}
