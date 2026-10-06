const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.{ts,js,cjs,md,json,env,prisma}', { ignore: ['node_modules/**', 'dist/**', 'generated/**'] });
let bomCount = 0;
let mojibakeCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    changed = true;
    bomCount++;
    console.log('Stripped BOM from:', file);
  }

  // Count mojibake (just for report, although I'm not fixing it if I don't see it)
  const mojibakeMatches = content.match(/Ã/g);
  if (mojibakeMatches) {
    mojibakeCount += mojibakeMatches.length;
    console.log('Mojibake found in:', file);
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log('BOM count = ' + bomCount);
console.log('mojibake count = ' + mojibakeCount);
