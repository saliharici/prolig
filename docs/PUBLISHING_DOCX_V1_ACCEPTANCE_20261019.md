# PRO-LİG — Yayıncılık Word (.docx) V1 taslağı

**Durum: Test amaçlı, Preview API'si ve kayıtlı kitaplara bağlı; Production dağıtımı / database migration / PR merge yok.**

## İlk gerçek DOCX teslimi
- Var olan **Book** kaydı, oturumun **GENEL_KOORDINATOR** rolü ve `createdByUserId` filtreleriyle sunucudan okunur. İstemcinin gönderdiği içerik ve cevap anahtarı dosyaya kaynak yapılmaz.
- `GET /api/v1/books/:id/docx?answers=0`: **öğrenci nüshası**, seçenekler ve soru metinleri, açık uçlu cevap çizgileri; doğru cevaplar yok.
- `GET /api/v1/books/:id/docx?answers=1`: aynı kitap + **ayrı sayfada cevap anahtarı**. Sunucu yanıtı resmi DOCX MIME türü, `.docx` ek adı ve geçerli OOXML ZIP paketidir.
- Kayıtlı `BookChapter.sortOrder` ve `BookQuestion.sortOrder` sırası korunur. Kitap içeriği dondurulmuş `snapshot` değerlerinden üretilir; kaynak soru sonradan değişse bile kitap çıktısı değişmez.
- Başlıklar, temel kalın/italik/alt çizgi, basit listeler, metin ve tablo içeriği, çoktan seçmeli dört/beş şık, doğru/yanlış, açık uçlu soru türleri, Türkçe karakterler, A4 ve temel sayfa kırımı desteklenir.
- Paket için harici npm bağımlılığı kullanılmaz: WordprocessingML parçaları standart **ZIP STORE** kapsayıcısıyla oluşturulur. Dosya **gerçek, düzenlenebilir Word dokümanıdır**; `.docx` uzantılı HTML değildir.
- İki indirme düğmesi yalnız V2 Preview ekranında ve sadece kayıtlı kitap varsa görünür. Kaydedilmemiş seçimler Word'e aktarılmaz.
- Sunucudaki önizleme kilidi değişmez: `VERCEL_ENV=production` kesin 404; `prolig_v2_uat` dışında DB ile etkinleşmez. Soru/hakediş/kullanıcı verisinde yazma işlemi yoktur.

## Fail-closed sınırlar
- **Çift sütun şu anda desteklenmez**. `layoutColumns=2` kaydı Word'e çıkarılamaz; kullanıcı önce tek sütunlu biçimi kaydedip tekrar deneyebilir.
- **Görsel, medya, formül / TeX ve zengin bağlantılar** henüz Word nesnesi olarak güvenle taşınmaz. Eksik/bulanık çıktı oluşturmak yerine **HTTP 422** ve açıklayıcı hata verilir.
- Çok sütunlu tablo taşmaları, farklı font kuralları, bölüm bazlı sayfa numarası, içindekiler, tam matematik tipi (OMML) ve matbaa taşması bu V1 sözleşmesinin dışında kalır.
- Gerçek yazdırma kabulü, Word'de dosyayı açma + PDF'ye dönüştürme + Türkçe, tablo, sayfa kırımı ve öğrenci/cevap anahtarı karşılaştırmasıyla yapılacak; **CI geçmesi matbaa kabulü değildir**.

## Testler
- `tests/publishing-docx-v1.test.ts`: ZIP parçaları/merkez dizin, Türkçe ve XML escaping, saklanmış sıra (#77 → #79 → #78), öğrenci cevap gizliliği, cevaplı versiyon, uygunsuz medya/formül/sütun reddi.
- `Publishing V2 Isolated PostgreSQL Acceptance` lint/unit/build ve gerçek postgres işlemleri, Production bağımsızdır.
- Güvenlik: **sadece yetkili kullanıcı**, **yalnız GET**, **yalnız sahibine ait Book**, **sanitizasyonsuz kaynak HTML çalıştırma yok**.

## Sıradaki aşama
Word görünüm kabulü ardından, görsellerin embedded media ilişkileriyle, matematiğin gerçek Word uyumlu denklem gösterimiyle ve çift sütunun Word section yapısıyla desteklenmesi gerekir. Kayıtlı kitabın değiştirilmesi veya Production'a geçirilmesi bu PR'nin kapsamı değildir.
