export const mockData = {
  authors: Array.from({ length: 154 }).map((_, i) => ({
    id: i + 1,
    name: i % 2 === 0 ? `Ahmet Yılmaz ${i}` : `Ayşe Kaya ${i}`,
    email: `yazar${i}@prolig.com`,
    branch: i % 3 === 0 ? "Matematik" : i % 3 === 1 ? "Fen Bilimleri" : "Türkçe",
    provinceId: i % 10 === 0 ? 6 : (i % 3 === 0 ? 34 : 35),
    province: i % 10 === 0 ? "Ankara" : (i % 3 === 0 ? "İstanbul" : "İzmir"),
    role: "YAZAR",
    status: i % 10 !== 0 ? "AKTIF" : "PASIF",
    avatarUrl: null
  })),
  projects: Array.from({ length: 5 }).map((_, i) => ({
    id: i + 1,
    name: `${i + 5}. Sınıf Tüm Dersler Soru Bankası`,
    targetGrade: `${i + 5}. Sınıf`,
    subject: "Karma",
    description: "Yeni nesil karma deneme projesi.",
    status: i < 3 ? "YAYINDA" : "TAMAMLANDI",
    progress: 75,
    dueDate: "2026-10-01",
    authorCount: 20
  })),
  provinces: Array.from({ length: 25 }).map((_, i) => ({
    id: i + 1, name: `İl ${i+1}`, code: String(i+1).padStart(2, '0'), authorCount: Math.floor(Math.random() * 10), activeProjects: 1
  })).concat([
    { id: 34, name: "İstanbul", code: "34", authorCount: 50, activeProjects: 2 }
  ]),
  tasks: Array.from({ length: 10 }).map((_, i) => ({
    id: i + 1,
    title: `${i}. Ünite Soruları Hazırlanacak`,
    description: "Taslak testler hazırlanmalı",
    status: i < 5 ? "YAPILACAK" : "YAPILIYOR",
    assigneeId: 1,
    projectId: 1,
    dueDate: "2026-11-01"
  }))
};
