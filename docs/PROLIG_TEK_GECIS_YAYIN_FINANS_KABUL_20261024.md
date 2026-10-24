# PRO-LIG | Tek geçişlik yayın + finans kabul sözleşmesi
**24.10.2026 · Sahip: 03 MİMARİ → Uygulama: 01 TEST · Ortam: yalnız izole Preview + izole Neon**
**İncelenen main SHA:** `2654872084c4fd3190ab5d6b345a8509f6d89564`.
**Durum:** UYGULAMA-KABUL PLANI; buradaki yeni senaryolara otomatik PASS atanmaz.

## Kaynaktan doğrulanan davranışlar
1. `api/v1/questions/[id]/workflow.ts`: `submit` yalnız soru sahibi `YAZAR` için `TASLAK/REVIZYON → INCELEMEDE`; `request_revision` `INCELEMEDE → REVIZYON`; `approve` `INCELEMEDE → ONAYLANDI`; `reject` `INCELEMEDE → REDDEDILDI`. Editör/Genel Koordinatör kapsamı `question-access.ts` tarafından korunuyor; durum değişikliği `updateMany(id+old status)` optimistic claim ve tek Prisma transaction ile yapılır.
2. `approve` işlemi yalnız aynı transaction içinde `accrueQuestionApproval` çağırır. `compensation-engine.ts`: yazar `QUESTION_AUTHOR:<questionId>`, eğer onaylayan `EDITOR` ise editör `QUESTION_EDITOR:<questionId>` kazanımı. `sourceKey` tekilleştirme amaçlı; tarife yoksa `COMPENSATION_RATE_MISSING` audit üretilir ve tahakkuk **oluşmaz**. Bu durum sessizce 'ödeme hazır' sayılmamalı.
3. Koordinatör tahakkuku mevcut kodda `accrueProjectCoordinatorCompletion` üzerinden **proje bazlı** olup soru onayındaki `accrueQuestionApproval` içinde değil. Yazarın geçmiş 'her onaylı soruya koordinatör ücreti' beklentisi varsayımsal olarak uygulanmış sayılamaz; bu bir **ürün kararı** gerektirir. Mevcut tarifeler `compensation-handler.ts` içinde Genel Koordinatör yönetimine açık, Muhasebe salt okunurdur.
4. `src/publishing/book-draft-contract.ts`: kitap taslağını yalnız `GENEL_KOORDINATOR` değiştirir; yalnız `ONAYLANDI`, arşiv dışı, doğru projedeki sorular eklenir. Bir sorunun birden fazla eklenmesi yasak; snapshot cevap anahtarı ve yazar bilgisiyle dondurulur; en çok **30 bölüm, 300 soru**, 1 veya 2 sütun. `book-handler.ts` V2 Production kapısını backend/DB host ve release env ile sınırlar.
5. `payment-settlement.ts` ve `payment-period-handler.ts`: Muhasebe ödeme dönemi yürütme yetkisine sahip, Genel Koordinatör okur. Ödeme statüsü şartları, optimistic concurrency ve dönemin `ONAYLANDI` olması kontrol edilir; `Serializable` transaction kullanılır. `CompensationEntry` ile `Payment` farklı mali defterlerdir.
6. Eski `docs/compensation-phase2.md` belgelediği PGlite tek bağlantılı testin native çoklu bağlantı rekabeti yerine geçmediğini açıkça belirtiyor. Bu boşluk **yeni test için gerçek ihtiyaç**, eski PASS tekrarına gerekçe değil.

## Tek sentetik yayın senaryosu — eksik bağlantı odaklı
**Ortam:** yeni/önceden ayrılmış doğru TEST Neon; Production Neon veya Production uygulaması **ASLA** hedef değil. Başlamadan `project_id`, `branch_id`, `database`, Preview URL ve SHA kesin doğrulanacak. Mevcut P3 Preview test kayıtları/matbaa soruları değiştirilmeyecek.

