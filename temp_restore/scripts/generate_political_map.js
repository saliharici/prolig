import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const { cities } = await import('turkey-map-react/lib/data/index.js');

  const regionsMap = {
    // Marmara (11)
    "İstanbul": "Marmara", "Edirne": "Marmara", "Kırklareli": "Marmara", "Tekirdağ": "Marmara",
    "Çanakkale": "Marmara", "Balıkesir": "Marmara", "Bursa": "Marmara", "Yalova": "Marmara",
    "Kocaeli": "Marmara", "Sakarya": "Marmara", "Bilecik": "Marmara",
    // Ege (8)
    "İzmir": "Ege", "Manisa": "Ege", "Aydın": "Ege", "Muğla": "Ege",
    "Denizli": "Ege", "Uşak": "Ege", "Kütahya": "Ege", "Afyonkarahisar": "Ege",
    // Akdeniz (8)
    "Antalya": "Akdeniz", "Burdur": "Akdeniz", "Isparta": "Akdeniz", "Mersin": "Akdeniz",
    "Adana": "Akdeniz", "Osmaniye": "Akdeniz", "Hatay": "Akdeniz", "Kahramanmaraş": "Akdeniz",
    // İç Anadolu (13)
    "Ankara": "İç Anadolu", "Konya": "İç Anadolu", "Eskişehir": "İç Anadolu", "Kayseri": "İç Anadolu",
    "Sivas": "İç Anadolu", "Kırıkkale": "İç Anadolu", "Aksaray": "İç Anadolu", "Karaman": "İç Anadolu",
    "Kırşehir": "İç Anadolu", "Niğde": "İç Anadolu", "Nevşehir": "İç Anadolu", "Yozgat": "İç Anadolu",
    "Çankırı": "İç Anadolu",
    // Karadeniz (18)
    "Bolu": "Karadeniz", "Düzce": "Karadeniz", "Zonguldak": "Karadeniz", "Karabük": "Karadeniz",
    "Bartın": "Karadeniz", "Kastamonu": "Karadeniz", "Sinop": "Karadeniz", "Çorum": "Karadeniz",
    "Amasya": "Karadeniz", "Samsun": "Karadeniz", "Tokat": "Karadeniz", "Ordu": "Karadeniz",
    "Giresun": "Karadeniz", "Trabzon": "Karadeniz", "Rize": "Karadeniz", "Artvin": "Karadeniz",
    "Gümüşhane": "Karadeniz", "Bayburt": "Karadeniz",
    // Doğu Anadolu (14)
    "Erzurum": "Doğu Anadolu", "Erzincan": "Doğu Anadolu", "Kars": "Doğu Anadolu", "Ağrı": "Doğu Anadolu",
    "Iğdır": "Doğu Anadolu", "Ardahan": "Doğu Anadolu", "Van": "Doğu Anadolu", "Muş": "Doğu Anadolu",
    "Bitlis": "Doğu Anadolu", "Hakkari": "Doğu Anadolu", "Bingöl": "Doğu Anadolu", "Tunceli": "Doğu Anadolu",
    "Elazığ": "Doğu Anadolu", "Malatya": "Doğu Anadolu",
    // Güneydoğu Anadolu (9)
    "Gaziantep": "Güneydoğu Anadolu", "Diyarbakır": "Güneydoğu Anadolu", "Şanlıurfa": "Güneydoğu Anadolu",
    "Batman": "Güneydoğu Anadolu", "Adıyaman": "Güneydoğu Anadolu", "Siirt": "Güneydoğu Anadolu",
    "Mardin": "Güneydoğu Anadolu", "Kilis": "Güneydoğu Anadolu", "Şırnak": "Güneydoğu Anadolu"
  };

  // Specific visual adjustments for province label/badge center points
  const manualCentroids = {
    'İstanbul': { x: 195, y: 210 },
    'Çanakkale': { x: 75, y: 280 },
    'Balıkesir': { x: 135, y: 295 },
    'Muğla': { x: 145, y: 490 },
    'Antalya': { x: 285, y: 515 },
    'Mersin': { x: 440, y: 505 },
    'Adana': { x: 505, y: 485 },
    'Hatay': { x: 568, y: 545 },
    'Sinop': { x: 498, y: 195 },
    'Konya': { x: 385, y: 435 },
    'Ankara': { x: 370, y: 325 },
    'İzmir': { x: 95, y: 380 },
    'Van': { x: 960, y: 385 },
    'Hakkari': { x: 980, y: 470 },
    'Diyarbakır': { x: 780, y: 425 },
    'Şanlıurfa': { x: 700, y: 475 },
    'Gaziantep': { x: 595, y: 485 },
    'Kilis': { x: 580, y: 510 },
    'Bursa': { x: 195, y: 275 },
    'Kocaeli': { x: 245, y: 232 },
    'Sakarya': { x: 275, y: 242 },
    'Düzce': { x: 305, y: 235 },
    'Bolu': { x: 335, y: 255 },
    'Zonguldak': { x: 335, y: 215 },
    'Bartın': { x: 365, y: 200 },
    'Karabük': { x: 375, y: 225 },
    'Kastamonu': { x: 440, y: 220 },
    'Samsun': { x: 565, y: 220 },
    'Ordu': { x: 640, y: 240 },
    'Giresun': { x: 690, y: 255 },
    'Trabzon': { x: 755, y: 248 },
    'Rize': { x: 810, y: 245 },
    'Artvin': { x: 855, y: 230 },
    'Ardahan': { x: 895, y: 235 },
    'Kars': { x: 925, y: 275 },
    'Iğdır': { x: 975, y: 300 },
    'Ağrı': { x: 925, y: 335 },
    'Erzurum': { x: 815, y: 300 },
    'Erzincan': { x: 710, y: 320 },
    'Sivas': { x: 590, y: 325 },
    'Kayseri': { x: 520, y: 395 },
    'Malatya': { x: 640, y: 395 },
    'Elazığ': { x: 695, y: 380 },
    'Tunceli': { x: 715, y: 350 },
    'Bingöl': { x: 780, y: 355 },
    'Muş': { x: 845, y: 365 },
    'Bitlis': { x: 885, y: 400 },
    'Siirt': { x: 865, y: 435 },
    'Batman': { x: 825, y: 430 },
    'Mardin': { x: 795, y: 485 },
    'Şırnak': { x: 900, y: 465 },
    'Adıyaman': { x: 660, y: 440 },
    'Kahramanmaraş': { x: 575, y: 430 },
    'Osmaniye': { x: 545, y: 480 },
    'Yozgat': { x: 495, y: 320 },
    'Çorum': { x: 480, y: 270 },
    'Amasya': { x: 525, y: 260 },
    'Tokat': { x: 575, y: 275 },
    'Çankırı': { x: 425, y: 265 },
    'Kırıkkale': { x: 425, y: 320 },
    'Kırşehir': { x: 445, y: 350 },
    'Nevşehir': { x: 465, y: 380 },
    'Niğde': { x: 465, y: 430 },
    'Aksaray': { x: 435, y: 405 },
    'Karaman': { x: 410, y: 485 },
    'Eskişehir': { x: 285, y: 315 },
    'Bilecik': { x: 250, y: 280 },
    'Kütahya': { x: 220, y: 330 },
    'Afyonkarahisar': { x: 280, y: 375 },
    'Uşak': { x: 200, y: 375 },
    'Manisa': { x: 135, y: 350 },
    'Aydın': { x: 115, y: 425 },
    'Denizli': { x: 185, y: 440 },
    'Burdur': { x: 235, y: 450 },
    'Isparta': { x: 275, y: 435 },
    'Edirne': { x: 95, y: 175 },
    'Kırklareli': { x: 145, y: 175 },
    'Tekirdağ': { x: 135, y: 225 },
    'Yalova': { x: 215, y: 242 },
    'Gümüşhane': { x: 725, y: 285 },
    'Bayburt': { x: 765, y: 285 },
  };

  const list = cities.map(c => {
    const nums = c.path.match(/-?[\d\.]+/g).map(Number);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < nums.length; i += 2) {
      const x = nums[i], y = nums[i+1];
      if (x !== undefined && y !== undefined) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    const calculatedCenter = { x: Math.round((minX + maxX)/2), y: Math.round((minY + maxY)/2) };
    const center = manualCentroids[c.name] || calculatedCenter;

    return {
      id: c.plateNumber,
      code: c.plateNumber < 10 ? '0' + c.plateNumber : String(c.plateNumber),
      name: c.name,
      slug: c.id,
      region: regionsMap[c.name] || 'Diğer',
      x: center.x,
      y: center.y,
      d: c.path
    };
  });

  // Sort by plateNumber ascending (01 to 81)
  list.sort((a, b) => a.id - b.id);

  const fileContent = `// Turkey 81 Provinces Official Political Map Vector Data
// High-precision geographic SVG paths conforming to Turkey's political administrative borders
// ViewBox: "10 135 1030 460"

export interface ProvinceMapItem {
  id: number;
  name: string;
  code: string;
  slug: string;
  region: string;
  x: number;
  y: number;
  d: string;
}

export const TURKEY_MAP_VIEWBOX = "10 135 1030 460";

export const TURKEY_MAP_PROVINCES: ProvinceMapItem[] = ${JSON.stringify(list, null, 2)};
`;

  const outputPath = path.resolve(__dirname, '../src/components/turkeyMapData.ts');
  fs.writeFileSync(outputPath, fileContent, 'utf8');
  console.log('Successfully generated political map with 81 provinces to', outputPath);
}

generate();
