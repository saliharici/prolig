const fs = require('fs');
const glob = require('glob');
const allFiles = glob.sync('**/*.{ts,js,cjs,md,json,env,prisma}', { ignore: ['node_modules/**', 'dist/**', 'generated/**', 'scripts/**', 'temp_restore/**', 'legacy/**'] });

let boms = 0;
let mojibakes = 0;
const regex = /[ÃÄÅ]|â€”/g;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    boms++;
  }
  const matches = content.match(regex);
  if (matches) {
    mojibakes += matches.length;
    console.log('Mojibake in:', file, matches);
  }
}
console.log('BOM count = ' + boms);
console.log('mojibake count = ' + mojibakes);
