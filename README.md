# Pro Lig · Etkileşimli Önizleme

Pro Lig ekibine gösterilecek rol ve iş akışı önizlemesi. Genel Koordinatör, İl Koordinatörü, Editör, Yazar ve Muhasebe görünümleri arasında üst sağdaki menüden geçiş yapılır.

## Önizlemede neler denenebilir?

- Yazar kendi soru taslağını oluşturur ve incelemeye gönderir.
- Editör ve Genel Koordinatör incelemedeki soruyu onaylar, revizyona yollar veya reddeder.
- İl Koordinatörü yalnızca İstanbul kapsamındaki örnek proje, soru ve yazarları görür.
- Türkiye Yazar Ağı ekranında 81 ilin haritası ve yazar rehberi birlikte incelenir. İl detayındaki düğme listedeki yazarları filtreler; il araması ve bölge filtresi kullanılabilir. İl Koordinatörü yalnızca İstanbul kapsamını açabilir.
- Muhasebe ve Genel Koordinatör örnek hakedişi onaylayıp ödendi olarak işaretler.
- Ekranlar role göre açılır; rol ve yetki matrisi karşılaştırılabilir.
- Genel Koordinatör, örnek işlem geçmişini görebilir. Yetki ekranı modül görünürlüğünü, işlem yetkilerini ve veri kapsamını ayrı ayrı gösterir.
- Veriler tarayıcıda saklanır. “Örnek verileri sıfırla” başlangıç durumunu geri getirir.

Bu bir **ürün deneyimi önizlemesidir**. Kimlik doğrulama, sunucu tarafı yetkilendirme, ortak veritabanı ve gerçek ödeme işlemi içermez. Gerçek müşteri verisi girmeyin. Örnek kişiler ve tutarlar kurgusaldır. Eski API uygulaması `legacy/api` altında korunmuştur ve bu statik dağıtıma dahil değildir.

## SchoolFlow'dan uyarlanan ilkeler

Kullanıcının paylaştığı SchoolFlow sohbetindeki üçlü yetki ayrımı bu önizlemeye uyarlandı: **ekran görünürlüğü, işlem yetkisi ve veri kapsamı**. İşlem geçmişi ve demo/pilot sınırının açıkça gösterilmesi de bu yaklaşımdan alındı. SchoolFlow'un okul, kurs, akıllı pano ve kiosk modülleri Pro Lig'in yayıncılık iş akışına doğrudan taşınmadı. Paylaşılan sohbet, SchoolFlow kaynak dosyalarını veya yüklenen eklerin içeriğini sağlamadığından burada kaynak kod aktarımı yapılmadı.

## Yerel çalışma

Node.js 20.19+ veya 22.12+ ile:

```bash
npm ci
npm run dev
```

Kontroller:

```bash
npm run lint
npm run build
```

## Vercel dağıtımı

Depoyu Vercel'e **Vite** projesi olarak bağlayın. Kök dizin proje kökü, build komutu `npm run build`, çıktı dizini `dist` olmalıdır; bunlar `vercel.json` içinde de belirtilir. Bu önizleme için ortam değişkeni veya veritabanı gerekmiyor. Dağıtımdan sonra `/` yolunu açıp rol menüsünden her görünümü deneyin.

Canlı ürüne geçerken gerçek kullanıcı girişini, sunucu tarafında rol ve sahiplik denetimini, veri şeması ve kalıcı veritabanını ayrı bir aşamada kurun.
