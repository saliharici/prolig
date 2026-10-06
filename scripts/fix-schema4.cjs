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

// Fix relation IDs
txt = txt.replace(/authorId(\s+)Int/g, 'authorProfileId');
txt = txt.replace(/fields: \[authorId\]/g, 'fields: [authorProfileId]');
txt = txt.replace(/@@id\(\[projectId, authorId\]\)/g, '@@id([projectId, authorProfileId])');
txt = txt.replace(/@@unique\(\[projectId, authorId\]\)/g, '@@unique([projectId, authorProfileId])');

txt = txt.replace(/assignedAuthorId(\s+)Int\?/g, 'assignedAuthorProfileId');
txt = txt.replace(/fields: \[assignedAuthorId\]/g, 'fields: [assignedAuthorProfileId]');

txt = txt.replace(/AuthorProfile(\s+)AuthorProfile\?/g, 'authorProfile');
txt = txt.replace(/Payment(\s+)Payment\[\]/g, 'payments[]');
txt = txt.replace(/Question(\s+)Question\[\]/g, 'questions[]');

fs.writeFileSync('prisma/schema.prisma', txt, 'utf8');
