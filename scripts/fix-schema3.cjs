const fs = require('fs');
let txt = fs.readFileSync('prisma/schema.prisma', 'utf8');

// First decode from double UTF-8
txt = Buffer.from(txt, 'binary').toString('utf8');
if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);

// Now apply relationship ID fixes
txt = txt.replace(/authorId\s+Int\n\s+authorProfile\s+AuthorProfile/g, 'authorProfileId Int\n  authorProfile AuthorProfile');
txt = txt.replace(/fields: \[authorId\]/g, 'fields: [authorProfileId]');
txt = txt.replace(/@@id\(\[projectId, authorId\]\)/g, '@@id([projectId, authorProfileId])');
txt = txt.replace(/@@unique\(\[projectId, authorId\]\)/g, '@@unique([projectId, authorProfileId])');

txt = txt.replace(/assignedAuthorId\s+Int\?/g, 'assignedAuthorProfileId Int?');
txt = txt.replace(/fields: \[assignedAuthorId\]/g, 'fields: [assignedAuthorProfileId]');

txt = txt.replace(/AuthorProfile\s+AuthorProfile\?/g, 'authorProfile AuthorProfile?');
txt = txt.replace(/Payment\s+Payment\[\]/g, 'payments Payment[]');
txt = txt.replace(/Question\s+Question\[\]/g, 'questions Question[]');

fs.writeFileSync('prisma/schema.prisma', txt, 'utf8');
