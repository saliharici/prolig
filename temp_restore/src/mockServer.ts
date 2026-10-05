import { mockData } from './mockData';

const originalFetch = window.fetch;

export function setupMockServer() {
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    
    // Yazar listesi
    if (url.includes('/api/authors')) {
      const searchParams = new URLSearchParams(url.split('?')[1] || '');
      const provinceId = searchParams.get('province_id');
      
      let authors = mockData.authors;
      if (provinceId) {
        authors = authors.filter(a => a.provinceId === Number(provinceId));
      }
      return new Response(JSON.stringify(authors), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Projeler
    if (url.includes('/api/projects')) {
      return new Response(JSON.stringify(mockData.projects), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Harita / İller
    if (url.includes('/api/map')) {
      return new Response(JSON.stringify(mockData.provinces), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Dashboard
    if (url.includes('/api/dashboard')) {
      return new Response(JSON.stringify({
        provinceDistribution: [{ name: "İstanbul", value: 50 }, { name: "Ankara", value: 30 }],
        branchDistribution: [{ name: "Matematik", value: 40 }, { name: "Fen Bilimleri", value: 30 }],
        upcomingDeadlines: [
          { id: 1, projectName: "8. Sınıf Soru Bankası", deadline: "2026-10-15", status: "YAYINDA" }
        ],
        recentAuthors: mockData.authors.slice(0, 5)
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Görevler
    if (url.includes('/api/tasks')) {
      return new Response(JSON.stringify(mockData.tasks), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Bildirimler
    if (url.includes('/api/notifications')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Soru durumu
    if (url.includes('/api/questions/')) {
       return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // Fallback
    return originalFetch(...args);
  };
}
