# PRO-LIG | 7 adımda güvenli tamamlama ve kabul planı
**Tarih:** 24.10.2026 (Europe/Istanbul)  
**Belge sahibi:** 03 MİMARİ | **Durum:** UYGULAMA PLANI — yalnız dokümantasyon, Production GO değildir  
**Başlangıç main SHA:** `2654872084c4fd3190ab5d6b345a8509f6d89564`  
**Canlı:** https://prolig.vercel.app/ | **Vercel project:** `prj_jXxAOO5pMvKLVq8IXhzGekBNOjho`

> Kanıt hiyerarşisi: GitHub kod/PR/SHA → ilgili Vercel deployment ve doğru Neon kimliği → tarihli ortak durum → sohbet geçmişi. `PASS (operatör)`, `PASS (araç)`, `READY` ve `PLAN` asla eşit değildir. Bu belge canlı ortamda değişiklik yapma yetkisi vermez.

## 26 Ekim 2026 — GO-0 güncel mantıksal yedek / koşullu kabul
- Mevcut Production `main 643cc3a524cb54c497cda550980fbc78f999be4d`, deployment `dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc` READY, yeni sürüm runtime DB identity **MATCH=true (OPERATÖR PASS)**.
- 26 Ekim V3 operatör çıktısı: güncel `pg_dump -Fc` şifreli arşiv ve AES-GCM doğrulama **OPERATÖR PASS**; ağsız izole PostgreSQL 18 restore + kritik sayım eşleşmesi **OPERATÖR PASS**. `_RAPOR.json` ve gerçek arşiv henüz bağımsız incelemeye sunulmadı.
- Ücretsiz Neon'da güncel snapshot/PITR kapısı **BLOKE**; mevcut 11 Ekim snapshot korunur. 26 Ekim PostgreSQL mantıksal yedeği, **snapshot'ın aynı işlevini sağlamaz**; mimari karar gereği ancak koşullu bir geri kazanım alternatifi olarak değerlendirilebilir.
- **Adım 1 bütünü HENÜZ PASS DEĞİL:** rapor içeriği, bağımsız/çift konumlu şifreli kopya, ayrı parola saklama, uygulama/Storage/env kapsamı, operasyonel rollback/izleme ve kabul edilebilir RPO/RTO açık. Yeni `pg_dump` veya restore tekrarı istenmez; mevcut kabul korunur.
- Yeni [**GO-0 mantıksal yedek kabulü ve güvenli geri dönüş kararı (26 Ekim)**](GO0_LOGICAL_BACKUP_KABUL_VE_GERI_DONUS_KARARI_20261026.md), eski tarihli "güncel snapshot şart" ifadelerinin bu koşullu alternatifle birlikte okunması için eklendi. **Migration/deploy/merge yetkisi oluşmadı.**

