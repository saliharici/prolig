# PRO-LIG P1-D — Teknik Kabul ve Sürüm Sınırı Raporu

**Tarih:** 11 Ekim 2026  
**Branch:** `feat/question-studio-p1d-safe-roundtrip-20261011`  
**Son operatör regresyon doğrulamasında pull edilen HEAD:** `21a26e3`  
**Kapsam:** Soru Üretim Stüdyosu, çakışmaya dayanıklı PATCH, kurtarılabilir şifreli taslak ve izole pilot doğrulamaları.

## Yönetici özeti

**P1-D geliştirme/kabul kapsamı: BAŞARILI.** Genel TypeScript denetimleri, birim/regresyon testleri, Vite derlemesi, bağımsız Neon üzerinde soru yaşam döngüsü entegrasyonu ve tarayıcı UAT geçti.

**Production sürüm onayı: VERİLMEDİ.** Hiçbir `main` birleştirmesi, Production deploy, mevcut Neon şemasına migration veya gerçek kullanıcıya erişim başlatılmadı. Bu rapor özellik kabulünü kanıtlar; bütün PRO-LIG modülleri için uçtan uca Production sertifikası değildir.

## 1. Operatörün son gerçek kod kalitesi çalıştırması

Komutlar Windows PowerShell `D:\Proje\pro-lig` içinde yürütüldü:

| Kontrol | Kanıt / sonuç |
|---|---|
| `git pull --ff-only` | P1-D branch için fast-forward, `1fb930b..21a26e3` |
| `npm run lint` | **PASS** — `prisma generate`, `tsc --noEmit` UI ve `tsc --noEmit -p tsconfig.api.json` |
| `npx vitest run --exclude "tests/integration/**"` | **PASS — 54/54 test dosyası, 480/480 test**, 4.56 s |
| `npm run build` | **PASS** — Prisma Client v7.10.0, Vite v8.3.0, 1.708 dönüştürülen modül, yaklaşık 759 ms |
| `git status --short` | Yalnızca iki önceden var olan, izlenmeyen yerel dosya: `README.txt`, `docs/PROLIG_CURRENT_STATE_AUDIT.md` |

`tests/question-handlers.test.ts` içinde görülen `DB Error` ve `Tx Error` stderr metinleri, 500 yanıtlarının kontrollü davranışını sınayan **kasıtlı hata enjeksiyonlarıdır**. İlgili test dosyası **77/77 PASS**; bu günlükler test başarısızlığı anlamına gelmez.

Derleme uyarısı: `dist/assets/index-Atfi4Ui7.js` yaklaşık **712,90 kB** (gzip **231,56 kB**) olduğundan 500 kB chunk eşiği uyarısı üretildi. CSS yaklaşık 180,64 kB (gzip 34,43 kB). Derleme başarılıdır; performans optimizasyonu bağımsız iyileştirme başlığıdır.

## 2. Bağımsız veritabanı kabulü

**Neon kaynak:** `neon-yellow-candle`  
**Veritabanı:** `prolig_p1d_sandbox`  
**Eski PRO-LIG Neon kaynağından bağımsız:** pooled/direct kimliği ve eski host karşılaştırmasıyla doğrulandı.

- İlk READ ONLY inceleme: public tablolar 0, Prisma migration tablosu ve User tablosu yok, PASS.
- Yalnızca açık kullanıcı izniyle yedi checked-in Prisma migration kuruldu; altı yapay rol hesabı ve bir 8. sınıf matematik pilot projesi oluşturuldu.
- Kurulum sonrası: **7/7 migration PASS**, **6/6 pilot rol hesabı PASS**, yazar/editör/il koordinatörü yetki kapsamı ve proje-yazar bağlantısı **PASS**.
- Ayrı operatör izniyle `tests/integration/question-db.test.ts` yürütüldü: **20/20 PASS**, 21,07 s; yazar CREATE/GET/PATCH, kalıcı revizyon, iki oturumdan eski sürüm PATCH **409**, revizyon döngüsü, editör onayı, 403/200 rol görünürlüğü ve audit kaydı kontrol edildi.
- Tarayıcı kabulünün ve geçici soru temizliğinin ardından `node scripts/p1d-sandbox-verify.mjs` READ ONLY tekrarlandı: yine tüm kimlik, migration, kullanıcı ve proje kontrolleri **PASS**, veri değiştirilmedi.
- Son sağlık doğrulama betiği Question tablosunda sıfır kayıt sayısını ayrıca sorgulamıyor. Geçici soru `#2` silindikten sonra Soru Havuzu'nun **0 soru** gösterdiği operatör tarafından teyit edildi.

