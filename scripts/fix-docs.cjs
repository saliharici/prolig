const fs = require('fs');
const file = 'docs/CANONICAL_ARCHITECTURE.md';
let content = fs.readFileSync(file, 'utf8');
let changed = false;

if (content.includes('\\n-')) {
  content = content.replace(/\\n-/g, '\n-');
  changed = true;
}
if (content.includes('will be migrated out')) {
  content = content.replace(/YONETICI will be migrated out/g, 'YONETICI has already been removed from the canonical schema');
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed:', file);
}
