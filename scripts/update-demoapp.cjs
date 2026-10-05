const fs = require('fs');
let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');

// rolePeople
demo = demo.replace(
  /IL_KOORDINATORU: '([^']+)',/g,
  "BOLGE_KOORDINATORU: 'Mustafa Bölge',\n  IL_KOORDINATORU: '\',"
);

// const visibleAuthors logic
demo = demo.replace(
  /const visibleAuthors = role === 'IL_KOORDINATORU' \? data.authors.filter\(a => a.province === 'İstanbul'\) : data.authors;/g,
  "const MARMARA = ['İstanbul', 'Bursa', 'Edirne', 'Kocaeli', 'Sakarya', 'Tekirdağ', 'Yalova', 'Çanakkale', 'Kırklareli', 'Bilecik', 'Balıkesir'];\n  const visibleAuthors = role === 'IL_KOORDINATORU' ? data.authors.filter(a => a.province === 'İstanbul') : role === 'BOLGE_KOORDINATORU' ? data.authors.filter(a => MARMARA.includes(a.province)) : data.authors;"
);

// Map usage
demo = demo.replace(
  /scopeProvince=\{role === 'IL_KOORDINATORU' \? 'İstanbul' : undefined\}/g,
  "scopeProvinces={role === 'IL_KOORDINATORU' ? ['İstanbul'] : role === 'BOLGE_KOORDINATORU' ? MARMARA : undefined}"
);

// Role headings in Authors view
demo = demo.replace(
  /role === 'IL_KOORDINATORU' \? 'İstanbul kapsamındaki örnek yazarları haritada ve listede keşfedin.' : 'Yazarların illere dağılımını/g,
  "role === 'IL_KOORDINATORU' ? 'İstanbul kapsamındaki örnek yazarları haritada ve listede keşfedin.' : role === 'BOLGE_KOORDINATORU' ? 'Marmara Bölgesi kapsamındaki il koordinatörlerini ve yazarları haritada ve listede keşfedin.' : 'Yazarların illere dağılımını"
);

// Add Role column to Authors list table
demo = demo.replace(/<th>YAZAR<\/th>/, "<th>YAZAR</th><th>ROLÜ</th>");
demo = demo.replace(/<td><div className="person-cell">/, "<td><div className=\"person-cell\">");
demo = demo.replace(/<strong>\{author\.name\}<\/strong><\/div><\/td><td>\{author\.subject\}/, "<strong>{author.name}</strong></div></td><td><span style={{fontWeight: 800, color: author.roleType === 'İl Koordinatörü' ? '#10b981' : '#64748b'}}>{author.roleType || 'Yazar'}</span></td><td>{author.subject}");

fs.writeFileSync('src/DemoApp.tsx', demo, 'utf8');
console.log('DemoApp.tsx updated.');
