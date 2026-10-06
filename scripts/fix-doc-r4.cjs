const fs = require('fs');
const file = 'docs/CANONICAL_ARCHITECTURE.md';
let content = fs.readFileSync(file, 'utf8');

// The title could be garbled, let's just replace the whole first line
const lines = content.split('\n');
if (lines[0].includes('Canonical Architecture')) {
  lines[0] = '# Canonical Architecture — Pro-Lig';
}
content = lines.join('\n');

const staleText = '*Note: The `YONETICI` role currently in the Prisma enum is designated as **OBSOLETE/ARCHIVE** and will be migrated out.*';
const newText = '*Note: `YONETICI` has been removed from the canonical `RoleCode` schema.*';
content = content.replace(staleText, newText);

// If it's a bit different, let's use a regex
content = content.replace(/\*Note: The `YONETICI` role.*migrated out.\*/g, newText);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed docs/CANONICAL_ARCHITECTURE.md');
