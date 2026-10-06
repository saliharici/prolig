const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts['test:integration'] = 'vitest run tests/integration';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2), 'utf8');
