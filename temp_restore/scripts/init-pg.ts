import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Postgres veritabanına bağlanıldı. Tablolar oluşturuluyor...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'BEKLEMEDE',
        "editorNote" TEXT,
        "objectiveCode" VARCHAR(50),
        grade VARCHAR(50),
        difficulty VARCHAR(50),
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS authors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        branch VARCHAR(100),
        "provinceId" INTEGER,
        province VARCHAR(100),
        role VARCHAR(50) DEFAULT 'YAZAR',
        status VARCHAR(50) DEFAULT 'AKTIF'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "targetGrade" VARCHAR(100),
        subject VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'YAPIM AŞAMASINDA',
        progress INTEGER DEFAULT 0,
        "dueDate" DATE,
        "authorCount" INTEGER DEFAULT 0
      );
    `);
    
    console.log('Tablolar başarıyla oluşturuldu!');
  } catch (e) {
    console.error('Hata:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
