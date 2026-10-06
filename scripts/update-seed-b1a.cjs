const fs = require('fs');
let seed = fs.readFileSync('prisma/seed.ts', 'utf8');

// For userCreate
seed = seed.replace(
  '      if (u.role === \'BOLGE_KOORDINATORU\') {',
  '      if (u.role === \'EDITOR\') {\n        userCreate.editorBranch = { connect: { id: branch.id } };\n      }\n      if (u.role === \'BOLGE_KOORDINATORU\') {'
);

// For userUpdate
seed = seed.replace(
  '        assignedRegion: u.role === \'BOLGE_KOORDINATORU\' ? \'Marmara\' : null,',
  '        assignedRegion: u.role === \'BOLGE_KOORDINATORU\' ? \'Marmara\' : null,\n        editorBranch: u.role === \'EDITOR\' ? { connect: { id: branch.id } } : { disconnect: true },'
);

fs.writeFileSync('prisma/seed.ts', seed, 'utf8');
