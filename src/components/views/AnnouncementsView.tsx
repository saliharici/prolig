import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Calendar, AlertCircle, CheckCircle, Bell } from 'lucide-react';

interface AnnouncementsViewProps {
  onAddAnnouncement?: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ onAddAnnouncement }) => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/announcements')
      .then(res => res.json())
      .then(data => {
        setAnnouncements(data || []);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Duyurular ve Bildiriler</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Müfredat değişiklikleri, teslim takvimleri ve yayın kurulu kararları
          </p>
        </div>

        {onAddAnnouncement && (
          <button
            onClick={onAddAnnouncement}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Duyuru Yayınla</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Duyurular yükleniyor...</div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          Yayınlanmış duyuru bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-blue-300 hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                  <Megaphone className="h-3 w-3" />
                  Yayın Kurulu
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  {item.created_at ? item.created_at.split(' ')[0] : '2026-09-15'}
                </span>
              </div>

              <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
