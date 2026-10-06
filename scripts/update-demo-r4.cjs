const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

content = content.replace(
  'export default function DemoApp() {',
  'import { AuthUser } from \'./auth/types\';\nexport default function DemoApp({ currentUser, onLogoutRequest }: { currentUser: AuthUser; onLogoutRequest: () => void }) {'
);

// Remove `const [role, setRole] = useState<Role>('GENEL_KOORDINATOR');`
content = content.replace(/const \[role, setRole\] = useState<Role>\('[^']+'\);\n?/, '');
content = content.replace(/const \[roleMenu, setRoleMenu\] = useState\(false\);\n?/, '');

// Replace `role` with `currentUser.role`
// Wait, `role` is used as a variable a lot. `currentUser.role` is better.
content = content.replace(/\brole ===/g, 'currentUser.role ===');
content = content.replace(/\brole !==/g, 'currentUser.role !==');
content = content.replace(/\[role\]/g, '[currentUser.role]');
content = content.replace(/\(role\)/g, '(currentUser.role)');
content = content.replace(/['"]GENEL_KOORDINATOR['"]\.includes\(role\)/g, "'GENEL_KOORDINATOR'.includes(currentUser.role)");
content = content.replace(/roleLabels\[role\]/g, 'roleLabels[currentUser.role]');

// In permissions[currentUser.role]?.includes(section)
// Let's replace the `section` effect
const effectRegex = /useEffect\(\(\) => \{\s*if \(\!permissions\[.*?\]\?.includes\(section\)\) \{\s*setSection\('overview'\);\s*\}\s*\}, \[.*?\]\);/;
content = content.replace(effectRegex, `useEffect(() => {
    if (!permissions[currentUser.role]?.includes(section)) {
      setSection('overview');
    }
  }, [currentUser.role, section]);`);

// Topbar role profile update
// Replace role menu UI
// Remove role-switching completely.
const topbarRegex = /<div className="topbar-profile"[^>]*>([\s\S]*?)<\/div>\s*<\/header>/;

const newTopbar = `<div className="topbar-profile">
            <div className="profile-badge">
              <span>{currentUser.fullName.split(' ').map(n => n[0]).join('')}</span>
            </div>
            <div className="profile-info">
              <strong>{currentUser.fullName}</strong>
              <small>{roleLabels[currentUser.role]}</small>
            </div>
            <button className="logout-button" onClick={onLogoutRequest} title="Çıkış Yap" style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.5rem', marginLeft: '0.5rem' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </header>`;
content = content.replace(topbarRegex, newTopbar);

// Update Greeting
content = content.replace(/Merhaba, \{rolePeople\[currentUser\.role\]?.split\(' '\)\[0\]\}/g, "Merhaba, {currentUser.fullName.split(' ')[0]}");

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
console.log('DemoApp updated.');
