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
    'Marmara': { fill: '#E0E7FF', border: '#818CF8', bgBadge: 'bg-indigo-50', textBadge: 'text-indigo-700' },
    'Ege': { fill: '#DCFCE7', border: '#4ADE80', bgBadge: 'bg-emerald-50', textBadge: 'text-emerald-700' },
    'Akdeniz': { fill: '#FEF3C7', border: '#FBBF24', bgBadge: 'bg-amber-50', textBadge: 'text-amber-700' },
    'İç Anadolu': { fill: '#FFEDD5', border: '#FB923C', bgBadge: 'bg-orange-50', textBadge: 'text-orange-700' },
    'Karadeniz': { fill: '#CFFAFE', border: '#38BDF8', bgBadge: 'bg-sky-50', textBadge: 'text-sky-700' },
    'Doğu Anadolu': { fill: '#F3E8FF', border: '#C084FC', bgBadge: 'bg-purple-50', textBadge: 'text-purple-700' },
    'Güneydoğu Anadolu': { fill: '#FFE4E6', border: '#FB7185', bgBadge: 'bg-rose-50', textBadge: 'text-rose-700' },
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

  // Determine fill color for political vector map
  const getProvinceColor = (prov: ProvinceMapItem, isSelected: boolean, isHovered: boolean) => {
    if (isSelected) {
      return { fill: '#1D4ED8', stroke: '#0F172A', strokeWidth: 2 };
    }

    if (colorMode === 'region') {
      const regStyle = regionColors[prov.region] || { fill: '#F1F5F9', border: '#CBD5E1' };
      if (selectedRegion !== 'Tümü' && prov.region !== selectedRegion) {
        return { fill: '#F8FAFC', stroke: '#E2E8F0', strokeWidth: 0.8 };
      }
      return {
        fill: isHovered ? '#60A5FA' : regStyle.fill,
        stroke: isHovered ? '#1D4ED8' : '#94A3B8',
        strokeWidth: isHovered ? 1.8 : 0.9,
      };
    }

    // Default: Density Heatmap mode
    const count = countsByProvinceId.get(prov.id)?.count || 0;

    if (selectedRegion !== 'Tümü' && prov.region !== selectedRegion) {
      return { fill: '#F8FAFC', stroke: '#E2E8F0', strokeWidth: 0.8 };
    }

    if (isHovered) {
      return { fill: '#3B82F6', stroke: '#1E3A8A', strokeWidth: 2 };
    }

    if (count === 0) {
      return { fill: '#F1F5F9', stroke: '#CBD5E1', strokeWidth: 0.9 };
    }

    const ratio = count / maxCount;
    if (ratio >= 0.7) return { fill: '#1E3A8A', stroke: '#172554', strokeWidth: 1.2 }; // Top tier
    if (ratio >= 0.4) return { fill: '#2563EB', stroke: '#1E40AF', strokeWidth: 1.1 };
    if (ratio >= 0.2) return { fill: '#3B82F6', stroke: '#2563EB', strokeWidth: 1 };
    if (ratio >= 0.1) return { fill: '#60A5FA', stroke: '#3B82F6', strokeWidth: 0.9 };
    if (ratio >= 0.04) return { fill: '#93C5FD', stroke: '#60A5FA', strokeWidth: 0.9 };
    return { fill: '#DBEAFE', stroke: '#93C5FD', strokeWidth: 0.9 };
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
    <div id="turkey-map-container" className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      {/* Top Header & Interactive Filtering Tools */}
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
              <Compass className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Türkiye Siyasi Yazar Haritası</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/60">
              81 İl İdari Sınırları
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Resmi il mülki sınırları üzerinden gerçek zamanlı yazar kadroları, branş yoğunluğu ve bölgesel dağılım
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input with Autocomplete */}
          <div className="relative min-w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="İl Ara (Örn: Ankara, 06)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-10 left-0 z-30 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                {searchResults.map((p) => {
                  const c = countsByProvinceId.get(p.id)?.count || 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvinceId(p.id);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0"
                    >
                      <span className="font-semibold">{p.name} ({p.code})</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        {c} Yazar
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Color Mode Toggle */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setColorMode('density')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                colorMode === 'density'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Yoğunluk</span>
            </button>
            <button
              onClick={() => setColorMode('region')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all ${
                colorMode === 'region'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Bölgeler</span>
            </button>
          </div>

          {/* Add Author Action */}
          <button
            onClick={() => onAddAuthorClick(selectedProvinceId || undefined)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Yeni Yazar Ekle</span>
          </button>
        </div>
      </div>

      {/* Region Filter Bar */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
        <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">Bölge Filtresi:</span>
        {allRegions.map((region) => (
          <button
            key={region}
            onClick={() => setSelectedRegion(region)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
              selectedRegion === region
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70'
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
          className="relative flex flex-col items-center justify-between rounded-xl border border-slate-200/80 bg-gradient-to-b from-[#F0F5FA]/80 via-white to-[#F0F5FA]/60 p-4 lg:col-span-8 overflow-hidden"
        >
          {/* Top Bar: Marine Labels & Legend */}
          <div className="flex w-full items-center justify-between text-xs text-slate-500 z-10">
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
                <div className="flex h-2.5 w-28 overflow-hidden rounded-full border border-slate-200 shadow-2xs">
                  <div className="h-full w-1/5 bg-[#DBEAFE]" title="1-3 Yazar" />
                  <div className="h-full w-1/5 bg-[#93C5FD]" title="4-6 Yazar" />
                  <div className="h-full w-1/5 bg-[#60A5FA]" title="7-10 Yazar" />
                  <div className="h-full w-1/5 bg-[#2563EB]" title="11-15 Yazar" />
                  <div className="h-full w-1/5 bg-[#1E3A8A]" title="16+ Yazar" />
                </div>
                <span className="text-[10px] font-bold text-slate-800">Çok (16+)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" /> Marmara
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Ege
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Akdeniz
                <span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Karadeniz
              </div>
            )}
          </div>

          {/* Zoom controls float on upper-right */}
          <div className="absolute right-4 top-12 z-20 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-xs backdrop-blur-xs">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 1.8))}
              title="Yakınlaştır"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
              title="Uzaklaştır"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title="Sıfırla"
              className="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-t border-slate-100"
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
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2E8F0" strokeWidth="0.4" strokeDasharray="2,2" />
                </pattern>
                {/* Active province glow filter */}
                <filter id="glow-selected" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#1D4ED8" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* Water background layer */}
              <rect x="0" y="100" width="1050" height="500" fill="url(#sea-grid)" opacity="0.6" />

              {/* Lakes (Van Gölü and Tuz Gölü for genuine political geography) */}
              <ellipse cx="945" cy="385" rx="18" ry="14" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.8" pointerEvents="none" />
              <text x="945" y="388" fontSize="7px" fill="#3B82F6" textAnchor="middle" fontStyle="italic" pointerEvents="none">Van G.</text>

              <ellipse cx="445" cy="360" rx="14" ry="24" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="0.8" strokeDasharray="2,2" pointerEvents="none" />
              <text x="445" y="363" fontSize="6px" fill="#94A3B8" textAnchor="middle" fontStyle="italic" pointerEvents="none">Tuz G.</text>

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
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 pt-3 w-full">
            <span className="text-[11px] text-slate-400 font-medium">Önemli Merkezler:</span>
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
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                  }`}
                >
                  <span>{item.name}</span>
                  <span className={`rounded-full px-1.2 py-0.2 text-[9px] ${
                    selectedProvinceId === item.id ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {c}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Province Details Inspector (4 cols) */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs lg:col-span-4">
          <div>
            {/* Province Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-blue-600 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">
                    {selectedProvinceData?.code || '34'}
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                    {selectedProvinceData?.name || 'İstanbul'}
                  </h3>
                </div>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {selectedProvinceData?.region || 'Marmara'} Bölgesi
                </span>
              </div>

              <button
                onClick={() => onAddAuthorClick(selectedProvinceId || undefined)}
                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200/60"
                title="Bu İle Yazar Ekle"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Yazar Ata</span>
              </button>
            </div>

            {/* Key Statistics for Selected Province */}
            <div className="grid grid-cols-2 gap-3 py-4 border-b border-slate-100">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kayıtlı Yazar</span>
                <div className="mt-0.5 text-2xl font-black text-slate-900">
                  {selectedStats?.count || 0}
                </div>
                <span className="text-[10px] text-slate-500">Milli Eğitim ve Özel</span>
              </div>

              <div className="rounded-lg bg-emerald-50/60 p-3 border border-emerald-100/80">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Aktif Görevde</span>
                <div className="mt-0.5 text-2xl font-black text-emerald-700">
                  {selectedStats?.active || 0}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Komisyon Üyesi</span>
              </div>
            </div>

            {/* Province Authors List */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Yerel Yazar Kadrosu ({provinceAuthors.length})
                </h4>
                {provinceAuthors.length > 0 && (
                  <span className="text-[11px] text-blue-600 font-semibold">Tümünü İncele</span>
                )}
              </div>

              {isLoadingAuthors ? (
                <div className="py-8 text-center text-xs text-slate-400">Yazar listesi yükleniyor...</div>
              ) : provinceAuthors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
                  <Info className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-700">Henüz Kayıtlı Yazar Yok</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Bu ilde henüz zümre yazarı görevlendirilmedi.
                  </p>
                  <button
                    onClick={() => onAddAuthorClick(selectedProvinceId || undefined)}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    <Plus className="h-3 w-3" />
                    <span>İlk Yazarı Ekle</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {provinceAuthors.map((author) => (
                    <div
                      key={author.id}
                      onClick={() => onAuthorClick && onAuthorClick(author)}
                      className="group flex items-center justify-between rounded-xl border border-slate-200/60 bg-white p-2.5 transition-all hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={author.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={author.first_name}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600">
                            {author.first_name} {author.last_name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {author.branch_name} {author.district_name ? `• ${author.district_name}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`rounded-full px-2 py-0.2 text-[9px] font-bold ${
                          author.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {author.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Footer Action */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Türkiye Mülki İdare Ağı</span>
            <span className="font-bold text-slate-800">81 İl Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
};
