const fs = require('fs');
let mapCode = fs.readFileSync('src/demo/AuthorMap.tsx', 'utf8');

// Replace interface
mapCode = mapCode.replace(/scopeProvince\?: string;/g, "scopeProvinces?: string[];");
// In props destruct
mapCode = mapCode.replace(/\{ authors, scopeProvince, initialProvince, onShowAuthors \}/g, "{ authors, scopeProvinces, initialProvince, onShowAuthors }");
// Uses of scopeProvince
mapCode = mapCode.replace(/provinceByName\(scopeProvince \|\| initialProvince \|\| 'İstanbul'\)/g, "provinceByName((scopeProvinces && scopeProvinces[0]) || initialProvince || 'İstanbul')");
mapCode = mapCode.replace(/\[scopeProvince, initialProvince\]/g, "[scopeProvinces, initialProvince]");
mapCode = mapCode.replace(/\(!scopeProvince \|\| province.name === scopeProvince\)/g, "(!scopeProvinces || scopeProvinces.includes(province.name))");
mapCode = mapCode.replace(/if \(scopeProvince && province.name !== scopeProvince\) return;/g, "if (scopeProvinces && !scopeProvinces.includes(province.name)) return;");
mapCode = mapCode.replace(/\{scopeProvince \? \$\{scopeProvince\} kapsamı : 'Türkiye geneli'\}/g, "{scopeProvinces ? (scopeProvinces.length === 1 ? ${scopeProvinces[0]} kapsamı : 'Bölge kapsamı') : 'Türkiye geneli'}");
mapCode = mapCode.replace(/!scopeProvince && <div className="author-map-regions"/g, "!scopeProvinces && <div className=\"author-map-regions\"");
mapCode = mapCode.replace(/const inScope = !scopeProvince \|\| scopeProvince === province.name;/g, "const inScope = !scopeProvinces || scopeProvinces.includes(province.name);");
mapCode = mapCode.replace(/scopeProvince && hovered\.name !== scopeProvince/g, "scopeProvinces && !scopeProvinces.includes(hovered.name)");

fs.writeFileSync('src/demo/AuthorMap.tsx', mapCode, 'utf8');
console.log('AuthorMap.tsx updated.');
