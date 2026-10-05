import React from 'react';
import { motion } from 'motion/react';

interface PageBannerProps {
  title: React.ReactNode;
  description: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  gradient?: string;
  orb1Color?: string;
  orb2Color?: string;
}

export function PageBanner({
  title,
  description,
  badge,
  actions,
  gradient = "from-slate-900 via-indigo-950 to-slate-900",
  orb1Color = "bg-blue-500",
  orb2Color = "bg-purple-500"
}: PageBannerProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`bg-gradient-to-r ${gradient} rounded-[2rem] p-8 sm:p-10 text-white shadow-2xl shadow-indigo-900/20 relative overflow-hidden border border-white/10 mb-8`}
    >
      {/* Işık Hüzmeleri (Orbs) */}
      <div className={`absolute top-0 right-0 w-72 h-72 ${orb1Color} rounded-full blur-[100px] opacity-30 -mr-20 -mt-20 pointer-events-none`}></div>
      <div className={`absolute bottom-0 right-1/4 w-56 h-56 ${orb2Color} rounded-full blur-[80px] opacity-30 pointer-events-none`}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold tracking-wider text-blue-200 mb-4">
              {badge}
            </div>
          )}
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            {title}
          </h2>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl font-light leading-relaxed">
            {description}
          </p>
        </div>
        
        {actions && (
          <div className="flex flex-wrap gap-4">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
