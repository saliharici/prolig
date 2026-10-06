const fs = require('fs');
let txt = fs.readFileSync('prisma/schema.prisma', 'utf8');

txt = txt.replace(/authorId\s+Int/g, 'authorProfileId Int');
txt = txt.replace(/authorId\s+Int\?/g, 'authorProfileId Int?');
txt = txt.replace(/assignedAuthorId\s+Int\?/g, 'assignedAuthorProfileId Int?');

fs.writeFileSync('prisma/schema.prisma', txt, 'utf8');
