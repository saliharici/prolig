import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { TURKEY_PROVINCES } from './provincesData.ts';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'prolig.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys and WAL mode for reliability
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS provinces (
      id INTEGER PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT UNIQUE NOT NULL,
      region TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS districts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      province_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS institutions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      province_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'Eğitim Kurumu',
      FOREIGN KEY (province_id) REFERENCES provinces(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role_code TEXT NOT NULL,
      province_id INTEGER,
      avatar_url TEXT,
      phone TEXT,
      status TEXT DEFAULT 'Aktif',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (province_id) REFERENCES provinces(id)
    );

    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      profile_photo TEXT,
      province_id INTEGER NOT NULL,
      district_id INTEGER,
      branch_id INTEGER NOT NULL,
      institution_id INTEGER,
      title TEXT DEFAULT 'Yazar / Eğitimci',
      experience_years INTEGER DEFAULT 5,
      status TEXT DEFAULT 'Aktif',
      biography TEXT,
      iban TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (province_id) REFERENCES provinces(id),
      FOREIGN KEY (district_id) REFERENCES districts(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (institution_id) REFERENCES institutions(id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      project_type TEXT DEFAULT 'Soru Bankası',
      coordinator_id INTEGER,
      progress INTEGER DEFAULT 0,
      deadline TEXT NOT NULL,
      status TEXT DEFAULT 'Devam Ediyor',
      priority TEXT DEFAULT 'Normal',
      target_grade TEXT DEFAULT '8. Sınıf',
      branch_id INTEGER NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coordinator_id) REFERENCES users(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      isbn TEXT,
      page_count INTEGER DEFAULT 240,
      status TEXT DEFAULT 'Dizgi Aşamasında',
      publication_date TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      role_in_project TEXT DEFAULT 'Bölüm Yazarı',
      assigned_chapters TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, author_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_author_id INTEGER,
      assigned_coordinator_id INTEGER,
      project_id INTEGER NOT NULL,
      priority TEXT DEFAULT 'Normal',
      status TEXT DEFAULT 'Bekliyor',
      start_date TEXT DEFAULT CURRENT_TIMESTAMP,
      due_date TEXT NOT NULL,
      completion_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_author_id) REFERENCES authors(id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_coordinator_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      contract_no TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'Bekliyor',
      payment_date TEXT,
      invoice_no TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      file_type TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploader_name TEXT NOT NULL,
      project_id INTEGER,
      author_id INTEGER,
      category TEXT DEFAULT 'Taslak Soru',
      upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'Normal',
      audience TEXT DEFAULT 'Tümü',
      published_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_archived INTEGER DEFAULT 0,
      created_by TEXT DEFAULT 'Genel Yayın Koordinatörlüğü'
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_authors_province ON authors(province_id);
    CREATE INDEX IF NOT EXISTS idx_authors_branch ON authors(branch_id);
    CREATE INDEX IF NOT EXISTS idx_authors_status ON authors(status);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
  `);

  // Check if seed data exists
  const roleCountRow = db.prepare('SELECT COUNT(*) as count FROM roles').get() as { count: number };
  if (roleCountRow.count === 0) {
    seedDatabase();
  }
}

export function seedDatabase() {
  console.log('🌱 Seeding database with realistic Turkish education data...');

  // 1. Roles
  const roles = [
    { code: 'GENEL_KOORDINATOR', name: 'Genel Koordinatör', description: 'Tüm sistem ve yayın kurullarına tam erişim' },
    { code: 'IL_KOORDINATORU', name: 'İl Koordinatörü', description: 'İl bazındaki yazar ve komisyonların yönetimi' },
    { code: 'EDITOR', name: 'Editör', description: 'Kitap projeleri, soru kontrolü ve yazarlık akışı' },
    { code: 'YAZAR', name: 'Yazar / Branş Uzmanı', description: 'Soru üretimi, bölüm yazımı ve görev teslimi' },
    { code: 'MUHASEBE', name: 'Muhasebe & Finans', description: 'Telif sözleşmeleri, hakedişler ve ödemeler' },
    { code: 'YONETICI', name: 'Sistem Yöneticisi', description: 'Kullanıcı, rol ve sistem altyapı ayarları' }
  ];
  const insertRole = db.prepare('INSERT INTO roles (code, name, description) VALUES (?, ?, ?)');
  for (const r of roles) {
    insertRole.run(r.code, r.name, r.description);
  }

  // 2. Provinces & Districts
  const insertProv = db.prepare('INSERT INTO provinces (id, code, name, region) VALUES (?, ?, ?, ?)');
  const insertDist = db.prepare('INSERT INTO districts (province_id, name) VALUES (?, ?)');
  for (const p of TURKEY_PROVINCES) {
    insertProv.run(p.id, p.code, p.name, p.region);
    for (const d of p.districts) {
      insertDist.run(p.id, d);
    }
  }

  // 3. Branches
  const branches = [
    { name: 'Matematik', category: 'Sayısal', color: '#2563eb' },
    { name: 'Türkçe', category: 'Sözel', color: '#0d9488' },
    { name: 'Fen Bilimleri', category: 'Sayısal', color: '#16a34a' },
    { name: 'Sosyal Bilgiler', category: 'Sözel', color: '#ea580c' },
    { name: 'Biyoloji', category: 'Sayısal', color: '#10b981' },
    { name: 'Kimya', category: 'Sayısal', color: '#8b5cf6' },
    { name: 'Fizik', category: 'Sayısal', color: '#0284c7' },
    { name: 'Tarih', category: 'Sözel', color: '#b45309' },
    { name: 'Coğrafya', category: 'Sözel', color: '#d97706' },
    { name: 'İngilizce', category: 'Yabancı Dil', color: '#ec4899' },
    { name: 'Din Kültürü', category: 'Sözel', color: '#64748b' },
    { name: 'Felsefe', category: 'Sözel', color: '#6366f1' }
  ];
  const insertBranch = db.prepare('INSERT INTO branches (name, category, color) VALUES (?, ?, ?)');
  for (const b of branches) {
    insertBranch.run(b.name, b.category, b.color);
  }

  // 4. Institutions
  const institutions = [
    { name: 'İstanbul Fen Lisesi', province_id: 34, type: 'Fen Lisesi' },
    { name: 'Kadıköy Anadolu Lisesi', province_id: 34, type: 'Anadolu Lisesi' },
    { name: 'Ankara Fen Lisesi', province_id: 6, type: 'Fen Lisesi' },
    { name: 'Çankaya Atatürk Anadolu Lisesi', province_id: 6, type: 'Anadolu Lisesi' },
    { name: 'İzmir Fen Lisesi', province_id: 35, type: 'Fen Lisesi' },
    { name: 'Bursa Tofaş Fen Lisesi', province_id: 16, type: 'Fen Lisesi' },
    { name: 'Erzurum İbrahim Hakkı Fen Lisesi', province_id: 25, type: 'Fen Lisesi' },
    { name: 'Gaziantep Vehbi Dinçerler Fen Lisesi', province_id: 27, type: 'Fen Lisesi' },
    { name: 'Trabzon Yomra Fen Lisesi', province_id: 61, type: 'Fen Lisesi' },
    { name: 'Antalya Yusuf Ziya Öner Fen Lisesi', province_id: 7, type: 'Fen Lisesi' }
  ];
  const insertInst = db.prepare('INSERT INTO institutions (name, province_id, type) VALUES (?, ?, ?)');
  for (const inst of institutions) {
    insertInst.run(inst.name, inst.province_id, inst.type);
  }

  // 5. Users
  const users = [
    {
      username: 'selim.yavuz',
      email: 'selim.yavuz@prolig.com.tr',
      full_name: 'Dr. Selim Yavuz',
      role_code: 'GENEL_KOORDINATOR',
      province_id: 34,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: '+90 (212) 444 88 90'
    },
    {
      username: 'ayse.koc',
      email: 'ayse.koc@prolig.com.tr',
      full_name: 'Ayşe Koç',
      role_code: 'IL_KOORDINATORU',
      province_id: 6,
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      phone: '+90 (312) 310 45 20'
    },
    {
      username: 'burak.celik',
      email: 'burak.celik@prolig.com.tr',
      full_name: 'Burak Çelik',
      role_code: 'EDITOR',
      province_id: 34,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      phone: '+90 (216) 555 12 34'
    },
    {
      username: 'zeynep.demir',
      email: 'zeynep.demir@prolig.com.tr',
      full_name: 'Zeynep Demir',
      role_code: 'YAZAR',
      province_id: 27,
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      phone: '+90 (342) 220 90 80'
    },
    {
      username: 'emre.muhasebe',
      email: 'emre.kaya@prolig.com.tr',
      full_name: 'Emre Kaya',
      role_code: 'MUHASEBE',
      province_id: 34,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      phone: '+90 (212) 444 88 95'
    },
    {
      username: 'admin',
      email: 'admin@prolig.com.tr',
      full_name: 'Sistem Yöneticisi',
      role_code: 'YONETICI',
      province_id: 34,
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      phone: '+90 (212) 444 88 00'
    }
  ];
  const insertUser = db.prepare('INSERT INTO users (username, email, full_name, role_code, province_id, avatar_url, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const u of users) {
    insertUser.run(u.username, u.email, u.full_name, u.role_code, u.province_id, u.avatar_url, u.phone);
  }

  // 6. Authors Generation (Realistic Distribution matching screenshot & prompt:
  // Istanbul 26, Ankara 18, Izmir 12, Erzurum 10, Bursa 9, Antalya 8, Gaziantep 7, Trabzon 6, etc.)
  const authorNames = [
    { first: 'Zeynep', last: 'Demir', prov: 27, branch: 2, photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', title: 'Uzman Türkçe Öğretmeni', exp: 12 },
    { first: 'Mehmet', last: 'Kara', prov: 61, branch: 1, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', title: 'Matematik Bölüm Başkanı', exp: 16 },
    { first: 'Elif', last: 'Yıldız', prov: 34, branch: 3, photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', title: 'Fen Bilimleri Yazarı', exp: 9 },
    { first: 'Ahmet', last: 'Kaya', prov: 34, branch: 1, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', title: 'LGS Matematik Yazarı', exp: 14 },
    { first: 'Canan', last: 'Öztürk', prov: 6, branch: 5, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', title: 'Biyoloji Zümre Başkanı', exp: 11 },
    { first: 'Murat', last: 'Şahin', prov: 6, branch: 7, photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', title: 'Fizik Yazarı & Akademisyen', exp: 18 },
    { first: 'Seda', last: 'Arslan', prov: 35, branch: 6, photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', title: 'Kimya Proje Lideri', exp: 10 },
    { first: 'Kemal', last: 'Aydın', prov: 25, branch: 8, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', title: 'Tarih Yazarı & Araştırmacı', exp: 15 },
    { first: 'Büşra', last: 'Koçak', prov: 16, branch: 4, photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', title: 'Sosyal Bilgiler Komisyon Üyesi', exp: 8 },
    { first: 'Deniz', last: 'Güneş', prov: 7, branch: 10, photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', title: 'İngilizce Materyal Geliştirici', exp: 7 },
    { first: 'Hakan', last: 'Polat', prov: 25, branch: 1, photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', title: 'Olimpiyat Matematik Eğitmeni', exp: 20 },
    { first: 'Fatma', last: 'Aksoy', prov: 34, branch: 2, photo: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80', title: 'Türkçe Soru Yazarı', exp: 13 },
    { first: 'Oğuzhan', last: 'Erdoğan', prov: 34, branch: 7, photo: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', title: 'AYT Fizik Koordinatörü', exp: 16 },
    { first: 'Merve', last: 'Çetin', prov: 6, branch: 3, photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80', title: 'Fen Bilgisi Yazarı', exp: 9 },
    { first: 'Emre', last: 'Yılmaz', prov: 35, branch: 1, photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', title: 'Geometri & Matematik Yazarı', exp: 12 },
    { first: 'Gamze', last: 'Taş', prov: 16, branch: 6, photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', title: 'Kimya Zümre Başkanı', exp: 11 },
    { first: 'Serkan', last: 'Bozkurt', prov: 25, branch: 2, photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', title: 'Edebiyat Yazarı', exp: 14 }
  ];

  // Specific target counts per province:
  const provinceTargets: Record<number, number> = {
    34: 26, // İstanbul
    6: 18,  // Ankara
    35: 12, // İzmir
    25: 10, // Erzurum
    16: 9,  // Bursa
    7: 8,   // Antalya
    27: 7,  // Gaziantep
    61: 6,  // Trabzon
    42: 6,  // Konya
    21: 5,  // Diyarbakır
    55: 5,  // Samsun
    38: 4,  // Kayseri
    1: 4,   // Adana
    26: 4,  // Eskişehir
    41: 4,  // Kocaeli
    65: 3,  // Van
    44: 3,  // Malatya
    10: 3,  // Balıkesir
    20: 3,  // Denizli
    48: 3,  // Muğla
    31: 3,  // Hatay
    52: 2,  // Ordu
    54: 2,  // Sakarya
    58: 2,  // Sivas
    33: 2   // Mersin
  };

  const turkishFirstNames = [
    'Ali', 'Veli', 'Ayşe', 'Fatma', 'Cem', 'Burak', 'Ceren', 'Derya', 'Eren', 'Furkan',
    'Gözde', 'Hilal', 'İbrahim', 'Jale', 'Kadir', 'Leyla', 'Mustafa', 'Nuray', 'Ozan',
    'Pınar', 'Rıza', 'Sinem', 'Tufan', 'Umut', 'Volkan', 'Yasemin', 'Zafer', 'Banu'
  ];
  const turkishLastNames = [
    'Özdemir', 'Kılıç', 'Aslan', 'Çetin', 'Koç', 'Kurt', 'Şimşek', 'Polat', 'Korkmaz',
    'Güler', 'Yalçın', 'Bulut', 'Yavuz', 'Doğan', 'Acar', 'Erdoğan', 'Tekin', 'Aktaş'
  ];

  const insertAuthor = db.prepare(`
    INSERT INTO authors (
      first_name, last_name, email, phone, profile_photo,
      province_id, district_id, branch_id, institution_id,
      title, experience_years, status, biography, iban, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let authorCounter = 1;
  // First insert seeded named authors
  for (const a of authorNames) {
    const distRow = db.prepare('SELECT id FROM districts WHERE province_id = ? LIMIT 1').get(a.prov) as { id: number } | undefined;
    const distId = distRow ? distRow.id : null;
    const email = `${a.first.toLowerCase()}.${a.last.toLowerCase()}${authorCounter}@prolig.com.tr`;
    const phone = `+90 (53${authorCounter % 9}) ${100 + authorCounter} ${20 + authorCounter} ${10 + authorCounter}`;
    const iban = `TR${30 + (authorCounter % 50)}00062000000${1000000000 + authorCounter}`;
    const status = authorCounter % 15 === 0 ? 'Pasif' : (authorCounter % 22 === 0 ? 'Beklemede' : 'Aktif');

    insertAuthor.run(
      a.first, a.last, email, phone, a.photo,
      a.prov, distId, a.branch, (authorCounter % 10) + 1,
      a.title, a.exp, status,
      `${a.first} ${a.last}, ${a.title} olarak görev yapmakta olup yeni nesil soru üretimi ve dijital içerik geliştirme alanında uzmanlaşmıştır.`,
      iban,
      `2026-0${Math.floor(authorCounter / 4) + 1}-1${(authorCounter % 8) + 1} 10:30:00`
    );
    authorCounter++;
  }

  // Populate remaining province target counts so dynamic map counts exactly reflect prompt reference
  for (const [provIdStr, targetCount] of Object.entries(provinceTargets)) {
    const provId = parseInt(provIdStr, 10);
    const existing = db.prepare('SELECT COUNT(*) as count FROM authors WHERE province_id = ?').get(provId) as { count: number };
    const needed = targetCount - existing.count;

    for (let i = 0; i < needed; i++) {
      const fn = turkishFirstNames[(authorCounter * 3 + i) % turkishFirstNames.length];
      const ln = turkishLastNames[(authorCounter * 7 + i) % turkishLastNames.length];
      const branchId = ((authorCounter + i) % 12) + 1;
      const distRow = db.prepare('SELECT id FROM districts WHERE province_id = ? LIMIT 1 OFFSET ?').get(provId, i % 3) as { id: number } | undefined;
      const distId = distRow ? distRow.id : null;
      const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${authorCounter}@prolig.com.tr`;
      const phone = `+90 (53${(authorCounter + i) % 9}) ${200 + authorCounter} ${30 + i} ${40 + i}`;
      const iban = `TR${20 + (authorCounter % 60)}00062000000${2000000000 + authorCounter}`;
      const status = i === 0 && provId === 34 ? 'Aktif' : (authorCounter % 18 === 0 ? 'Beklemede' : 'Aktif');
      const exp = 4 + ((authorCounter + i) % 18);
      const photoIndex = (authorCounter + i) % authorNames.length;
      const photo = authorNames[photoIndex].photo;

      insertAuthor.run(
        fn, ln, email, phone, photo,
        provId, distId, branchId, ((authorCounter + i) % 10) + 1,
        'Yazar / Branş Uzmanı', exp, status,
        `Yazarımız ${fn} ${ln}, ${exp} yıllık tecrübesi ile komisyonumuzda soru yazımı ve kitap inceleme kurullarında aktif yer almaktadır.`,
        iban,
        `2026-0${(authorCounter % 8) + 1}-0${(i % 8) + 1} 09:15:00`
      );
      authorCounter++;
    }
  }

  // 7. Projects & Books
  const sampleProjects = [
    {
      title: 'Ritim Biyoloji 11. Sınıf SB',
      code: 'PRJ-2026-BIO11',
      project_type: 'Soru Bankası',
      progress: 78,
      deadline: '2026-09-22',
      status: 'Devam Ediyor',
      priority: 'Acil',
      target_grade: '11. Sınıf',
      branch_id: 5,
      description: 'Yeni MEB müfredatına ve beceri temelli öğrenme çıktılarına tam uyumlu modüler soru bankası.'
    },
    {
      title: 'LGS Türkçe Paragraf Ustası',
      code: 'PRJ-2026-TR8',
      project_type: 'Konu ve Soru Bankası',
      progress: 92,
      deadline: '2026-09-28',
      status: 'Kontrol',
      priority: 'Yüksek',
      target_grade: '8. Sınıf',
      branch_id: 2,
      description: 'LGS mantık-muhakeme ve yeni nesil infografik paragraf sorularından oluşan özel seçki.'
    },
    {
      title: 'TYT Matematik Yeni Nesil Soru Bankası',
      code: 'PRJ-2026-MAT-TYT',
      project_type: 'Soru Bankası',
      progress: 64,
      deadline: '2026-10-15',
      status: 'Devam Ediyor',
      priority: 'Yüksek',
      target_grade: 'YKS / TYT',
      branch_id: 1,
      description: 'Görsel yorumlama, modelleme ve günlük hayat problemlerini içeren hibrit soru bankası.'
    },
    {
      title: 'AYT Fizik Konu Anlatımlı Modüler Set',
      code: 'PRJ-2026-FIZ-AYT',
      project_type: 'Modüler Fasikül Set',
      progress: 100,
      deadline: '2026-08-30',
      status: 'Tamamlandı',
      priority: 'Normal',
      target_grade: 'YKS / AYT',
      branch_id: 7,
      description: 'Deney videoları, QR çözümler ve adım adım kavrama testleri ile donatılmış set.'
    },
    {
      title: 'LGS Fen Bilimleri Beceri Temelli Sorular',
      code: 'PRJ-2026-FEN8',
      project_type: 'Soru Bankası',
      progress: 45,
      deadline: '2026-10-30',
      status: 'Devam Ediyor',
      priority: 'Normal',
      target_grade: '8. Sınıf',
      branch_id: 3,
      description: 'PISA ve TIMSS soruları referans alınarak kurgulanan deney ve grafik yorumlama odaklı içerik.'
    },
    {
      title: '10. Sınıf Kimya Hibrit Soru Bankası',
      code: 'PRJ-2026-KIM10',
      project_type: 'Soru Bankası',
      progress: 100,
      deadline: '2026-07-20',
      status: 'Tamamlandı',
      priority: 'Normal',
      target_grade: '10. Sınıf',
      branch_id: 6,
      description: 'Dizgi ve redaksiyon süreçleri tamamlanarak matbaa onayına sevk edilen temel kaynak.'
    },
    {
      title: '8. Sınıf İnkılap Tarihi ve Atatürkçülük Deneme Sınavları',
      code: 'PRJ-2026-TAR8',
      project_type: 'Deneme Seti',
      progress: 30,
      deadline: '2026-11-10',
      status: 'Planlama',
      priority: 'Düşük',
      target_grade: '8. Sınıf',
      branch_id: 8,
      description: '10 adet sarmal, 10 adet genel olmak üzere 20 adet fasikül deneme sınavı.'
    }
  ];

  const insertProject = db.prepare(`
    INSERT INTO projects (
      title, code, project_type, coordinator_id, progress,
      deadline, status, priority, target_grade, branch_id, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBook = db.prepare(`
    INSERT INTO books (project_id, title, isbn, page_count, status, publication_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertProjAuth = db.prepare(`
    INSERT OR IGNORE INTO project_authors (project_id, author_id, role_in_project, assigned_chapters)
    VALUES (?, ?, ?, ?)
  `);

  for (let idx = 0; idx < sampleProjects.length; idx++) {
    const p = sampleProjects[idx];
    const res = insertProject.run(
      p.title, p.code, p.project_type, (idx % 3) + 1, p.progress,
      p.deadline, p.status, p.priority, p.target_grade, p.branch_id, p.description
    );
    const projectId = res.lastInsertRowid as number;

    // Add Book entry
    insertBook.run(
      projectId, p.title, `978-605-${300 + idx}-${100 + idx}-8`,
      192 + (idx * 32), p.status === 'Tamamlandı' ? 'Basıldı' : 'Dizgi Aşamasında',
      p.status === 'Tamamlandı' ? '2026-08-15' : null
    );

    // Assign authors to this project
    const authorRows = db.prepare('SELECT id FROM authors WHERE branch_id = ? LIMIT 3').all(p.branch_id) as { id: number }[];
    for (const ar of authorRows) {
      insertProjAuth.run(projectId, ar.id, 'Bölüm Yazarı', 'Ünite 1-3 Soru Yazımı ve Redaksiyon');
    }
  }

  // 8. Tasks (Görev Takibi)
  const sampleTasks = [
    {
      title: 'Biyoloji 11. Sınıf Sinir Sistemi Ünitesi Soru Yazımı',
      desc: '32 adet yeni nesil beceri temelli soru hazırlanması ve sisteme yüklenmesi',
      author_id: 5,
      proj_id: 1,
      priority: 'Acil',
      status: 'Devam Ediyor',
      due: '2026-09-22'
    },
    {
      title: 'LGS Paragraf Test 4-8 Dizgi ve Kırmızı Kalem Kontrolü',
      desc: 'Dizgiden gelen PDF üzerinden soru tashih ve imla kontrolü',
      author_id: 1,
      proj_id: 2,
      priority: 'Yüksek',
      status: 'Kontrol Bekliyor',
      due: '2026-09-25'
    },
    {
      title: 'TYT Matematik Fonksiyonlar Karma Testleri',
      desc: 'ÖSYM tarzı 40 adet orta ve üst düzey fonksiyon sorusunun teslimi',
      author_id: 2,
      proj_id: 3,
      priority: 'Yüksek',
      status: 'Devam Ediyor',
      due: '2026-10-05'
    },
    {
      title: 'LGS Fen Bilimleri DNA ve Genetik Kod Görsel Revizyonları',
      desc: 'Grafik servisi ile koordineli olarak şema ve infografiklerin yenilenmesi',
      author_id: 3,
      proj_id: 5,
      priority: 'Normal',
      status: 'Bekliyor',
      due: '2026-10-18'
    },
    {
      title: 'Fizik AYT Elektrik ve Manyetizma Çözüm Videoları Onayı',
      desc: 'Kitap arkası QR kodlara bağlı video çözüm anlatımlarının incelenmesi',
      author_id: 6,
      proj_id: 4,
      priority: 'Normal',
      status: 'Tamamlandı',
      due: '2026-08-25'
    },
    {
      title: 'Kimya 10. Sınıf Gazlar Ünitesi Kazanım Testi 6',
      desc: '16 adet gaz yasaları sayısal uygulama sorusu',
      author_id: 7,
      proj_id: 6,
      priority: 'Düşük',
      status: 'Tamamlandı',
      due: '2026-07-15'
    },
    {
      title: 'Tarih 8. Sınıf 1. Dünya Savaşı Harita ve Karikatür Analizi',
      desc: 'Harita yorumlama kazanımlarına dönük görsel soru paketi',
      author_id: 8,
      proj_id: 7,
      priority: 'Normal',
      status: 'Gecikti',
      due: '2026-09-12'
    }
  ];

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      title, description, assigned_author_id, assigned_coordinator_id,
      project_id, priority, status, start_date, due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of sampleTasks) {
    insertTask.run(
      t.title, t.desc, t.author_id, 1,
      t.proj_id, t.priority, t.status,
      '2026-08-01', t.due
    );
  }

  // 9. Payments (Telif ve Ödemeler)
  const samplePayments = [
    { author_id: 1, proj_id: 2, contract: 'SZL-2026-089', amount: 48500, status: 'Ödendi', date: '2026-08-28', invoice: 'F-2026-00412', notes: '1. Aşama Telif Hakedişi (KDV Dahil)' },
    { author_id: 2, proj_id: 3, contract: 'SZL-2026-104', amount: 62000, status: 'Onaylandı', date: '2026-09-25', invoice: 'F-2026-00455', notes: 'Ünite Teslim Onaylı Telif Ödemesi' },
    { author_id: 5, proj_id: 1, contract: 'SZL-2026-112', amount: 35000, status: 'Bekliyor', date: '2026-09-30', invoice: null, notes: 'Biyoloji 11. Sınıf Ara Ödeme' },
    { author_id: 6, proj_id: 4, contract: 'SZL-2026-077', amount: 75000, status: 'Ödendi', date: '2026-08-10', invoice: 'F-2026-00398', notes: 'AYT Fizik Seti Kesin Kabul Ödemesi' },
    { author_id: 3, proj_id: 5, contract: 'SZL-2026-121', amount: 42000, status: 'Bekliyor', date: '2026-10-15', invoice: null, notes: 'LGS Fen Bilimleri Sözleşme Avansı' },
    { author_id: 7, proj_id: 6, contract: 'SZL-2026-065', amount: 50000, status: 'Ödendi', date: '2026-07-30', invoice: 'F-2026-00361', notes: '10. Sınıf Kimya Tamamlanma Hakedişi' },
    { author_id: 8, proj_id: 7, contract: 'SZL-2026-130', amount: 28000, status: 'Bekliyor', date: '2026-10-01', invoice: null, notes: 'Tarih Deneme Soru Yazımı Avansı' }
  ];

  const insertPayment = db.prepare(`
    INSERT INTO payments (author_id, project_id, contract_no, amount, status, payment_date, invoice_no, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const pay of samplePayments) {
    insertPayment.run(
      pay.author_id, pay.proj_id, pay.contract, pay.amount,
      pay.status, pay.date, pay.invoice, pay.notes
    );
  }

  // 10. Announcements (Duyurular)
  const announcements = [
    {
      title: '2026-2027 Eğitim Öğretim Yılı Soru Yazım Kılavuzu Yayınlandı',
      content: 'Değerli Pro Lig yazar kadromuz, yeni dönem için MEB kazanımları, beceri temelli soru yazım şablonları ve dizgi format kılavuzumuz sistem dosyalarına eklenmiştir. Lütfen inceleyiniz.',
      priority: 'Önemli',
      audience: 'Yazarlar',
      created_by: 'Genel Koordinatörlük'
    },
    {
      title: 'Eylül Ayı Telif Hakediş Bildirimleri ve Fatura Son Teslimi',
      content: 'Eylül ayı içerisinde teslim edilen soru ve fasiküllerin telif hakediş listeleri onaylanmıştır. Muhasebe birimine serbest meslek makbuzu veya faturaların en geç 25 Eylül mesai bitimine kadar iletilmesi rica olunur.',
      priority: 'Acil',
      audience: 'Tümü',
      created_by: 'Muhasebe & Finans'
    },
    {
      title: 'LGS ve YKS Komisyon Toplantısı Takvimi',
      content: 'Çevrim içi zümre koordinasyon toplantımız 27 Eylül Cumartesi saat 14:00’te gerçekleştirilecektir. Katılım linki mesajlar kutunuza iletilmiştir.',
      priority: 'Normal',
      audience: 'Koordinatörler',
      created_by: 'Yayın Kurulu'
    }
  ];

  const insertAnn = db.prepare('INSERT INTO announcements (title, content, priority, audience, created_by) VALUES (?, ?, ?, ?, ?)');
  for (const ann of announcements) {
    insertAnn.run(ann.title, ann.content, ann.priority, ann.audience, ann.created_by);
  }

  // 11. Files (Dosyalar)
  const files = [
    { filename: 'ProLig_2026_Soru_Yazim_Kriterleri.pdf', size: 4520000, type: 'application/pdf', uploader: 'Dr. Selim Yavuz', proj: 1, auth: 5, cat: 'Kılavuz' },
    { filename: 'LGS_Turkce_Paragraf_Dizgi_Taslak_v3.pdf', size: 18400000, type: 'application/pdf', uploader: 'Burak Çelik', proj: 2, auth: 1, cat: 'Dizgi Taslağı' },
    { filename: 'TYT_Matematik_Fonksiyonlar_Gorsel_Seti.zip', size: 32100000, type: 'application/zip', uploader: 'Mehmet Kara', proj: 3, auth: 2, cat: 'Görsel Arşiv' },
    { filename: 'AYT_Fizik_Baski_Onay_Raporu.docx', size: 1250000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', uploader: 'Murat Şahin', proj: 4, auth: 6, cat: 'Rapor' },
    { filename: 'Telif_Sozlesme_Ornegi_2026.pdf', size: 850000, type: 'application/pdf', uploader: 'Emre Kaya', proj: null, auth: null, cat: 'Sözleşme' }
  ];

  const insertFile = db.prepare('INSERT INTO files (filename, file_size, file_type, file_url, uploader_name, project_id, author_id, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  for (const f of files) {
    insertFile.run(f.filename, f.size, f.type, `/storage/${f.filename}`, f.uploader, f.proj, f.auth, f.cat);
  }

  // 12. Messages
  const messages = [
    { sender: 1, receiver: 4, subject: 'Paragraf Soru Bankası 3. Bölüm Revizyonu', body: 'Merhaba Zeynep Hocam, 3. ünitede yer alan 12. ve 14. soruların grafik çözünürlükleri güncellendi, son onayınızı bekliyoruz.', is_read: 1 },
    { sender: 3, receiver: 1, subject: 'Biyoloji 11. Sınıf Dizgi Durumu', body: 'Selim Hocam selamlar, Biyoloji kitabımızın 4. ünitesi dizgiye alındı. Haftaya prova baskı hazır olacak.', is_read: 0 },
    { sender: 5, receiver: 4, subject: 'Telif Hakediş Onayı Hakkında', body: 'Sayın Demir, hazırladığınız 40 soruluk soru paketinin hakediş tutarı onaylanmış olup muhasebe listesine dahil edilmiştir.', is_read: 0 }
  ];

  const insertMsg = db.prepare('INSERT INTO messages (sender_id, receiver_id, subject, body, is_read) VALUES (?, ?, ?, ?, ?)');
  for (const m of messages) {
    insertMsg.run(m.sender, m.receiver, m.subject, m.body, m.is_read);
  }

  // 13. Notifications
  const notifications = [
    { user_id: 1, title: 'Yeni Görev Teslim Edildi', message: 'Zeynep Demir, LGS Türkçe Paragraf ünitesini teslim etti.', type: 'task', link: '/tasks' },
    { user_id: 1, title: 'Yaklaşan Teslim Tarihi', message: 'Ritim Biyoloji 11. Sınıf SB için son 3 gün kaldı.', type: 'project', link: '/projects' },
    { user_id: 1, title: 'Telif Ödemesi Onaylandı', message: 'SZL-2026-104 numaralı sözleşme hakedişi onaylandı.', type: 'payment', link: '/payments' },
    { user_id: 4, title: 'Yeni Mesajınız Var', message: 'Genel Koordinatörlükten revizyon talebi aldınız.', type: 'message', link: '/messages' }
  ];

  const insertNotif = db.prepare('INSERT INTO notifications (user_id, title, message, type, link, is_read) VALUES (?, ?, ?, ?, ?, ?)');
  for (const n of notifications) {
    insertNotif.run(n.user_id, n.title, n.message, n.type, n.link, 0);
  }

  // 14. Activity Logs
  const activities = [
    { user: 'Dr. Selim Yavuz', action: 'Yazar Kaydı Eklendi', type: 'author', id: 1, details: 'Zeynep Demir sisteme Türkçe branşında eklendi.' },
    { user: 'Burak Çelik', action: 'Proje Durumu Güncellendi', type: 'project', id: 2, details: 'LGS Türkçe Paragraf Ustası "Kontrol" aşamasına alındı.' },
    { user: 'Emre Kaya', action: 'Telif Ödemesi Yapıldı', type: 'payment', id: 1, details: '48.500 ₺ tutarındaki telif Zeynep Demir hesabına aktarıldı.' },
    { user: 'Ayşe Koç', action: 'Yeni Görev Atandı', type: 'task', id: 1, details: 'Biyoloji 11. Sınıf Sinir Sistemi görevi Canan Öztürk\'e atandı.' }
  ];

  const insertLog = db.prepare('INSERT INTO activity_logs (user_name, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)');
  for (const act of activities) {
    insertLog.run(act.user, act.action, act.type, act.id, act.details);
  }

  console.log('✅ Database seeded successfully!');
}

// ----------------------------------------------------------------------
// DATA QUERY & MUTATION FUNCTIONS
// ----------------------------------------------------------------------

export function getDashboardStats(roleCode?: string, provinceId?: number) {
  // Respect role filtering if Province Coordinator or similar
  const authorWhere = provinceId ? 'WHERE province_id = ?' : '';
  const authorParams = provinceId ? [provinceId] : [];

  const totalAuthorsRow = db.prepare(`SELECT COUNT(*) as count FROM authors ${authorWhere}`).get(...authorParams) as { count: number };
  const totalProvincesRow = db.prepare('SELECT COUNT(DISTINCT province_id) as count FROM authors').get() as { count: number };
  const activeProjectsRow = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'Devam Ediyor'").get() as { count: number };
  const completedProjectsRow = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'Tamamlandı'").get() as { count: number };
  
  const activeWhere = provinceId ? "WHERE status = 'Aktif' AND province_id = ?" : "WHERE status = 'Aktif'";
  const activeAuthorsRow = db.prepare(`SELECT COUNT(*) as count FROM authors ${activeWhere}`).get(...authorParams) as { count: number };

  const paymentsTotalRow = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'Ödendi'").get() as { total: number };
  
  const totalTasksRow = db.prepare('SELECT COUNT(*) as total FROM tasks').get() as { total: number };
  const completedTasksRow = db.prepare("SELECT COUNT(*) as comp FROM tasks WHERE status = 'Tamamlandı'").get() as { comp: number };
  const completedTasksRate = totalTasksRow.total > 0 ? Math.round((completedTasksRow.comp / totalTasksRow.total) * 100) : 0;

  // Upcoming deadlines with calculated remaining days
  const upcomingDeadlines = db.prepare(`
    SELECT 
      p.id, 
      p.title, 
      p.title as project_title, 
      p.deadline, 
      CAST(ROUND((JULIANDAY(p.deadline) - JULIANDAY('now'))) AS INTEGER) as remaining_days,
      p.priority, 
      p.status
    FROM projects p
    WHERE p.status != 'Tamamlandı' AND p.status != 'Arşiv'
    ORDER BY p.deadline ASC
    LIMIT 6
  `).all() as any[];

  // Province distribution for horizontal bar chart & map
  const provinceDistribution = db.prepare(`
    SELECT 
      p.id as province_id,
      p.name as province_name,
      COUNT(a.id) as author_count
    FROM provinces p
    LEFT JOIN authors a ON p.id = a.province_id
    GROUP BY p.id, p.name
    HAVING COUNT(a.id) > 0
    ORDER BY author_count DESC
    LIMIT 12
  `).all() as any[];

  const maxAuthors = provinceDistribution[0]?.author_count || 1;
  const provinceDistWithPercent = provinceDistribution.map(p => ({
    ...p,
    percentage: Math.round((p.author_count / maxAuthors) * 100)
  }));

  // Branch distribution for donut chart
  const branchDistribution = db.prepare(`
    SELECT 
      b.name as branch_name,
      b.color,
      COUNT(a.id) as author_count
    FROM branches b
    LEFT JOIN authors a ON b.id = a.branch_id
    GROUP BY b.id, b.name, b.color
    HAVING COUNT(a.id) > 0
    ORDER BY author_count DESC
  `).all() as any[];

  const totalBranchAuthors = branchDistribution.reduce((acc, b) => acc + b.author_count, 0) || 1;
  const branchDistWithPercent = branchDistribution.map(b => ({
    ...b,
    percentage: Math.round((b.author_count / totalBranchAuthors) * 100)
  }));

  // Recent authors
  const recentAuthors = db.prepare(`
    SELECT 
      a.id, a.first_name, a.last_name, a.email, a.phone, a.profile_photo,
      a.title, a.status, a.created_at,
      p.name as province_name,
      b.name as branch_name
    FROM authors a
    LEFT JOIN provinces p ON a.province_id = p.id
    LEFT JOIN branches b ON a.branch_id = b.id
    ORDER BY a.created_at DESC
    LIMIT 8
  `).all() as any[];

  return {
    totalAuthors: totalAuthorsRow.count,
    totalProvinces: totalProvincesRow.count,
    activeProjects: activeProjectsRow.count,
    completedProjects: completedProjectsRow.count,
    activeAuthors: activeAuthorsRow.count,
    totalPaymentsAmount: paymentsTotalRow.total,
    completedTasksRate,
    upcomingDeadlines,
    provinceDistribution: provinceDistWithPercent,
    branchDistribution: branchDistWithPercent,
    recentAuthors
  };
}

export function getAllProvincesMap() {
  return db.prepare(`
    SELECT 
      p.id, p.code, p.name, p.region,
      COUNT(a.id) as author_count,
      SUM(CASE WHEN a.status = 'Aktif' THEN 1 ELSE 0 END) as active_author_count
    FROM provinces p
    LEFT JOIN authors a ON p.id = a.province_id
    GROUP BY p.id, p.code, p.name, p.region
    ORDER BY p.id ASC
  `).all();
}

export function getAuthors(filters: {
  search?: string;
  province_id?: number;
  branch_id?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  let sql = `
    SELECT 
      a.*,
      p.name as province_name,
      d.name as district_name,
      b.name as branch_name,
      i.name as institution_name,
      (SELECT COUNT(*) FROM project_authors pa WHERE pa.author_id = a.id) as assigned_projects_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.assigned_author_id = a.id AND t.status = 'Tamamlandı') as completed_tasks_count
    FROM authors a
    LEFT JOIN provinces p ON a.province_id = p.id
    LEFT JOIN districts d ON a.district_id = d.id
    LEFT JOIN branches b ON a.branch_id = b.id
    LEFT JOIN institutions i ON a.institution_id = i.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.search) {
    sql += ` AND (a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ? OR a.title LIKE ?)`;
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }
  if (filters.province_id) {
    sql += ` AND a.province_id = ?`;
    params.push(filters.province_id);
  }
  if (filters.branch_id) {
    sql += ` AND a.branch_id = ?`;
    params.push(filters.branch_id);
  }
  if (filters.status && filters.status !== 'Tümü') {
    sql += ` AND a.status = ?`;
    params.push(filters.status);
  }

  sql += ` ORDER BY a.created_at DESC`;

  if (filters.limit) {
    sql += ` LIMIT ? OFFSET ?`;
    params.push(filters.limit, filters.offset || 0);
  }

  return db.prepare(sql).all(...params);
}

export function getAuthorById(id: number) {
  const author = db.prepare(`
    SELECT 
      a.*,
      p.name as province_name,
      d.name as district_name,
      b.name as branch_name,
      i.name as institution_name
    FROM authors a
    LEFT JOIN provinces p ON a.province_id = p.id
    LEFT JOIN districts d ON a.district_id = d.id
    LEFT JOIN branches b ON a.branch_id = b.id
    LEFT JOIN institutions i ON a.institution_id = i.id
    WHERE a.id = ?
  `).get(id) as any;

  if (!author) return null;

  const projects = db.prepare(`
    SELECT p.id, p.title, p.code, p.status, p.progress, p.deadline, pa.role_in_project
    FROM project_authors pa
    JOIN projects p ON pa.project_id = p.id
    WHERE pa.author_id = ?
  `).all(id);

  const tasks = db.prepare(`
    SELECT t.*, p.title as project_title
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.assigned_author_id = ?
    ORDER BY t.due_date ASC
  `).all(id);

  const payments = db.prepare(`
    SELECT py.*, p.title as project_title
    FROM payments py
    JOIN projects p ON py.project_id = p.id
    WHERE py.author_id = ?
    ORDER BY py.created_at DESC
  `).all(id);

  return { ...author, projects, tasks, payments };
}

export function createAuthor(data: any) {
  const insert = db.prepare(`
    INSERT INTO authors (
      first_name, last_name, email, phone, profile_photo,
      province_id, district_id, branch_id, institution_id,
      title, experience_years, status, biography, iban
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const res = insert.run(
    data.first_name,
    data.last_name,
    data.email,
    data.phone,
    data.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    data.province_id,
    data.district_id || null,
    data.branch_id,
    data.institution_id || null,
    data.title || 'Yazar / Branş Uzmanı',
    data.experience_years || 5,
    data.status || 'Aktif',
    data.biography || '',
    data.iban || ''
  );

  const authorId = res.lastInsertRowid as number;

  db.prepare(`
    INSERT INTO activity_logs (user_name, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run('Sistem Kullanıcısı', 'Yazar Eklendi', 'author', authorId, `${data.first_name} ${data.last_name} sisteme dahil edildi.`);

  return getAuthorById(authorId);
}

export function updateAuthor(id: number, data: any) {
  db.prepare(`
    UPDATE authors SET
      first_name = ?, last_name = ?, email = ?, phone = ?,
      profile_photo = ?, province_id = ?, district_id = ?, branch_id = ?,
      institution_id = ?, title = ?, experience_years = ?, status = ?,
      biography = ?, iban = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.first_name,
    data.last_name,
    data.email,
    data.phone,
    data.profile_photo,
    data.province_id,
    data.district_id,
    data.branch_id,
    data.institution_id,
    data.title,
    data.experience_years,
    data.status,
    data.biography,
    data.iban,
    id
  );

  db.prepare(`
    INSERT INTO activity_logs (user_name, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run('Sistem Kullanıcısı', 'Yazar Güncellendi', 'author', id, `${data.first_name} ${data.last_name} bilgileri güncellendi.`);

  return getAuthorById(id);
}

export function deleteAuthor(id: number) {
  const author = db.prepare('SELECT first_name, last_name FROM authors WHERE id = ?').get(id) as any;
  db.prepare('DELETE FROM authors WHERE id = ?').run(id);
  if (author) {
    db.prepare(`
      INSERT INTO activity_logs (user_name, action, entity_type, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run('Sistem Kullanıcısı', 'Yazar Silindi', 'author', id, `${author.first_name} ${author.last_name} sistemden kaldırıldı.`);
  }
  return { success: true };
}

export function getProjects(filters: { search?: string; status?: string; branch_id?: number }) {
  let sql = `
    SELECT 
      p.*,
      b.name as branch_name,
      u.full_name as coordinator_name,
      (SELECT COUNT(*) FROM project_authors pa WHERE pa.project_id = p.id) as authors_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as tasks_count
    FROM projects p
    LEFT JOIN branches b ON p.branch_id = b.id
    LEFT JOIN users u ON p.coordinator_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.search) {
    sql += ` AND (p.title LIKE ? OR p.code LIKE ? OR p.project_type LIKE ?)`;
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }
  if (filters.status && filters.status !== 'Tümü') {
    sql += ` AND p.status = ?`;
    params.push(filters.status);
  }
  if (filters.branch_id) {
    sql += ` AND p.branch_id = ?`;
    params.push(filters.branch_id);
  }

  sql += ` ORDER BY p.created_at DESC`;
  const projects = db.prepare(sql).all(...params) as any[];

  // Attach sample authors for each project
  for (const prj of projects) {
    prj.authors = db.prepare(`
      SELECT a.id, (a.first_name || ' ' || a.last_name) as name, b.name as branch, a.profile_photo as photo
      FROM project_authors pa
      JOIN authors a ON pa.author_id = a.id
      JOIN branches b ON a.branch_id = b.id
      WHERE pa.project_id = ?
      LIMIT 4
    `).all(prj.id);
  }

  return projects;
}

export function createProject(data: any) {
  const insert = db.prepare(`
    INSERT INTO projects (
      title, code, project_type, coordinator_id, progress,
      deadline, status, priority, target_grade, branch_id, description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const code = data.code || `PRJ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const res = insert.run(
    data.title,
    code,
    data.project_type || 'Soru Bankası',
    data.coordinator_id || 1,
    data.progress || 0,
    data.deadline,
    data.status || 'Devam Ediyor',
    data.priority || 'Normal',
    data.target_grade || '8. Sınıf',
    data.branch_id,
    data.description || ''
  );

  const projectId = res.lastInsertRowid as number;

  // Add default book record
  db.prepare(`
    INSERT INTO books (project_id, title, page_count, status)
    VALUES (?, ?, ?, ?)
  `).run(projectId, data.title, 240, 'Hazırlık');

  // Assign author if provided
  if (data.author_ids && Array.isArray(data.author_ids)) {
    const assignStmt = db.prepare('INSERT OR IGNORE INTO project_authors (project_id, author_id) VALUES (?, ?)');
    for (const authId of data.author_ids) {
      assignStmt.run(projectId, authId);
    }
  }

  db.prepare(`
    INSERT INTO activity_logs (user_name, action, entity_type, entity_id, details)
    VALUES (?, ?, ?, ?, ?)
  `).run('Sistem Kullanıcısı', 'Proje Başlatıldı', 'project', projectId, `${data.title} projesi oluşturuldu.`);

  return getProjects({ search: code })[0];
}

export function updateProject(id: number, data: any) {
  db.prepare(`
    UPDATE projects SET
      title = ?, project_type = ?, coordinator_id = ?, progress = ?,
      deadline = ?, status = ?, priority = ?, target_grade = ?,
      branch_id = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    data.title,
    data.project_type,
    data.coordinator_id,
    data.progress,
    data.deadline,
    data.status,
    data.priority,
    data.target_grade,
    data.branch_id,
    data.description,
    id
  );
  return getProjects({ search: '' }).find(p => p.id === id);
}

export function deleteProject(id: number) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return { success: true };
}

export function getTasks(filters: { status?: string; priority?: string; project_id?: number }) {
  let sql = `
    SELECT 
      t.*,
      p.title as project_title,
      (a.first_name || ' ' || a.last_name) as assigned_author_name,
      a.profile_photo as assigned_author_photo,
      u.full_name as assigned_coordinator_name
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN authors a ON t.assigned_author_id = a.id
    LEFT JOIN users u ON t.assigned_coordinator_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.status && filters.status !== 'Tümü') {
    sql += ` AND t.status = ?`;
    params.push(filters.status);
  }
  if (filters.priority && filters.priority !== 'Tümü') {
    sql += ` AND t.priority = ?`;
    params.push(filters.priority);
  }
  if (filters.project_id) {
    sql += ` AND t.project_id = ?`;
    params.push(filters.project_id);
  }

  sql += ` ORDER BY t.due_date ASC`;
  return db.prepare(sql).all(...params);
}

export function createTask(data: any) {
  const insert = db.prepare(`
    INSERT INTO tasks (
      title, description, assigned_author_id, assigned_coordinator_id,
      project_id, priority, status, start_date, due_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const res = insert.run(
    data.title,
    data.description || '',
    data.assigned_author_id || null,
    data.assigned_coordinator_id || 1,
    data.project_id,
    data.priority || 'Normal',
    data.status || 'Bekliyor',
    data.start_date || new Date().toISOString().split('T')[0],
    data.due_date
  );

  return res.lastInsertRowid;
}

export function updateTaskStatus(id: number, status: string) {
  db.prepare(`
    UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, id);
  return { success: true };
}

export function deleteTask(id: number) {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return { success: true };
}

export function getPayments(filters: { status?: string; author_id?: number }) {
  let sql = `
    SELECT 
      py.*,
      (a.first_name || ' ' || a.last_name) as author_name,
      a.iban as author_iban,
      p.title as project_title
    FROM payments py
    LEFT JOIN authors a ON py.author_id = a.id
    LEFT JOIN projects p ON py.project_id = p.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (filters.status && filters.status !== 'Tümü') {
    sql += ` AND py.status = ?`;
    params.push(filters.status);
  }
  if (filters.author_id) {
    sql += ` AND py.author_id = ?`;
    params.push(filters.author_id);
  }
  sql += ` ORDER BY py.created_at DESC`;
  return db.prepare(sql).all(...params);
}

export function createPayment(data: any) {
  const insert = db.prepare(`
    INSERT INTO payments (author_id, project_id, contract_no, amount, status, payment_date, invoice_no, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const contract = data.contract_no || `SZL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
  const res = insert.run(
    data.author_id,
    data.project_id,
    contract,
    data.amount,
    data.status || 'Bekliyor',
    data.payment_date || null,
    data.invoice_no || null,
    data.notes || ''
  );
  return res.lastInsertRowid;
}

export function updatePaymentStatus(id: number, status: string) {
  db.prepare(`UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status, id);
  return { success: true };
}

export function getReportsData() {
  const provinceStats = db.prepare(`
    SELECT p.name as province, COUNT(a.id) as author_count
    FROM provinces p
    JOIN authors a ON p.id = a.province_id
    GROUP BY p.name
    ORDER BY author_count DESC
    LIMIT 15
  `).all();

  const branchStats = db.prepare(`
    SELECT b.name as branch, COUNT(a.id) as count, b.color
    FROM branches b
    JOIN authors a ON b.id = a.branch_id
    GROUP BY b.name, b.color
    ORDER BY count DESC
  `).all();

  const projectStats = db.prepare(`
    SELECT status, COUNT(*) as count FROM projects GROUP BY status
  `).all();

  const financialSummary = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'Ödendi' THEN amount ELSE 0 END) as paid_total,
      SUM(CASE WHEN status = 'Bekliyor' THEN amount ELSE 0 END) as pending_total,
      SUM(CASE WHEN status = 'Onaylandı' THEN amount ELSE 0 END) as approved_total,
      COUNT(*) as total_contracts
    FROM payments
  `).get();

  return {
    provinceStats,
    branchStats,
    projectStats,
    financialSummary
  };
}

export function getAnnouncements() {
  return db.prepare('SELECT * FROM announcements WHERE is_archived = 0 ORDER BY published_at DESC').all();
}

export function createAnnouncement(data: any) {
  const insert = db.prepare(`
    INSERT INTO announcements (title, content, priority, audience, created_by)
    VALUES (?, ?, ?, ?, ?)
  `);
  const res = insert.run(data.title, data.content, data.priority || 'Normal', data.audience || 'Tümü', data.created_by || 'Yayın Kurulu');
  return res.lastInsertRowid;
}

export function getMessages(userId: number) {
  return db.prepare(`
    SELECT 
      m.*,
      u1.full_name as sender_name,
      u2.full_name as receiver_name
    FROM messages m
    JOIN users u1 ON m.sender_id = u1.id
    JOIN users u2 ON m.receiver_id = u2.id
    WHERE m.receiver_id = ? OR m.sender_id = ?
    ORDER BY m.created_at DESC
  `).all(userId, userId);
}

export function createMessage(data: any) {
  const res = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, subject, body)
    VALUES (?, ?, ?, ?)
  `).run(data.sender_id, data.receiver_id, data.subject, data.body);
  return res.lastInsertRowid;
}

export function getFilesList() {
  return db.prepare(`
    SELECT f.*, p.title as project_title, (a.first_name || ' ' || a.last_name) as author_name
    FROM files f
    LEFT JOIN projects p ON f.project_id = p.id
    LEFT JOIN authors a ON f.author_id = a.id
    ORDER BY f.upload_date DESC
  `).all();
}

export function createFileRecord(data: any) {
  const res = db.prepare(`
    INSERT INTO files (filename, file_size, file_type, file_url, uploader_name, project_id, author_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.filename,
    data.file_size || 1024000,
    data.file_type || 'application/pdf',
    data.file_url || `/uploads/${data.filename}`,
    data.uploader_name || 'Kullanıcı',
    data.project_id || null,
    data.author_id || null,
    data.category || 'Belge'
  );
  return res.lastInsertRowid;
}

export function getNotifications(userId: number) {
  return db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId);
}

export function markNotificationsAsRead(userId: number) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  return { success: true };
}

export function searchGlobal(query: string) {
  if (!query || query.trim().length === 0) return { authors: [], projects: [], tasks: [], messages: [] };
  const q = `%${query.trim()}%`;

  const authors = db.prepare(`
    SELECT a.id, (a.first_name || ' ' || a.last_name) as title, b.name as subtitle, p.name as extra, 'author' as type
    FROM authors a
    JOIN branches b ON a.branch_id = b.id
    JOIN provinces p ON a.province_id = p.id
    WHERE a.first_name LIKE ? OR a.last_name LIKE ? OR a.email LIKE ?
    LIMIT 5
  `).all(q, q, q);

  const projects = db.prepare(`
    SELECT id, title, project_type as subtitle, code as extra, 'project' as type
    FROM projects
    WHERE title LIKE ? OR code LIKE ?
    LIMIT 5
  `).all(q, q);

  const tasks = db.prepare(`
    SELECT id, title, priority as subtitle, status as extra, 'task' as type
    FROM tasks
    WHERE title LIKE ? OR description LIKE ?
    LIMIT 5
  `).all(q, q);

  return { authors, projects, tasks };
}

export function getMetaOptions() {
  const provinces = db.prepare('SELECT id, name, code, region FROM provinces ORDER BY name ASC').all();
  const branches = db.prepare('SELECT id, name, category, color FROM branches ORDER BY name ASC').all();
  const institutions = db.prepare('SELECT id, name, province_id, type FROM institutions ORDER BY name ASC').all();
  const users = db.prepare('SELECT id, full_name, email, role_code, avatar_url FROM users ORDER BY full_name ASC').all();
  const projects = db.prepare('SELECT id, title, code, status FROM projects ORDER BY title ASC').all();
  const authors = db.prepare(`SELECT id, (first_name || ' ' || last_name) as name, branch_id FROM authors ORDER BY first_name ASC`).all();

  return { provinces, branches, institutions, users, projects, authors };
}
