import 'dotenv/config';
import pg from 'pg';
import { TURKEY_PROVINCES } from '../server/provincesData.ts';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  console.log('Connecting to PostgreSQL database...');
  await client.connect();
  console.log('Connected! Starting fast batched data population...');

  // 1. Provinces
  console.log('Seeding Provinces (batch)...');
  const provValues = TURKEY_PROVINCES.map(p => `(${p.id}, '${p.name.replace(/'/g, "''")}')`).join(',');
  await client.query(`
    INSERT INTO "Province" (id, name) VALUES ${provValues}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `);

  // 2. Districts
  console.log('Seeding Districts (batch)...');
  let distId = 1;
  const distRows = [];
  for (const p of TURKEY_PROVINCES) {
    for (const d of p.districts) {
      distRows.push(`(${distId++}, '${d.replace(/'/g, "''")}', ${p.id})`);
    }
  }
  await client.query(`
    INSERT INTO "District" (id, name, "provinceId") VALUES ${distRows.join(',')}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "provinceId" = EXCLUDED."provinceId";
  `);

  // 3. Branches
  console.log('Seeding Branches (batch)...');
  const branches = [
    { id: 1, name: 'Matematik' },
    { id: 2, name: 'Türkçe' },
    { id: 3, name: 'Fen Bilimleri' },
    { id: 4, name: 'Sosyal Bilgiler' },
    { id: 5, name: 'Biyoloji' },
    { id: 6, name: 'Kimya' },
    { id: 7, name: 'Fizik' },
    { id: 8, name: 'Tarih' },
    { id: 9, name: 'Coğrafya' },
    { id: 10, name: 'İngilizce' },
    { id: 11, name: 'Din Kültürü' },
    { id: 12, name: 'Felsefe' }
  ];
  const branchValues = branches.map(b => `(${b.id}, '${b.name}')`).join(',');
  await client.query(`
    INSERT INTO "Branch" (id, name) VALUES ${branchValues}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `);

  // 4. Institutions
  console.log('Seeding Institutions (batch)...');
  const institutions = [
    { id: 1, name: 'İstanbul Fen Lisesi' },
    { id: 2, name: 'Kadıköy Anadolu Lisesi' },
    { id: 3, name: 'Ankara Fen Lisesi' },
    { id: 4, name: 'Çankaya Atatürk Anadolu Lisesi' },
    { id: 5, name: 'İzmir Fen Lisesi' },
    { id: 6, name: 'Bursa Tofaş Fen Lisesi' },
    { id: 7, name: 'Erzurum İbrahim Hakkı Fen Lisesi' },
    { id: 8, name: 'Gaziantep Vehbi Dinçerler Fen Lisesi' },
    { id: 9, name: 'Trabzon Yomra Fen Lisesi' },
    { id: 10, name: 'Antalya Yusuf Ziya Öner Fen Lisesi' }
  ];
  const instValues = institutions.map(i => `(${i.id}, '${i.name}')`).join(',');
  await client.query(`
    INSERT INTO "Institution" (id, name) VALUES ${instValues}
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  `);

  // 5. Users
  console.log('Seeding Admin & Coordinator Users...');
  const users = [
    { id: 'usr-1', email: 'selim.yavuz@prolig.com.tr', pass: '$2b$10$hashedselimyavuzpassword123', fn: 'Selim', ln: 'Yavuz', role: 'GENEL_KOORDINATOR', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
    { id: 'usr-2', email: 'ayse.koc@prolig.com.tr', pass: '$2b$10$hashedaysekocpassword123', fn: 'Ayşe', ln: 'Koç', role: 'IL_KOORDINATORU', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
    { id: 'usr-3', email: 'burak.celik@prolig.com.tr', pass: '$2b$10$hashedburakcelikpassword123', fn: 'Burak', ln: 'Çelik', role: 'EDITOR', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
    { id: 'usr-4', email: 'emre.kaya@prolig.com.tr', pass: '$2b$10$hashedemrekayapassword123', fn: 'Emre', ln: 'Kaya', role: 'MUHASEBE', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
    { id: 'usr-5', email: 'admin@prolig.com.tr', pass: '$2b$10$hashedadminpassword123', fn: 'Sistem', ln: 'Yöneticisi', role: 'YONETICI', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' }
  ];

  for (const u of users) {
    await client.query(`
      INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, "profilePhoto", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET email = $2, "firstName" = $4, "lastName" = $5, role = $6, "profilePhoto" = $7;
    `, [u.id, u.email, u.pass, u.fn, u.ln, u.role, u.photo]);
  }

  // 6. Authors
  console.log('Seeding Authors & Author Users...');
  const authorSeeds = [
    { first: 'Zeynep', last: 'Demir', prov: 27, branch: 2, photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', title: 'Uzman Türkçe Öğretmeni', exp: 12, phone: '+90 (532) 111 22 33' },
    { first: 'Mehmet', last: 'Kara', prov: 61, branch: 1, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', title: 'Matematik Bölüm Başkanı', exp: 16, phone: '+90 (533) 222 33 44' },
    { first: 'Elif', last: 'Yıldız', prov: 34, branch: 3, photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', title: 'Fen Bilimleri Yazarı', exp: 9, phone: '+90 (534) 333 44 55' },
    { first: 'Ahmet', last: 'Kaya', prov: 34, branch: 1, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', title: 'LGS Matematik Yazarı', exp: 14, phone: '+90 (535) 444 55 66' },
    { first: 'Canan', last: 'Öztürk', prov: 6, branch: 5, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', title: 'Biyoloji Zümre Başkanı', exp: 11, phone: '+90 (536) 555 66 77' },
    { first: 'Murat', last: 'Şahin', prov: 6, branch: 7, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', title: 'Fizik Yazarı & Akademisyen', exp: 18, phone: '+90 (537) 666 77 88' },
    { first: 'Seda', last: 'Arslan', prov: 35, branch: 6, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', title: 'Kimya Proje Lideri', exp: 10, phone: '+90 (538) 777 88 99' },
    { first: 'Kemal', last: 'Aydın', prov: 25, branch: 8, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', title: 'Tarih Yazarı & Araştırmacı', exp: 15, phone: '+90 (539) 888 99 00' },
    { first: 'Büşra', last: 'Koçak', prov: 16, branch: 4, photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', title: 'Sosyal Bilgiler Komisyon Üyesi', exp: 8, phone: '+90 (530) 999 00 11' },
    { first: 'Deniz', last: 'Güneş', prov: 7, branch: 10, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', title: 'İngilizce Materyal Geliştirici', exp: 7, phone: '+90 (531) 123 45 67' }
  ];

  const provinceTargets = {
    34: 26, 6: 18, 35: 12, 25: 10, 16: 9, 7: 8, 27: 7, 61: 6, 42: 6, 21: 5,
    55: 5, 38: 4, 1: 4, 26: 4, 41: 4, 65: 3, 44: 3, 10: 3, 20: 3, 48: 3,
    31: 3, 52: 2, 54: 2, 58: 2, 33: 2
  };

  const turkishFirstNames = ['Ali', 'Veli', 'Ayşe', 'Fatma', 'Cem', 'Burak', 'Ceren', 'Derya', 'Eren', 'Furkan', 'Gözde', 'Hilal', 'İbrahim', 'Jale', 'Kadir', 'Leyla', 'Mustafa', 'Nuray', 'Ozan', 'Pınar', 'Rıza', 'Sinem', 'Tufan', 'Umut'];
  const turkishLastNames = ['Özdemir', 'Kılıç', 'Aslan', 'Çetin', 'Koç', 'Kurt', 'Şimşek', 'Polat', 'Korkmaz', 'Güler', 'Yalçın', 'Bulut', 'Yavuz', 'Doğan', 'Acar', 'Erdoğan', 'Tekin', 'Aktaş'];

  const allAuthorsList = [];
  let authorIdx = 1;

  for (const s of authorSeeds) {
    allAuthorsList.push({
      idx: authorIdx,
      first: s.first,
      last: s.last,
      prov: s.prov,
      branch: s.branch,
      title: s.title,
      exp: s.exp,
      photo: s.photo,
      phone: s.phone,
      status: 'AKTIF'
    });
    authorIdx++;
  }

  for (const [provStr, target] of Object.entries(provinceTargets)) {
    const provId = parseInt(provStr, 10);
    const existingCount = allAuthorsList.filter(a => a.prov === provId).length;
    const needed = target - existingCount;

    for (let i = 0; i < needed; i++) {
      const fn = turkishFirstNames[(authorIdx * 3 + i) % turkishFirstNames.length];
      const ln = turkishLastNames[(authorIdx * 7 + i) % turkishLastNames.length];
      const branchId = ((authorIdx + i) % 12) + 1;
      const phone = `+90 (53${(authorIdx + i) % 9}) ${200 + authorIdx} ${30 + i} ${40 + i}`;
      const status = i === 0 && provId === 34 ? 'AKTIF' : (authorIdx % 15 === 0 ? 'BEKLEMEDE' : 'AKTIF');
      const exp = 4 + ((authorIdx + i) % 18);
      const photo = authorSeeds[(authorIdx + i) % authorSeeds.length].photo;

      allAuthorsList.push({
        idx: authorIdx,
        first: fn,
        last: ln,
        prov: provId,
        branch: branchId,
        title: 'Yazar / Branş Uzmanı',
        exp,
        photo,
        phone,
        status
      });
      authorIdx++;
    }
  }

  // Batch insert all author Users and Authors
  console.log(`Inserting ${allAuthorsList.length} authors in batch...`);
  const userRows = allAuthorsList.map(a => 
    `('usr-author-${a.idx}', '${a.first.toLowerCase()}.${a.last.toLowerCase()}${a.idx}@prolig.com.tr', '$2b$10$hashedpass123', '${a.first}', '${a.last}', 'YAZAR', '${a.photo}', NOW(), NOW())`
  ).join(',');

  await client.query(`
    INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, "profilePhoto", "createdAt", "updatedAt")
    VALUES ${userRows}
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, "firstName" = EXCLUDED."firstName", "lastName" = EXCLUDED."lastName", "profilePhoto" = EXCLUDED."profilePhoto";
  `);

  const authorRows = allAuthorsList.map(a =>
    `('auth-${a.idx}', 'usr-author-${a.idx}', ${a.prov}, ${a.branch}, ${(a.idx % 10) + 1}, '${a.title}', ${a.exp}, '${a.status}', '${a.first} ${a.last}, ${a.exp} yıllık tecrübesiyle zümre komisyonunda yer almaktadır.', '${a.phone}', NOW(), NOW())`
  ).join(',');

  await client.query(`
    INSERT INTO "Author" (id, "userId", "provinceId", "branchId", "institutionId", title, experience, status, biography, phone, "createdAt", "updatedAt")
    VALUES ${authorRows}
    ON CONFLICT (id) DO UPDATE SET "provinceId" = EXCLUDED."provinceId", "branchId" = EXCLUDED."branchId", status = EXCLUDED.status, biography = EXCLUDED.biography, phone = EXCLUDED.phone;
  `);

  // 7. Projects
  console.log('Seeding Projects...');
  const projects = [
    { id: 'prj-1', title: 'Ritim Biyoloji 11. Sınıf SB', type: 'Soru Bankası', progress: 78, deadline: '2026-09-22', status: 'DEVAM_EDIYOR', priority: 'ACIL', desc: 'Yeni MEB müfredatına ve beceri temelli öğrenme çıktılarına tam uyumlu modüler soru bankası.' },
    { id: 'prj-2', title: 'LGS Türkçe Paragraf Ustası', type: 'Konu ve Soru Bankası', progress: 92, deadline: '2026-09-28', status: 'KONTROL', priority: 'YUKSEK', desc: 'LGS mantık-muhakeme ve yeni nesil infografik paragraf sorularından oluşan özel seçki.' },
    { id: 'prj-3', title: 'TYT Matematik Yeni Nesil Soru Bankası', type: 'Soru Bankası', progress: 64, deadline: '2026-10-15', status: 'DEVAM_EDIYOR', priority: 'YUKSEK', desc: 'Görsel yorumlama, modelleme ve günlük hayat problemlerini içeren hibrit soru bankası.' },
    { id: 'prj-4', title: 'AYT Fizik Konu Anlatımlı Modüler Set', type: 'Modüler Fasikül Set', progress: 100, deadline: '2026-08-30', status: 'TAMAMLANDI', priority: 'NORMAL', desc: 'Deney videoları, QR çözümler ve adım adım kavrama testleri ile donatılmış set.' },
    { id: 'prj-5', title: 'LGS Fen Bilimleri Beceri Temelli Sorular', type: 'Soru Bankası', progress: 45, deadline: '2026-10-30', status: 'DEVAM_EDIYOR', priority: 'NORMAL', desc: 'PISA ve TIMSS soruları referans alınarak kurgulanan deney ve grafik yorumlama odaklı içerik.' },
    { id: 'prj-6', title: '10. Sınıf Kimya Hibrit Soru Bankası', type: 'Soru Bankası', progress: 100, deadline: '2026-07-20', status: 'TAMAMLANDI', priority: 'NORMAL', desc: 'Dizgi ve redaksiyon süreçleri tamamlanarak matbaa onayına sevk edilen temel kaynak.' },
    { id: 'prj-7', title: '8. Sınıf İnkılap Tarihi Deneme Sınavları', type: 'Deneme Seti', progress: 30, deadline: '2026-11-10', status: 'PLANLAMA', priority: 'DUSUK', desc: '10 adet sarmal, 10 adet genel olmak üzere 20 adet fasikül deneme sınavı.' }
  ];

  const projectRows = projects.map(p =>
    `('${p.id}', '${p.title}', '${p.desc}', '${p.type}', '${p.status}', '${p.priority}', '${p.deadline}', ${p.progress}, NOW(), NOW())`
  ).join(',');

  await client.query(`
    INSERT INTO "Project" (id, title, description, type, status, priority, deadline, progress, "createdAt", "updatedAt")
    VALUES ${projectRows}
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, type = EXCLUDED.type, status = EXCLUDED.status, priority = EXCLUDED.priority, deadline = EXCLUDED.deadline, progress = EXCLUDED.progress;
  `);

  // 8. ProjectAuthors
  console.log('Seeding ProjectAuthors...');
  const pas = [
    { id: 'pa-1', p: 'prj-1', a: 'auth-5', r: 'Başyazar' },
    { id: 'pa-2', p: 'prj-2', a: 'auth-1', r: 'Başyazar' },
    { id: 'pa-3', p: 'prj-3', a: 'auth-2', r: 'Bölüm Yazarı' },
    { id: 'pa-4', p: 'prj-3', a: 'auth-4', r: 'Soru Redaktörü' },
    { id: 'pa-5', p: 'prj-4', a: 'auth-6', r: 'Başyazar' },
    { id: 'pa-6', p: 'prj-5', a: 'auth-3', r: 'Bölüm Yazarı' },
    { id: 'pa-7', p: 'prj-6', a: 'auth-7', r: 'Başyazar' },
    { id: 'pa-8', p: 'prj-7', a: 'auth-8', r: 'Bölüm Yazarı' }
  ];
  const paRows = pas.map(p => `('${p.id}', '${p.p}', '${p.a}', '${p.r}', NOW())`).join(',');
  await client.query(`
    INSERT INTO "ProjectAuthor" (id, "projectId", "authorId", "roleInProject", "createdAt")
    VALUES ${paRows}
    ON CONFLICT (id) DO UPDATE SET "roleInProject" = EXCLUDED."roleInProject";
  `);

  // 9. Tasks
  console.log('Seeding Tasks...');
  const tasks = [
    { id: 'tsk-1', title: 'Biyoloji 11. Sınıf Sinir Sistemi Ünitesi Soru Yazımı', desc: '32 adet yeni nesil beceri temelli soru hazırlanması ve sisteme yüklenmesi', p: 'prj-1', a: 'auth-5', c: 'usr-1', s: 'DEVAM_EDIYOR', pr: 'ACIL', d: '2026-09-22' },
    { id: 'tsk-2', title: 'LGS Paragraf Test 4-8 Dizgi ve Kırmızı Kalem Kontrolü', desc: 'Dizgiden gelen PDF üzerinden soru tashih ve imla kontrolü', p: 'prj-2', a: 'auth-1', c: 'usr-3', s: 'KONTROL_BEKLIYOR', pr: 'YUKSEK', d: '2026-09-25' },
    { id: 'tsk-3', title: 'TYT Matematik Fonksiyonlar Karma Testleri', desc: 'ÖSYM tarzı 40 adet orta ve üst düzey fonksiyon sorusunun teslimi', p: 'prj-3', a: 'auth-2', c: 'usr-1', s: 'DEVAM_EDIYOR', pr: 'YUKSEK', d: '2026-10-05' },
    { id: 'tsk-4', title: 'LGS Fen Bilimleri DNA ve Genetik Kod Görsel Revizyonları', desc: 'Grafik servisi ile koordineli olarak şema ve infografiklerin yenilenmesi', p: 'prj-5', a: 'auth-3', c: 'usr-2', s: 'BEKLIYOR', pr: 'NORMAL', d: '2026-10-18' },
    { id: 'tsk-5', title: 'Fizik AYT Elektrik ve Manyetizma Çözüm Videoları Onayı', desc: 'Kitap arkası QR kodlara bağlı video çözüm anlatımlarının incelenmesi', p: 'prj-4', a: 'auth-6', c: 'usr-3', s: 'TAMAMLANDI', pr: 'NORMAL', d: '2026-08-25' },
    { id: 'tsk-6', title: 'Kimya 10. Sınıf Gazlar Ünitesi Kazanım Testi 6', desc: '16 adet gaz yasaları sayısal uygulama sorusu', p: 'prj-6', a: 'auth-7', c: 'usr-3', s: 'TAMAMLANDI', pr: 'DUSUK', d: '2026-07-15' },
    { id: 'tsk-7', title: 'Tarih 8. Sınıf 1. Dünya Savaşı Harita ve Karikatür Analizi', desc: 'Harita yorumlama kazanımlarına dönük görsel soru paketi', p: 'prj-7', a: 'auth-8', c: 'usr-1', s: 'GECIKTI', pr: 'NORMAL', d: '2026-09-12' }
  ];
  const taskRows = tasks.map(t =>
    `('${t.id}', '${t.title}', '${t.desc}', '${t.p}', '${t.a}', '${t.c}', '${t.s}', '${t.pr}', NOW(), '${t.d}', NOW(), NOW())`
  ).join(',');
  await client.query(`
    INSERT INTO "Task" (id, title, description, "projectId", "authorId", "coordinatorId", status, priority, "startDate", "dueDate", "createdAt", "updatedAt")
    VALUES ${taskRows}
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, priority = EXCLUDED.priority, "dueDate" = EXCLUDED."dueDate";
  `);

  // 10. Payments
  console.log('Seeding Payments...');
  const payments = [
    { id: 'pay-1', a: 'auth-1', p: 'prj-2', amt: 48500, s: 'ODENDI', d: '2026-08-28', n: '1. Aşama Telif Hakedişi (KDV Dahil)' },
    { id: 'pay-2', a: 'auth-2', p: 'prj-3', amt: 62000, s: 'ONAYLANDI', d: '2026-09-25', n: 'Ünite Teslim Onaylı Telif Ödemesi' },
    { id: 'pay-3', a: 'auth-5', p: 'prj-1', amt: 35000, s: 'BEKLIYOR', d: '2026-09-30', n: 'Biyoloji 11. Sınıf Ara Ödeme' },
    { id: 'pay-4', a: 'auth-6', p: 'prj-4', amt: 75000, s: 'ODENDI', d: '2026-08-10', n: 'AYT Fizik Seti Kesin Kabul Ödemesi' },
    { id: 'pay-5', a: 'auth-3', p: 'prj-5', amt: 42000, s: 'BEKLIYOR', d: '2026-10-15', n: 'LGS Fen Bilimleri Sözleşme Avansı' },
    { id: 'pay-6', a: 'auth-7', p: 'prj-6', amt: 50000, s: 'ODENDI', d: '2026-07-30', n: '10. Sınıf Kimya Tamamlanma Hakedişi' },
    { id: 'pay-7', a: 'auth-8', p: 'prj-7', amt: 28000, s: 'BEKLIYOR', d: '2026-10-01', n: 'Tarih Deneme Soru Yazımı Avansı' }
  ];
  const payRows = payments.map(p =>
    `('${p.id}', '${p.a}', '${p.p}', ${p.amt}, '${p.s}', '${p.d}', '${p.n}', NOW(), NOW())`
  ).join(',');
  await client.query(`
    INSERT INTO "Payment" (id, "authorId", "projectId", amount, status, "paymentDate", notes, "createdAt", "updatedAt")
    VALUES ${payRows}
    ON CONFLICT (id) DO UPDATE SET amount = EXCLUDED.amount, status = EXCLUDED.status, "paymentDate" = EXCLUDED."paymentDate", notes = EXCLUDED.notes;
  `);

  // 11. Announcements
  console.log('Seeding Announcements...');
  const annRows = [
    `('ann-1', '2026-2027 Eğitim Öğretim Yılı Soru Yazım Kılavuzu Yayınlandı', 'Değerli Pro Lig yazar kadromuz, yeni dönem için MEB kazanımları, beceri temelli soru yazım şablonları ve dizgi format kılavuzumuz sistem dosyalarına eklenmiştir. Lütfen inceleyiniz.', 'YUKSEK', NOW(), false, 'Yazarlar', NOW(), NOW())`,
    `('ann-2', 'Eylül Ayı Telif Hakediş Bildirimleri ve Fatura Son Teslimi', 'Eylül ayı içerisinde teslim edilen soru ve fasiküllerin telif hakediş listeleri onaylanmıştır. Muhasebe birimine serbest meslek makbuzu veya faturaların en geç 25 Eylül mesai bitimine kadar iletilmesi rica olunur.', 'ACIL', NOW(), false, 'Tümü', NOW(), NOW())`,
    `('ann-3', 'LGS ve YKS Komisyon Toplantısı Takvimi', 'Çevrim içi zümre koordinasyon toplantımız 27 Eylül Cumartesi saat 14:00’te gerçekleştirilecektir. Katılım linki mesajlar kutunuza iletilmiştir.', 'NORMAL', NOW(), false, 'Koordinatörler', NOW(), NOW())`
  ].join(',');
  await client.query(`
    INSERT INTO "Announcement" (id, title, content, priority, "publishDate", "isArchived", "targetAudience", "createdAt", "updatedAt")
    VALUES ${annRows}
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, priority = EXCLUDED.priority, "targetAudience" = EXCLUDED."targetAudience";
  `);

  // 12. Messages
  console.log('Seeding Messages...');
  const msgRows = [
    `('msg-1', 'usr-1', 'usr-author-1', 'Paragraf Soru Bankası 3. Bölüm Revizyonu', 'Merhaba Zeynep Hocam, 3. ünitede yer alan 12. ve 14. soruların grafik çözünürlükleri güncellendi, son onayınızı bekliyoruz.', true, false, NOW())`,
    `('msg-2', 'usr-3', 'usr-1', 'Biyoloji 11. Sınıf Dizgi Durumu', 'Selim Hocam selamlar, Biyoloji kitabımızın 4. ünitesi dizgiye alındı. Haftaya prova baskı hazır olacak.', false, false, NOW())`,
    `('msg-3', 'usr-4', 'usr-author-1', 'Telif Hakediş Onayı Hakkında', 'Sayın Demir, hazırladığınız 40 soruluk soru paketinin hakediş tutarı onaylanmış olup muhasebe listesine dahil edilmiştir.', false, false, NOW())`
  ].join(',');
  await client.query(`
    INSERT INTO "Message" (id, "senderId", "receiverId", subject, content, "isRead", "isArchived", "createdAt")
    VALUES ${msgRows}
    ON CONFLICT (id) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, "isRead" = EXCLUDED."isRead";
  `);

  // 13. Notifications
  console.log('Seeding Notifications...');
  const notifRows = [
    `('notif-1', 'usr-1', 'Yeni Görev Teslim Edildi', 'Zeynep Demir, LGS Türkçe Paragraf ünitesini teslim etti.', false, '/tasks', NOW())`,
    `('notif-2', 'usr-1', 'Yaklaşan Teslim Tarihi', 'Ritim Biyoloji 11. Sınıf SB için son 3 gün kaldı.', false, '/projects', NOW())`,
    `('notif-3', 'usr-1', 'Telif Ödemesi Onaylandı', 'SZL-2026-104 numaralı sözleşme hakedişi onaylandı.', false, '/payments', NOW())`,
    `('notif-4', 'usr-author-1', 'Yeni Mesajınız Var', 'Genel Koordinatörlükten revizyon talebi aldınız.', false, '/messages', NOW())`
  ].join(',');
  await client.query(`
    INSERT INTO "Notification" (id, "userId", title, content, "isRead", link, "createdAt")
    VALUES ${notifRows}
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, link = EXCLUDED.link;
  `);

  console.log('🎉 PostgreSQL Database Populated Successfully in Real Remote Database!');
  const finalProvinces = await client.query('SELECT COUNT(*) FROM "Province"');
  const finalAuthors = await client.query('SELECT COUNT(*) FROM "Author"');
  const finalProjects = await client.query('SELECT COUNT(*) FROM "Project"');
  const finalTasks = await client.query('SELECT COUNT(*) FROM "Task"');
  const finalPayments = await client.query('SELECT COUNT(*) FROM "Payment"');
  console.log('Verified Counts in Remote PostgreSQL:', {
    provinces: finalProvinces.rows[0].count,
    authors: finalAuthors.rows[0].count,
    projects: finalProjects.rows[0].count,
    tasks: finalTasks.rows[0].count,
    payments: finalPayments.rows[0].count
  });

  await client.end();
}

run().catch(err => {
  console.error('Fast Batch Error:', err);
  process.exit(1);
});
