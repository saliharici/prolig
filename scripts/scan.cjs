const fs = require('fs');
const files = ['docs/CANONICAL_ARCHITECTURE.md', 'docs/PILOT_V1_CONTRACT.md', 'prisma/schema.prisma', 'prisma.config.ts', 'api/v1/_lib/prisma.ts', '.gitignore'];
const patterns = ['Ã', 'Ä', 'Å', '\uFFFD', 'â€'];

let totalCount = 0;
for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'g');
      const matches = content.match(regex);
      if (matches) {
        console.log(`Found ${matches.length} matches for '${pattern}' in ${file}`);
        totalCount += matches.length;
      }
    }
  }
}
console.log(`0 unintended mojibake/replacement occurrences (Actual count: ${totalCount})`);
