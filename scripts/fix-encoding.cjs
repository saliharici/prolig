const fs = require('fs');
const files = [
  'docs/CANONICAL_ARCHITECTURE.md',
  'docs/PILOT_V1_CONTRACT.md',
  'prisma/schema.prisma',
  'prisma.config.ts',
  'api/v1/_lib/prisma.ts',
  '.gitignore'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let txt = fs.readFileSync(file, 'utf8');
    // Re-decode if we see typical double-utf8 patterns like Ä° or Ã¶
    if (txt.includes('Ä°') || txt.includes('Ã') || txt.includes('Å')) {
      txt = Buffer.from(txt, 'binary').toString('utf8');
      
      // Also remove BOM if present
      if (txt.charCodeAt(0) === 0xFEFF) {
        txt = txt.slice(1);
      }
      
      fs.writeFileSync(file, txt, 'utf8');
      console.log('Fixed encoding in:', file);
    }
  }
}
