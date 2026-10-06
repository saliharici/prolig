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
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        console.log("Tables in public schema:");
        res.rows.forEach(row => console.log("- " + row.table_name));
        if (res.rows.length === 0) {
            console.log("Database public schema is empty. Safe to proceed.");
        }
    } catch(e) {
        console.error("DB connection error:", e.message);
    } finally {
        await client.end();
    }
}
checkDB();
