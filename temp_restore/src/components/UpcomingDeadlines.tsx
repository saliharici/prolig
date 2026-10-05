import React from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

interface UpcomingDeadlinesProps {
  deadlines: {
    id: number;
    title: string;
    project_title: string;
    deadline: string;
    remaining_days: number;
    priority: string;
    status: string;
  }[];
  onProjectClick?: (id: number) => void;
}

export const UpcomingDeadlines: React.FC<UpcomingDeadlinesProps> = ({ deadlines, onProjectClick }) => {
  // Format ISO date to Turkish date format
  const formatTurkishDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="panel-upcoming-deadlines" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Yaklaşan Teslim Tarihleri</h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400">Yayın Takvimi</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {deadlines.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Yaklaşan acil teslim tarihi bulunmuyor.
          </div>
        ) : (
          deadlines.map((item) => {
            const isUrgent = item.remaining_days <= 3;
            const isWarning = item.remaining_days > 3 && item.remaining_days <= 10;

            return (
              <div
                key={item.id}
                onClick={() => onProjectClick && onProjectClick(item.id)}
                className="group flex items-center justify-between rounded-lg border border-slate-100 p-2.5 transition-all hover:border-blue-200 hover:bg-slate-50/70 cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <p className="truncate text-xs font-bold text-slate-800 group-hover:text-blue-600">
                    {item.project_title || item.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {formatTurkishDate(item.deadline)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isUrgent
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : isWarning
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isUrgent && <AlertTriangle className="h-3 w-3" />}
                    {item.remaining_days < 0 
                      ? 'Teslim Gecikti'
                      : item.remaining_days === 0 
                      ? 'Bugün Son Gün' 
                      : `${item.remaining_days} gün kaldı`}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-600" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