## 3. Tarayıcı kabulü

Yalnızca yerel `127.0.0.1:3137` ve sandbox-only çevre değişkenleriyle (Vercel CLI bağlantısı kullanılmadan) yürütüldü.

| Senaryo | Kabul kanıtı / sonuç |
|---|---|
| Pilot yazar oturumu ve Soru Havuzu | Kullanıcı ekran görüntüleri — PASS |
| Atanmış matematik projesini görme / seçme | `PILOT-MAT-8-001`, bir yazar — PASS |
| Yeni soru oluşturma | `#2`, Taslak, Matematik, atanmış 8. sınıf projesi — PASS |
| Şifreli taslak | Etkinleştirme, otomatik güncelleme, ara verme, tam sayfa yenileme ve ayrı parolayla geri yükleme — kullanıcının yeniden uygulamasıyla PASS |
| Aynı soruyu iki sekmede açma | Sekme A güncellemesi kaydedildi; Sekme B'nin eski düzenleme isteği engellendi |
| Çakışma sonrası görünüm | Kullanıcı ekran görüntüsünde yerel B taslağı korundu, sunucudaki A sürümü yan yana görüntülendi, "Kaydetme engellendi" uyarısı — PASS |
| Eski taslağı bırak / en yeni sürümü aç | Kullanıcı doğrulaması — PASS |
| Geçici soru `#2` silme | Kullanıcı doğrulaması, Soru Havuzu 0 — PASS |

Tarayıcıdaki 409 sonucu görsel çakışma uyarısıyla teyit edildi; gerçek HTTP **409** kodu ayrıca veritabanı entegrasyon testinde doğrulanmıştır. Şifreleme algoritmasının bağımsız güvenlik denetimi bu kabulün kapsamı dışında.

## 4. İncelenen teknik uyumluluk ve kalan riskler

### Yayın öncesi değerlendirme zorunlu

**PATCH API sözleşmesi değişikliği:** `api/v1/questions/[id].ts` artık her düzenleme isteğinde, istemcinin soruyu açtığında gördüğü `expectedUpdatedAt` ISO zaman damgasını gerektiriyor:

- Alan eksikse **428 Precondition Required**.
- Zaman damgası geçersizse **400**.
- Kayıt başka oturumda değişmişse **409 Conflict**.
- Başarılı PATCH sunucu revizyonunu monoton artırıyor; güncelleme sırasında `updatedAt` eşleşmesini koşullu olarak denetliyor (CAS).

Yeni `src/DemoApp.tsx` istemcisi eski revizyonu açıkça gönderiyor ve çakışmada yerel taslağı koruyor; tarayıcı UAT bunu doğruladı. Ancak `src/questions/types.ts` içindeki `PatchQuestionInput.expectedUpdatedAt` hâlen TypeScript açısından **opsiyonel (`?`)**, oysa sunucu açısından zorunludur. Başka istemciler / eski dağıtılmış sürümler revizyonu göndermiyorsa 428 alacaktır. **Release öncesi tüm PATCH çağıranları ve istemci dağıtım geçişi denetlenmeli; CAS koruması kaldırılarak geçiş yapılmamalı.**

### Takip maddeleri (bu turda başarısız test değil)

1. **PostgreSQL sürücü SSL semantiği:** `pg-connection-string` gelecekte `sslmode=require` davranışını değiştireceğine dair uyarı verdi. Mevcut güvenli davranış sürdürülmek isteniyorsa uygun ortamlarda açıkça `sslmode=verify-full` seçeneği değerlendirilmeli; bağlantı dizelerini ifşa etmeyin.
2. **Eşzamanlı `client.query()` deprecation:** Gerçek entegrasyon testi, pg@9 öncesi düzeltilmesi gereken olası paralel sorgu akışı uyarısı üretti. Ayrı hata incelemesi yapılmalı.
3. **Büyük frontend JS paketi:** Yaklaşık 713 kB minified asset uyarısı için rota/modül bazlı code splitting değerlendirilmeli.
4. **Sürüm entegrasyon sınırı:** P1-D feature branch dışındaki projeye paralel geliştirmeler, diğer modüller, mevcut Production veri kümesi ve tam dağıtım süreçleri bu pilota dahil değil. Güncel `main` ile kod çakışmaları ayrıca karşılaştırılmalı.

