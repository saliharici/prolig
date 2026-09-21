import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { QuestionsView } from './components/QuestionsView';
import { UserRole, Author, Province } from './types';
import { Users, MapPin, BookOpen, CheckCircle, Award, Shield, Key, Search } from 'lucide-react';
import { motion } from 'motion/react';

const BING_LIKE_IMAGES = [
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1080&auto=format&fit=crop", // Modern office / Architecture
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1080&auto=format&fit=crop", // Modern University Campus
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1080&auto=format&fit=crop", // Professional Team Working
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1080&auto=format&fit=crop"  // Creative Digital Workspace
];

function LandingPage({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bgImage, setBgImage] = useState(BING_LIKE_IMAGES[0]);

  useEffect(() => {
    // Sayfa her yüklendiğinde Bing mantığı gibi farklı ve etkileyici bir görsel seç
    const randomImage = BING_LIKE_IMAGES[Math.floor(Math.random() * BING_LIKE_IMAGES.length)];
    setBgImage(randomImage);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Vercel (Frontend-only) ortamı için Hardcoded Mock Login
    if (email === 'admin@prolig.com') {
      setTimeout(() => onLogin('GENEL_KOORDINATOR'), 800);
      return;
    }
    if (email === 'yazar@prolig.com') {
      setTimeout(() => onLogin('YAZAR'), 800);
      return;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (data.success) {
        setTimeout(() => onLogin(data.role), 500);
      } else {
        alert(data.error || 'Giriş başarısız!');
        setLoading(false);
      }
    } catch (err) {
      alert('Giriş başarısız. Lütfen admin@prolig.com adresini kullanın.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans overflow-hidden bg-[#0a0a0a]">
      {/* Premium Arka Plan Efektleri */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-600/30 to-emerald-600/30 rounded-full blur-[120px] mix-blend-screen opacity-50"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-6xl p-4 sm:p-8"
      >
        <div className="grid md:grid-cols-2 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden min-h-[700px]">
          
          {/* Sol Taraf - Premium Tanıtım & Etkileyici Görsel */}
          <div className="relative p-12 md:p-16 flex flex-col justify-between overflow-hidden hidden md:flex group">
            {/* Dinamik Arka Plan Görseli */}
            <motion.div 
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 10, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('${bgImage}')` }}
            />
            {/* Görsel Üzeri Koyu Cam Efekti (Yazıların okunması için) */}
            <div className="absolute inset-0 bg-slate-900/60 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent"></div>
            
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative z-10"
            >
              <div className="flex items-center gap-3 mb-16">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-widest text-white uppercase">PRO LİG</h1>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-semibold leading-[1.15] mb-6 text-white tracking-tight">
                Profesyoneller<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  Karması.
                </span>
              </h2>
              
              <p className="text-slate-300 text-lg mb-12 leading-relaxed font-light max-w-md">
                Eğitim ekosisteminin en yenilikçi yazar, proje ve finans yönetim platformu.
              </p>
              
              <div className="space-y-6">
                {[
                  { icon: MapPin, text: "81 İl Dinamik Harita ve Veri Yönetimi" },
                  { icon: Users, text: "Gelişmiş Rol, Yetki ve Görev Kuyrukları" },
                  { icon: Award, text: "Şeffaf Puan, Telif ve Hakediş Sistemi" }
                ].map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    key={i} 
                    className="flex items-center gap-4 group"
                  >
                    <div className="bg-white/5 group-hover:bg-white/10 transition-colors p-3 rounded-2xl border border-white/10">
                      <item.icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="font-medium text-slate-300 group-hover:text-white transition-colors">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative z-10 text-xs text-slate-500 font-medium tracking-widest mt-16"
            >
              © 2026 PRO LİG YÖNETİM SİSTEMLERİ
            </motion.div>
          </div>

          {/* Sağ Taraf - Premium Form */}
          <div className="p-8 md:p-16 bg-white flex flex-col justify-center relative">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                  {isLogin ? 'Hoş Geldiniz' : 'Aramıza Katılın'}
                </h2>
                <p className="text-slate-500 text-base">
                  {isLogin 
                    ? 'Lütfen devam etmek için bilgilerinizi girin.' 
                    : 'Havuz sistemine dahil olmak için başvurunuzu yapın.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Ad Soyad</label>
                    <input type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="Örn: Ahmet Yılmaz" />
                  </motion.div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">E-posta Adresi</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium" 
                    placeholder="ornek@prolig.com" 
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Şifre</label>
                    {isLogin && <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">Şifremi Unuttum</a>}
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium tracking-widest" 
                    placeholder="••••••••" 
                  />
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={loading}
                  className="w-full mt-4 bg-slate-900 hover:bg-indigo-600 text-white font-semibold py-4 px-4 rounded-2xl shadow-xl shadow-slate-900/10 hover:shadow-indigo-600/25 transition-all duration-300 flex justify-center items-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Key className="w-5 h-5" />
                      <span>{isLogin ? 'Sisteme Giriş Yap' : 'Kayıt Ol'}</span>
                    </>
                  )}
                </motion.button>
              </form>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-slate-500 hover:text-slate-900 font-semibold transition-colors"
                >
                  {isLogin ? "Hesabınız yok mu? Hemen Başvurun" : "Zaten hesabınız var mı? Giriş Yapın"}
                </button>
              </div>
              
              <div className="mt-12 p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-4">
                <div className="text-indigo-600 bg-indigo-100 p-2 rounded-xl mt-0.5"><Shield className="w-4 h-4" /></div>
                <div className="text-xs text-slate-600 leading-relaxed font-medium">
                  <strong className="text-slate-900 block mb-1 text-sm">Geliştirici İpucu:</strong>
                  Süper admin paneli için e-posta alanına <strong className="text-indigo-700">admin@prolig.com</strong> yazıp doğrudan giriş yapabilirsiniz. Standart kullanıcılar için rastgele bir adres girin.
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ==========================================
// 2. ANA YÖNETİM PANELİ (DASHBOARD APP)
// ==========================================
function DashboardApp({ userRole, onLogout }: { userRole: UserRole, onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>(userRole);
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

  // Basit bir Yetki Kontrol Fonksiyonu
  const canAccess = (tab: TabKey) => {
    if (currentRole === 'GENEL_KOORDINATOR' || currentRole === 'YONETICI') return true;
    if (currentRole === 'YAZAR' && (tab === 'payments' || tab === 'reports' || tab === 'settings')) return false;
    if (currentRole === 'MUHASEBE' && (tab === 'map' || tab === 'tasks')) return false;
    return true;
  };

  useEffect(() => {
    if (!canAccess(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentRole]);

  return (
    <div className="flex min-h-screen bg-slate-100/60 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        userRole={currentRole}
        counts={{
          tasksCount: dashboardStats?.upcomingDeadlines?.length || 5,
          unreadMessages: 3,
          unreadAnnouncements: 2,
        }}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Header
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          currentRole={currentRole}
          onRoleChange={setCurrentRole} 
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onQuickAction={handleQuickAction}
          notifications={notifications}
          onMarkNotificationsRead={async () => {}}
          onLogout={onLogout}
        />



        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-8">
          {activeTab === 'dashboard' && (
            <>
              {/* Premium Welcome Banner */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2rem] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden border border-white/10"
              >
                {/* Işık Hüzmeleri (Orbs) */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500 rounded-full blur-[100px] opacity-30 -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-purple-500 rounded-full blur-[80px] opacity-30 pointer-events-none"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div>
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold tracking-wider text-blue-200 mb-4"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      SİSTEM AKTİF
                    </motion.div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
                      Hoş Geldiniz, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">Sedat AKBULUT</span> 👋
                    </h2>
                    <p className="text-slate-400 text-base md:text-lg max-w-2xl font-light">
                      {currentRole === 'YAZAR' 
                        ? 'Soru havuzuna yeni içerikler eklemek ve bekleyen onaylarınızı takip etmek için harika bir gün.' 
                        : <>Türkiye geneli <strong className="text-white font-medium">81 ilden</strong> gelen veriler senkronize edildi. Bugün havuzda onaylanmayı bekleyen <strong className="text-white font-medium">12 yeni soru</strong> var.</>}
                    </p>
                  </div>
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-4"
                  >
                    <button onClick={() => setActiveTab('questions')} className="px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 hover:scale-105 transition-all shadow-lg">
                      {currentRole === 'YAZAR' ? 'Soru Havuzuna Git' : 'Onay Bekleyenler'}
                    </button>
                    <button onClick={() => setIsGlobalSearchOpen(true)} className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-sm hover:bg-white/20 hover:scale-105 transition-all flex items-center gap-2 backdrop-blur-md">
                      <Search className="w-4 h-4" /> Detaylı Ara (⌘K)
                    </button>
                  </motion.div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
                <KpiCard id="kpi-total-authors" title="Toplam Yazar" value={154} subtitle="Tüm Branşlar Dahil" trend={{ value: '+12 bu ay', isPositive: true }} icon={Users} variant="blue" />
                <KpiCard id="kpi-total-provinces" title="İl Sayısı" value={25} subtitle="81 İlden 25'inde Kadro" trend={{ value: '3 yeni il', isPositive: true }} icon={MapPin} variant="emerald" />
                <KpiCard id="kpi-active-projects" title="Devam Eden Proje" value={3} subtitle="Yayın Aşaması Süren" trend={{ value: '2 kontrol', isNeutral: true }} icon={BookOpen} variant="violet" />
                <KpiCard id="kpi-completed-projects" title="Tamamlanan Proje" value={2} subtitle="Baskıya Giren Eserler" trend={{ value: 'Tamamlandı', isPositive: true }} icon={CheckCircle} variant="amber" />
                <KpiCard id="kpi-active-authors" title="Aktif Yazar" value={145} subtitle="Şu An Görev Başında" trend={{ value: '%94 katılım', isPositive: true }} icon={Award} variant="cyan" />
              </div>
              
              {/* Map removed from home page as requested */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <HorizontalBarChart data={dashboardStats?.provinceDistribution || []} onSelectProvince={() => setActiveTab('map')} />
                <DonutChart data={dashboardStats?.branchDistribution || []} />
                <UpcomingDeadlines deadlines={dashboardStats?.upcomingDeadlines || []} onProjectClick={() => setActiveTab('projects')} />
              </div>
              <RecentAuthorsList authors={dashboardStats?.recentAuthors || []} onAuthorClick={(a) => setSelectedAuthorForModal(a)} onAddAuthorClick={() => handleQuickAction('author')} />
            </>
          )}

          {activeTab === 'map' && canAccess('map') && (
            <TurkeyMap mapData={mapData} onAddAuthorClick={handleOpenAddAuthorFromMap} onAuthorClick={(a) => setSelectedAuthorForModal(a)} />
          )}
          {activeTab === 'questions' && <QuestionsView userRole={currentRole} userEmail="admin@prolig.com" />}
          {activeTab === 'authors' && <AuthorsView onAddAuthor={() => handleQuickAction('author')} onSelectAuthor={(a) => setSelectedAuthorForModal(a)} />}
          {activeTab === 'projects' && <ProjectsView onAddProject={() => handleQuickAction('project')} />}
          {activeTab === 'tasks' && canAccess('tasks') && <TasksView onAddTask={() => handleQuickAction('task')} />}
          {activeTab === 'payments' && canAccess('payments') && <PaymentsView onAddPayment={() => handleQuickAction('payment')} />}
          {activeTab === 'reports' && canAccess('reports') && <ReportsView />}
          {activeTab === 'messages' && <MessagesView />}
          {activeTab === 'announcements' && <AnnouncementsView onAddAnnouncement={() => {}} />}
          {activeTab === 'files' && <FilesView />}
          {activeTab === 'settings' && canAccess('settings') && <SettingsView />}
          
          {/* YETKİSİZ SAYFA EKRANI */}
          {!canAccess(activeTab) && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-red-100 p-8">
              <Shield className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-2xl font-bold text-slate-800">Yetkisiz Erişim</h2>
              <p className="text-slate-500 mt-2">Mevcut rolünüz ({currentRole}) bu sayfayı görüntülemek için yeterli değil.</p>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddAuthorModal isOpen={isAddAuthorOpen} onClose={() => setIsAddAuthorOpen(false)} onSuccess={() => fetchData()} defaultProvinceId={defaultProvinceForAuthor} />
      <AddProjectModal isOpen={isAddProjectOpen} onClose={() => setIsAddProjectOpen(false)} onSuccess={() => fetchData()} />
      <AddTaskModal isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} onSuccess={() => fetchData()} />
      <AddPaymentModal isOpen={isAddPaymentOpen} onClose={() => setIsAddPaymentOpen(false)} onSuccess={() => fetchData()} />
      <AuthorDetailModal author={selectedAuthorForModal} isOpen={Boolean(selectedAuthorForModal)} onClose={() => setSelectedAuthorForModal(null)} onUpdateStatus={() => {}} onDelete={async () => {}} />
      <GlobalSearchModal isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} onNavigate={setActiveTab} />
    </div>
  );
}

// ==========================================
// 3. ANA YÖNLENDİRİCİ (ROUTER)
// ==========================================
export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('YAZAR');

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole('YAZAR');
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage onLogin={handleLogin} />
          } 
        />
        
        <Route 
          path="/dashboard/*" 
          element={
            isAuthenticated ? <DashboardApp userRole={userRole} onLogout={handleLogout} /> : <Navigate to="/" replace />
          } 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;