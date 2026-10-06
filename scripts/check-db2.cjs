const { Client } = require('pg');
const fs = require('fs');

const envFile = fs.readFileSync('.env.development.local', 'utf8');
const getEnvVar = (name) => {
    const match = envFile.match(new RegExp(`^${name}=['"]?(.*?)['"]?$`, 'm'));
    return match ? match[1] : null;
};
const directUrl = getEnvVar('DIRECT_URL');

const client = new Client({ connectionString: directUrl });
async function checkDB() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT count(*) FROM "User"
        `);
        console.log("Users:", res.rows[0].count);
        
        const ap = await client.query(`
            SELECT count(*) FROM "AuthorProfile"
        `);
        console.log("AuthorProfiles:", ap.rows[0].count);
    } catch(e) {
        console.error("DB connection error:", e.message);
    } finally {
        await client.end();
    }
}
checkDB();
