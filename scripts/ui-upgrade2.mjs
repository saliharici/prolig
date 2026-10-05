import fs from 'fs';

// 1. KpiCard.tsx - Upgrade shadows and lift
let kpi = fs.readFileSync('src/components/KpiCard.tsx', 'utf8');
kpi = kpi.replace(/shadow-2xs transition-all hover:shadow-xs hover:border-slate-300\/80 bg-white/g, 'shadow-sm transition-all duration-300 hover:shadow-xl hover:border-slate-300/80 hover:-translate-y-1 bg-white');
fs.writeFileSync('src/components/KpiCard.tsx', kpi, 'utf8');

// 2. Sidebar.tsx - Upgrade active tab styling
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
// Active tab: bg-emerald-500/10 text-emerald-400
sidebar = sidebar.replace(/bg-blue-600 text-white/g, 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20');
sidebar = sidebar.replace(/bg-slate-800 text-white/g, 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md shadow-slate-900/20');
sidebar = sidebar.replace(/hover:bg-slate-50 text-slate-700/g, 'hover:bg-slate-50 text-slate-700 hover:pl-5 transition-all duration-300');
fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');

// 3. App.tsx - Upgrade Landing Page
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/bg-slate-900 hover:bg-slate-800/g, 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300');
app = app.replace(/bg-slate-50 border border-slate-200/g, 'bg-white/80 border border-slate-200/60 backdrop-blur-sm focus:bg-white shadow-inner');
app = app.replace(/bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900/g, 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-800 to-slate-950');
fs.writeFileSync('src/App.tsx', app, 'utf8');

console.log('UI Upgraded v2');
