# PRO-LIG V5 | Profesyonel Çok Bölümlü Kitap Atölyesi
Tarih 2026-10-29 · TEST PR #117 · Prod etkisi yok.

## Teslim kapsamı
- 1–30 bölüm oluştur, adlandır, yukarı/aşağı sırala, sil, kaydet; her bölümde bağımsız soru sırası. Aynı soru birden fazla bölümde bulunamaz.
- Yalnız ONAYLANDI ve arşiv dışı sorular seçilir. Mevcut V4 ünite planı bölüm düzenine isteğe bağlı aktarılır. Başka bölüme soru taşıma ve sıra değişimi desteklenir.
- Mevcut V2 sunucu API'si (30 bölüm, 300 soru) üzerinden kayıt ve revizyonla güncelleme; sunucu kaynak soru, onay ve sürüm doğrulamasını yeniden yapar. Doğrulama başarısızsa hata ve yeniden açma seçeneği.
- HTML baskı/PDF: A4, kapak, içindekiler, bölüm başlıkları, sayfa sonları, cevap anahtarı; tarayıcı «Yazdır → PDF olarak kaydet» ile PDF üretilir. Doğrudan sunucu PDF endpoint'i YOK. Baskı motorunda desteklenen CSS margin-box'larla sayfa numarası; içindekilerde kesin sayfa numarası tarayıcıdan bağımsız garanti edilmez.
- DOCX: kaydedilmiş sürümden güvenli sunucu Word, bölüm ayrımı, Word dinamik TOC alanı, PAGE alanı; Word ilk açılışta TOC güncellenmesini isteyebilir (Ctrl+A/F9). Harici görsel ve matematik destek sınırları sürüyor, eksik belge sessizce üretilmez.
- Kitap önizlemesi yeni düzenleme sırasında kayıtlı kaynak sorunun dondurulmuş sürümünü gösterebilir; Word daima kaydedilmiş sürümden gelir.
- Yayına alma, ISBN, nihai matbaa PDF dizgisi ve yayımlanmış kitapların geri alınması bu TEST paketinde YOK. P3 özel PNG sadece eski izole gate altında ve doğrulanmış kaynakla devam eder.

## Kabul özeti
İzole Preview: yazar/editör geçmiş PASS'leri yeniden başlatılmadı.
V5 tek ürün turu: (1) 2 ünite/bölüm oluştur veya V4 planından aktar; (2) farklı onaylı sorular yerleştir; (3) kaydet, yeniden aç, sırayı karşılaştır; (4) Word öğrenci/cevaplı DOCX; (5) yazdırma PDF.
Hobi planı için yeni serverless fonksiyon/migration yok. Production'a merge yapılmadı.
