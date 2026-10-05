const fs = require('fs');
let model = fs.readFileSync('src/demo/model.ts', 'utf8');

// Fix roleLabels
model = model.replace(/BOLGE_KOORDINATORU: '.*',\s*IL_KOORDINATORU: '',/g, "BOLGE_KOORDINATORU: 'Bölge Koordinatörü',\n    IL_KOORDINATORU: 'İl Koordinatörü',");

// Wait, the above will match multiple things if not careful. Let's do it manually.
if (model.includes("IL_KOORDINATORU: '',")) {
  // roleLabels appears first
  model = model.replace("IL_KOORDINATORU: '',", "IL_KOORDINATORU: 'İl Koordinatörü',");
  // rolePeople appears second
  model = model.replace("IL_KOORDINATORU: '',", "IL_KOORDINATORU: 'Mustafa İl',");
}

fs.writeFileSync('src/demo/model.ts', model, 'utf8');

let demo = fs.readFileSync('src/DemoApp.tsx', 'utf8');
// Fix DemoApp.tsx rolePeople if I broke it there too
if (demo.includes("IL_KOORDINATORU: '',")) {
  demo = demo.replace("IL_KOORDINATORU: '',", "IL_KOORDINATORU: 'Mustafa İl',");
  fs.writeFileSync('src/DemoApp.tsx', demo, 'utf8');
}

console.log('Fixed IL_KOORDINATORU');
