import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, TabKey } from './components/Sidebar';
import { Header } from './components/Header';
import { KpiCard } from './components/KpiCard';
import { TurkeyMap } from './components/TurkeyMap';
import { HorizontalBarChart } from './components/HorizontalBarChart';
import { DonutChart } from './components/DonutChart';
import { UpcomingDeadlines } from './components/UpcomingDeadlines';
import { RecentAuthorsList } from './components/RecentAuthorsList';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Modals
import { AddAuthorModal } from './components/modals/AddAuthorModal';
import { AddProjectModal } from './components/modals/AddProjectModal';
import { AddTaskModal } from './components/modals/AddTaskModal';
import { AddPaymentModal } from './components/modals/AddPaymentModal';
import { AuthorDetailModal } from './components/modals/AuthorDetailModal';

// Dedicated Module Views
import { AuthorsView } from './components/views/AuthorsView';
import { ProjectsView } from './components/views/ProjectsView';
import { TasksView } from './components/views/TasksView';
import { PaymentsView } from './components/views/PaymentsView';
import { ReportsView } from './components/views/ReportsView';
import { MessagesView } from './components/views/MessagesView';
import { AnnouncementsView } from './components/views/AnnouncementsView';
import { FilesView } from './components/views/FilesView';
import { SettingsView } from './components/views/SettingsView';

