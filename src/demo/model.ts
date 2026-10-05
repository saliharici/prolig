export type Role = 'GENEL_KOORDINATOR' | 'IL_KOORDINATORU' | 'EDITOR' | 'YAZAR' | 'MUHASEBE';
export type Section = 'overview' | 'questions' | 'projects' | 'authors' | 'payments' | 'roles' | 'audit';
export type QuestionStatus = 'Taslak' | 'İncelemede' | 'Revizyon' | 'Onaylandı' | 'Reddedildi';
export type PaymentStatus = 'Bekliyor' | 'Onaylandı' | 'Ödendi';

export interface Question {
  id: number;
  title: string;
  subject: string;
  grade: string;
  projectId: number;
  authorId: number;
  status: QuestionStatus;
  updatedAt: string;
  note?: string;
}

export interface Project {
  id: number;
  name: string;
  subject: string;
  grade: string;
  deadline: string;
  progress: number;
  status: 'Planlama' | 'Üretimde' | 'Editörde' | 'Tamamlandı';
  province: string;
}

export interface Author {
  id: number;
  name: string;
  initials: string;
  subject: string;
  province: string;
  activeProjects: number;
  status: 'Aktif' | 'Davet edildi';
}

export interface Payment {
  id: number;
  authorId: number;
  projectId: number;
  amount: number;
  status: PaymentStatus;
  date: string;
}

export interface Activity {
  id: number;
  text: string;
  actor: string;
  at: string;
  type: 'question' | 'project' | 'payment';
  projectId?: number;
  authorId?: number;
}

export interface DemoData {
  questions: Question[];
  projects: Project[];
  authors: Author[];
  payments: Payment[];
  activities: Activity[];
}

export const roleLabels: Record<Role, string> = {
  GENEL_KOORDINATOR: 'Genel Koordinatör',
  IL_KOORDINATORU: 'İl Koordinatörü',
  EDITOR: 'Editör',
  YAZAR: 'Yazar',
  MUHASEBE: 'Muhasebe',
};

export const rolePeople: Record<Role, string> = {
  GENEL_KOORDINATOR: 'Deniz Aydın',
  IL_KOORDINATORU: 'Ece Demir',
  EDITOR: 'Selin Arslan',
  YAZAR: 'Ayşe Yılmaz',
  MUHASEBE: 'Mert Kaya',
};

export const sectionLabels: Record<Section, string> = {
  overview: 'Genel Bakış',
  questions: 'Soru Havuzu',
  projects: 'Projeler',
  authors: 'Türkiye Yazar Ağı',
  payments: 'Hakedişler',
  roles: 'Rol ve Yetkiler',
  audit: 'İşlem Geçmişi',
};

export const permissions: Record<Role, Section[]> = {
  GENEL_KOORDINATOR: ['overview', 'questions', 'projects', 'authors', 'payments', 'roles', 'audit'],
  IL_KOORDINATORU: ['overview', 'questions', 'projects', 'authors', 'roles'],
  EDITOR: ['overview', 'questions', 'projects', 'roles'],
  YAZAR: ['overview', 'questions', 'projects', 'roles'],
  MUHASEBE: ['overview', 'payments', 'projects', 'roles'],
};

export const dataScopes: Record<Role, string> = {
  GENEL_KOORDINATOR: 'Tüm örnek kayıtlar',
  IL_KOORDINATORU: 'İstanbul ilindeki projeler, sorular ve yazarlar',
  EDITOR: 'Tüm sorular ve proje özetleri',
  YAZAR: 'Kendi soruları ve atanmış proje',
  MUHASEBE: 'Hakediş kayıtları ve proje bağlamı',
};

export const actionPermissions: { label: string; roles: Role[] }[] = [
  { label: 'Soru taslağı oluştur', roles: ['YAZAR'] },
  { label: 'Kendi sorusunu incelemeye gönder', roles: ['YAZAR'] },
  { label: 'Soruyu onayla / revizyona gönder', roles: ['EDITOR', 'GENEL_KOORDINATOR'] },
  { label: 'Hakedişi onayla / ödendi işaretle', roles: ['MUHASEBE', 'GENEL_KOORDINATOR'] },
  { label: 'İşlem geçmişini görüntüle', roles: ['GENEL_KOORDINATOR'] },
];

