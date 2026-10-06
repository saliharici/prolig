const fs = require('fs');
let envFile = fs.readFileSync('.env.development.local', 'utf8');

const getEnvVar = (name) => {
    const match = envFile.match(new RegExp(`^${name}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1] : null;
};

const unpooled = getEnvVar('DATABASE_URL_UNPOOLED');
envFile = envFile.replace(/DIRECT_URL\s*=\s*['"]?DATABASE_URL_UNPOOLED['"]?/, `DIRECT_URL="${unpooled}"`);
fs.writeFileSync('.env.development.local', envFile, 'utf8');
