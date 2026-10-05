import React from 'react';
import { Building2, ChevronRight } from 'lucide-react';

interface HorizontalBarChartProps {
  data: {
    province_name: string;
    province_id: number;
    author_count: number;
    percentage: number;
  }[];
  onSelectProvince?: (provinceId: number) => void;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, onSelectProvince }) => {
  return (
    <div id="chart-province-distribution" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Building2 className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">İllere Göre Yazar Dağılımı</h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400">En Çok Yazar Bulunan İller</span>
      </div>

      <div className="mt-4 space-y-3">
        {data.slice(0, 7).map((item, index) => {
          return (
            <div
              key={item.province_id}
              onClick={() => onSelectProvince && onSelectProvince(item.province_id)}
              className="group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 group-hover:text-blue-600 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 w-3">{index + 1}.</span>
                  {item.province_name}
                </span>
                <span className="font-bold text-slate-900">{item.author_count} Yazar</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 group-hover:from-blue-600 group-hover:to-indigo-700"
                  style={{ width: `${Math.max(8, item.percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
