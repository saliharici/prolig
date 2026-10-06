const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.{ts,js,md,json,env,prisma}', { ignore: ['node_modules/**', 'dist/**', 'generated/**'] });
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
    changed = true;
  }
  
  if (file === 'docs/CANONICAL_ARCHITECTURE.md') {
    if (content.includes('\\n-')) {
      content = content.replace(/\\n-/g, '\n-');
      changed = true;
    }
    if (content.includes('will be migrated out')) {
      content = content.replace(/YONETICI will be migrated out/g, 'YONETICI has already been removed from the canonical schema');
      changed = true;
    }
  }

  // Also fix encoding artifacts
  if (content.includes('Ã')) {
    content = content.replace(/Ã¼/g, 'ü')
                     .replace(/Ã¶/g, 'ö')
                     .replace(/Ä±/g, 'ı')
                     .replace(/Ä°/g, 'İ')
                     .replace(/ÅŸ/g, 'ş')
                     .replace(/Å/g, 'Ş')
                     .replace(/Ã§/g, 'ç')
                     .replace(/Ã‡/g, 'Ç')
                     .replace(/ÄŸ/g, 'ğ')
                     .replace(/Ä/g, 'Ğ')
                     .replace(/â€”/g, '—');
    changed = true;
  }

  if (content.includes('')) {
    content = content.replace(/-Y/g, 'öğ')
                     .replace(/-rn/g, 'Örn')
                     .replace(/steYe/g, 'İsteğe')
                     .replace(/baYl/g, 'bağlı')
                     .replace(/Snf/g, 'Sınıf')
                     .replace(/Kazanm/g, 'Kazanım')
                     .replace(/AYamasnda/g, 'Aşamasında')
                     .replace(/hakediYleri/g, 'hakedişleri')
                     .replace(/iin/g, 'için')
                     .replace(/ekilir/g, 'çekilir')
                     .replace(/baYmsz/g, 'bağımsız')
                     .replace(/dǬYer/g, 'düşer')
                     .replace(/ieriYi/g, 'içeriği')
                     .replace(/TǬmǬ/g, 'Tümü')
                     .replace(/-Yretmen/g, 'Öğretmen')
                     .replace(/Blge/g, 'Bölge')
                     .replace(/KoordinatrǬnǬn/g, 'Koordinatörünün')
                     .replace(/sorumlu olduYu blge/g, 'sorumlu olduğu bölge')
                     .replace(/rn:/g, 'Örn:')
                     .replace(/Ynetim/g, 'Yönetim')
                     .replace(/stanbul/g, 'İstanbul')
                     .replace(/Editr/g, 'Editör')
                     .replace(/l Koordinatr/g, 'İl Koordinatörü')
                     .replace(/Blge Koordinatr/g, 'Bölge Koordinatörü')
                     .replace(/Genel Koordinatr/g, 'Genel Koordinatör');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  }
}
