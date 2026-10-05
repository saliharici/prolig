const fs = require('fs');
let model = fs.readFileSync('src/demo/model.ts', 'utf8');

// Add BOLGE_KOORDINATORU to Role type
model = model.replace(
  /export type Role = 'GENEL_KOORDINATOR' \| 'IL_KOORDINATORU'/g, 
  "export type Role = 'GENEL_KOORDINATOR' | 'BOLGE_KOORDINATORU' | 'IL_KOORDINATORU'"
);

// Add to roleLabels
model = model.replace(
  /IL_KOORDINATORU: '([^']+)',/g,
  "BOLGE_KOORDINATORU: 'Bölge Koordinatörü',\n    IL_KOORDINATORU: '\',"
);

// Add to permissions
model = model.replace(
  /IL_KOORDINATORU: \['overview',/g,
  "BOLGE_KOORDINATORU: ['overview', 'questions', 'projects', 'authors', 'grades', 'roles'],\n    IL_KOORDINATORU: ['overview',"
);

// Update Author interface
model = model.replace(
  /status: 'Aktif' \| 'Davet edildi';/g,
  "status: 'Aktif' | 'Davet edildi';\n  roleType?: 'Yazar' | 'İl Koordinatörü';"
);

// Default roleType to 'Yazar' and make some 'İl Koordinatörü'
model = model.replace(/levels: \['Ortaokul'\] \},/g, "levels: ['Ortaokul'], roleType: 'Yazar' },");
model = model.replace(/levels: \['Lise'\] \},/g, "levels: ['Lise'], roleType: 'Yazar' },");
model = model.replace(/levels: \['Ortaokul', 'Lise'\] \},/g, "levels: ['Ortaokul', 'Lise'], roleType: 'Yazar' },");
model = model.replace(/levels: \['İlkokul', 'Ortaokul'\] \},/g, "levels: ['İlkokul', 'Ortaokul'], roleType: 'İl Koordinatörü' },");
model = model.replace(/levels: \['Mezun'\] \},/g, "levels: ['Mezun'], roleType: 'Yazar' },");

fs.writeFileSync('src/demo/model.ts', model, 'utf8');
console.log('model.ts updated.');
