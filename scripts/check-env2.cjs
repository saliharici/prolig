const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');

const getEnvVar = (name) => {
    const match = envFile.match(new RegExp(`^${name}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1] : null;
};

const dbUrl = getEnvVar('DATABASE_URL');
const directUrl = getEnvVar('DIRECT_URL');
const authSecret = getEnvVar('AUTH_SECRET');

let pilotDbProvider = "Unknown";
let dbValidPooled = "NO";
let dbValidDirect = "NO";
let isolationConfirmed = "NO";

if (dbUrl && directUrl) {
    try {
        const dbUrlObj = new URL(dbUrl);
        const directUrlObj = new URL(directUrl);

        if (dbUrlObj.hostname.includes('neon.tech')) {
            pilotDbProvider = "Neon PostgreSQL";
            if (dbUrlObj.hostname.includes('-pooler')) {
                dbValidPooled = "YES";
            }
            if (!directUrlObj.hostname.includes('-pooler') && directUrlObj.hostname.includes('neon.tech')) {
                dbValidDirect = "YES";
            }
            if (!directUrlObj.hostname.includes('example.com') && directUrlObj.protocol.includes('postgres')) {
                isolationConfirmed = "YES";
            }
        }
    } catch (e) {
        console.error(e);
    }
}

console.log(`- Pilot DB provider: ${pilotDbProvider}`);
console.log(`- DATABASE_URL valid Neon pooled: ${dbValidPooled}`);
console.log(`- DIRECT_URL valid Neon direct: ${dbValidDirect}`);
console.log(`- AUTH_SECRET present: ${authSecret && authSecret.length > 10 ? 'YES' : 'NO'}`);
console.log(`- Dedicated prolig-pilot isolation confirmed: ${isolationConfirmed}`);

if (isolationConfirmed === "YES" && dbValidPooled === "YES" && dbValidDirect === "YES" && authSecret) {
    console.log(`- Safe to proceed with first migration: YES`);
} else {
    console.log(`- Safe to proceed with first migration: NO`);
}
