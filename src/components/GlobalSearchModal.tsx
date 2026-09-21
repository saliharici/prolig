import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Users, BookOpen, CheckSquare, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { TabKey } from './Sidebar';

import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: TabKey, itemId?: number) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    authors: any[];
    projects: any[];
    tasks: any[];
    provinces: any[];
  }>({
    authors: [],
    projects: [],
    tasks: [],
    provinces: [],
  });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ authors: [], projects: [], tasks: [], provinces: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ authors: [], projects: [], tasks: [], provinces: [] });
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const totalResults =
    results.authors.length +
    results.projects.length +
    results.tasks.length +
    results.provinces.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 font-sans">
          {/* Arka Plan Bulanıklığı (Backdrop) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-3xl rounded-2xl border border-white/20 bg-white/70 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center border-b border-slate-200/50 px-5 py-4 bg-white/50">
              <Search className="h-6 w-6 text-indigo-500 mr-4" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Yazar adı, branş, kitap, görev veya il arayın..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-lg font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {loading && <Loader2 className="h-5 w-5 animate-spin text-indigo-500 mr-3" />}
              {query && (
                <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 mr-3 transition-colors bg-slate-100 rounded-full">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm hover:bg-slate-50 transition-colors"
          >
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-10 text-center text-xs text-slate-400">
              <p className="font-semibold text-slate-600 mb-1">Aramaya Başlayın</p>
              <p>Örnek aramalar: "Matematik", "İstanbul", "Ritim Biyoloji", "Ahmet", "Deneme"</p>
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="py-10 text-center text-xs text-slate-400">
              "{query}" ile eşleşen sonuç bulunamadı.
            </div>
          ) : (
            <>
              {/* Authors Group */}
              {results.authors.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>Yazarlar ({results.authors.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.authors.map((author) => (
                      <button
                        key={author.id}
                        onClick={() => {
                          onNavigate('authors', author.id);
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={author.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {author.first_name} {author.last_name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {author.province_name} • {author.branch_name}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-0.5">
                          Görüntüle <ChevronRight className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects Group */}
              {results.projects.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Projeler / Kitaplar ({results.projects.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          onNavigate('projects', proj.id);
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{proj.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {proj.branch_name} • {proj.target_grade} • Durum: {proj.status}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-0.5">
                          Projeye Git <ChevronRight className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Provinces Group */}
              {results.provinces.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>İller ({results.provinces.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.provinces.map((prov) => (
                      <button
                        key={prov.id}
                        onClick={() => {
                          onNavigate('map', prov.id);
                          onClose();
                        }}
                        className="flex w-full items-center justify-between rounded-lg p-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {prov.plate_code}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{prov.name}</span>
                          <span className="text-[11px] text-slate-400">({prov.region})</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
                          Haritada Gör <ChevronRight className="h-3 w-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 bg-slate-50 text-[11px] text-slate-400">
          <span>Hızlı arama için <kbd className="font-mono bg-white px-1 border rounded">Enter</kbd> tuşunu kullanabilirsiniz</span>
          <button onClick={onClose} className="font-medium text-slate-600 hover:underline">
            Kapat
          </button>
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
