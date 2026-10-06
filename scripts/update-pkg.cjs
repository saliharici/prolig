const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts.build = 'prisma generate && vite build';
pkg.scripts.lint = 'prisma generate && npm run lint:ui && npm run lint:api';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
