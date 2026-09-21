import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, Loader2 } from 'lucide-react';
import { TURKEY_MAP_PROVINCES } from '../turkeyMapData';

interface AddAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProvinceId?: number;
}

export const AddAuthorModal: React.FC<AddAuthorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProvinceId,
}) => {
  const [branches, setBranches] = useState<{ id: number; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: 'Yazar / Branş Uzmanı',
    institution_id: 1,
    province_id: defaultProvinceId || 34,
    district_id: '',
    branch_id: 1,
    status: 'Aktif',
    notes: '',
  });

  // Load branches & meta on open
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/meta')
      .then(res => res.json())
      .then(data => {
        setBranches(data.branches || []);
      })
      .catch(console.error);

    if (defaultProvinceId) {
      setFormData(prev => ({ ...prev, province_id: defaultProvinceId }));
    }
  }, [isOpen, defaultProvinceId]);

  // Load districts when province changes
  useEffect(() => {
    if (!formData.province_id) return;

    fetch('/api/meta')
      .then(res => res.json())
      .then(data => {
        const provDistricts = data.districts?.filter(
          (d: any) => d.province_id === Number(formData.province_id)
        ) || [];
        setDistricts(provDistricts);
        if (provDistricts.length > 0 && !formData.district_id) {
          setFormData(prev => ({ ...prev, district_id: provDistricts[0].id.toString() }));
        }
      })
      .catch(console.error);
  }, [formData.province_id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          province_id: Number(formData.province_id),
          branch_id: Number(formData.branch_id),
          district_id: formData.district_id ? Number(formData.district_id) : undefined,
          institution_id: Number(formData.institution_id),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Yazar eklenirken bir hata oluştu');
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
      <div className="relative w-full max-w-xl flex flex-col max-h-full rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Yeni Yazar Kaydı</h3>
              <p className="text-xs text-slate-500">PRO LİG yazar ve branş uzmanı veri tabanına kayıt açın</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto">
            {error && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ad *</label>
              <input
                required
                type="text"
                placeholder="Örn: Ayşe"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Soyad *</label>
              <input
                required
                type="text"
                placeholder="Örn: Yılmaz"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">E-Posta *</label>
              <input
                required
                type="email"
                placeholder="ornek@prolig.com.tr"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telefon</label>
              <input
                type="text"
                placeholder="+90 (5XX) XXX XX XX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İl (Şehir) *</label>
              <select
                value={formData.province_id}
                onChange={(e) => setFormData({ ...formData, province_id: Number(e.target.value) })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                {TURKEY_MAP_PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İlçe</label>
              <select
                value={formData.district_id}
                onChange={(e) => setFormData({ ...formData, district_id: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">Merkez / Seçiniz</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ana Branş *</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: Number(e.target.value) })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Aktif">Aktif</option>
                <option value="Beklemede">Beklemede</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unvan / Görev Tanımı</label>
            <input
              type="text"
              placeholder="Örn: Yazar / Matematik Zümre Başkanı"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Yazar Notları / Biyografi</label>
            <textarea
              rows={2}
              placeholder="Yazarın tecrübesi, daha önce yazdığı yayınlar veya koordinatör notu..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer Actions */}
          <div className="shrink-0 flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
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
              className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Yazarı Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
