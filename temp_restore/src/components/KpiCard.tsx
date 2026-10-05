import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface KpiCardProps {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
  };
  icon: LucideIcon;
  variant: 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan';
}

const variantStyles = {
  blue: {
    bg: 'bg-blue-50/60',
    border: 'border-blue-100',
    iconBg: 'bg-blue-600 text-white',
    accentText: 'text-blue-700',
    numColor: 'text-slate-900',
  },
  emerald: {
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-600 text-white',
    accentText: 'text-emerald-700',
    numColor: 'text-slate-900',
  },
  violet: {
    bg: 'bg-indigo-50/60',
    border: 'border-indigo-100',
    iconBg: 'bg-indigo-600 text-white',
    accentText: 'text-indigo-700',
    numColor: 'text-slate-900',
  },
  amber: {
    bg: 'bg-amber-50/60',
    border: 'border-amber-100',
    iconBg: 'bg-amber-500 text-white',
    accentText: 'text-amber-800',
    numColor: 'text-slate-900',
  },
  cyan: {
    bg: 'bg-cyan-50/60',
    border: 'border-cyan-100',
    iconBg: 'bg-cyan-600 text-white',
    accentText: 'text-cyan-700',
    numColor: 'text-slate-900',
  },
};

export const KpiCard: React.FC<KpiCardProps> = ({
  id,
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-xl border ${styles.border} ${styles.bg} p-4.5 shadow-2xs transition-all hover:shadow-xs hover:border-slate-300/80 bg-white`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
            {title}
          </span>
          <div className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">
            {value}
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} shadow-xs`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2.5">
        <span className="text-slate-500 font-medium truncate pr-2">
          {subtitle}
        </span>
        {trend && (
          <div
            className={`flex shrink-0 items-center gap-1 font-semibold ${
              trend.isNeutral
                ? 'text-slate-500'
                : trend.isPositive
                ? 'text-emerald-600'
                : 'text-rose-600'
            }`}
          >
            {trend.isNeutral ? (
              <Minus className="h-3.5 w-3.5" />
            ) : trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
    </div>
  );
};
