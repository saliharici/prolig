const fs = require('fs');

// Fix DemoApp.tsx
let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');
demo = demo.replace("const visibleAuthors", "const MARMARA = ['İstanbul', 'Bursa', 'Edirne', 'Kocaeli', 'Sakarya', 'Tekirdağ', 'Yalova', 'Çanakkale', 'Kırklareli', 'Bilecik', 'Balıkesir'];\n  const visibleAuthors");
demo = demo.replace("const MARMARA = ['İstanbul', 'Bursa', 'Edirne', 'Kocaeli', 'Sakarya', 'Tekirdağ', 'Yalova', 'Çanakkale', 'Kırklareli', 'Bilecik', 'Balıkesir'];\n  const MARMARA = ", "const MARMARA = ");
fs.writeFileSync('src/DemoApp.tsx', demo, 'utf8');

// Fix AuthorMap.tsx
let mapCode = fs.readFileSync('src/demo/AuthorMap.tsx', 'utf8');
mapCode = mapCode.replace(/scopeProvince \? \\\\$\\\{scopeProvince\\\}/g, "scopeProvinces ? (scopeProvinces.length === 1 ? \");
mapCode = mapCode.replace(/scopeProvince /g, "scopeProvinces ");
mapCode = mapCode.replace(/!== scopeProvince/g, "&& !scopeProvinces.includes(hovered.name)");
fs.writeFileSync('src/demo/AuthorMap.tsx', mapCode, 'utf8');