| No | Eylem | Beklenen değişmez/kanıt | Önceden bilinen durum |
|---|---|---|---|
| Y1 | İzinli sentetik YAZAR taslak soru oluşturur, yeniden açar | Author-scope, kalıcı içerik/sürüm | Önceki izole soru create/reopen PASS korunur |
| Y2 | Soru `submit` edilir | 200, `INCELEMEDE`, tek audit; tekrar/yanlış rol 409/403 | Mock sözleşmeler PASS; gerçek birleşik akış BİLİNMİYOR |
| Y3 | Doğru branş/il editörü revizyon ister | 200, `REVIZYON`, sınırlı not; yabancı editor 403 | KISMİ |
| Y4 | Aynı yazar düzeltir/yeniden gönderir | Önceki metin ve sürüm güvencesi, `INCELEMEDE` | KISMİ |
| Y5 | Yetkili editör onaylar | `ONAYLANDI`, tek audit; yazar+editör kaynak-anahtarı tekil; oran eksikse net uyarı | Kod sözleşmesi var, izole uçtan uca mali kabul BİLİNMİYOR |
| Y6 | Yanlış kullanıcı/tekrar onay denemesi | 403/409, yeni `CompensationEntry` yok | Yeni hedefli negatif bağlantı |
| Y7 | Genel Koordinatör onaylı soruyu bölüm/kitaba alır | Proje/rol/aynı soru kısıtı; `BookQuestion.snapshot` dondurulmuş | DOCX/snapshot geçmiş izole PASS, yeni uçtan uca zincir BİLİNMİYOR |
| Y8 | Kaynak soruda sonraki değişiklik (yalnız izinli TEST) | Dondurulmuş kitap snapshot değişmez | İstenen invariant; değişikliğe yetki yoksa manipülasyon yok |
| Y9 | Word çıktı ve cevap anahtarı | Metin, cevap, kitap sırası, medyanın uygun sınıfları; P3 özel PNG yalnız izinli izole Preview | Önceki P3 Word PNG kullanıcı PASS; farklı yazdırma turu gereksiz |
| Y10 | Aşama kapanışı | Beklenen soru/kitap/audit/tahakkuk sayıları; sentetik kayıtlar izole; gerçek hesaplar korunur | BİLİNMİYOR |

**Kabul tekniği:** Önceden PASS olan Y1 ve önceki Word PNG testini sırf bu liste için yeniden koşma. Y2–Y7'nin **yalnız eksik birleşim noktalarını** hedefli TEST kabulüne bağla. Finansal etkili `approve` yalnız sentetik data ve izole TEST ile ayrı net kapsamda. Test başarısızsa prod yazısı yok.

## Finans için tek native concurrency gereksinimi
**Ayrı küçük TEST iş paketi (Production değil):** Aynı `PaymentPeriod` içinde iki PostgreSQL bağlantısından `prepare/settle/pay/close` rekabeti. Sistem yalnız bir kazanan durum geçişi oluşturmalı, kaybeden deneme 409; ödeme tekrar çağrısı ikinci `Payment` üretmemeli; tahakkuk ve ödeme mutabakatı `BigInt cents` üzerinden eşleşmeli. `sourceKey`, `(paymentPeriodId,authorUserId)` unique, Serializable çatışma/P2034 sonucu ve audit sayıları doğrulanmalı. PGlite/mock testini native çoklu bağlantı PASS diye yazma.

## Ürün kararı gereken tek açık mali konu
**KOORDİNATÖR BİRİMİ:** Mevcut kod: proje tamamlandığında koordinatör başına `PROJECT` birimi. Alternatif: her onaylanan soru için koordinatör başına `QUESTION` birimi. İki model aynı projede otomatik birleşirse çift hakediş riski doğar. Öncelikli varsayılan, **mevcut proje bazlı modelin korunmasıdır**; karar olmadan ücret modeline dokunma. Tarife Genel Koordinatör tarafından belirlenir; değişiklik eskiden tahakkuk etmiş tutarı yeniden yazmaz.

## Devir / son durum
- **TEST PASS yazma koşulu:** sentetik API + gerçek izole DB + doğru kullanıcı kapsamı + audit + telif/kitap tutarlılığı kanıtı.
- **FAIL:** tekrar tahakkuk, yabancı soruya erişim, snapshot değişimi, çift ödeme, bilinmeyen DB veya koşulsuz finans onayı.
- **Sıradaki sahip:** 01 TEST eksik tek birleşik kabulü izole Preview'da hazırlar; 03 MİMARİ koordinatör birim fiyat kararını netleştirir; 02 CANLI için Production yayın ayrı kapıdır.
