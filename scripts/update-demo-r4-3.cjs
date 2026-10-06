const fs = require('fs');
let content = fs.readFileSync('src/DemoApp.tsx', 'utf8');

// Fix currentRole prop
content = content.replace(/<PermissionDetails currentRole=\{role\} \/>/, '<PermissionDetails currentRole={currentUser.role} />');

// Update Demo Notice
const demoNoticePattern = /<div className="demo-notice">[\s\S]*?<\/div>/;
const newDemoNotice = `<div className="demo-notice">
  <div><Sparkles size={17} /><strong>Pro Lig test ortamı</strong><span>Pilot oturumunuz gerçek kullanıcı hesabına bağlıdır. Soru, proje ve hakediş içerikleri bu aşamada örnek çalışma verileridir.</span></div>
  <button onClick={() => navigate('roles')}>Rolleri incele <ArrowRight size={15} /></button>
</div>`;
content = content.replace(demoNoticePattern, newDemoNotice);

fs.writeFileSync('src/DemoApp.tsx', content, 'utf8');
console.log('DemoApp UI texts updated.');
