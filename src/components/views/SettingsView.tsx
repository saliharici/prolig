import React, { useState } from 'react';
import { PageBanner } from '../PageBanner';
import { User, Lock, Bell, Palette, Globe, Shield, Save } from 'lucide-react';
import { motion } from 'motion/react';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');

  const tabs = [
    { id: 'profile', label: 'Profil Bilgileri', icon: User },
    { id: 'security', label: 'Şifre & Güvenlik', icon: Shield },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'preferences', label: 'Tercihler', icon: Palette },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageBanner
        title={<>Hesap <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">Ayarları</span></>}
        description="Profil bilgilerinizi, güvenlik ayarlarınızı ve kişisel tercihlerinizi yönetin."
        badge={<><User className="h-3 w-3 mr-1" /> PROFİL & AYARLAR</>}
        gradient="from-slate-900 via-blue-950 to-slate-900"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sol Menü */}
        <div className="w-full lg:w-64 flex flex-col gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/60'
              }`}
            >
              <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-blue-200' : 'text-slate-400'}`} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Sağ İçerik Alanı */}
        <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden min-h-[400px]">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Kişisel Bilgiler</h3>
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80" alt="Profile" className="w-24 h-24 rounded-2xl object-cover shadow-sm border border-slate-200" />
                  <button className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-md border border-slate-100 text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                    <User className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Profil Fotoğrafı</h4>
                  <p className="text-sm text-slate-500 mt-1">Sistem genelinde görünecek fotoğrafınızı değiştirebilirsiniz.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Ad Soyad</label>
                  <input type="text" defaultValue="Sedat AKBULUT" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">E-posta Adresi</label>
                  <input type="email" defaultValue="sedat.akbulut@prolig.com.tr" disabled className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Telefon</label>
                  <input type="tel" defaultValue="+90 (555) 123 4567" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Unvan / Kurum</label>
                  <input type="text" defaultValue="Genel Koordinatör" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium" />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all">
                  <Save className="w-4 h-4" />
                  Değişiklikleri Kaydet
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Şifre Değiştirme</h3>
              <div className="space-y-5 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Mevcut Şifre</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Yeni Şifre</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Yeni Şifre (Tekrar)</label>
                  <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none transition-all font-medium" />
                </div>
                <button className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-colors mt-2">
                  Şifreyi Güncelle
                </button>
              </div>
            </motion.div>
          )}

          {(activeTab === 'notifications' || activeTab === 'preferences') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-12 flex flex-col items-center justify-center text-center text-slate-500 h-full min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                {activeTab === 'notifications' ? <Bell className="w-8 h-8 text-slate-400" /> : <Palette className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Yakında Eklenecek</h3>
              <p className="text-sm max-w-sm">Bu bölümdeki ayarlar şu anda geliştirme aşamasındadır. Yakında aktif edilecektir.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
