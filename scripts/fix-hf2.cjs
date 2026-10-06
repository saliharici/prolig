const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
let contract = fs.readFileSync('docs/PILOT_V1_CONTRACT.md', 'utf8');

schema = schema.replace(/\/\/ Prisma schema for PRO L.*G - Profesyoneller Karmas.*/g, '// Prisma schema for PRO LİG - Profesyoneller Karması');
schema = schema.replace(/\/\/ B.lge Koordinat.r.n.n sorumlu oldu.*u b.lge.*/g, "// Bölge Koordinatörünün sorumlu olduğu bölge (örn: 'Marmara')");
schema = schema.replace(/\/\/ Havuz sistemi hakedi.leri i.in Puan\/Kredi sistemi/g, '// Havuz sistemi hakedişleri için Puan/Kredi sistemi');
schema = schema.replace(/\/\/ Metin veya Soru i.eri.i/g, '// Metin veya Soru içeriği');
schema = schema.replace(/\/\/ ..ste.e ba.l. soru resmi/g, '// İsteğe bağlı soru resmi');
schema = schema.replace(/\/\/ Havuz sistemi: Soru havuza ba..ms.z d.*er, sonradan kitaba .ekilir./g, '// Havuz sistemi: Soru havuza bağımsız düşer, sonradan kitaba çekilir.');
schema = schema.replace(/\/\/ Kazan.m Kodu \(.rn: M\.8\.1\.2\.1\)/g, '// Kazanım Kodu (Örn: M.8.1.2.1)');
schema = schema.replace(/\/\/ S.n.f \(.rn: 8\. S.n.f\)/g, '// Sınıf (Örn: 8. Sınıf)');
schema = schema.replace(/\/\/ Zorluk \(.rn: Kolay, Orta, Zor\)/g, '// Zorluk (Örn: Kolay, Orta, Zor)');
schema = schema.replace(/Dizgi A.amas.nda/g, 'Dizgi Aşamasında');
schema = schema.replace(/Yazar \/ .*xretmen/g, 'Yazar / Öğretmen');

contract = contract.replace(/^.*?Pilot V1 Contract.*$/m, '# Pilot V1 Contract — Pro-Lig');
contract = contract.replace(/payment\/hakedi. status/g, 'payment/hakediş status');
contract = contract.replace(/B.lge Koordinat.r./g, 'Bölge Koordinatörü');
contract = contract.replace(/.l Koordinat.r./g, 'İl Koordinatörü');
contract = contract.replace(/.ncelemede/g, 'İncelemede');
contract = contract.replace(/Onayland./g, 'Onaylandı');

schema = schema.replace(/\uFFFD/g, '');
contract = contract.replace(/\uFFFD/g, '');

if (schema.charCodeAt(0) === 0xFEFF) schema = schema.slice(1);
if (contract.charCodeAt(0) === 0xFEFF) contract = contract.slice(1);

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
fs.writeFileSync('docs/PILOT_V1_CONTRACT.md', contract, 'utf8');
