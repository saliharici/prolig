import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Users,
  BookOpen,
  CheckSquare,
  CreditCard,
  BarChart3,
  Mail,
  Bell,
  FolderArchive,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';

export type TabKey =
  | 'dashboard'
  | 'map'
  | 'authors'
  | 'projects'
  | 'tasks'
  | 'payments'
  | 'reports'
  | 'messages'
  | 'announcements'
  | 'files'
  | 'settings';

interface SidebarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  counts?: {
    tasksCount?: number;
    unreadMessages?: number;
    unreadAnnouncements?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpenMobile,
  onCloseMobile,
  counts = {},
}) => {
  const menuItems = [
    { key: 'dashboard' as TabKey, label: 'Ana Sayfa', icon: LayoutDashboard },
    { key: 'map' as TabKey, label: 'Türkiye Haritası', icon: MapPin },
    { key: 'authors' as TabKey, label: 'Yazarlar', icon: Users },
    { key: 'projects' as TabKey, label: 'Projeler / Kitaplar', icon: BookOpen },
    {
      key: 'tasks' as TabKey,
      label: 'Görev Takibi',
      icon: CheckSquare,
      badge: counts.tasksCount,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    { key: 'payments' as TabKey, label: 'Telif ve Ödemeler', icon: CreditCard },
    { key: 'reports' as TabKey, label: 'Raporlar', icon: BarChart3 },
    {
      key: 'messages' as TabKey,
      label: 'Mesajlar',
      icon: Mail,
      badge: counts.unreadMessages || 3,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    },
    {
      key: 'announcements' as TabKey,
      label: 'Duyurular',
      icon: Bell,
      badge: counts.unreadAnnouncements || 2,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    { key: 'files' as TabKey, label: 'Dosyalar', icon: FolderArchive },
    { key: 'settings' as TabKey, label: 'Ayarlar', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-68 flex-col bg-[#0B1528] text-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-slate-800/80 shadow-2xl lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-900/40">
              <span className="font-extrabold text-lg tracking-wider">PRO</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wider text-white">PRO LİG</span>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[9px] font-bold text-blue-400 border border-blue-500/30">
                  v2.6
                </span>
              </div>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Profesyoneller Karması
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Yönetim Modülleri
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                id={`sidebar-nav-${item.key}`}
                onClick={() => {
                  onTabChange(item.key);
                  onCloseMobile();
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-white text-blue-700' : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Institutional Motto Card */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="rounded-xl border border-blue-900/40 bg-gradient-to-br from-slate-900/90 to-blue-950/40 p-3.5 text-xs text-slate-300 shadow-inner">
            <div className="flex items-center gap-2 text-blue-400 font-bold mb-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Yayıncılık Vizyonu</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 italic">
              "İyi bir kitap, daha aydınlık yarınların anahtarıdır."
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Canlı Sistem
              </span>
              <span>PRO LİG © 2026</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
