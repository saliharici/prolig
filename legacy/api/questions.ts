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

  if (req.method === 'GET') {
    try {
      let query = 'SELECT * FROM questions';
      const params: any[] = [];

      if (user.role === 'YAZAR') {
        query += ' WHERE "authorId" = $1';
        params.push(user.id);
      }

      query += ' ORDER BY id DESC';
      const { rows: questions } = await pool.query(query, params);
      return res.status(200).json(questions);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }

  if (req.method === 'POST') {
    if (user.role !== 'YAZAR') {
      return res.status(403).json({ error: 'Only authors can submit questions' });
    }
    const { content, objectiveCode, grade, difficulty, projectId } = req.body;
    try {
      const { rows } = await pool.query(
        'INSERT INTO questions (content, status, "objectiveCode", grade, difficulty, "authorId", "projectId") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [content, 'TASLAK', objectiveCode, grade, difficulty, user.id, projectId || null]
      );
      return res.status(201).json(rows[0]);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to create question' });
    }
  }

  if (req.method === 'PATCH') {
    const { id, status, editorNote, content } = req.body;
    
    try {
      if (user.role === 'YAZAR') {
        // Author can only update their own question, and cannot update if ONAYLANDI.
        // They can only change status to INCELEMEDE.
        let targetStatus = undefined;
        if (status === 'İNCELEMEDE') targetStatus = 'İNCELEMEDE';

        const { rows } = await pool.query(`
          UPDATE questions 
          SET 
            content = COALESCE($1, content),
            status = COALESCE($2, status)
          WHERE id = $3 
            AND "authorId" = $4 
            AND status NOT IN ('ONAYLANDI')
          RETURNING *;
        `, [content, targetStatus, id, user.id]);

        if (rows.length === 0) {
          return res.status(403).json({ error: 'Yasaklandı: Soru size ait değil veya onaylanmış durumda.' });
        }
        return res.status(200).json(rows[0]);
      } else {
        // Admin or Editor
        const { rows } = await pool.query(`
          UPDATE questions 
          SET 
            "editorNote" = COALESCE($1, "editorNote"),
            status = COALESCE($2, status)
          WHERE id = $3 
          RETURNING *;
        `, [editorNote, status, id]);

        if (rows.length === 0) {
          return res.status(404).json({ error: 'Kayıt bulunamadı' });
        }
        return res.status(200).json(rows[0]);
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to update question' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
