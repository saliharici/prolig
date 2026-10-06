const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.{ts,js,md,json,env,prisma}', { ignore: ['node_modules/**', 'dist/**', 'generated/**', 'scripts/**'] });
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Stripped BOM from:', file);
  }
}
