import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Postgres veritabanına bağlanıldı. Örnek veriler ekleniyor...');
    
    await client.query(`
      INSERT INTO questions (content, status, "objectiveCode", grade, difficulty)
      VALUES 
      ('Türkiye''nin başkenti neresidir?', 'BEKLEMEDE', 'SOS.4.1', '4. Sınıf', 'Kolay'),
      ('İstanbul''un fethi kaç yılındadır?', 'ONAYLANDI', 'TAR.7.2', '7. Sınıf', 'Orta')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO authors (name, email, branch, "provinceId", province, role, status)
      VALUES 
      ('Salih Arıcıoğlu', 'salih@prolig.com.tr', 'Matematik', 34, 'İstanbul', 'YAZAR', 'AKTIF'),
      ('Ahmet Yılmaz', 'ahmet@prolig.com.tr', 'Fen Bilimleri', 6, 'Ankara', 'YAZAR', 'AKTIF'),
      ('Ayşe Kaya', 'ayse@prolig.com.tr', 'Türkçe', 35, 'İzmir', 'YAZAR', 'AKTIF')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO projects (name, "targetGrade", subject, description, status, progress, "authorCount")
      VALUES 
      ('8. Sınıf LGS Denemeleri', '8. Sınıf', 'Karma', 'LGS hazırlık deneme seti.', 'YAYINDA', 80, 5),
      ('TYT Matematik Soru Bankası', '12. Sınıf', 'Matematik', 'YKS hazırlık testleri.', 'YAPIM AŞAMASINDA', 30, 3)
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('Örnek veriler başarıyla eklendi!');
  } catch (e) {
    console.error('Hata:', e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
