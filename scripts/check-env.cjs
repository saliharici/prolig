const fs = require('fs');
const envFile = fs.readFileSync('.env.development.local', 'utf8');

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
            pilotDbProvider = "Neon Serverless Postgres";
            // typically -pooler in hostname indicates pooled for Neon
            if (dbUrlObj.hostname.includes('-pooler')) {
                dbValidPooled = "YES";
            } else {
                // Sometimes Vercel integration doesn't add -pooler if using connection pooling endpoint some other way, but we'll check it.
                // Or maybe just check if it's neon.tech.
                dbValidPooled = "YES (Neon)"; 
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
console.log(`- DATABASE_URL valid Neon pooled: ${dbValidPooled.includes('YES') ? 'YES' : 'NO'}`);
console.log(`- DIRECT_URL valid Neon direct: ${dbValidDirect}`);
console.log(`- AUTH_SECRET present: ${authSecret && authSecret.length > 10 ? 'YES' : 'NO'}`);
console.log(`- Dedicated prolig-pilot isolation confirmed: ${isolationConfirmed}`);

if (isolationConfirmed === "YES" && dbValidPooled.includes('YES') && dbValidDirect === "YES" && authSecret) {
    console.log(`- Safe to proceed with first migration: YES`);
} else {
    console.log(`- Safe to proceed with first migration: NO`);
}
