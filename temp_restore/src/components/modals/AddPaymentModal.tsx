import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check, Loader2 } from 'lucide-react';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [authors, setAuthors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    author_id: '',
    project_id: '',
    amount: '15000',
    currency: 'TRY',
    payment_type: 'Telif',
    status: 'Beklemede',
    payment_date: '2026-09-30',
    description: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/authors?limit=50')
      .then(res => res.json())
      .then(data => {
        setAuthors(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, author_id: data[0].id.toString() }));
        }
      })
      .catch(console.error);

    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        setProjects(data || []);
        if (data && data.length > 0) {
          setFormData(prev => ({ ...prev, project_id: data[0].id.toString() }));
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
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          author_id: Number(formData.author_id),
          project_id: formData.project_id ? Number(formData.project_id) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ödeme kaydı oluşturulamadı');
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Telif ve Ödeme Kaydı Aç</h3>
              <p className="text-xs text-slate-500">Yazara hak ediş, avans veya telif ödemesi tanımlayın</p>
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
            <label className="block text-xs font-bold text-slate-700 mb-1">Hak Sahibi Yazar *</label>
            <select
              value={formData.author_id}
              onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            >
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.first_name} {a.last_name} ({a.branch_name} - {a.province_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ödeme Tutarı (₺) *</label>
              <input
                required
                type="number"
                step="500"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ödeme Türü</label>
              <select
                value={formData.payment_type}
                onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="Telif">Telif Hak Edişi</option>
                <option value="Avans">Sözleşme Avansı</option>
                <option value="Soru Başı">Soru Başı Ücret</option>
                <option value="Tashih">Tashih & İnceleme</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İlgili Eser / Kitap</label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="">Genel / Projesiz</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="Beklemede">Onay Bekliyor</option>
                <option value="Ödendi">Ödendi (Dekontlu)</option>
                <option value="İptal">İptal Edildi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ödeme / Vade Tarihi</label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama / Dekont No</label>
            <input
              type="text"
              placeholder="Örn: 1. Baskı 1. Taksit Telif Ödemesi"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-amber-500 focus:outline-hidden"
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
              className="flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Kaydı Oluştur</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
