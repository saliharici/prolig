const fs = require('fs');
let txt = fs.readFileSync('prisma/schema.prisma', 'utf8');

txt = txt.replace(/DateTümü/g, 'DateTime');
txt = txt.replace(/Dizgi A.*amas.*nda/g, 'Dizgi Aşamasında');
// Wait, Tümü should only match Tümü.
// Let's replace any unintended match:
// Actually, I can just restore it from git and apply safe replacements.
