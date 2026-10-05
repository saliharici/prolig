import React, { useState, useEffect } from 'react';
import { Payment } from '../../types';
import { CreditCard, Plus, CheckCircle2, Clock, DollarSign, ArrowUpRight, Check } from 'lucide-react';

interface PaymentsViewProps {
  onAddPayment: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ onAddPayment }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Tümü');

  const fetchPayments = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'Tümü') params.append('status', statusFilter);

    fetch(`/api/payments?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        setPayments(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await fetch(`/api/payments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchPayments();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPaid = payments
    .filter(p => p.status === 'Ödendi')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalPending = payments
    .filter(p => p.status === 'Beklemede')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Telif ve Ödeme Yönetimi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Yazar telif hak edişleri, sözleşme avansları ve soru başı ödemelerin takibi
          </p>
        </div>

        <button
          onClick={onAddPayment}
          className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni Ödeme Kaydı</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4.5 bg-white">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Ödenen Toplam Telif</span>
          <div className="mt-1 text-2xl font-black text-slate-900">
            ₺{totalPaid.toLocaleString('tr-TR')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Muhasebe tarafından dekontlandırılmış</span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4.5 bg-white">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Bekleyen Hak Ediş</span>
          <div className="mt-1 text-2xl font-black text-amber-700">
            ₺{totalPending.toLocaleString('tr-TR')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Onay sürecindeki yazar telifleri</span>
        </div>

        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4.5 bg-white">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Kayıtlı Ödeme Kalemi</span>
          <div className="mt-1 text-2xl font-black text-slate-900">
            {payments.length} Adet
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Tüm dönem işlemleri</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/60">
          <div className="flex gap-2">
            {['Tümü', 'Ödendi', 'Beklemede'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Hak Sahibi Yazar</th>
                <th className="py-3 px-4">İlgili Eser / Kitap</th>
                <th className="py-3 px-4">Ödeme Türü</th>
                <th className="py-3 px-4">Tutar (₺)</th>
                <th className="py-3 px-4">Vade / Ödeme Tarihi</th>
                <th className="py-3 px-4">Statü</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Ödemeler yükleniyor...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Kayıtlı telif ödemesi bulunmuyor.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {p.author_first_name} {p.author_last_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.author_branch_name} • {p.author_province_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {p.project_title || 'Genel Sözleşme'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      ₺{p.amount?.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{p.payment_date}</td>
                    <td className="py-3 px-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        p.status === 'Ödendi'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'Beklemede' ? (
                        <button
                          onClick={() => handleStatusChange(p.id, 'Ödendi')}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                        >
                          Ödendi Olarak İşaretle
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Dekontlandı
                        </span>
                      )}
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
