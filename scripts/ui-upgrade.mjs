import fs from 'fs';

// 1. Upgrade Header
let header = fs.readFileSync('src/components/Header.tsx', 'utf8');
header = header.replace(/bg-white shadow-sm(.*?)/g, 'sticky top-0 z-40 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200/80$1');
fs.writeFileSync('src/components/Header.tsx', header, 'utf8');

// 2. Upgrade KpiCard
let kpi = fs.readFileSync('src/components/KpiCard.tsx', 'utf8');
kpi = kpi.replace(/bg-white rounded-2xl p-5 shadow-sm border border-slate-100/g, 'bg-white rounded-2xl p-6 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300');
fs.writeFileSync('src/components/KpiCard.tsx', kpi, 'utf8');

// 3. Upgrade Sidebar Active State
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(/\? 'bg-emerald-500\/10 text-emerald-400'/g, "? 'bg-gradient-to-r from-emerald-500/15 to-transparent text-emerald-400 border-l-4 border-emerald-500 rounded-r-xl rounded-l-sm'");
fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');

// 4. Upgrade Landing Page Input & Buttons
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/bg-slate-900 hover:bg-slate-800/g, 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300');
app = app.replace(/bg-slate-50 border border-slate-200/g, 'bg-slate-50/50 border border-slate-200/60 backdrop-blur-sm focus:bg-white');
fs.writeFileSync('src/App.tsx', app, 'utf8');

console.log('UI Upgraded');
