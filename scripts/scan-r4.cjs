const fs = require('fs');
const glob = require('glob');

const specificFiles = [
  'scripts/require-pilot-db-env.cjs',
  'api/v1/auth/login.ts',
  'api/v1/auth/me.ts',
  'docs/CANONICAL_ARCHITECTURE.md'
];

for (const f of specificFiles) {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
      fs.writeFileSync(f, content, 'utf8');
    }
  }
}

// scan all files
const allFiles = glob.sync('**/*.{ts,js,cjs,md,json,env,prisma}', { ignore: ['node_modules/**', 'dist/**', 'generated/**'] });

let bomCount = 0;
let mojibakeCount = 0;
const mojibakeRegex = /[ÃÄÅ]|â€”/g;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    changed = true;
    bomCount++;
  }

  // Count mojibake but only in canonical files, skip temp scripts and temp_restore, legacy, etc.
  if (!file.includes('scripts/') && !file.includes('temp_restore/') && !file.includes('legacy/')) {
    const matches = content.match(mojibakeRegex);
    if (matches) {
      mojibakeCount += matches.length;
      console.log('Mojibake in:', file, matches);
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
}

console.log('BOM count = ' + bomCount);
console.log('mojibake count = ' + mojibakeCount);
