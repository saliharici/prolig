const fs = require('fs');
const files = ['scripts/require-pilot-db-env.cjs', 'api/v1/auth/login.ts', 'api/v1/auth/me.ts'];
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    fs.writeFileSync(file, content, 'utf8');
  }
}
