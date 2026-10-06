const fs = require('fs');
let config = fs.readFileSync('prisma.config.ts', 'utf8');
config = config.replace(/url:\s*env\(['"]DATABASE_URL['"]\)/, 'url: env("DIRECT_URL")');
fs.writeFileSync('prisma.config.ts', config, 'utf8');