export const seedData: DemoData = {
  authors: [
    { id: 1, name: 'Ayşe Yılmaz', initials: 'AY', subject: 'Matematik', province: 'İstanbul', activeProjects: 2, status: 'Aktif' },
    { id: 2, name: 'Mehmet Çelik', initials: 'MÇ', subject: 'Fen Bilimleri', province: 'Ankara', activeProjects: 1, status: 'Aktif' },
    { id: 3, name: 'Zeynep Kara', initials: 'ZK', subject: 'Türkçe', province: 'İzmir', activeProjects: 2, status: 'Aktif' },
    { id: 4, name: 'Emre Şahin', initials: 'EŞ', subject: 'Matematik', province: 'Bursa', activeProjects: 1, status: 'Aktif' },
    { id: 5, name: 'Elif Özkan', initials: 'EÖ', subject: 'Sosyal Bilgiler', province: 'İstanbul', activeProjects: 0, status: 'Davet edildi' },
    { id: 6, name: 'Deniz Aksoy', initials: 'DA', subject: 'Türkçe', province: 'İstanbul', activeProjects: 1, status: 'Aktif' },
    { id: 7, name: 'Can Erdem', initials: 'CE', subject: 'İngilizce', province: 'İstanbul', activeProjects: 1, status: 'Aktif' },
    { id: 8, name: 'Derya Acar', initials: 'DA', subject: 'Fen Bilimleri', province: 'Ankara', activeProjects: 2, status: 'Aktif' },
    { id: 9, name: 'Berk Yıldız', initials: 'BY', subject: 'Matematik', province: 'Ankara', activeProjects: 1, status: 'Aktif' },
    { id: 10, name: 'Seda Çetin', initials: 'SÇ', subject: 'Türkçe', province: 'İzmir', activeProjects: 1, status: 'Aktif' },
    { id: 11, name: 'Kerem Ekin', initials: 'KE', subject: 'Sosyal Bilgiler', province: 'İzmir', activeProjects: 0, status: 'Davet edildi' },
    { id: 12, name: 'İrem Güneş', initials: 'İG', subject: 'Fen Bilimleri', province: 'Bursa', activeProjects: 1, status: 'Aktif' },
    { id: 13, name: 'Umut Arslan', initials: 'UA', subject: 'Matematik', province: 'Bursa', activeProjects: 1, status: 'Aktif' },
    { id: 14, name: 'Ece Polat', initials: 'EP', subject: 'İngilizce', province: 'Antalya', activeProjects: 1, status: 'Aktif' },
    { id: 15, name: 'Onur Şimşek', initials: 'OŞ', subject: 'Türkçe', province: 'Antalya', activeProjects: 0, status: 'Davet edildi' },
    { id: 16, name: 'Nehir Kılıç', initials: 'NK', subject: 'Matematik', province: 'Konya', activeProjects: 2, status: 'Aktif' },
    { id: 17, name: 'Arda Taş', initials: 'AT', subject: 'Tarih', province: 'Konya', activeProjects: 1, status: 'Aktif' },
    { id: 18, name: 'Pelin Kaya', initials: 'PK', subject: 'Fen Bilimleri', province: 'Samsun', activeProjects: 1, status: 'Aktif' },
    { id: 19, name: 'Burak Yalçın', initials: 'BY', subject: 'Türkçe', province: 'Trabzon', activeProjects: 1, status: 'Aktif' },
    { id: 20, name: 'Aylin Tekin', initials: 'AT', subject: 'Sosyal Bilgiler', province: 'Gaziantep', activeProjects: 1, status: 'Aktif' },
    { id: 21, name: 'Mert Balcı', initials: 'MB', subject: 'Matematik', province: 'Gaziantep', activeProjects: 0, status: 'Davet edildi' },
    { id: 22, name: 'Ezgi Koç', initials: 'EK', subject: 'Fen Bilimleri', province: 'Adana', activeProjects: 1, status: 'Aktif' },
    { id: 23, name: 'Ozan Işık', initials: 'OI', subject: 'Türkçe', province: 'Mersin', activeProjects: 1, status: 'Aktif' },
    { id: 24, name: 'Selin Durmuş', initials: 'SD', subject: 'Matematik', province: 'Kocaeli', activeProjects: 1, status: 'Aktif' },
    { id: 25, name: 'Alp Can', initials: 'AC', subject: 'Fen Bilimleri', province: 'Eskişehir', activeProjects: 0, status: 'Davet edildi' },
    { id: 26, name: 'Defne Şen', initials: 'DŞ', subject: 'İngilizce', province: 'Erzurum', activeProjects: 1, status: 'Aktif' },
    { id: 27, name: 'Eren Öztürk', initials: 'EÖ', subject: 'Matematik', province: 'Kayseri', activeProjects: 1, status: 'Aktif' },
    { id: 28, name: 'Nazlı Eren', initials: 'NE', subject: 'Türkçe', province: 'Diyarbakır', activeProjects: 1, status: 'Aktif' },
    { id: 29, name: 'Kaan Demir', initials: 'KD', subject: 'Fen Bilimleri', province: 'Malatya', activeProjects: 0, status: 'Davet edildi' },
    { id: 30, name: 'Aslı Bilgin', initials: 'AB', subject: 'Sosyal Bilgiler', province: 'Denizli', activeProjects: 1, status: 'Aktif' },
  ],
  projects: [
    { id: 1, name: '8. Sınıf Matematik Soru Bankası', subject: 'Matematik', grade: '8. Sınıf', deadline: '2026-11-15', progress: 72, status: 'Üretimde', province: 'İstanbul' },
    { id: 2, name: '7. Sınıf Fen Denemeleri', subject: 'Fen Bilimleri', grade: '7. Sınıf', deadline: '2026-11-28', progress: 48, status: 'Editörde', province: 'Ankara' },
    { id: 3, name: 'LGS Türkçe Yeni Nesil', subject: 'Türkçe', grade: '8. Sınıf', deadline: '2026-12-12', progress: 34, status: 'Üretimde', province: 'İzmir' },
    { id: 4, name: '6. Sınıf Sosyal Bilgiler', subject: 'Sosyal Bilgiler', grade: '6. Sınıf', deadline: '2027-01-20', progress: 15, status: 'Planlama', province: 'İstanbul' },
  ],
  questions: [
    { id: 101, title: 'Doğrusal denklemlerle ilgili günlük yaşam problemi', subject: 'Matematik', grade: '8. Sınıf', projectId: 1, authorId: 1, status: 'İncelemede', updatedAt: '2026-10-04' },
    { id: 102, title: 'Hücre bölünmesi aşamalarını yorumlama', subject: 'Fen Bilimleri', grade: '7. Sınıf', projectId: 2, authorId: 2, status: 'Revizyon', updatedAt: '2026-10-03', note: 'Şekil açıklamasını netleştirelim.' },
    { id: 103, title: 'Paragrafta ana düşünceyi belirleme', subject: 'Türkçe', grade: '8. Sınıf', projectId: 3, authorId: 3, status: 'Onaylandı', updatedAt: '2026-10-02' },
    { id: 104, title: 'Kareköklü ifadelerde işlem önceliği', subject: 'Matematik', grade: '8. Sınıf', projectId: 1, authorId: 1, status: 'Taslak', updatedAt: '2026-10-01' },
    { id: 105, title: 'Türkiye’nin iklim bölgelerini karşılaştırma', subject: 'Sosyal Bilgiler', grade: '6. Sınıf', projectId: 4, authorId: 5, status: 'İncelemede', updatedAt: '2026-09-29' },
    { id: 106, title: 'Üslü sayılarla model kurma', subject: 'Matematik', grade: '8. Sınıf', projectId: 1, authorId: 4, status: 'Reddedildi', updatedAt: '2026-09-27', note: 'Kazanım düzeyini yeniden değerlendirelim.' },
  ],
  payments: [
    { id: 201, authorId: 1, projectId: 1, amount: 4200, status: 'Bekliyor', date: '2026-10-08' },
    { id: 202, authorId: 2, projectId: 2, amount: 3600, status: 'Onaylandı', date: '2026-10-10' },
    { id: 203, authorId: 3, projectId: 3, amount: 5100, status: 'Ödendi', date: '2026-09-30' },
    { id: 204, authorId: 4, projectId: 1, amount: 2800, status: 'Bekliyor', date: '2026-10-18' },
  ],
  activities: [
    { id: 1, text: 'Matematik sorusu editör incelemesine gönderildi', actor: 'Ayşe Yılmaz', at: '4 Ekim · 10:42', type: 'question', projectId: 1, authorId: 1 },
    { id: 2, text: 'Fen sorusu için revizyon istendi', actor: 'Selin Arslan', at: '3 Ekim · 16:18', type: 'question', projectId: 2, authorId: 2 },
    { id: 3, text: 'Türkçe sorusu yayına hazır olarak onaylandı', actor: 'Selin Arslan', at: '2 Ekim · 14:05', type: 'question', projectId: 3, authorId: 3 },
    { id: 4, text: 'Ekim ayı hakediş listesi hazırlandı', actor: 'Mert Kaya', at: '1 Ekim · 09:30', type: 'payment', projectId: 1 },
  ],
};

const storageKey = 'prolig-demo-v1';

export function loadDemoData(): DemoData {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoData;
      if (Array.isArray(parsed.questions) && Array.isArray(parsed.projects) && Array.isArray(parsed.authors) && Array.isArray(parsed.payments) && Array.isArray(parsed.activities)) {
        return {
          ...parsed,
          authors: [...parsed.authors, ...seedData.authors.filter(author => !parsed.authors.some(savedAuthor => savedAuthor.id === author.id))],
          activities: parsed.activities.map(item => {
            const original = seedData.activities.find(seed => seed.id === item.id && seed.type === item.type);
            const at = item.at === 'Bugün · 10:42' || item.at === 'Dün · 16:18' ? original?.at ?? item.at : item.at;
            return { ...item, at, projectId: item.projectId ?? original?.projectId, authorId: item.authorId ?? original?.authorId };
          }),
        };
      }
    }
  } catch { /* Invalid browser data falls back to the curated demo. */ }
  return structuredClone(seedData);
}

export function saveDemoData(data: DemoData) {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* Demo remains usable in memory. */ }
}

export function resetDemoData(): DemoData {
  const data = structuredClone(seedData);
  saveDemoData(data);
  return data;
}
