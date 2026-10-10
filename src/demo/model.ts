export type Role = 'GENEL_KOORDINATOR' | 'BOLGE_KOORDINATORU' | 'IL_KOORDINATORU' | 'EDITOR' | 'YAZAR' | 'MUHASEBE';
export type Section = 'overview' | 'grades' | 'questions' | 'projects' | 'tasks' | 'messages' | 'announcements' | 'authors' | 'payments' | 'members' | 'roles' | 'audit';
export type QuestionStatus = 'Taslak' | 'İncelemede' | 'Revizyon' | 'Onaylandı' | 'Reddedildi';
export type PaymentStatus = 'Bekliyor' | 'Onaylandı' | 'Ödendi';

export interface Question {
  id: number;
  title: string;
  subject: string;
  grade: string;
  level: string;
  projectId: number;
  authorId: number;
  status: QuestionStatus;
  updatedAt: string;
  note?: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  imageName?: string;
  editorEdited?: boolean;
  editorName?: string;
  editorEditedAt?: string;
  originalTitle?: string;
}

export interface Project {
  id: number;
  name: string;
  subject: string;
  grade: string;
  level: string;
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
  levels: string[];
  status: 'Aktif' | 'Davet edildi';
  roleType?: 'Yazar' | 'İl Koordinatörü';
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
  BOLGE_KOORDINATORU: 'Bölge Koordinatörü',
    IL_KOORDINATORU: 'İl Koordinatörü',
  EDITOR: 'Editör',
  YAZAR: 'Yazar',
  MUHASEBE: 'Muhasebe',
};

export const rolePeople: Record<Role, string> = {
  GENEL_KOORDINATOR: 'Deniz Aydın',
  BOLGE_KOORDINATORU: 'Bölge Koordinatörü',
    IL_KOORDINATORU: 'İl Koordinatörü',
  EDITOR: 'Selin Arslan',
  YAZAR: 'Ayşe Yılmaz',
  MUHASEBE: 'Mert Kaya',
};

export const sectionLabels: Record<Section, string> = {
  overview: 'Genel Bakış',
  questions: 'Soru Havuzu',
  grades: 'Eğitim Kademeleri',
  projects: 'Projeler',
  tasks: 'Görev Takibi',
  messages: 'Mesajlar',
  announcements: 'Duyurular',
  authors: 'Türkiye Yazar Ağı',
  payments: 'Hakedişler',
  members: 'Üye Yönetimi',
  roles: 'Rol ve Yetkiler',
  audit: 'İşlem Geçmişi',
};

export const permissions: Record<Role, Section[]> = {
  GENEL_KOORDINATOR: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'announcements', 'authors', 'payments', 'members', 'roles', 'audit'],
  BOLGE_KOORDINATORU: ['overview', 'questions', 'projects', 'tasks', 'messages', 'announcements', 'authors', 'grades', 'members'],
    IL_KOORDINATORU: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'announcements', 'authors', 'members'],
  EDITOR: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'announcements'],
  YAZAR: ['overview', 'grades', 'questions', 'projects', 'tasks', 'messages', 'announcements'],
  MUHASEBE: ['overview', 'payments', 'projects', 'messages', 'announcements'],
};

export const dataScopes: Record<Role, string> = {
  GENEL_KOORDINATOR: 'Tüm örnek kayıtlar',
  BOLGE_KOORDINATORU: 'Bölge Koordinatörü',
    IL_KOORDINATORU: 'İl Koordinatörü',
  EDITOR: 'Tüm sorular ve proje özetleri',
  YAZAR: 'Kendi soruları ve atanmış proje',
  MUHASEBE: 'Hakediş kayıtları ve proje bağlamı',
};

