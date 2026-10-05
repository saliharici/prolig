import pg from 'pg';
import 'dotenv/config';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
pool.query("DELETE FROM users WHERE email IN ('admin@prolig.com', 'yazar@prolig.com')").then(() => { console.log('Test users deleted'); pool.end(); });
