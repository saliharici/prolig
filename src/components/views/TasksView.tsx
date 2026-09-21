import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { PageBanner } from '../PageBanner';

interface TasksViewProps {
  onAddTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onAddTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Tümü');

  const fetchTasks = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'Tümü') params.append('status', statusFilter);

    fetch(`/api/tasks?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setTasks(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleStatusChange = async (taskId: number, newStatus: string) => {
    try {
      await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Acil':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Yüksek':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <PageBanner
        title={
          <><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-300">Görev</span> ve İş Takibi</>
        }
        description={`Yazarlara, dizgicilere ve editörlere atanan güncel soru yazımı, tashih ve mizanpaj görevleri.`}
        badge={
          <>
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
            </span>
            GÖREV YÖNETİMİ
          </>
        }
        gradient="from-slate-900 via-rose-950 to-slate-900"
        orb1Color="bg-rose-500"
        orb2Color="bg-pink-500"
        actions={
          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100 hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Görev Ata</span>
          </button>
        }
      />

      {/* Status Filter Tabs */}
      <div className="flex gap-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        {['Tümü', 'Yapılacak', 'Devam Ediyor', 'Kontrol', 'Tamamlandı'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === st
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Task List Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Görev & İlgili Proje</th>
                <th className="py-3 px-4">Atanan Yazar</th>
                <th className="py-3 px-4">Öncelik</th>
                <th className="py-3 px-4">Teslim Tarihi</th>
                <th className="py-3 px-4">Aşama / Durum</th>
                <th className="py-3 px-4 text-right">Durum Değiştir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Görevler yükleniyor...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Kayıtlı görev bulunmuyor.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{task.title}</div>
                      <div className="text-[11px] text-blue-600 font-medium">
                        {task.project_title || 'Genel Proje'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {task.author_first_name ? (
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {task.author_first_name} {task.author_last_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Atanmadı</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{task.due_date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        task.status === 'Tamamlandı'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : task.status === 'Kontrol'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : task.status === 'Devam Ediyor'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 focus:border-emerald-500 focus:outline-hidden"
                      >
                        <option value="Yapılacak">Yapılacak</option>
                        <option value="Devam Ediyor">Devam Ediyor</option>
                        <option value="Kontrol">Kontrol</option>
                        <option value="Tamamlandı">Tamamlandı</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
