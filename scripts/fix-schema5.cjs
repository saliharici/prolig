const fs = require('fs');
let txt = fs.readFileSync('prisma/schema.prisma', 'utf8');

const replacements = [
  ['PRO LÄ°G', 'PRO LİG'],
  ['Profesyoneller KarmasÄ±', 'Profesyoneller Karması'],
  ['BÃ¶lge KoordinatÃ¶rÃ¼', 'Bölge Koordinatörü'],
  ['Ä°l KoordinatÃ¶rÃ¼', 'İl Koordinatörü'],
  ['hakediÅŸ', 'hakediş'],
  ['Ä°ncelemede', 'İncelemede'],
  ['OnaylandÄ±', 'Onaylandı'],
  ['Yazar / Ã–ÄŸretmen', 'Yazar / Öğretmen'],
  ['Soru BankasÄ±', 'Soru Bankası'],
  ['8. SÄ±nÄ±f', '8. Sınıf'],
  ['Dizgi AÅŸamasÄ±nda', 'Dizgi Aşamasında'],
  ['TÃ¼mÃ¼', 'Tümü'],
  ['YÃ¶netim', 'Yönetim']
];

for (let [bad, good] of replacements) {
  txt = txt.split(bad).join(good);
}

// authorId -> authorProfileId exactly
txt = txt.replace(/authorId\s+Int\n/g, 'authorProfileId Int\n');
txt = txt.replace(/fields: \[authorId\]/g, 'fields: [authorProfileId]');
txt = txt.replace(/@@id\(\[projectId, authorId\]\)/g, '@@id([projectId, authorProfileId])');
txt = txt.replace(/@@unique\(\[projectId, authorId\]\)/g, '@@unique([projectId, authorProfileId])');

// assignedAuthorId -> assignedAuthorProfileId
txt = txt.replace(/assignedAuthorId\s+Int\?\n/g, 'assignedAuthorProfileId Int?\n');
txt = txt.replace(/fields: \[assignedAuthorId\]/g, 'fields: [assignedAuthorProfileId]');

// optional authorId
txt = txt.replace(/authorId\s+Int\?\n/g, 'authorProfileId Int?\n');

// User fields
txt = txt.replace(/authorProfile\s+AuthorProfile\?/g, 'authorProfile AuthorProfile?');
// Just use a single string replace for the collection names on User:
txt = txt.replace('payments      Payment[]', 'payments      Payment[]');
txt = txt.replace('questions     Question[]', 'questions     Question[]');


fs.writeFileSync('prisma/schema.prisma', txt, 'utf8');
