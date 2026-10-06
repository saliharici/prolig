const fs = require('fs');
const files = ['docs/CANONICAL_ARCHITECTURE.md', 'prisma/schema.prisma'];
const patterns = ['Ã', 'Ä', 'Å', '\uFFFD', 'â€'];

for (const file of files) {
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const pattern of patterns) {
        if (line.includes(pattern)) {
          console.log(`[${file}:${i+1}] ${line.trim()}`);
          break;
        }
      }
    });
  }
}
