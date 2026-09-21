import React, { useState, useMemo, useRef } from 'react';
import { TURKEY_MAP_PROVINCES, TURKEY_MAP_VIEWBOX, ProvinceMapItem } from './turkeyMapData';
import { Province, Author } from '../types';
import {
  Users, MapPin, Plus, Search, Layers, Compass, ZoomIn, ZoomOut, RotateCcw,
  BookOpen, Award, CheckCircle2, ChevronRight, UserPlus, Info
} from 'lucide-react';

interface TurkeyMapProps {
  mapData: Province[];
  onAddAuthorClick: (provinceId?: number) => void;
  onAuthorClick?: (author: Author) => void;
}

type ColorMode = 'density' | 'region';

export const TurkeyMap: React.FC<TurkeyMapProps> = ({
  mapData,
  onAddAuthorClick,
  onAuthorClick,
}) => {
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(34); // Default to Istanbul
  const [hoveredProvince, setHoveredProvince] = useState<ProvinceMapItem | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('Tümü');
  const [colorMode, setColorMode] = useState<ColorMode>('density');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [provinceAuthors, setProvinceAuthors] = useState<Author[]>([]);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Region colors for 'region' view mode (Professional institutional palette)
  const regionColors: Record<string, { fill: string; border: string; bgBadge: string; textBadge: string }> = {
    'Marmara': { fill: '#312e81', border: '#4f46e5', bgBadge: 'bg-indigo-900/50', textBadge: 'text-indigo-300' },
    'Ege': { fill: '#064e3b', border: '#10b981', bgBadge: 'bg-emerald-900/50', textBadge: 'text-emerald-300' },
    'Akdeniz': { fill: '#78350f', border: '#f59e0b', bgBadge: 'bg-amber-900/50', textBadge: 'text-amber-300' },
    'İç Anadolu': { fill: '#7c2d12', border: '#f97316', bgBadge: 'bg-orange-900/50', textBadge: 'text-orange-300' },
    'Karadeniz': { fill: '#0c4a6e', border: '#0ea5e9', bgBadge: 'bg-sky-900/50', textBadge: 'text-sky-300' },
    'Doğu Anadolu': { fill: '#4c1d95', border: '#8b5cf6', bgBadge: 'bg-purple-900/50', textBadge: 'text-purple-300' },
    'Güneydoğu Anadolu': { fill: '#881337', border: '#f43f5e', bgBadge: 'bg-rose-900/50', textBadge: 'text-rose-300' },
  };

  // Map province counts from database records
  const countsByProvinceId = useMemo(() => {
    const map = new Map<number, { count: number; active: number; name: string }>();
    for (const item of mapData) {
      map.set(item.id, {
        count: item.author_count || 0,
        active: item.active_author_count || 0,
        name: item.name,
      });
    }
    return map;
  }, [mapData]);

  // Fetch authors for the selected province
  React.useEffect(() => {
    if (!selectedProvinceId) return;

    let isMounted = true;
    setIsLoadingAuthors(true);
    fetch(`/api/authors?province_id=${selectedProvinceId}`)
      .then(res => res.json())
      .then((data: Author[]) => {
        if (isMounted) {
          setProvinceAuthors(data || []);
          setIsLoadingAuthors(false);
        }
      })
      .catch(err => {
        console.error('Error fetching province authors:', err);
        if (isMounted) setIsLoadingAuthors(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedProvinceId]);

  // Maximum author count for heatmap calculation
  const maxCount = useMemo(() => {
    let max = 1;
    for (const item of mapData) {
      if ((item.author_count || 0) > max) max = item.author_count || 0;
    }
    return max;
  }, [mapData]);

  // Currently selected province data
  const selectedProvinceData = useMemo(() => {
    if (!selectedProvinceId) return null;
    return TURKEY_MAP_PROVINCES.find(p => p.id === selectedProvinceId) || null;
  }, [selectedProvinceId]);

  const selectedStats = selectedProvinceId ? countsByProvinceId.get(selectedProvinceId) : null;

  // Filtered provinces for search autocomplete
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return TURKEY_MAP_PROVINCES.filter(p =>
      p.name.toLocaleLowerCase('tr').includes(searchQuery.toLocaleLowerCase('tr')) ||
      p.code.includes(searchQuery)
    ).slice(0, 8);
  }, [searchQuery]);

  // Determine fill color for political vector map (DARK HOLOGRAPHIC THEME)
  const getProvinceColor = (prov: ProvinceMapItem, isSelected: boolean, isHovered: boolean) => {
    if (isSelected) {
      return { fill: '#3b82f6', stroke: '#ffffff', strokeWidth: 1.8 };
    }

    if (colorMode === 'region') {
      const regStyle = regionColors[prov.region] || { fill: '#334155', border: '#475569' };
      if (selectedRegion !== 'Tümü' && prov.region !== selectedRegion) {
        return { fill: '#0f172a', stroke: '#1e293b', strokeWidth: 0.8 };
      }
      return {
        fill: isHovered ? '#60a5fa' : regStyle.fill,
        stroke: isHovered ? '#bfdbfe' : '#475569',
        strokeWidth: isHovered ? 1.5 : 0.9,
      };
    }

    // Default: Density Heatmap mode (Dark)
    const count = countsByProvinceId.get(prov.id)?.count || 0;

    if (selectedRegion !== 'Tümü' && prov.region !== selectedRegion) {
      return { fill: '#0f172a', stroke: '#1e293b', strokeWidth: 0.8 };
    }

    if (isHovered) {
      return { fill: '#3b82f6', stroke: '#bfdbfe', strokeWidth: 1.8 };
    }

    if (count === 0) {
      return { fill: '#1e293b', stroke: '#475569', strokeWidth: 0.9 };
    }

    const ratio = count / maxCount;
    if (ratio >= 0.7) return { fill: '#93c5fd', stroke: '#bfdbfe', strokeWidth: 1.2 }; // Top tier (brightest soft blue)
    if (ratio >= 0.4) return { fill: '#60a5fa', stroke: '#93c5fd', strokeWidth: 1.1 };
    if (ratio >= 0.2) return { fill: '#3b82f6', stroke: '#60a5fa', strokeWidth: 1 };
    if (ratio >= 0.1) return { fill: '#2563eb', stroke: '#3b82f6', strokeWidth: 0.9 };
    if (ratio >= 0.04) return { fill: '#1d4ed8', stroke: '#2563eb', strokeWidth: 0.9 };
    return { fill: '#1e3a8a', stroke: '#1d4ed8', strokeWidth: 0.9 };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const allRegions = ['Tümü', 'Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];

  return (
    <div id="turkey-map-container" className="rounded-3xl border border-indigo-900/30 bg-[#0B1120] p-6 shadow-2xl relative overflow-hidden">
      {/* Background glowing effects for the whole widget */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Top Header & Interactive Filtering Tools */}
      <div className="relative z-10 flex flex-col gap-4 border-b border-white/5 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Compass className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Türkiye Yazar Ağı Radarı</h2>
            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-[11px] font-bold text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
              Canlı Radar
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-300 font-light">
            Resmi il mülki sınırları üzerinden gerçek zamanlı yazar kadroları, branş yoğunluğu ve bölgesel dağılım
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input with Autocomplete */}
          <div className="relative min-w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-300" />
            <input
              type="text"
              placeholder="İl Ara (Örn: Ankara, 06)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-600/80 bg-[#1e293b]/60 pl-8 pr-3 text-xs text-white placeholder-slate-400 focus:border-blue-400 focus:bg-[#1e293b] focus:outline-hidden"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-10 left-0 z-30 w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                {searchResults.map((p) => {
                  const c = countsByProvinceId.get(p.id)?.count || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvinceId(p.id);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-200 hover:bg-blue-500/20 hover:text-blue-200 border-b border-slate-700/50 last:border-0"
                    >
                      <span className="font-semibold">{p.name} ({p.code})</span>
                      <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-200">
                        {c} Yazar
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Color Mode Toggle */}
          <div className="flex rounded-lg border border-slate-600/80 p-0.5 bg-[#1e293b]/60">
            <button
              onClick={() => setColorMode('density')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                colorMode === 'density'
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Yoğunluk</span>
            </button>
            <button
              onClick={() => setColorMode('region')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                colorMode === 'region'
                  ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Bölgeler</span>
            </button>
          </div>

          {/* Add Author Action */}
          <button
            onClick={() => onAddAuthorClick(selectedProvinceId || undefined)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni Yazar Ekle</span>
          </button>
        </div>
      </div>

      {/* Region Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-white/5 pb-4 relative z-10">
        <span className="text-[11px] font-bold text-slate-300 mr-2 uppercase tracking-wider">Bölge Filtresi:</span>
        {allRegions.map((region) => (
          <button
            key={region}
            onClick={() => setSelectedRegion(region)}
            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
              selectedRegion === region
                ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]'
                : 'bg-[#1e293b]/80 text-slate-300 border border-slate-600/50 hover:bg-[#334155] hover:text-white'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* Map Layout: SVG Political Map (8 cols) + Selected Province Details (4 cols) */}
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* SVG Interactive Map Area */}
        <div
          ref={mapContainerRef}
          onMouseMove={handleMouseMove}
          className="relative flex flex-col items-center justify-between rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#020617] p-4 lg:col-span-8 overflow-hidden shadow-2xl shadow-blue-900/10"
        >
          {/* Decorative glowing orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

          {/* Top Bar: Marine Labels & Legend */}
          <div className="flex w-full items-center justify-between text-xs text-slate-300 z-10">
            {/* Marine water body identifier */}
            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 italic select-none">
              <span>⚓ Karadeniz</span>
              <span>• Marmara Denizi</span>
              <span>• Ege Denizi</span>
              <span>• Akdeniz</span>
            </div>

            {/* Density scale legend */}
            {colorMode === 'density' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Az (0-2)</span>
                <div className="flex h-2.5 w-28 overflow-hidden rounded-full border border-slate-600 shadow-2xs">
                  <div className="h-full w-1/5 bg-[#172554]" title="1-3 Yazar" />
                  <div className="h-full w-1/5 bg-[#1e3a8a]" title="4-6 Yazar" />
                  <div className="h-full w-1/5 bg-[#1d4ed8]" title="7-10 Yazar" />
                  <div className="h-full w-1/5 bg-[#3b82f6]" title="11-15 Yazar" />
                  <div className="h-full w-1/5 bg-[#60a5fa]" title="16+ Yazar" />
                </div>
                <span className="text-[10px] font-bold text-slate-200">Çok (16+)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] font-medium text-slate-300">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" /> Marmara
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" /> Ege
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" /> Akdeniz
                <span className="inline-block h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]" /> Karadeniz
              </div>
            )}
          </div>

          {/* Zoom controls float on upper-right */}
          <div className="absolute right-4 top-12 z-20 flex flex-col gap-1 rounded-lg border border-slate-700/80 bg-[#0f172a]/90 p-1 shadow-xl backdrop-blur-md">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))}
              title="Yakınlaştır"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
              title="Uzaklaştır"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title="Sıfırla"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white border-t border-slate-700/50 mt-1 pt-1 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* The High-Precision Political SVG Map */}
          <div className="relative w-full aspect-[1030/460] my-2 transition-transform duration-200" style={{ transform: `scale(${zoomLevel})` }}>
            <svg
              viewBox={TURKEY_MAP_VIEWBOX}
              className="h-full w-full select-none"
              style={{ filter: 'drop-shadow(0 3px 6px rgba(15, 23, 42, 0.08))' }}
            >
              <defs>
                {/* Subtle sea pattern grid */}
                <pattern id="sea-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                </pattern>
                {/* Active province glow filter */}
                <filter id="glow-selected" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#60a5fa" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* Water background layer */}
              <rect x="0" y="100" width="1050" height="500" fill="url(#sea-grid)" opacity="0.4" />

              {/* Lakes (Van Gölü and Tuz Gölü for genuine political geography) */}
              <ellipse cx="945" cy="385" rx="18" ry="14" fill="#0f172a" stroke="#1e3a8a" strokeWidth="0.8" pointerEvents="none" />
              <text x="945" y="388" fontSize="7px" fill="#3b82f6" textAnchor="middle" fontStyle="italic" pointerEvents="none">Van G.</text>

              <ellipse cx="445" cy="360" rx="14" ry="24" fill="#0f172a" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2,2" pointerEvents="none" />
              <text x="445" y="363" fontSize="6px" fill="#475569" textAnchor="middle" fontStyle="italic" pointerEvents="none">Tuz G.</text>

              {/* 81 Turkish Provinces (Detailed Political Boundaries) */}
              {TURKEY_MAP_PROVINCES.map((prov) => {
                const isSelected = selectedProvinceId === prov.id;
                const isHovered = hoveredProvince?.id === prov.id;
                const style = getProvinceColor(prov, isSelected, isHovered);
                const stats = countsByProvinceId.get(prov.id);
                const count = stats?.count || 0;

                return (
                  <g
                    key={prov.id}
                    id={`province-${prov.slug}`}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredProvince(prov)}
                    onMouseLeave={() => setHoveredProvince(null)}
                    onClick={() => setSelectedProvinceId(prov.id)}
                  >
                    <path
                      d={prov.d}
                      fill={style.fill}
                      stroke={style.stroke}
                      strokeWidth={style.strokeWidth}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                      filter={isSelected ? 'url(#glow-selected)' : undefined}
                      className="transition-colors duration-150"
                    />

                    {/* Author count badge / pin on province center */}
                    {count > 0 && (
                      <g pointerEvents="none">
                        <circle
                          cx={prov.x}
                          cy={prov.y}
                          r={isSelected ? 9 : count >= 10 ? 8 : 6.5}
                          fill={isSelected ? '#FFFFFF' : '#0F172A'}
                          stroke={isSelected ? '#1D4ED8' : '#FFFFFF'}
                          strokeWidth="1.2"
                        />
                        <text
                          x={prov.x}
                          y={prov.y + 3}
                          textAnchor="middle"
                          fill={isSelected ? '#1D4ED8' : '#FFFFFF'}
                          fontSize={isSelected ? '8px' : count >= 10 ? '7.5px' : '7px'}
                          fontWeight="800"
                        >
                          {count}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Dynamic Floating Tooltip */}
            {hoveredProvince && (
              <div
                className="pointer-events-none absolute z-50 rounded-lg bg-slate-900/95 px-3 py-2 text-white shadow-xl backdrop-blur-xs transition-all border border-slate-700/80"
                style={{
                  left: `${Math.min(Math.max(mousePos.x, 90), 620)}px`,
                  top: `${Math.max(mousePos.y - 65, 10)}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="text-white">{hoveredProvince.name}</span>
                  <span className="rounded bg-blue-600 px-1.5 py-0.2 text-[10px] font-mono text-white">
                    {hoveredProvince.code}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {hoveredProvince.region}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-300">
                  <span>Kayıtlı Yazar: <strong className="text-white font-bold">{countsByProvinceId.get(hoveredProvince.id)?.count || 0}</strong></span>
                  <span>Aktif: <strong className="text-emerald-400 font-bold">{countsByProvinceId.get(hoveredProvince.id)?.active || 0}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Jump Hotspot Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-700/50 pt-3 w-full relative z-10">
            <span className="text-[11px] text-slate-300 font-medium">Önemli Merkezler:</span>
            {[
              { id: 34, name: 'İstanbul' },
              { id: 6, name: 'Ankara' },
              { id: 35, name: 'İzmir' },
              { id: 16, name: 'Bursa' },
              { id: 7, name: 'Antalya' },
              { id: 25, name: 'Erzurum' },
              { id: 27, name: 'Gaziantep' },
              { id: 61, name: 'Trabzon' },
              { id: 65, name: 'Van' },
              { id: 21, name: 'Diyarbakır' },
            ].map(item => {
              const c = countsByProvinceId.get(item.id)?.count || 0;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedProvinceId(item.id)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.8 text-[11px] font-semibold transition-all ${
                    selectedProvinceId === item.id
                      ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]'
                      : 'bg-[#1e293b]/80 text-slate-200 border border-slate-600/50 hover:border-blue-400 hover:bg-blue-900/50'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    selectedProvinceId === item.id ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Province Details Inspector (4 cols) */}
        <div className="flex flex-col justify-between rounded-2xl border border-indigo-500/20 bg-[#0f172a]/80 p-5 shadow-2xl backdrop-blur-md lg:col-span-4 relative overflow-hidden">
          {/* Subtle inner glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>
          
          <div className="relative z-10">
            {/* Province Header */}
            <div className="flex items-start justify-between border-b border-slate-700/50 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-500/20 px-2 py-0.5 font-mono text-xs font-bold text-blue-300 border border-blue-500/30">
                    {selectedProvinceData?.code || '34'}
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {selectedProvinceData?.name || 'İstanbul'}
                  </h3>
                </div>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-300 font-medium">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {selectedProvinceData?.region || 'Marmara'} Bölgesi
                </span>
              </div>

              <button
                onClick={() => onAddAuthorClick(selectedProvinceId || undefined)}
                className="flex items-center gap-1 rounded-lg bg-blue-500/20 px-2.5 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                title="Bu İle Yazar Ekle"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Yazar Ata</span>
              </button>
            </div>

            {/* Key Statistics for Selected Province */}
            <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-700/50">
              <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-600/50 backdrop-blur-sm">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Kayıtlı Yazar</span>
                <div className="mt-0.5 text-2xl font-black text-white">
                  {selectedStats?.count || 0}
                </div>
                <span className="text-[10px] text-slate-400">Milli Eğitim ve Özel</span>
              </div>

              <div className="rounded-xl bg-emerald-900/40 p-3 border border-emerald-500/30 backdrop-blur-sm">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Aktif Görevde</span>
                <div className="mt-0.5 text-2xl font-black text-emerald-400">
                  {selectedStats?.active || 0}
                </div>
                <span className="text-[10px] text-emerald-400/80 font-medium">Komisyon Üyesi</span>
              </div>
            </div>

            {/* Province Authors List */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Yerel Yazar Kadrosu ({provinceAuthors.length})
                </h4>
                {provinceAuthors.length > 0 && (
                  <span className="text-[11px] text-blue-300 font-semibold cursor-pointer hover:text-blue-200">Tümünü İncele</span>
                )}
              </div>

              {isLoadingAuthors ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Yazar listesi taranıyor...
                </div>
              ) : provinceAuthors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/50 p-6 text-center backdrop-blur-sm">
                  <Info className="mx-auto h-6 w-6 text-slate-400" />
                  <p className="mt-2 text-xs font-semibold text-slate-200">Henüz Kayıtlı Yazar Yok</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Bu ilde henüz zümre yazarı görevlendirilmedi.
                  </p>
                  <button
                    onClick={() => onAddAuthorClick(selectedProvinceId || undefined)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_10px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    <span>İlk Yazarı Ekle</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                  {provinceAuthors.map((author) => (
                    <div
                      key={author.id}
                      onClick={() => onAuthorClick && onAuthorClick(author)}
                      className="group flex items-center justify-between rounded-xl border border-slate-600/50 bg-slate-800/60 p-2.5 transition-all hover:border-blue-400/50 hover:bg-blue-900/30 cursor-pointer shadow-lg backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={author.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={author.first_name}
                            referrerPolicy="no-referrer"
                            className="h-9 w-9 rounded-full object-cover border border-slate-600"
                          />
                          <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-800 shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                            {author.first_name} {author.last_name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {author.branch?.name || 'Branş Belirtilmemiş'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer of Inspector */}
          <div className="mt-4 border-t border-slate-700/50 pt-3 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>Türkiye Mülki İdare Ağı</span>
            <span className="flex items-center gap-1 text-slate-300 font-bold">
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              81 İl Aktif Sistem
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
