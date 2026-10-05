import React, { useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';

interface DonutChartProps {
  data: {
    branch_name: string;
    color: string;
    author_count: number;
    percentage: number;
  }[];
}

export const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const totalAuthors = data.reduce((acc, curr) => acc + curr.author_count, 0) || 1;

  // Calculate SVG stroke dashes for a 100x100 circle (circumference = 2 * PI * 38 ≈ 238.76)
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = data.slice(0, 7).map((item) => {
    const strokeDasharray = `${(item.author_count / totalAuthors) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += (item.author_count / totalAuthors) * 100;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const selectedItem = activeBranch ? data.find(d => d.branch_name === activeBranch) : data[0];

  return (
    <div id="chart-branch-distribution" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
            <PieChartIcon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Branşlara Göre Dağılım</h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400">Yazar Branşları</span>
      </div>

      <div className="mt-4 flex flex-col items-center sm:flex-row gap-5">
        {/* SVG Donut Ring */}
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth="14"
            />
            {slices.map((slice) => {
              const isActive = activeBranch === slice.branch_name;
              return (
                <circle
                  key={slice.branch_name}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isActive ? '17' : '14'}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-300 cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setActiveBranch(slice.branch_name)}
                  onMouseLeave={() => setActiveBranch(null)}
                />
              );
            })}
          </svg>

          {/* Centered Donut Label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-medium text-slate-400">
              {selectedItem?.branch_name || 'Toplam'}
            </span>
            <span className="text-lg font-extrabold text-slate-900">
              {selectedItem ? `%${selectedItem.percentage}` : totalAuthors}
            </span>
            <span className="text-[9px] font-semibold text-slate-500">
              {selectedItem ? `${selectedItem.author_count} Yazar` : 'Yazar'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          {data.slice(0, 8).map((item) => (
            <div
              key={item.branch_name}
              onMouseEnter={() => setActiveBranch(item.branch_name)}
              onMouseLeave={() => setActiveBranch(null)}
              className={`flex items-center justify-between rounded p-1 transition-colors cursor-pointer ${
                activeBranch === item.branch_name ? 'bg-slate-100/80 font-bold' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-slate-700 text-[11px] font-medium">{item.branch_name}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-900">
                %{item.percentage}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
