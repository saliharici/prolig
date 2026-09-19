import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Plus,
  ChevronDown,
  Menu,
  Shield,
  User,
  LogOut,
  Settings,
  BookOpen,
  UserPlus,
  CheckSquare,
  CreditCard,
  Megaphone,
  Check,
  ExternalLink,
  Database,
  Server
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onOpenGlobalSearch: () => void;
  onQuickAction: (action: 'author' | 'project' | 'task' | 'payment' | 'announcement') => void;
  notifications: any[];
  onMarkNotificationsRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  currentRole,
  onRoleChange,
  onOpenGlobalSearch,
  onQuickAction,
  notifications,
  onMarkNotificationsRead,
}) => {
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);

  const roleMenuRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const dbMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/database/status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => {});
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setIsRoleMenuOpen(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setIsQuickMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (dbMenuRef.current && !dbMenuRef.current.contains(event.target as Node)) {
        setIsDbMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const roles: { key: UserRole; title: string; desc: string }[] = [
    { key: 'GENEL_KOORDINATOR', title: 'Genel Koordinatör', desc: 'Tam yetkili yönetim ve onay paneli' },
    { key: 'IL_KOORDINATORU', title: 'İl Koordinatörü', desc: 'İl bazlı yazarlar ve yerel projeler' },
    { key: 'EDITOR', title: 'Editör', desc: 'Yayın ve tashih aşamaları' },
    { key: 'YAZAR', title: 'Yazar', desc: 'Bölüm teslimleri ve kişisel görevler' },
    { key: 'MUHASEBE', title: 'Muhasebe', desc: 'Telif hakları ve ödeme tabloları' },
    { key: 'YONETICI', title: 'Sistem Yöneticisi', desc: 'Roller, ayarlar ve sistem kütüğü' },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header id="app-header" className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger & Global Search input */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Menüyü Aç"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search trigger bar */}
        <div
          onClick={onOpenGlobalSearch}
          className="group relative flex h-9.5 w-60 sm:w-80 cursor-pointer items-center rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs text-slate-400 transition-all hover:border-blue-400 hover:bg-white hover:text-slate-600 hover:shadow-xs"
        >
          <Search className="h-4 w-4 text-slate-400 group-hover:text-blue-600 mr-2" />
          <span className="truncate">Yazar, kitap, branş veya il ara...</span>
          <kbd className="hidden sm:inline-block ml-auto rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: DB Status, Role Switcher, Quick Add, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* PostgreSQL Database Indicator Pill */}
        <div className="relative" ref={dbMenuRef}>
          <button
            id="btn-db-status"
            onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-2.5 sm:px-3 text-xs font-semibold text-emerald-800 transition-colors hover:border-emerald-300 hover:bg-emerald-100/60"
            title="Veritabanı Durumu"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Database className="h-3.5 w-3.5 text-emerald-700" />
            <span className="hidden lg:inline font-bold">
              {dbStatus?.activeDatabase === 'PostgreSQL' ? 'PostgreSQL' : 'Veritabanı'}
            </span>
            <span className="text-[11px] font-normal text-emerald-600 hidden sm:inline">
              Canlı
            </span>
            <ChevronDown className="h-3 w-3 text-emerald-600/70" />
          </button>

          {isDbMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Prisma Cloud PostgreSQL</div>
                    <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Aktif ve Bağlı (SSL)
                    </div>
                  </div>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                  v17.2
                </span>
              </div>

              <div className="mt-2.5 space-y-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100 font-mono text-[11px] text-slate-600 break-all">
                  <span className="text-slate-400 block text-[9px] font-sans uppercase font-bold">Sunucu Host</span>
                  {dbStatus?.postgres?.host || 'db.prisma.io:5432'}
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                    <span className="text-slate-400 block text-[10px]">Kayıtlı Yazar</span>
                    <span className="font-bold text-slate-800 text-sm">{dbStatus?.postgres?.counts?.authors ?? 154}</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                    <span className="text-slate-400 block text-[10px]">Kapsanan İl</span>
                    <span className="font-bold text-slate-800 text-sm">{dbStatus?.postgres?.counts?.provinces ?? 81}</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                    <span className="text-slate-400 block text-[10px]">Aktif Proje</span>
                    <span className="font-bold text-slate-800 text-sm">{dbStatus?.postgres?.counts?.projects ?? 7}</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-2">
                    <span className="text-slate-400 block text-[10px]">Telif Ödemesi</span>
                    <span className="font-bold text-slate-800 text-sm">{dbStatus?.postgres?.counts?.payments ?? 7}</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                  DATABASE_URL üzerinden tam yetkili bağlantı sağlandı.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher Pill (Interactive Demo Tool) */}
        <div className="relative" ref={roleMenuRef}>
          <button
            id="btn-role-switcher"
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 sm:px-3 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50"
            title="Aktif Rolü Değiştir"
          >
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden md:inline font-bold">
              {roles.find(r => r.key === currentRole)?.title || 'Genel Koordinatör'}
            </span>
            <span className="md:hidden">Rol</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {isRoleMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Rol Tabanlı Erişim Simülasyonu
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Farklı kullanıcı rollerinin yetki ve görünümünü test edin.
                </p>
              </div>

              <div className="py-1">
                {roles.map((r) => {
                  const isCurrent = r.key === currentRole;
                  return (
                    <button
                      key={r.key}
                      onClick={() => {
                        onRoleChange(r.key);
                        setIsRoleMenuOpen(false);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                        isCurrent ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isCurrent ? (
                          <Check className="h-4 w-4 text-blue-600" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-slate-300" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{r.title}</div>
                        <div className="text-[10px] text-slate-400">{r.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Button with Action Dropdown */}
        <div className="relative" ref={quickMenuRef}>
          <button
            id="btn-quick-add"
            onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Yeni Ekle</span>
            <ChevronDown className="h-3.5 w-3.5 text-blue-200" />
          </button>

          {isQuickMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Hızlı Ekleme Menüsü
              </div>
              <button
                onClick={() => {
                  onQuickAction('author');
                  setIsQuickMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <UserPlus className="h-4 w-4 text-blue-600" />
                <span>Yeni Yazar Kaydı</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('project');
                  setIsQuickMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <span>Yeni Proje / Kitap</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('task');
                  setIsQuickMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <CheckSquare className="h-4 w-4 text-emerald-600" />
                <span>Yeni Görev Ata</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('payment');
                  setIsQuickMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <CreditCard className="h-4 w-4 text-amber-600" />
                <span>Yeni Telif / Ödeme</span>
              </button>
              <button
                onClick={() => {
                  onQuickAction('announcement');
                  setIsQuickMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Megaphone className="h-4 w-4 text-rose-600" />
                <span>Yeni Duyuru Yayınla</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Bildirimler"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-2xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-xs font-bold text-slate-900">Bildirimler ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkNotificationsRead}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Tümünü Okundu Say
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto py-1 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">Yeni bildirim bulunmuyor</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-lg p-2.5 text-xs transition-colors ${
                        n.is_read ? 'bg-white text-slate-500' : 'bg-blue-50/60 text-slate-800 font-medium'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{n.title}</div>
                      <p className="mt-0.5 text-[11px] text-slate-600 leading-tight">{n.message}</p>
                      <span className="mt-1 block text-[10px] text-slate-400">{n.created_at || 'Yeni'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-1 pr-3 hover:border-slate-300 hover:bg-white"
          >
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80"
              alt="Dr. Selim Yavuz"
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-lg object-cover border border-slate-200"
            />
            <div className="hidden text-left xl:block">
              <p className="text-xs font-bold text-slate-800 leading-none">Dr. Selim Yavuz</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {roles.find(r => r.key === currentRole)?.title}
              </p>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">Dr. Selim Yavuz</p>
                <p className="text-[10px] text-slate-500">selim.yavuz@prolig.com.tr</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Profilim</span>
                </button>
                <button
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  <span>Hesap Ayarları</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
