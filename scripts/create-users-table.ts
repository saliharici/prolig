import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Postgres veritabanına bağlanıldı. Users tablosu oluşturuluyor...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'YAZAR',
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create default accounts
    const passwordHash = await bcrypt.hash('admin123', 10);
    const authorHash = await bcrypt.hash('yazar123', 10);

    await client.query(`
      INSERT INTO users (email, "passwordHash", name, role)
      VALUES 
      ('admin@prolig.com', $1, 'Admin Yöneticisi', 'SUPER_ADMIN'),
      ('yazar@prolig.com', $2, 'Örnek Yazar', 'YAZAR')
      ON CONFLICT (email) DO NOTHING;
    `, [passwordHash, authorHash]);
    
    console.log('Users tablosu ve örnek hesaplar oluşturuldu!');
  } catch (e) {
    console.error('Hata:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
