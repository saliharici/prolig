const fs = require('fs');

let arch = fs.readFileSync('docs/CANONICAL_ARCHITECTURE.md', 'utf8');
arch = arch.replace('Canonical Architecture â€” Pro-Lig', 'Canonical Architecture — Pro-Lig');
fs.writeFileSync('docs/CANONICAL_ARCHITECTURE.md', arch, 'utf8');

let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const replacements = [
  ["Bölge KoordinatörünÃ¼n sorumlu olduÄŸu bÃ¶lge (Ã¶rn: 'Marmara')", "Bölge Koordinatörünün sorumlu olduğu bölge (örn: 'Marmara')"],
  ["Havuz sistemi hakedişleri iÃ§in Puan/Kredi sistemi", "Havuz sistemi hakedişleri için Puan/Kredi sistemi"],
  ["Metin veya Soru iÃ§eriÄŸi", "Metin veya Soru içeriği"],
  ["Ä°steÄŸe baÄŸlÄ± soru resmi", "İsteğe bağlı soru resmi"],
  ["Havuz sistemi: Soru havuza baÄŸÄ±msÄ±z dÃ¼ÅŸer, sonradan kitaba Ã§ekilir.", "Havuz sistemi: Soru havuza bağımsız düşer, sonradan kitaba çekilir."],
  ["KazanÄ±m Kodu (Ã–rn: M.8.1.2.1)", "Kazanım Kodu (Örn: M.8.1.2.1)"],
  ["SÄ±nÄ±f (Ã–rn: 8. Sınıf)", "Sınıf (Örn: 8. Sınıf)"],
  ["Zorluk (Ã–rn: Kolay, Orta, Zor)", "Zorluk (Örn: Kolay, Orta, Zor)"]
];

for (let [bad, good] of replacements) {
  schema = schema.split(bad).join(good);
}

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