export const actionPermissions: { label: string; roles: Role[] }[] = [
  { label: 'Soru taslağı oluştur', roles: ['YAZAR'] },
  { label: 'Kendi sorusunu incelemeye gönder', roles: ['YAZAR'] },
  { label: 'Soruyu onayla / revizyona gönder', roles: ['EDITOR', 'GENEL_KOORDINATOR'] },
  { label: 'Görev oluştur / ata', roles: ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'] },
  { label: 'Kendi görev durumunu ilerlet', roles: ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU', 'EDITOR', 'YAZAR'] },
  { label: 'Yetki kapsamına mesaj gönder', roles: ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU', 'EDITOR', 'YAZAR', 'MUHASEBE'] },
  { label: 'Duyuru yayınla / yönet', roles: ['GENEL_KOORDINATOR', 'BOLGE_KOORDINATORU', 'IL_KOORDINATORU'] },
  { label: 'Hakedişi onayla / ödendi işaretle', roles: ['MUHASEBE', 'GENEL_KOORDINATOR'] },
  { label: 'İşlem geçmişini görüntüle', roles: ['GENEL_KOORDINATOR'] },
];

export const seedData: DemoData = {
  authors: [
    { id: 1, name: 'Ayşe Yılmaz', initials: 'AY', subject: 'Matematik', province: 'İstanbul', activeProjects: 2, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 2, name: 'Mehmet Çelik', initials: 'MÇ', subject: 'Fen Bilimleri', province: 'Ankara', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 3, name: 'Zeynep Kara', initials: 'ZK', subject: 'Türkçe', province: 'İzmir', activeProjects: 2, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 4, name: 'Emre Şahin', initials: 'EŞ', subject: 'Matematik', province: 'Bursa', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 5, name: 'Elif Özkan', initials: 'EÖ', subject: 'Sosyal Bilgiler', province: 'İstanbul', activeProjects: 0, status: 'Davet edildi', levels: ['Lise'], roleType: 'Yazar' },
    { id: 6, name: 'Deniz Aksoy', initials: 'DA', subject: 'Türkçe', province: 'İstanbul', activeProjects: 1, status: 'Aktif', levels: ['İlkokul', 'Ortaokul'], roleType: 'İl Koordinatörü' },
    { id: 7, name: 'Can Erdem', initials: 'CE', subject: 'İngilizce', province: 'İstanbul', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 8, name: 'Derya Acar', initials: 'DA', subject: 'Fen Bilimleri', province: 'Ankara', activeProjects: 2, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 9, name: 'Berk Yıldız', initials: 'BY', subject: 'Matematik', province: 'Ankara', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 10, name: 'Seda Çetin', initials: 'SÇ', subject: 'Türkçe', province: 'İzmir', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 11, name: 'Kerem Ekin', initials: 'KE', subject: 'Sosyal Bilgiler', province: 'İzmir', activeProjects: 0, status: 'Davet edildi', levels: ['Lise', 'Mezun'] },
    { id: 12, name: 'İrem Güneş', initials: 'İG', subject: 'Fen Bilimleri', province: 'Bursa', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 13, name: 'Umut Arslan', initials: 'UA', subject: 'Matematik', province: 'Bursa', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 14, name: 'Ece Polat', initials: 'EP', subject: 'İngilizce', province: 'Antalya', activeProjects: 1, status: 'Aktif', levels: ['İlkokul', 'Ortaokul'], roleType: 'İl Koordinatörü' },
    { id: 15, name: 'Onur Şimşek', initials: 'OŞ', subject: 'Türkçe', province: 'Antalya', activeProjects: 0, status: 'Davet edildi', levels: ['Lise'], roleType: 'Yazar' },
    { id: 16, name: 'Nehir Kılıç', initials: 'NK', subject: 'Matematik', province: 'Konya', activeProjects: 2, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 17, name: 'Arda Taş', initials: 'AT', subject: 'Tarih', province: 'Konya', activeProjects: 1, status: 'Aktif', levels: ['Lise', 'Mezun'] },
    { id: 18, name: 'Pelin Kaya', initials: 'PK', subject: 'Fen Bilimleri', province: 'Samsun', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 19, name: 'Burak Yalçın', initials: 'BY', subject: 'Türkçe', province: 'Trabzon', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 20, name: 'Aylin Tekin', initials: 'AT', subject: 'Sosyal Bilgiler', province: 'Gaziantep', activeProjects: 1, status: 'Aktif', levels: ['İlkokul', 'Ortaokul'], roleType: 'İl Koordinatörü' },
    { id: 21, name: 'Mert Balcı', initials: 'MB', subject: 'Matematik', province: 'Gaziantep', activeProjects: 0, status: 'Davet edildi', levels: ['Lise'], roleType: 'Yazar' },
    { id: 22, name: 'Ezgi Koç', initials: 'EK', subject: 'Fen Bilimleri', province: 'Adana', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 23, name: 'Ozan Işık', initials: 'OI', subject: 'Türkçe', province: 'Mersin', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 24, name: 'Selin Durmuş', initials: 'SD', subject: 'Matematik', province: 'Kocaeli', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 25, name: 'Alp Can', initials: 'AC', subject: 'Fen Bilimleri', province: 'Eskişehir', activeProjects: 0, status: 'Davet edildi', levels: ['Lise'], roleType: 'Yazar' },
    { id: 26, name: 'Defne Şen', initials: 'DŞ', subject: 'İngilizce', province: 'Erzurum', activeProjects: 1, status: 'Aktif', levels: ['Lise'], roleType: 'Yazar' },
    { id: 27, name: 'Eren Öztürk', initials: 'EÖ', subject: 'Matematik', province: 'Kayseri', activeProjects: 1, status: 'Aktif', levels: ['Lise', 'Mezun'] },
    { id: 28, name: 'Nazlı Eren', initials: 'NE', subject: 'Türkçe', province: 'Diyarbakır', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
    { id: 29, name: 'Kaan Demir', initials: 'KD', subject: 'Fen Bilimleri', province: 'Malatya', activeProjects: 0, status: 'Davet edildi', levels: ['Lise'], roleType: 'Yazar' },
    { id: 30, name: 'Aslı Bilgin', initials: 'AB', subject: 'Sosyal Bilgiler', province: 'Denizli', activeProjects: 1, status: 'Aktif', levels: ['Ortaokul'], roleType: 'Yazar' },
  ],
  projects: [
    { id: 1, name: '8. Sınıf Matematik Soru Bankası', subject: 'Matematik', grade: '8. Sınıf', level: 'Ortaokul', deadline: '2026-11-15', progress: 72, status: 'Üretimde', province: 'İstanbul' },
    { id: 2, name: '7. Sınıf Fen Denemeleri', subject: 'Fen Bilimleri', grade: '7. Sınıf', level: 'Ortaokul', deadline: '2026-11-28', progress: 48, status: 'Editörde', province: 'Ankara' },
    { id: 3, name: 'LGS Türkçe Yeni Nesil', subject: 'Türkçe', grade: '8. Sınıf', level: 'Ortaokul', deadline: '2026-12-12', progress: 34, status: 'Üretimde', province: 'İzmir' },
    { id: 4, name: '6. Sınıf Sosyal Bilgiler', subject: 'Sosyal Bilgiler', grade: '6. Sınıf', level: 'Ortaokul', deadline: '2027-01-20', progress: 15, status: 'Planlama', province: 'İstanbul' },
    { id: 5, name: '4. Sınıf Türkçe Etkinlikleri', subject: 'Türkçe', grade: '4. Sınıf', level: 'İlkokul', deadline: '2027-02-10', progress: 28, status: 'Üretimde', province: 'İstanbul' },
    { id: 6, name: '11. Sınıf Fizik Soru Bankası', subject: 'Fizik', grade: '11. Sınıf', level: 'Lise', deadline: '2027-02-28', progress: 20, status: 'Planlama', province: 'Ankara' },
    { id: 7, name: 'TYT Matematik Kampı', subject: 'Matematik', grade: 'Mezun', level: 'Mezun', deadline: '2027-03-15', progress: 42, status: 'Üretimde', province: 'İzmir' },
  ],
  questions: [
    { id: 101, title: 'Doğrusal denklemlerle ilgili günlük yaşam problemi', subject: 'Matematik', grade: '8. Sınıf', level: 'Ortaokul', projectId: 1, authorId: 1, status: 'İncelemede', updatedAt: '2026-10-04' },
    { id: 102, title: 'Hücre bölünmesi aşamalarını yorumlama', subject: 'Fen Bilimleri', grade: '7. Sınıf', level: 'Ortaokul', projectId: 2, authorId: 2, status: 'Revizyon', updatedAt: '2026-10-03', note: 'Şekil açıklamasını netleştirelim.' },
    { id: 103, title: 'Paragrafta ana düşünceyi belirleme', subject: 'Türkçe', grade: '8. Sınıf', level: 'Ortaokul', projectId: 3, authorId: 3, status: 'Onaylandı', updatedAt: '2026-10-02' },
    { id: 104, title: 'Kareköklü ifadelerde işlem önceliği', subject: 'Matematik', grade: '8. Sınıf', level: 'Ortaokul', projectId: 1, authorId: 1, status: 'Taslak', updatedAt: '2026-10-01' },
    { id: 105, title: 'Türkiye’nin iklim bölgelerini karşılaştırma', subject: 'Sosyal Bilgiler', grade: '6. Sınıf', level: 'Ortaokul', projectId: 4, authorId: 5, status: 'İncelemede', updatedAt: '2026-09-29' },
    { id: 106, title: 'Üslü sayılarla model kurma', subject: 'Matematik', grade: '8. Sınıf', level: 'Ortaokul', projectId: 1, authorId: 4, status: 'Reddedildi', updatedAt: '2026-09-27', note: 'Kazanım düzeyini yeniden değerlendirelim.' },
    { id: 107, title: 'Metindeki olayların oluş sırasını belirleme', subject: 'Türkçe', grade: '4. Sınıf', level: 'İlkokul', projectId: 5, authorId: 6, status: 'Taslak', updatedAt: '2026-10-04' },
    { id: 108, title: 'Elektrik alan şiddetini yorumlama', subject: 'Fizik', grade: '11. Sınıf', level: 'Lise', projectId: 6, authorId: 26, status: 'İncelemede', updatedAt: '2026-10-03' },
    { id: 109, title: 'Fonksiyon grafikleriyle problem çözme', subject: 'Matematik', grade: 'Mezun', level: 'Mezun', projectId: 7, authorId: 27, status: 'Onaylandı', updatedAt: '2026-10-02' },
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
        const mergeWithSeed = <T extends { id: number }>(savedItems: T[], seedItems: T[], normalize: (saved: T, seed: T) => T = saved => saved) => [
          ...savedItems.map(savedItem => {
            const seedItem = seedItems.find(item => item.id === savedItem.id);
            return seedItem ? normalize(savedItem, seedItem) : savedItem;
          }),
          ...seedItems.filter(seedItem => !savedItems.some(savedItem => savedItem.id === seedItem.id)),
        ];
        return {
          ...parsed,
          authors: mergeWithSeed(parsed.authors, seedData.authors, (saved, seed) => ({ ...seed, ...saved, levels: saved.levels?.length ? saved.levels : seed.levels })),
          projects: mergeWithSeed(parsed.projects, seedData.projects, (saved, seed) => ({ ...seed, ...saved, level: saved.level || seed.level })),
          questions: mergeWithSeed(parsed.questions, seedData.questions, (saved, seed) => ({ ...seed, ...saved, level: saved.level || seed.level })),
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
