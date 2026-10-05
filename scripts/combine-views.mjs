import fs from 'fs';

// 1. Update Sidebar.tsx
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(/\{ key: 'map' as TabKey, label: 'Türkiye Haritası', icon: MapPin \},\s*/, '');
sidebar = sidebar.replace(/label: 'Yazarlar'/, "label: 'Türkiye Yazar Ağı'");
sidebar = sidebar.replace(/item.key === 'map' \|\| /, ''); // Remove map from MUHASEBE restriction
fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');

// 2. Update App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Remove map rendering
app = app.replace(/\{activeTab === 'map' && canAccess\('map'\) && \([\s\S]*?<TurkeyMap[\s\S]*?\/>\s*\)\}/, '');

// Update authors rendering
const newAuthorsRender = `{activeTab === 'authors' && (
            <div className="space-y-6">
              <TurkeyMap mapData={mapData} onAddAuthorClick={handleOpenAddAuthorFromMap} onAuthorClick={(a) => setSelectedAuthorForModal(a)} />
              <AuthorsView onAddAuthor={() => handleQuickAction('author')} onSelectAuthor={(a) => setSelectedAuthorForModal(a)} />
            </div>
          )}`;

app = app.replace(/\{activeTab === 'authors' && <AuthorsView .*? \/>\}/, newAuthorsRender);

fs.writeFileSync('src/App.tsx', app, 'utf8');

console.log('Done');
