import React, { useState, useEffect } from 'react';
import { Author } from '../../types';
import { Search, Filter, Plus, Mail, Phone, MapPin, Download, Trash2, Eye, ChevronRight, UserCheck } from 'lucide-react';
import { TURKEY_MAP_PROVINCES } from '../turkeyMapData';

interface AuthorsViewProps {
  onAddAuthor: () => void;
  onSelectAuthor: (author: Author) => void;
}

export const AuthorsView: React.FC<AuthorsViewProps> = ({ onAddAuthor, onSelectAuthor }) => {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchAuthors = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (selectedProvince) params.append('province_id', selectedProvince);
    if (selectedBranch) params.append('branch_id', selectedBranch);
    if (selectedStatus) params.append('status', selectedStatus);

    fetch(`/api/authors?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setAuthors(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch('/api/meta')
      .then(res => res.json())
      .then(data => setBranches(data.branches || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuthors();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, selectedProvince, selectedBranch, selectedStatus]);

  const handleExportCSV = () => {
    window.open('/api/reports/export-csv', '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Yazarlar Dizini</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Türkiye genelinde {authors.length} branş uzmanı ve yazar listeleniyor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={onAddAuthor}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Yazar Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="İsim, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
        </div>

        {/* Province Filter */}
        <div>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          >
            <option value="">Tüm İller (81 İl)</option>
            {TURKEY_MAP_PROVINCES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          >
            <option value="">Tüm Branşlar</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          >
            <option value="">Tüm Durumlar</option>
            <option value="Aktif">Sadece Aktif</option>
            <option value="Beklemede">Beklemede</option>
            <option value="Pasif">Pasif</option>
          </select>
        </div>
      </div>

      {/* Authors Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Yazar Bilgisi</th>
                <th className="py-3 px-4">Branş</th>
                <th className="py-3 px-4">İl / İlçe</th>
                <th className="py-3 px-4">İletişim</th>
                <th className="py-3 px-4">Statü</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Yazarlar yükleniyor...
                  </td>
                </tr>
              ) : authors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Filtre kriterlerine uygun yazar bulunamadı.
                  </td>
                </tr>
              ) : (
                authors.map((author) => (
                  <tr
                    key={author.id}
                    onClick={() => onSelectAuthor(author)}
                    className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={author.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={author.first_name}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900">
                            {author.first_name} {author.last_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {author.title || 'Yazar / Branş Uzmanı'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                        {author.branch_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>{author.province_name}</span>
                        {author.district_name && (
                          <span className="text-slate-400">/ {author.district_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{author.email}</span>
                        </div>
                        {author.phone && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{author.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        author.status === 'Aktif'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {author.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAuthor(author);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Detay Görüntüle"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
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
