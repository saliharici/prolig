import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { rows: authors } = await pool.query('SELECT * FROM authors');
    const { rows: questions } = await pool.query('SELECT * FROM questions');
    const { rows: projects } = await pool.query('SELECT * FROM projects');
    
    // Basit istatistik hesaplamaları
    const provinceDistribution = [
      { name: "İstanbul", value: authors.filter(a => a.provinceId === 34).length },
      { name: "Ankara", value: authors.filter(a => a.provinceId === 6).length },
    ];
    
    const branchDistribution = [
      { name: "Matematik", value: authors.filter(a => a.branch === 'Matematik').length },
      { name: "Fen Bilimleri", value: authors.filter(a => a.branch === 'Fen Bilimleri').length },
    ];
    
    res.status(200).json({
      provinceDistribution,
      branchDistribution,
      upcomingDeadlines: projects.slice(0, 3),
      recentAuthors: authors.slice(0, 5)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
