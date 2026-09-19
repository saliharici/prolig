import React, { useState } from 'react';
import { Settings, RefreshCw, Database, Shield, Server, CheckCircle2, AlertTriangle, Key } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResetDatabase = async () => {
    if (!window.confirm('Veritabanını sıfırlamak ve örnek verileri yeniden yüklemek istediğinize emin misiniz?')) {
      return;
    }

    setResetting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seed/reset', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || 'Veritabanı başarıyla sıfırlandı.');
    } catch (err: any) {
      setMessage('Hata oluştu: ' + err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sistem ve Veritabanı Ayarları</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          PRO LİG platform yapılandırması, veritabanı durumu ve yönetimsel kontroller
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Environment & Architecture Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Server className="h-5 w-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Sistem ve Mimari Bilgisi</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Platform</span>
              <span className="font-semibold text-slate-800">PRO LİG (Profesyoneller Karması)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Sürüm</span>
              <span className="font-semibold text-slate-800">v2.6.0 (2026 Stable)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Veritabanı Altyapısı</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Canlı İlişkisel SQL (SQLite + Prisma Schema)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Sunucu Katmanı</span>
              <span className="font-semibold text-slate-800">Node.js Express REST API</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Arayüz Framework</span>
              <span className="font-semibold text-slate-800">React 18 + Vite + Tailwind CSS</span>
            </div>
          </div>
        </div>

        {/* Database Reset & Maintenance */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Database className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Veritabanı Bakım ve Yeniden Yükleme</h3>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Geliştirme ve test süreçlerinde veritabanını fabrika ayarlarına döndürerek 150+ yazar, 81 il, 20+ branş ve gerçekçi yayın projelerini sıfırdan yeniden yükleyebilirsiniz.
          </p>

          <div className="pt-2">
            <button
              onClick={handleResetDatabase}
              disabled={resetting}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Veritabanı Sıfırlanıyor...' : 'Veritabanını Sıfırla ve Örnek Verileri Yükle'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
