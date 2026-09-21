import 'dotenv/config';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
async function seed() {
  try {
    await pool.query(`
      INSERT INTO "Role" (id, code, name) VALUES (1, 'YAZAR', 'Yazar') ON CONFLICT (code) DO NOTHING;
    `);
    
    await pool.query(`
      INSERT INTO "User" (id, username, email, "fullName", "roleId", "updatedAt") 
      VALUES (1, 'testyazar', 'yazar@prolig.com', 'Test Yazar', 1, NOW()) 
      ON CONFLICT (email) DO NOTHING;
    `);

    await pool.query(`INSERT INTO "Province" (id, code, name, region) VALUES (34, '34', 'İstanbul', 'Marmara') ON CONFLICT DO NOTHING;`);
    await pool.query(`INSERT INTO "Branch" (id, name, category) VALUES (1, 'Matematik', 'Sayısal') ON CONFLICT DO NOTHING;`);
    
    await pool.query(`
      INSERT INTO "Author" (id, "firstName", "lastName", email, phone, "provinceId", "branchId", status, "updatedAt")
      VALUES (1, 'Test', 'Yazar', 'yazar@prolig.com', '5551234567', 34, 1, 'Aktif', NOW())
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('Dummy author created successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}
seed();
