import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { rows: authors } = await pool.query('SELECT "provinceId", COUNT(*) as count FROM authors GROUP BY "provinceId"');
    
    // Basit harita illeri mapping
    const provinces = authors.map(row => ({
      id: row.provinceId || 34,
      name: "İl " + row.provinceId,
      code: String(row.provinceId).padStart(2, '0'),
      authorCount: parseInt(row.count, 10),
      activeProjects: Math.floor(Math.random() * 3)
    }));
    
    // Eğer İstanbul (34) yoksa ekleyelim
    if (!provinces.find(p => p.id === 34)) {
       provinces.push({ id: 34, name: 'İstanbul', code: '34', authorCount: 0, activeProjects: 0 });
    }

    res.status(200).json(provinces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
}
