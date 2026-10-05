import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});

pool.query('ALTER TABLE questions ADD COLUMN IF NOT EXISTS "authorId" INTEGER').then(() => {
  console.log('Added authorId to questions');
  pool.end();
});