import { UserRole, Author, Province } from './types';
import { Users, MapPin, BookOpen, CheckCircle, Award, CreditCard, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('GENEL_KOORDINATOR');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Modal states
  const [isAddAuthorOpen, setIsAddAuthorOpen] = useState(false);
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedAuthorForModal, setSelectedAuthorForModal] = useState<Author | null>(null);
  const [defaultProvinceForAuthor, setDefaultProvinceForAuthor] = useState<number | undefined>(undefined);

  // Data states
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [mapData, setMapData] = useState<Province[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Dashboard Stats & Map Data
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, mapRes, notifRes] = await Promise.all([
        fetch(`/api/dashboard?role=${currentRole}`),
        fetch('/api/map'),
        fetch('/api/notifications')
      ]);

      const dashData = await dashRes.json();
      const mapProvinces = await mapRes.json();
      const notifs = await notifRes.json();

      setDashboardStats(dashData);
      setMapData(mapProvinces || []);
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Global keyboard shortcut for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickAction = (action: 'author' | 'project' | 'task' | 'payment' | 'announcement') => {
    if (action === 'author') {
      setDefaultProvinceForAuthor(undefined);
      setIsAddAuthorOpen(true);
    } else if (action === 'project') {
      setIsAddProjectOpen(true);
    } else if (action === 'task') {
      setIsAddTaskOpen(true);
    } else if (action === 'payment') {
      setIsAddPaymentOpen(true);
    } else if (action === 'announcement') {
      setActiveTab('announcements');
    }
  };

  const handleOpenAddAuthorFromMap = (provinceId?: number) => {
    setDefaultProvinceForAuthor(provinceId);
    setIsAddAuthorOpen(true);
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 1 }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAuthorStatus = async (authorId: number, newStatus: string) => {
    try {
      await fetch(`/api/authors/${authorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (selectedAuthorForModal && selectedAuthorForModal.id === authorId) {
        setSelectedAuthorForModal({ ...selectedAuthorForModal, status: newStatus });
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAuthor = async (authorId: number) => {
    if (!window.confirm('Bu yazarı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/authors/${authorId}`, { method: 'DELETE' });
      setSelectedAuthorForModal(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100/60 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        counts={{
          tasksCount: dashboardStats?.upcomingDeadlines?.length || 5,
          unreadMessages: 3,
          unreadAnnouncements: 2,
        }}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onQuickAction={handleQuickAction}
          notifications={notifications}
          onMarkNotificationsRead={handleMarkNotificationsRead}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-7xl w-full mx-auto space-y-6">
          {/* Main Dashboard View */}
          {activeTab === 'dashboard' && (
            <>
              {/* Section 6: Top 5 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                <KpiCard
                  id="kpi-total-authors"
                  title="Toplam Yazar"
                  value={dashboardStats?.totalAuthors || 154}
                  subtitle="Tüm Branşlar Dahil"
                  trend={{ value: '+12 bu ay', isPositive: true }}
                  icon={Users}
                  variant="blue"
                />
                <KpiCard
                  id="kpi-total-provinces"
                  title="İl Sayısı"
                  value={dashboardStats?.totalProvinces || 25}
                  subtitle="81 İlden 25'inde Kadro"
                  trend={{ value: '3 yeni il', isPositive: true }}
                  icon={MapPin}
                  variant="emerald"
                />
                <KpiCard
                  id="kpi-active-projects"
                  title="Devam Eden Proje"
                  value={dashboardStats?.activeProjects || 3}
                  subtitle="Yayın Aşaması Süren"
                  trend={{ value: '2 kontrol', isNeutral: true }}
                  icon={BookOpen}
                  variant="violet"
                />
                <KpiCard
                  id="kpi-completed-projects"
                  title="Tamamlanan Proje"
                  value={dashboardStats?.completedProjects || 2}
                  subtitle="Baskıya Giren Eserler"
                  trend={{ value: 'Tamamlandı', isPositive: true }}
                  icon={CheckCircle}
                  variant="amber"
                />
                <KpiCard
                  id="kpi-active-authors"
                  title="Aktif Yazar"
                  value={dashboardStats?.activeAuthors || 145}
                  subtitle="Şu An Görev Başında"
                  trend={{ value: '%94 katılım', isPositive: true }}
                  icon={Award}
                  variant="cyan"
                />
              </div>

              {/* Section 7: Interactive Turkey Map */}
              <TurkeyMap
                mapData={mapData}
                onAddAuthorClick={handleOpenAddAuthorFromMap}
                onAuthorClick={(author) => setSelectedAuthorForModal(author)}
              />

              {/* Section 8: 3 Analytical Dashboard Panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Panel 1: İllere Göre Yazar Dağılımı */}
                <HorizontalBarChart
                  data={dashboardStats?.provinceDistribution || []}
                  onSelectProvince={(provId) => {
                    setActiveTab('map');
                  }}
                />

                {/* Panel 2: Branşlara Göre Dağılım */}
                <DonutChart data={dashboardStats?.branchDistribution || []} />

                {/* Panel 3: Yaklaşan Teslim Tarihleri */}
                <UpcomingDeadlines
                  deadlines={dashboardStats?.upcomingDeadlines || []}
                  onProjectClick={() => setActiveTab('projects')}
                />
              </div>

              {/* Section 9: Son Eklenen Yazarlar */}
              <RecentAuthorsList
                authors={dashboardStats?.recentAuthors || []}
                onAuthorClick={(author) => setSelectedAuthorForModal(author)}
                onAddAuthorClick={() => handleQuickAction('author')}
              />
            </>
          )}

          {/* Module: Türkiye Haritası standalone full screen view */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <TurkeyMap
                mapData={mapData}
                onAddAuthorClick={handleOpenAddAuthorFromMap}
                onAuthorClick={(author) => setSelectedAuthorForModal(author)}
              />
            </div>
          )}

          {/* Module: Yazarlar */}
          {activeTab === 'authors' && (
            <AuthorsView
              onAddAuthor={() => handleQuickAction('author')}
              onSelectAuthor={(author) => setSelectedAuthorForModal(author)}
            />
          )}

          {/* Module: Projeler / Kitaplar */}
          {activeTab === 'projects' && (
            <ProjectsView onAddProject={() => handleQuickAction('project')} />
          )}

          {/* Module: Görev Takibi */}
          {activeTab === 'tasks' && (
            <TasksView onAddTask={() => handleQuickAction('task')} />
          )}

          {/* Module: Telif ve Ödemeler */}
          {activeTab === 'payments' && (
            <PaymentsView onAddPayment={() => handleQuickAction('payment')} />
          )}

          {/* Module: Raporlar */}
          {activeTab === 'reports' && <ReportsView />}

          {/* Module: Mesajlar */}
          {activeTab === 'messages' && <MessagesView />}

          {/* Module: Duyurular */}
          {activeTab === 'announcements' && (
            <AnnouncementsView onAddAnnouncement={() => alert('Duyuru ekleme penceresi açıldı.')} />
          )}

          {/* Module: Dosyalar */}
          {activeTab === 'files' && <FilesView />}

          {/* Module: Ayarlar */}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      <AddAuthorModal
        isOpen={isAddAuthorOpen}
        onClose={() => setIsAddAuthorOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        defaultProvinceId={defaultProvinceForAuthor}
      />

      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={() => setIsAddProjectOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      <AddPaymentModal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
      />

      <AuthorDetailModal
        author={selectedAuthorForModal}
        isOpen={Boolean(selectedAuthorForModal)}
        onClose={() => setSelectedAuthorForModal(null)}
        onUpdateStatus={handleUpdateAuthorStatus}
        onDelete={handleDeleteAuthor}
      />

      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab);
        }}
      />
    </div>
  );
}
export default App;
