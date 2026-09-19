import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Check, Loader2 } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [projects, setProjects] = useState<{ id: number; title: string }[]>([]);
  const [authors, setAuthors] = useState<{ id: number; first_name: string; last_name: string; branch_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    project_id: '',
    assigned_to_author_id: '',
    due_date: '2026-10-15',
    priority: 'Yüksek',
    status: 'Yapılacak',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, project_id: data[0].id.toString() }));
        }
      })
      .catch(console.error);

    fetch('/api/authors?limit=50')
      .then(res => res.json())
      .then(data => {
        setAuthors(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, assigned_to_author_id: data[0].id.toString() }));
        }
      })
      .catch(console.error);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          project_id: formData.project_id ? Number(formData.project_id) : undefined,
          assigned_to_author_id: formData.assigned_to_author_id ? Number(formData.assigned_to_author_id) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Görev eklenemedi');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Yeni Görev Tanımla</h3>
              <p className="text-xs text-slate-500">Yazar veya editöre proje bazlı iş paketi atayın</p>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Görev Başlığı *</label>
            <input
              required
              type="text"
              placeholder="Örn: 2. Ünite Beceri Temelli Soruların Tamamlanması"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İlgili Proje *</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Atanan Yazar</label>
              <select
                value={formData.assigned_to_author_id}
                onChange={(e) => setFormData({ ...formData, assigned_to_author_id: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="">Atama Yapılmadı (Boş)</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.first_name} {a.last_name} ({a.branch_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Öncelik Derecesi</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="Acil">Acil (Kritik)</option>
                <option value="Yüksek">Yüksek</option>
                <option value="Normal">Normal</option>
                <option value="Düşük">Düşük</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bitiş Tarihi *</label>
              <input
                required
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama / Yönerge</label>
            <textarea
              rows={2}
              placeholder="Yazarın dikkat etmesi gereken soru kalıpları veya çizim talepleri..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-hidden"
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
              className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Atanıyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Görevi Ata</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
