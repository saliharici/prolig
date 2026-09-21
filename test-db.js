import 'dotenv/config';
import pg from 'pg';
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
async function test() {
  try {
    const res = await pool.query('SELECT id FROM "Author"');
    console.log('Authors:', res.rows);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
test();
