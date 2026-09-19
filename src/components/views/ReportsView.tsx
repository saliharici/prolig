import React, { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, Users, BookOpen, MapPin, CreditCard } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports')
      .then(res => res.json())
      .then(data => {
        setReportData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleExportCSV = () => {
    window.open('/api/reports/export-csv', '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Kurumsal Raporlar ve Analitik</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            İl bazlı yazar yoğunluğu, branş dağılımı ve yayın performans metrikleri
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Excel / CSV Raporunu İndir</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Rapor verileri hazırlanıyor...</div>
      ) : (
        <>
          {/* Key Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Toplam Yazar</span>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {reportData?.summary?.totalAuthors || 0}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Türkiye Geneli Aktif Kadro
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Temsil Edilen İl</span>
              <div className="mt-1 text-2xl font-black text-blue-600">
                {reportData?.summary?.totalProvinces || 0} / 81
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                Bölgesel Yayılım Oranı %31
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Yayın Projeleri</span>
              <div className="mt-1 text-2xl font-black text-indigo-600">
                {reportData?.summary?.activeProjects || 0} Aktif
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                {reportData?.summary?.completedProjects || 0} Tamamlanan Kitap
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telif Ödeme Toplamı</span>
              <div className="mt-1 text-2xl font-black text-slate-900">
                ₺{reportData?.summary?.totalPaymentsAmount?.toLocaleString('tr-TR') || '0'}
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                Ödenmiş Telif Hak Edişi
              </span>
            </div>
          </div>

          {/* Regional Table & Branch Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Provinces Report */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900">İl Bazlı Yazar ve Kapasite Dağılımı</h3>
                <span className="text-[11px] text-slate-400">En Çok Yazar Bulunan 10 İl</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">İl Adı</th>
                      <th className="pb-2">Yazar Sayısı</th>
                      <th className="pb-2 text-right">Oran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData?.provinceDistribution?.slice(0, 10).map((p: any, idx: number) => (
                      <tr key={p.province_id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-bold text-slate-800">
                          <span className="text-slate-400 font-normal mr-2">{idx + 1}.</span>
                          {p.province_name}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-700">{p.author_count} Yazar</td>
                        <td className="py-2.5 text-right font-semibold text-blue-600">
                          %{p.percentage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Branch Performance Report */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900">Branş Dağılım İstatistiği</h3>
                <span className="text-[11px] text-slate-400">Zümre Büyüklükleri</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                      <th className="pb-2">Branş</th>
                      <th className="pb-2">Uzman Sayısı</th>
                      <th className="pb-2 text-right">Zümre Payı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData?.branchDistribution?.map((b: any) => (
                      <tr key={b.branch_name} className="hover:bg-slate-50">
                        <td className="py-2.5 font-bold text-slate-800 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                          {b.branch_name}
                        </td>
                        <td className="py-2.5 font-semibold text-slate-700">{b.author_count} Yazar</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900">
                          %{b.percentage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
