import React, { useState, useEffect } from 'react';
import { X, BookPlus, Check, Loader2 } from 'lucide-react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    branch_id: 1,
    target_grade: '11. Sınıf',
    project_type: 'Soru Bankası',
    status: 'Devam Ediyor',
    start_date: new Date().toISOString().split('T')[0],
    target_end_date: '2026-11-30',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/meta')
      .then(res => res.json())
      .then(data => {
        setBranches(data.branches || []);
      })
      .catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          branch_id: Number(formData.branch_id),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Proje eklenemedi');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <BookPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Yeni Proje / Kitap Oluştur</h3>
              <p className="text-xs text-slate-500">Yayın planına yeni bir eser kaydı tanımlayın</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Kitap / Proje Başlığı *</label>
            <input
              required
              type="text"
              placeholder="Örn: TYT Kimya Akıllı Soru Bankası"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branş *</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hedef Seviye / Sınıf</label>
              <select
                value={formData.target_grade}
                onChange={(e) => setFormData({ ...formData, target_grade: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="LGS (8. Sınıf)">LGS (8. Sınıf)</option>
                <option value="9. Sınıf">9. Sınıf</option>
                <option value="10. Sınıf">10. Sınıf</option>
                <option value="11. Sınıf">11. Sınıf</option>
                <option value="TYT (YKS 1. Oturum)">TYT (YKS 1. Oturum)</option>
                <option value="AYT (YKS 2. Oturum)">AYT (YKS 2. Oturum)</option>
                <option value="KPSS">KPSS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Yayın Türü</label>
              <select
                value={formData.project_type}
                onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="Soru Bankası">Soru Bankası</option>
                <option value="Konu Anlatımı">Konu Anlatımı</option>
                <option value="Fasikül">Fasikül Seti</option>
                <option value="Deneme Sınavı">Deneme Sınavı</option>
                <option value="Yaprak Test">Yaprak Test</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Başlangıç Durumu</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              >
                <option value="Planlama">Planlama</option>
                <option value="Devam Ediyor">Devam Ediyor</option>
                <option value="Kontrol">Kontrol / Tashih</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hedef Teslim Tarihi *</label>
              <input
                required
                type="date"
                value={formData.target_end_date}
                onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Proje Açıklaması</label>
            <textarea
              rows={2}
              placeholder="Yayın hedefi, sayfa tahmini veya müfredat kazanımları..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Projeyi Başlat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