## 25 Ekim 2026 güncel operasyon sonucu
- Kullanıcının ayrı canlı yayın onayıyla [PR #112](https://github.com/saliharici/prolig/pull/112) merge edildi, yeni `main` SHA **`643cc3a524cb54c497cda550980fbc78f999be4d`**.
- Vercel Production **`dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc` READY**, kanonik `prolig.vercel.app` alias eşleşti; `GET /api/v1/health` **HTTP 200**.
- Yeni Production deployment-scoped operatör logunda `PROLIG_GO0_IDENTITY` **`MATCH=true`**, direct Neon endpoint / `neondb` / READ ONLY SELECT kanıtı alınmıştır. Bu yalnız **yeni SHA** için PASS, önceki SHA için değildir.
- **Adım 1 hâlâ tamamlanmadı:** Yalnız güncel Production Neon `prolig-pilot/main` snapshot + **izole yeni restore dalı kabulü** eksik. Bu aşama ayrı açık işlem onayına bağlı; Neon main'e restore veya var olan branch silinmesi yok.
- Bu belgenin aşağıdaki `0. Başlangıç durumu` bölümünde yer alan `main 26548720` ve `runtime MATCH bilinmiyor` ifadeleri **24 Ekim tarihli tarihsel başlangıç durumudur**, 25 Ekim mevcut durumunu göstermez.

## Production GO-0 kanıt ve müdahale planı
- [**Runtime DB kimliği ve yedek/restore kapıları — 24 Ekim güncel operasyon dosyası**](PROLIG_GO0_PRODUCTION_DB_KIMLIK_RUNBOOK_20261024.md): Vercel erişimi PASS; mevcut deployment ile `prolig.vercel.app` alias eşleşmesi PASS; `DATABASE_URL` ve `AUTH_SECRET` Production env metadata'sında **VAR** (96 kayıt tam filtrelendi; önceki yok ifadesi yanlıştı). Gerçek sensitive değerler maskeli ve mevcut runtime eski SHA'nın DB bağlantısı **BİLİNMİYOR**. İzole Preview test/doğrulama ve ayrı izinli Production env/deploy/backup planı, geri dönüş değişmezi.

## Bu plana bağlı uygulama sözleşmeleri
- [**Tek geçişlik yazar–editör–kitap ve telif kabul matrisi**](PROLIG_TEK_GECIS_YAYIN_FINANS_KABUL_20261024.md): kanonik API durum geçişleri, hangi önceki PASS'ın korunacağı, yalnız eksik E2E bağlantısı ve PostgreSQL çoklu bağlantı finans güvenliği.
- [**ADR-006 Süper Admin ve çok yayınevi (ÖNERİ)**](ADR006_SUPER_ADMIN_COK_YAYINEVI_20261024.md): kurumlar arası veri izolasyonu, şirket formu, bağımsız DB/Storage seçeneği, tenant A/B negatif kabulü. Production tasarım/uygulama kararı değildir.

## 0. Başlangıç durumu — gerçek kanıt ve korunacak kazanımlar
- GitHub `main` en son doğrulanan commit `26548720` (UX-06 Bootstrap responsive public). Vercel Production deployment `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` için READY kaydı bulunuyor. Domain `prolig.vercel.app` Vercel projesine doğrulanmış bağlıdır.
- #93 profesyonel Soru Stüdyosu P3 kodu main'e squash merge edildi; canlı profesyonel editör kullanıcı görsel PASS. Bu, bütün modüllerin E2E/UAT PASS olması değildir.
- UX-01/02/04/05/06 arayüz değişiklikleri (#94, #96, #100, #101, #102) main'e alındı. Yeni yayıncılık arayüzü, video, akordeon ve responsive kurgu yeniden geliştirilmez.
- İşlem Geçmişi #103 taslağı kullanıcı canlı PASS bildirdiği için **merge edilmeden kapatıldı**; ihtiyaç kanıtsızsa tekrar açılmaz.
- İzole P3 private PNG bucket: `wandering-hill-34960596` / `br-misty-base-bac3oqzr` / `prolig-p3-geometry-test`, private. Yükleme, soruya bağlama, tekrar açma, Word'e gömme **izole TEST kullanıcı PASS**. Production private PNG kapalı; P3 üretim migration ve storage GO değildir.
- UX03 #104 (main bazlı), #106 (base #104) ve #109 (base #106) **OPEN/DRAFT**; birbirini körlemesine main'e birleştirme. #109 20/20 negatif test PASS, ancak yalnız TEST kodu; Production runtime DB identity `MATCH` **BİLİNMİYOR**.
- UX03 #107 **CLOSED, PASS (kullanıcı operatör kanıtı)**: Windows Prisma exit=0, TEST SQL Editor 12/12 TRUE, kullanıcı doğru disposable dala geçip PASS bildirdi. Bağlı Neon connector bağımsız post-run doğrulaması yapılmadı. CLI/SQL tekrar çalıştırılmaz.
- UX03 e-posta teslimi, reset, yeni giriş ve API düzeyinde oturum iptali TEST PASS olarak kaydedilmiştir. Bu kanıt Production mail/sender yayını değildir.
- **ADR-005 #105 KABUL:** Kurtarma OFF olsa da authVersion/JWT sürüm kontrolü ON; legacy `v` alanı olmayan token ilk yeni Production güvenli sürümde 401; kullanıcı yeniden giriş yapar. İlk kalıcı güvenli rollback tabanı recovery OFF + JWT enforcement ON olacaktır. `authVersion>0` üretim kullanıcıları oluşunca eski sürüm kontrolsüz deploy'a rollback YASAK.
- **Aktif operasyonel engel #108:** canlı fonksiyonun gerçekten Production Neon `prolig-pilot/main/neondb` kullandığı runtime ortamında gizli değer açıklanmadan MATCH ile kanıtlanmadı. Güncel Production snapshot + bağımsız restore tatbikatı da PASS değil.
- `README.md` ve 18.10.2026 tarihli envanter tarihsel belgelerdir; bugünkü en son durum yerine kaynak alınmaz. Başarıyla kapanan P2/P3 testleri sırf yeni sohbet açıldı diye tekrarlanmaz.

## 1. Production kimlik, gözlem ve güvenli geri dönüş (P0)
**Sahip:** 02 CANLI, mimari GO denetimi 03 MİMARİ.  
**Durum:** **BLOKE / NO-GO**. İş kaydı: [#108](https://github.com/saliharici/prolig/issues/108); teşhis taslağı [#109](https://github.com/saliharici/prolig/pull/109).

**Yapılacaklar:**
1. Mevcut Production **fonksiyon runtime** `DATABASE_URL` hedefini yetkili yöntemle, secretsiz sadece **`MATCH=true/false`** şeklinde Neon proje/branch/DB ve doğrudan endpoint kimliğiyle kıyasla. Vercel env anahtarının varlığı, yerel terminal, Preview veya başka deployment bunu ispat etmez. Mevcut SHA'da çalıştırma kanalı yoksa `BİLİNMİYOR` kalır; yetkisiz/korumasız teşhis API'si eklenmez.
2. Kimlik MATCH kanıtı ve **ayrı işlem onayı** sonrasında güncel Production backup/snapshot; Production'a bağlanmayan yeni izole restore dalı; veri tutarlılığı sayım/şema ve geri kazanım koşulları. 11.10 snapshot'ı güncel restore PASS değildir.
3. Deploy/rollback/runbook: hedef SHA, deployment ID, migration ledger/checksum, gözlem kriterleri, hata eşikleri, operasyon sahibi ve roll-forward. Runtime error günlükleri erişilemezse `BİLİNMİYOR` raporlanır.
4. Browser'a gömülen `VITE_*` değişkenleri dahil public bundle'da istemciye gizli anahtar çıkmadığı **içerik-ifşasız** statik/dinamik kontrol; gerçek sızıntı kanıtlanmadan 'sızıntı var' denmez.

**PASS koşulu:** runtime DB MATCH (ayrı kanıt) + güncel backup/izole restore PASS + rollback/runbook + erişilebilir izleme/eksik erişimin kaydı.  
**GO sınırı:** snapshot/restore, Prod env/DB/migration/deploy veya main merge ancak somut hedef, etki ve rollback ile **ayrı açık onay**.

## 2. Şifre kurtarma ve kalıcı oturum iptali (P0)
**Sahip:** 01 TEST → 03 MİMARİ → 02 CANLI.  
**Durum:** **İzole kabul kullanıcı PASS; Production kapıları NO-GO**. [#104](https://github.com/saliharici/prolig/pull/104) / [#106](https://github.com/saliharici/prolig/pull/106) / [#105](https://github.com/saliharici/prolig/issues/105).

**Yapılacaklar:**
1. Geçmiş 8/8 negatif güvenlik, test e-postası, parola sıfırlama, yeni giriş ve #107 seçici Prisma CLI/metadata operatör PASS sonuçlarını **koru, yeniden koşma**.
2. #104 + #106 farklarını güncel main'e dayanan **tek release candidate Preview** ile bütünleştir; #106'nın stacked delta'sını tek başına 'tam sürüm' sayma; #109 runtime teşhis taslağını körlemesine Production'a alma.
3. P3 migration içermeyen tek UX03 additive schema paketini, geçmiş 9 migration checksum/ledger bütünlüğü ile önce uygulama ön koşulu olarak ayır. **Production kök `prisma migrate deploy` yasak**: P3 migration'ı da tetikleyebilir.
4. Önce GO-0 + ayrı Production migration onayı → şema-only → ledger PASS. Sonra ayrı merge/deploy onayı → recovery OFF, JWT version check ON, legacy JWT 401, mevcut rol/giriş smoke PASS; güvenli rollback SHA+deployment ID sabitle.
5. Üretim mail açılışı sonraki **ayrı** adım. Doğrulanmış kurum alan adı+Resend göndereni, özel Production API key/pepper, exact origin/host, backend iki ayrı açık flag, UI Production flag ve kontrollü teslim. `onboarding@resend.dev` Production'da yasak; TEST secret/DB kopyalanmaz.
6. Etkilenen aktif kullanıcılar için kişisel veri içermeyen, yayın öncesinde onaylı yeniden giriş duyurusu hazırla.

**PASS koşulu:** önce recovery OFF güvenli Production taban sürümünün gerçek login/rol/authVersion smoke PASS; ardından bağımsız onayla live mail/reset UAT.  
**Rollback:** authVersion değişmiş kullanıcı varsa 22/24 Ekim eski version-check'siz main'e dönülmez; önce recovery flag OFF + versiyon doğrulayan güvenli taban/roll-forward.

## 3. Yazar → editör → kitap uçtan uca yayın akışı (P0/P1)
**Sahip:** 01 TEST; kabul matrisi 03 MİMARİ; yayın 02 CANLI.  
**Durum:** **KISMİ KABUL; tam senaryo kanıtı BİLİNMİYOR**.

**Tek uygulama iş emri:** [ACCEPT-01 #111 — yayın–kitap–telif tek geçişlik TEST kabulü](https://github.com/saliharici/prolig/issues/111). Önceki PASS'ler korunur.

**Tek yeni örnek senaryo:** İzole TEST'te sentetik yayınevi projelendirmesi → yazar rolüyle soru/taslak → editöre gönder → revizyon → yazar düzeltme/yeniden gönderme → editör onay (mali etkisi yalnız izole sentetik veride) → bölüm/kitap seçimi → dondurulmuş soru snapshot → Word çıktı/cevap anahtarı. İlgili adım önceden PASS ise yeniden koşulmaz; yalnız eksik bağlantı test edilir.

**Değişmezler:** yabancı yazara erişim 403; ilgili il/branş/rol kapsamı korunur; ret/revizyon telif üretmez; onay iki kez aynı tahakkuku yazmaz; kitap snapshot'ı canlı soru sonradan değişse bile değişmez; soru içeriğindeki kaynak satır sonu otomatik düzeltilmez.

**PASS koşulu:** tek uçtan uca sentetik akışın ekran+API+Neon kayıt/kapsam kanıtı ve başarısız durumda veri korunumu. Gerçek kullanıcıya dokunulmaz.

## 4. P3 özel PNG'nin güvenli Production açılışı (P1)
**Sahip:** 03 MİMARİ storage/izin/rollback → 01 TEST izole negatif kabul → 02 CANLI aşamalı release.  
**Durum:** **TEST kullanıcı PASS; Production KAPALI**.

**Yapılacaklar:** Production için ayrı private bucket ve doğru kimlik/izin sınırı, PNG MIME/byte/magic ve boyut sınırı, sahiplik/revizyon bütünlüğü, imzalı kısa ömürlü okuma, yükleme sonrası DB referans bütünlüğü, dondurulmuş kitap manifestinden doğrulanmış resim Word'e gömme, log'da private object URL sızıntısı olmaması; P3 migration tam diff+snapshot ve geri dönüş planı. İzole P3 bucket kesinlikle Production bucket yerine kullanılmaz. Preview flag'i Production'da açıkmış gibi raporlanmaz.

**PASS koşulu:** authz negatif testleri, boyut/tür, revizyon, sahiplik, DOCX, rollback planı ve ayrı live açılış onayı. Word mikro dizgi ayrıntıları ADR-004 kararı gereği ertelenmiş kalır.

## 5. Telif, tarife, ödeme ve rapor tutarlılığı (P0/P1)
**Sahip:** 01 TEST + 03 MİMARİ finansal invariant → 02 CANLI kontrollü operasyon.  
**Durum:** **Kod/model mevcut; host üzerinde bütünsel finans kabulü BİLİNMİYOR**.

**Asgari kurallar:**
- Tarifeyi yalnız Genel Koordinatör yönetir; rol bazlı yazar/editör/il-bölge-genel koordinatör ayrımı. Birim fiyat/versiyon ve geçerlilik tarihi; geçmiş tahakkuk değişmez.
- `CompensationEntry` **tahakkuk defteri**, `Payment` **ödeme defteri**: birbirine eklenerek gelir/gider toplamı sayılmaz. Dönem oluştur/yenile/onayla/kapat akışları idempotent; işlem geçmişi audit kaydı tutarlı.
- Çoklu eşzamanlı PostgreSQL oturumuyla çift ödemenin engellenmesi, rollback, iptal, aynı sorunun iki defa onaylanması, yetkisiz rol/başka il verisi, CSV ve rapor toplamları; yalnız sentetik TEST kayıtları.
- Daha önce canlı İşlem Geçmişi için kullanıcı PASS nedeniyle kapatılmış [#103](https://github.com/saliharici/prolig/pull/103) tekrar açılmaz; yeni hata varsa somut yeniden üretim kanıtı gerekir.

**PASS koşulu:** nakit çıkışı olmayan izolasyonlu senaryolar ve tutarlı SQL/rapor toplamları. Gerçek Production ödeme ayrı mali operasyon onayı olmadan **YOK**.

## 6. Süper Admin / çok yayınevi (P2)
**Sahip:** 03 MİMARİ → 01 TEST (izole prototip).  
**Durum:** **YAPILMADI — bağımsız mimari faz**.

**Ürün sözleşmesi taslağı:**
- Bugünkü 6 kurumsal rol **tenant-içi** kalır; global `SUPER_ADMIN` tenant kullanıcısı değildir. Genel Koordinatör, sahibi olmadığı kurumdaki verileri görmez.
- Her şirkete kimlik (`tenantId` veya fiziksel ayrı DB kararı), kurumsal ad/alan adı/logo/tema, yayın ayarları, üyeler, proje, yazar, soru, kitap, telif ve ödeme kapsamı verilir.
- Pilot strateji kararı: paylaşımlı DB'de her tabloyu zorunlu tenant-scope + RLS ile koruma **veya** kuruma ayrı veri kaynağı (daha güçlü ayrışma ama pahalı operasyon). Kapsam ve maliyet hesabı olmadan biri prod'a uygulanmaz.
- Super Admin kurulumunda varsayılan kurum, kullanıcı daveti/ilk şifre belirleme, role yetkisi, lisans/paket, kayıp erişim kurtarma, tenant suspension/geri alma ve audit; kurumsal secret veya veriye varsayılan erişim olmamalı.
- Testte tenant A/B kullanıcılarıyla yatay veri erişimi, global destek hesabı impersonation denetimi, çapraz-tenant kitap ve ödeme verileri için negatif senaryolar; tenant silme/restore ayrı yazılı karar.
- İlk Production tenant dönüşümü için kimlik ve veri backfill, unique indeks kapsamı, zorunlu filtreleme, backward-compatible migration ve rollback stratejisi önce yazılı onay.

**PASS koşulu:** ADR'de fiziksel veri izolasyonu tercihi kabul edilmeden schema/deploy yok; iki bağımsız sentetik tenant negatif erişim testleri geçmeden canlı kurumsallaştırma yok.

## 7. Belgeler, roller arası devir ve kapanış (P0; paralel yürütülür)
**Sahip:** 03 MİMARİ.  
**Durum:** **BU BELGE İLE BAŞLATILDI; henüz main'e merge edilmedi**.

- `README.md` tarihli tarihi envanter diye işaretlenip en yeni durum belgesine bağlantı verilecek; 18 Ekim envanter/sürüm matrisi **tarihî** olarak saklanacak.
- Her iş için tek kanıt: GitHub SHA/PR, environment ve Neon kimliği, test türü (otomatik/kullanıcı/araç), etkisi ve rollback. Bir sohbetin bitirdiği tekrar yapılmaz.
- Devirler kısa: **Ortam | İş | Kanıt/SHA | Test (PASS/FAIL/BİLİNMİYOR) | Etki | Risk | Sıradaki sahip**; 3 uzman sohbet anlık senkron varsayılmaz.
- Son kabul kriteri: Adım 1-5 güvenli üretim kapıları PASS, 6 şirketli ürün ancak ayrı faz onayı ile PASS; belgeler o anki en son main SHA/feature state'e göre senkron.
- `main` merge Production build'i tetikleyebilir. GitHub dokümantasyon PR'ı bile kendiliğinden merge edilmez.

## Kapı tablosu
| Adım | Sahip | Bugünkü karar | GO için eksik tek/ana kanıt |
|---|---|---|---|
| 1. Runtime/backup | 02 CANLI | **NO-GO** | Runtime DATABASE_URL MATCH + güncel snapshot/izole restore |
| 2. UX03 | TEST→MİMARİ→CANLI | **TEST USER-PASS / PROD NO-GO** | GO-0, birleşik Preview RC, schema-first PROD güvenli taban ve ayrı izinler |
| 3. Üretim akışı | 01 TEST | **KISMİ** | Tek sentetik yazar/editör/kitap E2E |
| 4. P3 PNG | MİMARİ→TEST→CANLI | **TEST USER-PASS / PROD OFF** | Güvenli Production storage/DB/izin/rollback |
| 5. Telif/finans | 01 TEST | **KISMİ** | Native multi-connection ödeme/idempotency + raportaj kabulü |
| 6. Süper Admin | 03 MİMARİ | **PLAN** | Tenant veri sınırı ADR + izole A/B kabul |
| 7. Dokümantasyon | 03 MİMARİ | **DRAFT** | Belge review + ayrı main merge onayı |

### Şimdi ilk tek iş — tekrar test döngüsü yok
**02 CANLI → #108:** Mevcut Production `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` içine yetkili, secret açıklamayan bir runtime teşhis yürütme kanalı gerçekten var mı? Varsa salt okunur `MATCH=true/false`; yoksa **BİLİNMİYOR** tutup ayrı güvenli teşhis dağıtımı için kapsam + rollback + açık onay teklifi. Kullanıcı #107 PASS ve #109 20/20 TEST PASS bozulmaz. Bu sırada 01 TEST, mevcut kazanımları tekrar etmeden adım 3'ün eksik bağlantı kabulünü planlayabilir.

### Her üretim yazımı için karar formatı
- **Tam hedef:** proje, ortam, deployment SHA, DB/branch adı (secret yok).
- **Somut değişiklik:** hangi SQL/env/merge/deploy, hangi kayıtlar etkilenir?
- **Ön kontrol ve kabul:** gerekli PASS/NO-GO kanıtları.
- **Rollback:** yalnız bugünkü geri dönüşü değil, sonradan authVersion/ledger/veri değiştikten sonraki güvenli yön.
- **İşlem onayı:** her kritik Production migration/snapshot-restore, merge/deploy ve feature activation için **ayrı açık kullanıcı kararı**.

**Kaynak bağlantılar:** [#105 ADR](https://github.com/saliharici/prolig/issues/105) · [#107 kapalı TEST](https://github.com/saliharici/prolig/issues/107) · [#108 operasyon](https://github.com/saliharici/prolig/issues/108) · [#104](https://github.com/saliharici/prolig/pull/104) · [#106](https://github.com/saliharici/prolig/pull/106) · [#109](https://github.com/saliharici/prolig/pull/109) · [#93 merged](https://github.com/saliharici/prolig/pull/93).
