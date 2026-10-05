import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MapPin, RotateCcw, Search, Users, ZoomIn, ZoomOut } from 'lucide-react';
import { TURKEY_MAP_PROVINCES, TURKEY_MAP_VIEWBOX } from '../components/turkeyMapData';
import type { Author } from './model';

type Province = (typeof TURKEY_MAP_PROVINCES)[number];

interface AuthorMapProps {
  authors: Author[];
  scopeProvince?: string;
  initialProvince?: string;
  onShowAuthors: (province: string) => void;
}

const regions = ['Tümü', 'Marmara', 'Ege', 'Akdeniz', 'İç Anadolu', 'Karadeniz', 'Doğu Anadolu', 'Güneydoğu Anadolu'];
const provinceByName = (name: string) => TURKEY_MAP_PROVINCES.find(province => province.name === name);

export function AuthorMap({ authors, scopeProvince, initialProvince, onShowAuthors }: AuthorMapProps) {
  const [selectedId, setSelectedId] = useState(() => provinceByName(scopeProvince || initialProvince || 'İstanbul')?.id ?? 34);
  const [region, setRegion] = useState('Tümü');
  const [search, setSearch] = useState('');
  const [hovered, setHovered] = useState<Province | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setSelectedId(provinceByName(scopeProvince || initialProvince || 'İstanbul')?.id ?? 34);
  }, [scopeProvince, initialProvince]);

  const authorsByProvince = useMemo(() => {
    const map = new Map<string, Author[]>();
    for (const author of authors) map.set(author.province, [...(map.get(author.province) || []), author]);
    return map;
  }, [authors]);
  const selected = TURKEY_MAP_PROVINCES.find(province => province.id === selectedId) || TURKEY_MAP_PROVINCES[33];
  const selectedAuthors = authorsByProvince.get(selected.name) || [];
  const coveredProvinces = [...authorsByProvince.values()].filter(items => items.length > 0).length;
  const topProvinces = TURKEY_MAP_PROVINCES.filter(province => (authorsByProvince.get(province.name)?.length || 0) > 0)
    .sort((a, b) => (authorsByProvince.get(b.name)?.length || 0) - (authorsByProvince.get(a.name)?.length || 0)).slice(0, 5);
  const searchResults = search.trim()
    ? TURKEY_MAP_PROVINCES.filter(province => (!scopeProvince || province.name === scopeProvince) && province.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))).slice(0, 6)
    : [];

  const selectProvince = (province: Province) => {
    if (scopeProvince && province.name !== scopeProvince) return;
    setSelectedId(province.id);
    setRegion('Tümü');
    setSearch('');
  };
  const selectRegion = (nextRegion: string) => {
    setRegion(nextRegion);
    if (nextRegion === 'Tümü' || selected.region === nextRegion) return;
    const firstWithAuthors = TURKEY_MAP_PROVINCES.find(province => province.region === nextRegion && (authorsByProvince.get(province.name)?.length || 0) > 0);
    if (firstWithAuthors) setSelectedId(firstWithAuthors.id);
  };
  const keySelect = (event: React.KeyboardEvent<SVGGElement>, province: Province) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectProvince(province); }
  };

  return <div className="author-map-layout">
    <section className="panel author-map-panel">
      <div className="author-map-top">
        <div><span className="panel-kicker">81 İL · YAZAR DAĞILIMI</span><h2>Türkiye Yazar Ağı Haritası</h2><p>İlleri seçerek örnek yazarları ve branşlarını inceleyin.</p></div>
        <span className="author-map-scope"><MapPin size={15} /> {scopeProvince ? `${scopeProvince} kapsamı` : 'Türkiye geneli'}</span>
      </div>
      <div className="author-map-summary"><div><strong>{authors.length}</strong><span>örnek yazar</span></div><div><strong>{coveredProvinces}</strong><span>ilde kayıt</span></div><div><strong>{authors.filter(author => author.status === 'Aktif').length}</strong><span>aktif yazar</span></div></div>
      <div className="author-map-controls">
        <div className="author-map-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && searchResults[0]) selectProvince(searchResults[0]); }} placeholder="İl ara..." aria-label="Haritada il ara" />
          {searchResults.length > 0 && <div className="author-map-results">{searchResults.map(province => <button key={province.id} onClick={() => selectProvince(province)}>{province.name}<small>{authorsByProvince.get(province.name)?.length || 0} yazar</small></button>)}</div>}
        </div>
        <div className="author-map-zoom" aria-label="Harita yakınlaştırma"><button title="Yakınlaştır" aria-label="Yakınlaştır" onClick={() => setZoom(value => Math.min(1.6, +(value + .2).toFixed(1)))}><ZoomIn size={16} /></button><button title="Uzaklaştır" aria-label="Uzaklaştır" onClick={() => setZoom(value => Math.max(.8, +(value - .2).toFixed(1)))}><ZoomOut size={16} /></button><button title="Yakınlaştırmayı sıfırla" aria-label="Yakınlaştırmayı sıfırla" onClick={() => setZoom(1)}><RotateCcw size={15} /></button></div>
      </div>
      {!scopeProvince && <div className="author-map-regions" aria-label="Bölge filtresi">{regions.map(item => <button key={item} className={region === item ? 'selected' : ''} onClick={() => selectRegion(item)}>{item}</button>)}</div>}
      <div className="author-map-canvas">
        <div className="author-map-water-label">KARADENİZ <span>·</span> MARMARA <span>·</span> EGE <span>·</span> AKDENİZ</div>
        <svg viewBox={TURKEY_MAP_VIEWBOX} role="group" aria-label="Türkiye illeri üzerinde örnek yazar dağılımı" style={{ transform: `scale(${zoom})` }}>
          {TURKEY_MAP_PROVINCES.map(province => {
            const count = authorsByProvince.get(province.name)?.length || 0;
            const inScope = !scopeProvince || scopeProvince === province.name;
            const inRegion = region === 'Tümü' || region === province.region;
            const isSelected = selectedId === province.id;
            const fill = !inScope || !inRegion ? '#dbe5e6' : isSelected ? '#156d66' : count >= 4 ? '#35b39d' : count >= 2 ? '#82d5c4' : count === 1 ? '#b8e9df' : '#edf3f2';
            return <g key={province.id} role="button" tabIndex={inScope && inRegion ? 0 : -1} aria-label={`${province.name}, ${count} yazar`} aria-disabled={!inScope || !inRegion} className={`author-map-province ${isSelected ? 'selected' : ''} ${inScope && inRegion ? '' : 'dimmed'}`} onClick={() => inRegion && selectProvince(province)} onKeyDown={event => inRegion && keySelect(event, province)} onMouseEnter={() => setHovered(province)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(province)} onBlur={() => setHovered(null)}>
              <title>{province.name}: {count} örnek yazar</title><path d={province.d} fill={fill} />
              {count > 0 && inScope && inRegion && <g><circle cx={province.x} cy={province.y} r={isSelected ? 12 : 10} fill={isSelected ? '#103d43' : '#fff'} /><text x={province.x} y={province.y + 3} textAnchor="middle" fill={isSelected ? '#fff' : '#206c63'}>{count}</text></g>}
            </g>;
          })}
        </svg>
        <div className="author-map-hover">{hovered ? <><strong>{hovered.name}</strong><span>{scopeProvince && hovered.name !== scopeProvince ? 'Kapsam dışında' : `${authorsByProvince.get(hovered.name)?.length || 0} örnek yazar`}</span></> : <><strong>Bir il seçin</strong><span>Haritada il üzerine gelin</span></>}</div>
      </div>
      <div className="author-map-bottom"><div className="author-map-legend"><span>Yazar yoğunluğu</span><i className="level-empty" />0<i className="level-low" />1<i className="level-mid" />2–3<i className="level-high" />4+</div><div className="author-map-hotspots">{topProvinces.map(province => <button key={province.id} onClick={() => selectProvince(province)}>{province.name} <strong>{authorsByProvince.get(province.name)?.length}</strong></button>)}</div></div>
    </section>
    <aside className="panel author-map-detail">
      <span className="panel-kicker">İL DETAYI</span><h2>{selected.name}</h2><p>{selected.region} Bölgesi · {selected.code} plaka kodu</p>
      <div className="author-map-detail-stats"><div><strong>{selectedAuthors.length}</strong><span>Toplam yazar</span></div><div><strong>{selectedAuthors.filter(author => author.status === 'Aktif').length}</strong><span>Aktif</span></div></div>
      <div className="author-map-detail-heading"><strong>Bu ildeki yazarlar</strong><span>{selectedAuthors.length} kayıt</span></div>
      <div className="author-map-author-list">{selectedAuthors.length ? selectedAuthors.map(author => <div key={author.id} className="author-map-author"><span className="small-avatar">{author.initials}</span><div><strong>{author.name}</strong><small>{author.subject} · {author.status}</small></div></div>) : <div className="author-map-empty"><Users size={23} /><strong>Bu ilde örnek kayıt yok</strong><span>Haritadaki renkli illerden birini seçin.</span></div>}</div>
      {selectedAuthors.length > 0 && <button className="author-map-list-button" onClick={() => onShowAuthors(selected.name)}>{selected.name} yazarlarını listede göster <ArrowRight size={16} /></button>}
      <div className="author-map-footnote">Bu harita örnek kayıtlardan oluşur. Gerçek yazar ağı ve canlı veri bağlantısı içermez.</div>
    </aside>
  </div>;
}
