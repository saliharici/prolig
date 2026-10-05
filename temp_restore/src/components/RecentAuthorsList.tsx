import React from 'react';
import { Author } from '../types';
import { Users, MapPin, ChevronRight, UserPlus } from 'lucide-react';

interface RecentAuthorsListProps {
  authors: Author[];
  onAuthorClick?: (author: Author) => void;
  onAddAuthorClick?: () => void;
}

export const RecentAuthorsList: React.FC<RecentAuthorsListProps> = ({
  authors,
  onAuthorClick,
  onAddAuthorClick
}) => {
  return (
    <div id="panel-recent-authors" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Son Eklenen Yazarlar</h3>
          </div>
        </div>
        <button
          onClick={onAddAuthorClick}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Yazar Ekle</span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {authors.map((author) => (
          <div
            key={author.id}
            onClick={() => onAuthorClick && onAuthorClick(author)}
            className="group relative flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 transition-all hover:border-blue-300 hover:bg-white hover:shadow-xs cursor-pointer"
          >
            <img
              src={author.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
              alt={author.first_name}
              referrerPolicy="no-referrer"
              className="h-10 w-10 shrink-0 rounded-full object-cover border border-slate-200"
            />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-600">
                {author.first_name} {author.last_name}
              </h4>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-600">
                {author.province_name} | <span className="text-blue-700 font-semibold">{author.branch_name}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Kayıt: {author.created_at ? author.created_at.split(' ')[0] : '2026-08'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};
