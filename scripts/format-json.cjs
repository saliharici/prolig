const fs = require('fs');
let pkgStr = fs.readFileSync('package.json', 'utf8');
if (pkgStr.charCodeAt(0) === 0xFEFF) pkgStr = pkgStr.slice(1);
const pkg = JSON.parse(pkgStr);
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');

let tsStr = fs.readFileSync('tsconfig.api.json', 'utf8');
if (tsStr.charCodeAt(0) === 0xFEFF) tsStr = tsStr.slice(1);
const tsconfig = JSON.parse(tsStr);
fs.writeFileSync('tsconfig.api.json', JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
