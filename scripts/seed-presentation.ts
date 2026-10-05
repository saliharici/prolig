import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seed() {
  try {
    console.log('Seeding demo presentation data...');
    // Add roles & dummy projects for demo
    await pool.query('DELETE FROM questions;');
    await pool.query('DELETE FROM "userProjects";');
    await pool.query('DELETE FROM projects;');
    
    // Create demo users if not exists (Assume they exist or create them here. For presentation, we'll just insert users directly without bcrypt for simplicity or use existing ones).
    // The previous script created users. Let's just create 3 projects.
    
    const { rows: projects } = await pool.query(`
      INSERT INTO projects (name, description, "deadline", status, "targetGrade") 
      VALUES 
      ('LGS 2027 Matematik Denemesi', '8. Sınıf Genel Matematik Soru Havuzu', '2027-05-01', 'AKTIF', '8. Sınıf'),
      ('YKS 2027 Fizik', '12. Sınıf Fizik Soru Havuzu', '2027-06-01', 'AKTIF', '12. Sınıf')
      RETURNING id;
    `);

    console.log('Created Demo Projects:', projects.map(p => p.id));
    console.log('Demo presentation seed complete.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
seed();
