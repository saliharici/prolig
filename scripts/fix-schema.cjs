const fs = require('fs');
let txt = fs.readFileSync('prisma/schema.prisma', 'utf8');

// If there's BOM or mojibake, clean it up completely:
// First, decode the double utf8 if present
if (txt.includes('Ä°') || txt.includes('Ã')) {
  txt = Buffer.from(txt, 'binary').toString('utf8');
}
// Second, if it's broken 'ï¿½', we just hardcode string replaces:
txt = txt.replace(/Yazar \/ .*xretmen/g, 'Yazar / Öğretmen');
txt = txt.replace(/PRO L.*G - Profesyoneller Karmas.*/g, 'PRO LİG - Profesyoneller Karması');
txt = txt.replace(/B.lge Koordinat.r./g, 'Bölge Koordinatörü');
txt = txt.replace(/.l Koordinat.r./g, 'İl Koordinatörü');
txt = txt.replace(/hakedi./g, 'hakediş');
txt = txt.replace(/.ncelemede/g, 'İncelemede');
txt = txt.replace(/Onayland./g, 'Onaylandı');
txt = txt.replace(/Soru Bankas./g, 'Soru Bankası');
txt = txt.replace(/8. S.n.f/g, '8. Sınıf');
txt = txt.replace(/Dizgi A.amas.nda/g, 'Dizgi Aşamasında');
txt = txt.replace(/T.m./g, 'Tümü');
txt = txt.replace(/Y.netim/g, 'Yönetim');

// Remove BOM
if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
if (txt.charCodeAt(0) === 0xEF && txt.charCodeAt(1) === 0xBB && txt.charCodeAt(2) === 0xBF) txt = txt.slice(3);

// Fix relation IDs
txt = txt.replace(/authorId\s+Int/g, 'authorProfileId Int');
txt = txt.replace(/fields: \[authorId\]/g, 'fields: [authorProfileId]');
txt = txt.replace(/@@id\(\[projectId, authorId\]\)/g, '@@id([projectId, authorProfileId])');
txt = txt.replace(/@@unique\(\[projectId, authorId\]\)/g, '@@unique([projectId, authorProfileId])');

txt = txt.replace(/assignedAuthorId\s+Int\?/g, 'assignedAuthorProfileId Int?');
txt = txt.replace(/fields: \[assignedAuthorId\]/g, 'fields: [assignedAuthorProfileId]');

txt = txt.replace(/AuthorProfile\s+AuthorProfile\?/g, 'authorProfile AuthorProfile?');
txt = txt.replace(/Payment\s+Payment\[\]/g, 'payments Payment[]');
txt = txt.replace(/Question\s+Question\[\]/g, 'questions Question[]');

fs.writeFileSync('prisma/schema.prisma', txt, 'utf8');
