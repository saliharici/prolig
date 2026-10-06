const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

// Replace topbar
content = content.replace(/<header className="topbar">[\s\S]*?<\/header>/, 
`<header className="topbar">
  <div className="topbar-left">
    <button className="mobile-toggle" aria-label="Menüyü aç" onClick={() => setMobileMenu(true)}><Menu size={22} /></button>
    <div className="breadcrumbs"><span>Çalışma Alanı</span><ArrowRight size={14} /><strong>{sectionLabels[section]}</strong></div>
  </div>
  <div className="topbar-right">
    <span className="preview-badge"><span /> ETKİLEŞİMLİ ÖNİZLEME</span>
    <div className="topbar-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.3rem 0.5rem 0.3rem 0.3rem', borderRadius: '2rem', border: '1px solid #e2e8f0' }}>
      <div className="profile-badge" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
        {currentUser.fullName.split(' ').map(n => n[0]).join('')}
      </div>
      <div className="profile-info" style={{ display: 'flex', flexDirection: 'column' }}>
        <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{currentUser.fullName}</strong>
        <small style={{ fontSize: '0.75rem', color: '#64748b' }}>{roleLabels[currentUser.role]}</small>
      </div>
      <button className="logout-button" onClick={onLogoutRequest} title="Çıkış Yap" style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem', marginLeft: '0.25rem', display: 'flex', alignItems: 'center' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    </div>
  </div>
</header>`);

// Fix log function
content = content.replace(/actor: rolePeople\[currentUser.role\]/g, 'actor: currentUser.fullName');
// Fix editorName
content = content.replace(/editorName: rolePeople\.EDITOR/g, 'editorName: currentUser.fullName');
// In YAZAR activity check
content = content.replace(/item\.actor === rolePeople\.YAZAR/g, 'item.actor === currentUser.fullName');

// Fix the roleMenu state (might be left over)
content = content.replace(/const \[roleMenu, setRoleMenu\] = useState\(false\);\n?/g, '');
// Remove selectRole
content = content.replace(/const selectRole = \([\s\S]*?};\n/g, '');

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
console.log('DemoApp updated part 2.');