## 5. Kabul kararı ve bir sonraki operasyonel adım

**Karar: P1-D özelliği test ve kullanıcı kabulü bakımından tamamlandı; Production için henüz yayınlanmadı.**

Release kararı istenmeden önce:
1. `PATCH expectedUpdatedAt` kullanan bütün istemcileri ve eski sürümlerin geçiş senaryosunu doğrulayın; TypeScript sözleşmesindeki opsiyonellik tutarsızlığını değerlendirin.
2. Bu P1-D dalını diğer aktif geliştirme dalları ve güncel `main` ile birleştirme açısından inceleyin; merge/deploy yapmadan önce birleştirilmiş kodun yeniden lint, 480 regresyon ve izole DB/UAT gereksinimlerini planlayın.
3. SSL, pg deprecation ve frontend bundle uyarılarını uygun önem sırasıyla ele alın.
4. Production veritabanı ve deployment için **ayrı, kapsamı açık kullanıcı onayı** alın. Bu rapor böyle bir onay değildir.

**Gizlilik/saha durumu:** `.env.p1d.local` ve `.local/p1d-sandbox-credentials.env` içeriği rapora taşınmadı. Yerel izlenmeyen kullanıcı dosyaları olduğu gibi bırakıldı.


## 6. 11 Ekim 2026 yayın hazırlığı güncellemesi

Bu raporun ilk sürümü sonrası kullanıcı, kalan sürüm hazırlığı, birleştirme ve Production sürecini onayladı; ancak güvenlik kapılarının geçilmesi zorunluluğu devam ediyor.

- GitHub `main` ile karşılaştırma: P1-D feature dalı yaklaşık **190 commit ileride**, main tarafından ek commit yok; başka ilgili feature dalları bu dalın geçmişinde bulunuyor. Bu yüzden release kapsamı tek P1-D düzeltmesinden daha geniş.
- [Taslak Pull Request #14](https://github.com/saliharici/prolig/pull/14) açıldı, henüz merge edilmedi. GitHub başlangıçta PR'ın mergeable olduğunu bildirdi.
- Vercel mevcut Production dağıtımı `main` commit `10b34f2` üzerindedir; Production değişmedi.
- Vercel Production'da `DATABASE_URL` mevcut, fakat `DIRECT_URL` Production hedefli değişken olarak listelenmiyor. Bu eksiklik çözülmeden kör migrate/deploy çalıştırılmayacak. Henüz mevcut Production migration geçmişi salt okunur sorguyla doğrulanamadı.
- Vercel preview/check durumu `build-rate-limit` nedeniyle failure gösteriyor. Bu, uygulama kaynak kodunun başarısız derlendiğini kanıtlamıyor; barındırma tarafı limit ayrı bir sürüm engeli.
- PATCH sözleşmesindeki tutarsızlık için `src/questions/types.ts` içinde `expectedUpdatedAt` artık **zorunlu**; `buildQuestionEditPatch` açılan sorunun revizyonunu ekliyor. Böylece TypeScript kontratı ile sunucu 428/409 önkoşulu uyuşuyor. Eski harici istemciler için geçiş stratejisi yine gerekli.
- Değişiklikten sonraki ilk GitHub CI çalıştırmasında `tests/frontend-questions.test.ts` içindeki **üç eski PATCH test isteğinin revizyonu göndermediği** saptandı (TS2741). Bu testler revizyon gönderecek biçimde düzeltildi ve otomatik CI yeniden kontrol edilecek.
- P1-D 480/480 regresyon, lint ve Vite build operatör PASS kanıtı, bu son küçük sözleşme düzeltmelerinden **önceye** aittir; nihai SHA üzerinde GitHub CI ve gerekirse kullanıcı yerel doğrulaması tamamlanmadan Production kararı verilmez.

**Güncel karar:** PR incelemede; son CI, Vercel build-rate-limit, canlı veritabanı şema/rollback doğrulaması çözülmeden `main` birleştirmesi veya Production dağıtımı yapılmaz.
