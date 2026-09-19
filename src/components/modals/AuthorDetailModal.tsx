import React, { useState } from 'react';
import { X, Mail, Phone, MapPin, BookOpen, CheckSquare, CreditCard, Edit3, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Author } from '../../types';

interface AuthorDetailModalProps {
  author: Author | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus?: (authorId: number, newStatus: string) => void;
  onDelete?: (authorId: number) => void;
}

export const AuthorDetailModal: React.FC<AuthorDetailModalProps> = ({
  author,
  isOpen,
  onClose,
  onUpdateStatus,
  onDelete,
}) => {
  if (!isOpen || !author) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Banner with Profile */}
        <div className="relative bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg bg-black/20 p-1.5 text-white/80 hover:bg-black/40 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <img
              src={author.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={author.first_name}
              referrerPolicy="no-referrer"
              className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20 shadow-lg"
            />
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-xl font-bold text-white">
                  {author.first_name} {author.last_name}
                </h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  author.status === 'Aktif'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {author.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-200 font-medium">
                {author.title || 'Yazar / Branş Uzmanı'} • {author.branch_name}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  {author.province_name} {author.district_name ? `/ ${author.district_name}` : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" />
                  {author.email}
                </span>
                {author.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    {author.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs / Details */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Institutional Affiliation */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Yazar No</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">#{author.id}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Branş</span>
              <p className="text-sm font-bold text-blue-700 mt-0.5">{author.branch_name}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Kurum</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{author.institution_name || 'MEB / Özel'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Kayıt Tarihi</span>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                {author.created_at ? author.created_at.split(' ')[0] : '2026-08'}
              </p>
            </div>
          </div>

          {/* Author Bio & Notes */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Biyografi ve Koordinatör Notları
            </h4>
            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 leading-relaxed border border-slate-100">
              {author.notes ||
                `${author.first_name} ${author.last_name}, ${author.province_name} ilimizde ${author.branch_name} alanında PRO LİG yayın kadrosunda yer almaktadır. Soru yazımı ve deneme incelemelerinde görevlidir.`}
            </div>
          </div>

          {/* Quick Status Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
            <div>
              <p className="text-xs font-bold text-slate-800">Yazar Durumunu Güncelle</p>
              <p className="text-[11px] text-slate-500">Yazarın aktif proje atamaları için statüsünü belirleyin.</p>
            </div>
            <div className="flex gap-2">
              {['Aktif', 'Beklemede', 'Pasif'].map((st) => (
                <button
                  key={st}
                  onClick={() => onUpdateStatus && onUpdateStatus(author.id, st)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                    author.status === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 bg-slate-50">
          <button
            onClick={() => onDelete && onDelete(author.id)}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Yazarı Sil</span>
          </button>
          <button
            onClick={onClose}
            className="h-9 rounded-lg bg-slate-800 px-5 text-xs font-bold text-white hover:bg-slate-900"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
