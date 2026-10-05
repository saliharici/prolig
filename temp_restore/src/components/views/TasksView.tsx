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

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
        {['Yapılacak', 'Devam Ediyor', 'Kontrol', 'Tamamlandı'].map((columnStatus) => {
          const columnTasks = tasks.filter(t => t.status === columnStatus);
          
          return (
            <div key={columnStatus} className="flex flex-col min-w-[300px] w-[300px] bg-slate-50/50 rounded-2xl border border-slate-200/60 p-3 h-[calc(100vh-250px)]">
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-sm text-slate-700">{columnStatus}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              
              {/* Task Cards */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
                {columnTasks.length === 0 ? (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                    Görev yok
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getPriorityBadge(task.priority)}`}>
                          {task.priority}
                        </span>
                        <div className="relative group/menu">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="opacity-0 group-hover:opacity-100 absolute right-0 top-0 h-6 w-6 cursor-pointer"
                          >
                            <option value="Yapılacak">Yapılacak</option>
                            <option value="Devam Ediyor">Devam Ediyor</option>
                            <option value="Kontrol">Kontrol</option>
                            <option value="Tamamlandı">Tamamlandı</option>
                          </select>
                          <button className="text-slate-400 hover:text-slate-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-sm text-slate-800 leading-snug mb-1">{task.title}</h4>
                      <p className="text-[11px] text-blue-600 font-semibold mb-4 line-clamp-1">
                        {task.project_title || 'Genel Proje'}
                      </p>
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            {task.author_first_name ? (
                              <span className="text-[10px] font-bold text-slate-600">
                                {task.author_first_name[0]}{task.author_last_name?.[0] || ''}
                              </span>
                            ) : (
                              <User className="w-3 h-3 text-slate-400" />
                            )}
                          </div>
                          {task.author_first_name ? (
                            <span className="text-[10px] font-medium text-slate-600">
                              {task.author_first_name} {task.author_last_name?.substring(0, 1)}.
                            </span>
                          ) : (
                            <span className="text-[10px] italic text-slate-400">Atanmadı</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                          <Clock className="w-3 h-3" />
                          {task.due_date}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
