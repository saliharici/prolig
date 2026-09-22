import React from 'react';
import { PageBanner } from '../PageBanner';
import { ShieldAlert, Activity, User, Eye, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export const AuditLogsView: React.FC = () => {
  // Mock audit logs
  const logs = [
    { id: 1, user: 'Sedat AKBULUT (admin@prolig.com)', action: 'Sisteme Giriş Yaptı', type: 'AUTH', time: '10 dakika önce', ip: '192.168.1.1' },
    { id: 2, user: 'Sedat AKBULUT', action: 'Rol izinlerini güncelledi: "Editör"', type: 'SECURITY', time: '2 saat önce', ip: '192.168.1.1' },
    { id: 3, user: 'Ahmet Yılmaz (yazar@prolig.com)', action: 'Yeni bir soru havuza ekledi (M.8.1.2)', type: 'CONTENT', time: '3 saat önce', ip: '88.243.21.11' },
    { id: 4, user: 'Sistem', action: 'Otomatik veritabanı yedeği alındı', type: 'SYSTEM', time: 'Dün 03:00', ip: 'localhost' },
    { id: 5, user: 'Elif Şahin', action: 'Görev durumunu değiştirdi: "Devam Ediyor" -> "Tamamlandı"', type: 'CONTENT', time: 'Dün 14:30', ip: '85.101.44.22' },
  ];

  return (
    <div className="space-y-5">
      <PageBanner
        title={
          <><span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400">Sistem Log</span> Kayıtları</>
        }
        description={`Bu sayfa yalnızca Süper Admin yetkisine sahip kullanıcılar tarafından görüntülenebilir.`}
        badge={
          <>
            <Lock className="h-3 w-3 mr-1" />
            GİZLİ BÖLÜM
          </>
        }
        gradient="from-slate-900 via-rose-950 to-slate-900"
        orb1Color="bg-red-500"
        orb2Color="bg-rose-500"
      />

      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 overflow-hidden p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
            <Activity className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Son Aktiviteler</h3>
            <p className="text-xs text-slate-500">Sistemdeki son değişiklikler ve girişler</p>
          </div>
        </div>

        <div className="space-y-4">
          {logs.map((log, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={log.id} 
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors"
            >
              <div className="mt-0.5">
                {log.type === 'AUTH' && <User className="w-4 h-4 text-blue-500" />}
                {log.type === 'SECURITY' && <ShieldAlert className="w-4 h-4 text-rose-500" />}
                {log.type === 'CONTENT' && <Eye className="w-4 h-4 text-emerald-500" />}
                {log.type === 'SYSTEM' && <Activity className="w-4 h-4 text-slate-500" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-800">{log.action}</p>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{log.time}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-600 font-medium">{log.user}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{log.ip}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
