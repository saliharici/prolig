import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
import { authenticate } from './_auth';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = authenticate(req, res);
  if (!user) return;

  try {
    const { province_id } = req.query;
    let query = 'SELECT * FROM authors';
    let params: any[] = [];
    
    if (province_id) {
      query += ' WHERE "provinceId" = $1';
      params.push(Number(province_id));
    }
    
    query += ' ORDER BY id DESC';
    
    const { rows: authors } = await pool.query(query, params);
    res.status(200).json(authors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch authors' });
  }
}
