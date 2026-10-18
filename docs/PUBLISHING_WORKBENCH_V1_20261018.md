# PRO-LİG — Yayın Hazırlık Atölyesi V1

**Kapsam:** İlk yayıncılık dilimi, sadece `GENEL_KOORDINATOR` için, **salt okunur** ve geçici tarayıcı durumudur. Bu adım üretime geçmiş Word/DOCX ve matbaa PDF işlevi değildir.

## Doğrulanabilen ilk teslim
- Gerçek oturum kapsamındaki `GET /api/v1/questions` üzerinden gelen aktif sorulardan yalnızca `ONAYLANDI` ve `isArchived=false` kayıtlar seçilir.
- Genel Koordinatör, kitap ve bölüm başlığını, soru sırasını, tek/çift sütunu ve (varsayılan kapalı) ayrı cevap anahtarını belirler.
- Öğrenci nüshasında doğru şık veya model cevap gösterilmez. Cevap anahtarı açıldığında çoktan seçmeli, doğru/yanlış ve açık uçlu cevaplar ayrı sayfada görünür.
- Önizleme, React metin kaçışı ve mevcut `StudioMarkup` bileşenini kullanır. Görsel yalnız izin verilen HTTP(S) veya kök-göreli kaynak adreslerinden gösterilir.
- `Yazdır / PDF` tarayıcının yerel print arayüzünü açar; kullanıcı isterse PDF olarak kaydeder. A4 ve baskı ölçeği tarayıcıdan kontrol edilmelidir.
- Veri olmayan, yükleme hatası görülen veya kitap başlığı boş olan durumlarda baskı butonu devre dışıdır.
- API CRUD, tahakkuk, onay, ödeme, Prisma migration ve sunucu üzerinde Book/Question kaydı oluşturulmaz.

## Açık sınırlar — özellik tam kabul değildir
- **Kalıcı kitap yok:** Prisma `Book` modeli bulunmasına rağmen soru–kitap ilişkisi, bölüm/sıra, revizyon snapshot'ı ve yayın yaşam döngüsü mevcut değildir.
- **DOCX yok:** Word (.docx) için gerçek doküman paketi ve tablo/görsel/formül biçimlendirme, ayrı tasarım ve bağımlılık değerlendirmesi gerektirir. Bu ekranın çıktısına `.docx` denmez.
- **Baskı dizgisi sınırlı:** Matematik TeX, video, bağlantı, iç içe tablo ve geniş görsellerin nihai sayfa kırımı kontrol edilmelidir. Matbaaya hazır PDF garantisi yoktur.
- **Katalog tamamlık garantisi yok:** Soru kaynağı, oturumun API aracılığıyla o an getirdiği erişilebilir listedir. Tüm soru havuzu veya belirli yayının eksiksizliği iddia edilmez.
- **Rol ve güvenlik:** Menü/React rol kontrolü tek başına bir sunucu yetkilendirme kuralı değildir. V1 sunucuya yeni endpoint açmaz. Kalıcı kitap/çıktı üretim API'si geldiğinde gerçek sunucu-rolleri, proje kapsamı, revizyon/sahiplik ve yetkisiz erişim testleri zorunludur.

## Sıradaki teslimler
1. **V2 — Kalıcı kitap şeması:** `Book` ile `Question` arasında sürümlü `BookQuestion` eşlemesi; `chapter`, `sortOrder`, `sourceQuestionUpdatedAt`, kitap durumları ve proje/coğrafi yetki API kapıları. Migration için ayrı açık onay ve yedek/geri dönüş.
2. **V3 — Gerçek Word/DOCX:** Türkçe karakter, yazı tipi, sayfa numarası, soru ve cevap anahtarı, güvenli medya, çoktan seçmeli/klasik/Doğru-Yanlış, satır/sayfa bölünmesi ve tam dosya doğrulama.
3. **V4 — Matbaa PDF:** Gömülü font, matematik dizgisi, görsel DPI/izin, taşma ve baskı öncesi kalibrasyon testleri; yayın onay ve dosya sürümleme.
4. **V5 — Yayın akışı:** Sürüm dondurma, yayınevi düzeltmesi, tekrar basım, telif/lisans bağlantısı ve denetim izi.

## Kullanıcı kabulü
GENEL_KOORDINATOR ile Yayıncılık sayfasını aç; sadece mevcut onaylı ve arşivlenmemiş soru göründüğünü denetle. İki soruyu işaretle, sırasını değiştir, tek/çift sütunu dene, cevap anahtarını aç/kapat ve PDF önizlemede menülerin görünmediğini kontrol et. **Gerçek kaydetme, soru onayı veya ödeme yapılmaz.**
