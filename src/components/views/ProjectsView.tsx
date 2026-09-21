import React, { useState, useEffect } from 'react';
import { Project } from '../../types';
import { BookOpen, Plus, Calendar, CheckCircle2, Clock, Users, ArrowUpRight, Search } from 'lucide-react';
import { PageBanner } from '../PageBanner';

interface ProjectsViewProps {
  onAddProject: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onAddProject }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Tümü');
  const [search, setSearch] = useState('');

  const fetchProjects = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter !== 'Tümü') params.append('status', statusFilter);

    fetch(`/api/projects?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setProjects(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter, search]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Tamamlandı':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Devam Ediyor':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Kontrol':
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
          <><span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Projeler</span> ve Kitaplar</>
        }
        description={`Müfredat kazanımlarına uygun soru bankası, deneme ve fasikül yayın süreçleri yönetimi.`}
        badge={
          <>
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            YAYIN SÜREÇLERİ
          </>
        }
        gradient="from-slate-900 via-orange-950 to-slate-900"
        orb1Color="bg-orange-500"
        orb2Color="bg-amber-500"
        actions={
          <button
            onClick={onAddProject}
            className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-lg hover:bg-slate-100 hover:scale-105 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Proje Başlat</span>
          </button>
        }
      />

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap gap-1.5">
          {['Tümü', 'Devam Ediyor', 'Kontrol', 'Planlama', 'Tamamlandı'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kitap başlığı veya branş ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Projeler yükleniyor...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
          Seçilen kriterde yayın projesi bulunmuyor.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-indigo-300 hover:shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200/60">
                    {proj.branch_name} • {proj.target_grade}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${getStatusColor(proj.status)}`}>
                    {proj.status}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-indigo-600 line-clamp-2">
                  {proj.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {proj.description || 'Müfredat kazanımları doğrultusunda hazırlanan nitelikli soru ve anlatım içeriği.'}
                </p>
              </div>

              <div className="mt-5 space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    Hedef: {proj.target_end_date}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-indigo-700">
                    <Users className="h-3.5 w-3.5" />
                    {proj.authors_count || 1} Yazar
                  </span>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                    <span>Yayın İlerlemesi</span>
                    <span className="font-bold text-slate-800">
                      {proj.status === 'Tamamlandı' ? '%100' : proj.status === 'Kontrol' ? '%85' : '%60'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        proj.status === 'Tamamlandı'
                          ? 'bg-emerald-500 w-full'
                          : proj.status === 'Kontrol'
                          ? 'bg-amber-500 w-[85%]'
                          : 'bg-indigo-600 w-[60%]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
