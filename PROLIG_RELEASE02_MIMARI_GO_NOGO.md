# PROLIG-RELEASE-02 — MİMARİ GO / NO-GO KARARI

**Tarih:** 29 Ekim 2026 · **Rol:** 03 MİMARİ · **Karar:** **SEÇENEK A — BRANŞ ROLÜNÜ ERTELE; PRODUCTION ŞİMDİLİK NO-GO**  
**Depo:** saliharici/prolig · **PR:** #117, açık/taslak · **main/Production:** 643cc3a524cb54c497cda550980fbc78f999be4d  
**Onaylanmış RELEASE-01 kodu:** 7c7da4e756346b0ef7320090f31489a240de2574 · **RELEASE-01 raporu:** dc55ee9ecad201890859b95c3e0e11349b03a2c4  
**Bu belgenin kapsamı:** Karar, salt okunur ön kontrol, 02 CANLI operasyon emri. Deploy, migration, veri/secret yazımı, PR merge, yeni TEST dalı veya yeni PR YOK.

## 1. Yönetici kararı ve kanıt durumları

| Kontrol | Durum | Kanıt / anlam |
|---|---|---|
| Önceki CI ve kalite kapıları | **PASS** | Pro-Lig CI run 40790108516, **865/865 PASS**; P2 40790108547, Publishing 40790108604, Word QA 40790108597: SUCCESS. Tekrar çalıştırılmadı. |
| GitHub main ve PR #117 | **PASS** | main 643cc3a5; PR #117 HEAD dc55ee9e, draft/open/unmerged. #113/#116 ayrı ve draft. |
| Vercel Production deployment | **PASS** | 643cc3a5, READY. |
| Neon Production proje/dal/DB kimliği | **PASS** | calm-band-45633698 / br-soft-salad-b2vb8sdr (varsayılan main) / neondb; Neon kontrolü ve SELECT ile doğrulandı. |
| Vercel Production DATABASE_URL/PRISMA_DATABASE_URL'nun hedef DB ile uçtan uca eşleşmesi | **BİLİNMİYOR** | Production env anahtarları mevcut, fakat değerler bu araç erişiminde maskeli; gizli bağlantı bilgisi raporlanmadı. |
| Üretim için güncel ve geri dönülebilir yedek | **FAIL** | Sadece 11.10.2026 tarihli snapshot mevcut; yeni snapshot ve izole restore kanıtı yok. |
| BRANS migration'ını mevcut hesaplara doğrudan uygulama | **FAIL** | İki aktif eski İl Koordinatörünün ikisinde de branş ataması yok. |
| V2 Word/kitap API Production açılışı | **FAIL** | Production'da gerekli altı onay/kimlik/arayüz bayrağı bulunmadı. |
| İlk pilotun gerçek uçtan uca kullanıcı UAT'si | **BİLİNMİYOR** | TEST'de birim/entegrasyon kanıtı var; aynı kullanıcılı tarayıcı zinciri ve Word indirme kayıtlı değil. |
| **Bugünkü Production geçiş kararı** | **NO-GO** | Tek kesin yayın adayı henüz A kapsamına ayrıştırılmadı; backup ve UAT kapıları eksik. |

**Prensip:** Geçmiş PASS silinmez; o PASS, değiştirilmiş veya henüz oluşturulmamış A-minimal paketine otomatik aktarılmaz. RELEASE-01'in PASS olan kodu ile bu belgede önerilen daha dar Production paketini birbirine karıştırmayın.

## 2. İlk pilot — minimum işlevsel ürün

**Tek kabul zinciri:** Genel Koordinatör → Proje → Yazar atama → hedefli Görev → Yazarın görevden soru açması → Taslak kaydetme ve yeniden açma → Editör inceleme/revizyon/onay → onaylı soruyu V2 tek bölümlü kitaba alma → kaydedilmiş kitap/Word DOCX.

**Dahil:** Mevcut Genel Koordinatör/Yazar/Editör rol modeli; proje/yazar/görev/soru temel API'leri; V3 görev–soru ilişkisi ve hedef sayısı; mevcut soru onay iş akışı; mevcut Book/BookChapter/BookQuestion şeması ve V2 tek bölümlü Word dışa aktarımı; audit/kapsam/optimistic revision kontrolleri; mevcut Production özelliklerinin korunması.

**Hariç:** #113 UX03 şifre kurtarma/oturum yenilikleri; #116 CORE-01A kişisel kütüphane; BRANS rolü ve bunun yeni kullanıcı/üyelik izinleri; V4 ünite hedef/plan paneli; V5 çok bölümlü editör; yeni telif/ödeme/finansal otomasyon; P3 özel PNG'nin Production açılışı. Mevcut Production telif, ödeme, yayın ve erişim işlevleri kaldırılmayacak.

**Not:** Production'da 2 proje, 10 soru (6 onaylı, 2 editör bekliyor), 5 kitap (hepsinde tek bölüm), 5 kitap bölümü ve 8 kitap-soru satırı var; **0 görev** var. V3 bu eski verileri yeni bağlamı olmayan hâliyle korumalı, zorla geriye dönük göreve bağlamamalı.

## 3. Seçenek A / B — karşılaştırma ve kesin seçim

| Ölçüt | A — Eski IL rolünü koru, V3'ü dar kapsamda al | B — PR #117 BRANS enum'uyla al |
|---|---|---|
| Canlıya çıkış kolaylığı | **Orta**: A-minimal kod paketi ve tek yeni CI gerekir; mevcut PR olduğu gibi deploy edilemez. | **Kod açısından kolay**, mevcut #117 CI PASS; fakat rol/veri ve V4 paket bağımlılığı var. |
| Veri bütünlüğü | **Yüksek**: V3 additive, eski enum/scope aynı; eski sorular ve kitaplar korunur. | **Riskli**: rol kimliği yerinde yeniden adlandırılıyor; iki kullanıcı ve bir tarife semantiği değişir. |
| Mevcut kullanıcıların etkilenmesi | **Düşük**: eski rol ve il bazlı yetkiler korunur. | **Yüksek**: 2/2 eski İl kullanıcısının branş ataması yok, mevcut yetki kapsamları değişir. |
| Migration karmaşıklığı | **Düşük**: V3 tek tablo sütunları + FK/index/check; V4 ve rol migration'ı yok. | **Yüksek**: rol rename → V3 → V4 ve ilgili Prisma/rol/rapor/audit/finans kodu eşleşmesi. |
| Geri dönüş | **Daha kolay**: eski uygulama additive DB'yi tolere eder; sütun DROP gerekmez. | **Zor**: enum rename eski kodla uyumsuz; snapshot+uygulama sürümü koordineli restore gerekir. |
| Kullanıcı kabulü | Basit 3 rol/tek ürün zinciri, yeni kısa UAT gerekir. | Branş yetkileri, iki eski kullanıcı, finans ve yeni V4/V5 yüzeyleri ek kabul gerektirir. |
| Yayın gecikmesi | Küçük, sınırları belli kod uyarlaması gerekir. | Yetki eşleştirme ve rollback için daha çok operasyonel belirsizlik. |

### **Karar: A — ilk pilotta İl Koordinatörü kalır.**

**Somut teknik bağımlılık kanıtı:**
- V3 SQL dosyası **20261029010000_task_question_production_v3**: role enum'una veya V4 tablosuna tek bir referans yok. Task.targetQuestionCount INTEGER NOT NULL DEFAULT 0; Question.taskId INTEGER NULL, Task'a FK ON DELETE SET NULL; indeks ve 0–10000 CHECK. **DB şeması düzeyinde BRANS/V4 olmadan bağımsız uygulanabilir: PASS.**
- Aday **prisma/schema.prisma**, **api/v1/_lib/task-handler.ts**, **api/v1/_lib/task-dto.ts**, **src/tasks/TaskTracking.tsx** ve **src/DemoApp.tsx** içinde aynı anda hem V3 hem V4 unitPlanId/ProjectUnitPlan hem de BRANS rolüne ait başvurular var. **Bugünkü #117 kodu, rol ve V4'ten bağımsız A paketi değildir: FAIL.**
- **Main** role enum'unda IL_KOORDINATORU var, BRANS yok. İki ayrı şemayı yalnız feature flag ile uyumlu hâle getirmek **mümkün değil**. PR #117'nin tüm migration klasöründe sıraya giren dosyalar bulunduğundan, **bu PR'nin migration setiyle doğrudan "prisma migrate deploy" A seçeneği için YASAK**: istemeden rol rename ve V4 de uygulanabilir.
- **A çözüm paketi, tek sınırlı revizyon:** mevcut PR #117 üzerinde, main'in IL izin/rol dosyaları korunarak yalnız V3 Prisma model/SQL, Task–Question API/DTO, görevden taslak açma ve hedefli görev UI bağlantıları alınmalı; V4 ünite alanlarına ilişkin referanslar koddan çıkarılmalı; main'deki V2 tek bölümlü ekran/kod korunmalı. Bu değişiklik bugün uygulanmadı, dolayısıyla **A için yeni CI PASS henüz yok**. Yeni PR/bağımsız dal açmadan mevcut iş akışında tek paket ve bir doğrulama turu yeterlidir.
- B seçeneği ancak mevcut iki kullanıcı için **yetkili insan tarafından doğrulanmış branş eşleştirmesi**, hak/ücret tarife kararı, açık onay ve restore kanıtından sonra tekrar değerlendirilebilir. Varsayılan tüm branş ataması yapılmaz.

## 4. Production'daki rol etkisi (kimliksiz, gerçek sayımlar)

| Anonim etki kaydı | Önceki rol | Aktif | Önceki il kapsamı | Branş ataması | Eski atandığı proje/görev | Olası değişim |
|---|---|---|---|---:|---:|---|
| IL-01 | IL_KOORDINATORU | Evet | İl alanı dolu; kapsamda 1 yazar profili | **0** | 0 / 0 | B ile il bazlı üyelik/proje/yazar erişimi kaybolur, BRANS fail-closed scope oluşur. |
| IL-02 | IL_KOORDINATORU | Evet | İl alanı dolu; kapsamda 3 yazar profili | **0** | 0 / 0 | Aynı. |

Production'da toplam 15 kullanıcı: **3 Genel, 2 Bölge, 2 İl, 2 Editör, 4 Yazar, 2 Muhasebe** (aktif). 3 adet kullanıcı–branş ataması mevcut, fakat hiçbiri bu iki İl hesabında değil. Mevcut İl rolüne ait 1 ücret tarifesi, 0 hakediş satırı, 0 atanmış görev, 0 koordine ettiği proje var.

**İzin farkı:** main'deki IL rolü il bazında üye/başvuru görebilir, belirli rolleri atayabilir ve aynı il kapsamındaki proje, yazar, soru ve görevleri yönetebilir. #117 BRANS rolü il bazlı üye/başvuru/rol atama yetkisine sahip değil; yalnız verilmiş branş ID'lerindeki proje/yazar/soru/görev ve sınırlandırılmış iletişim erişimini açar. Bu yeni yetki modeli bilinçli olarak kısıtlıdır; yetki yükseltilerek veya sahte branş atanarak test geçirme YASAK. İki kullanıcı için gelecekte B istenirse farklı branşlara göre **tek tek gerçek görev/rol onayı** gerekir; otomatik dönüştürme YASAK.

## 5. V3 / V4 migration kararı ve uyumluluk matrisi

| İnceleme | V3 | V4 |
|---|---|---|
| İlk pilot zorunlu mu? | **EVET** — görev ile kayıtlı soruyu gerçekten ilişkilendirmek ve hedefi izlemek için. | **HAYIR** — ünite planı ilk 10 adımlı akış için zorunlu değil. |
| Bağımlılık | Mevcut Task/Question ve temel migration zinciri. BRANS'a veya V4'e SQL FK bağımlılığı yok. | Mevcut Project/Task tabloları; UnitPlan tablosunu ve Task.unitPlanId ilişkisini ekler. V3'e SQL FK doğrudan bağımlı değil, ama PR'deki Task UI/DTO V3+V4'ü birlikte bekler. |
| Sıralama | Mevcut main şeması → **yalnız V3**. | B tercih edilirse mevcut şema → BRANS migration → V3 → V4; sıra migration dosyalarının timestamp sırasıdır. |
| Production durumu | **UYGULANMADI.** Task.targetQuestionCount ve Question.taskId mevcut değil. | **UYGULANMADI.** ProjectUnitPlan tablosu ve Task.unitPlanId yok. |
| Eski kayıtlar | Task.targetQuestionCount = 0 default; Question.taskId = NULL. Eski Question, Task, Book kayıtları değişmeden kalır. | Yeni tablodan başlar; mevcut Task.unitPlanId NULL, UnitPlan hedefleri 1–10000. |
| Constraint / silme | Question.taskId FK → Task, ON DELETE SET NULL; hedef 0–10000. | ProjectUnitPlan.projectId FK → Project ON DELETE CASCADE; Task.unitPlanId FK → UnitPlan ON DELETE SET NULL; unique proje+başlık/proje+sıra. |
| Eski app → yeni DB | **Uyumlu olma olasılığı yüksek:** yeni alanlar opsiyonel/default; rollback testi yine şart. | Ek tablo/nullable alan eski app'i tipik olarak bozmaz; yeni kodun V4 sorgularını eski DB'de çalıştırmak ise **hatalıdır**. |
| Rollback yaklaşımı | İlk tercih eski uygulamaya dönüp additive DB'yi korumak; sütun DROP ile veri silinmez. | UI/uygulama kapatılabilir, veri yazıldıysa DROP yerine ileri düzeltme/restore gerekir. |

**Önemli:** V3'ün Question.taskId alanının NULL olması, eski 10 sorunun otomatik ve tahmini görevlere bağlanmayacağı anlamına gelir. Mevcut Production'daki 5 kitap ve 8 kitap-soru ilişkisi ayrıca korunmalı. Production'daki publishing migration geçmişinde önce *rolled back*, ardından *finished* kayıt bulunduğu için geçiş öncesi migration hash/son durum kontrolü ayrıca yapılmalı; bugünkü doğrulamada V2 şeması ve 5 adet tek bölümlü kitap mevcut.

## 6. Production Neon ve Vercel salt okunur ön kontrol

**Neon:** project calm-band-45633698, name prolig-pilot, PostgreSQL 18, default branch br-soft-salad-b2vb8sdr (main), database neondb, kullanıcı neondb_owner. İlgili 27 uygulama/migration tablosu mevcut. Üretim verilerinde değişiklik yapılmadı.

**Snapshot/branch:** 8 dal listeleniyor; tek snapshot **PROLIG_PRE_P1D_RELEASE_20261011**, tarih 2026-10-11 19:32:49 UTC; otomatik snapshot schedule **boş**. Production metadata history_retention_seconds=21600 (**6 saat**), branch_logical_size_limit_bytes=1073741824 (**1 GiB**). Gerçek hesap abonelik planı ve yeni snapshot/restore fiyatı **BİLİNMİYOR**.

**Vercel:** prolig projesi, Production SHA 643cc3a5 ve READY. Production env'de DATABASE_URL, POSTGRES_URL, PRISMA_DATABASE_URL var. Gizli env değerleri maskeli; bu üç bağlantının hangi Neon host/branch'e gittiğini **bu erişimle doğrulayamadık: BİLİNMİYOR**. Anahtarların varlığı host+DB kimliğinin PASS olduğu anlamına gelmez.

**V2 Word kapısı:** Prod env listesinde PROLIG_BOOKS_V2_ENABLED, PROLIG_BOOKS_V2_PRODUCTION_ENABLED, PROLIG_BOOKS_V2_RELEASE_APPROVED, PROLIG_BOOKS_V2_PRODUCTION_DB_HOST, PROLIG_BOOKS_V2_PRODUCTION_DB_NAME ve VITE_PUBLISHING_V2_PRODUCTION_ENABLED anahtarları bulunamadı. api/v1/_lib/book-handler.ts ve UI'nin V2 production gate'i birlikte bunları gerektiriyor. **Mevcut production'da yazılabilir V2 kitap API'sinin açıldığını iddia etmek YASAK; durum FAIL (kapalı).** 02 CANLI, değerleri yalnız onaylı DB kimliğiyle eşleştirerek ve açık env/deploy onayıyla hazırlamalı.

## 7. Free-plan uyumlu backup ve rollback koşulları

**Bugünkü durum: NO-GO.** 11 Ekim snapshot'ı güncel uygulama/veri için uygun rollback noktası değil. 6 saatlik PITR penceresi tek başına büyük bir yayın değişikliği için uzun vadeli garantili yedek sayılmaz. Restore testi henüz yapılmadı.

**02 CANLI için backup şartı:**
1. Plan ve mevcut kota/aktif dal sayısını yeniden doğrula (**şu an 8 dal, metadata 1 GiB/6 saat**). Ücretli plana geçiş şart koşulmaz. Resmî Neon 2 Ekim 2026 Free duyurusunda 1 GB/proje, 100 CU-saat/ay/proje, 10 dal ve 6 saatlik restore penceresi listeleniyor; **bu kullanıcı hesabının abonelik tipi ayrıca teyit edilmeli**.
2. Kesintiye alınan yazma penceresinde **o anın** Production snapshot'ını oluştur; güvenli alternatif olarak şifreli/erişimi kontrollü mantıksal pg_dump yedeği düşün. Yedeğin zamanı, kaynak dalı, şema ve veri sayaçları, hash/manifest korunmalı; kişisel veriler sohbet raporuna eklenmemeli.
3. Aynı proje ve mevcut planda **izole restore** mümkünse, yeni dal üzerinde snapshot'tan geri dönüşü doğrula (aynı güncel 15 kullanıcı, 2 proje, 10 soru, 5 kitap, 5 bölüm, 8 kitap-soru vb.); restore kaynağa yazmamalı. Geçici dalın hesap kotasına etkisi ve temizliği açıkça kayda geçirilmeli. Bu görevde yeni dal/restore OLUŞTURULMADI.
4. Snapshot veya bağımsız yedek güvenilir biçimde **geri getirilemiyorsa NO-GO**. Kullanıcıya otomatik ücretli yükseltme önerilmez; gerekirse ücretsiz doğrulanabilir pg_dump + izole PostgreSQL restore seçeneği karşılaştırılır.

**Rollback dizisi (A):** (1) Kullanıcı yazmalarını durdur / bakım uyarısı, (2) üretimde değişen veri sayısını ve zamanını kaydet, (3) Vercel'de önceki sağlıklı 643cc3a5 sürümüne rollback (ayrı onay), (4) V2 yeni release flag'lerini kapat (ayrı onay), (5) V3'ün ek sütunlarını **DROP etme**; eski kod additive şemayla çalışıyorsa ileri düzeltme/uyumluluk sürdürme, (6) veri tutarlılığı bozulmuşsa yalnız doğrulanmış yedekten ve veri kaybı analiziyle kontrollü restore, (7) smoke + rol + kitap kontrolleri.

**B'nin geri dönüş farkı:** PostgreSQL RoleCode değerinin rename'i önceki uygulama enum sözleşmesini bozabilir. Tek başına eski uygulamayı deploy etmek güvenilir rollback değildir; gerekirse DB snapshot restore + app/config birden ele alınır veya kontrollü ileri düzeltme gerekir. Yayın sonrası yeni yazımlar snapshot'a dönerken kaybolabileceğinden geçiş bir bakım penceresinde sınırlandırılmalıdır.

**Neon resmî kaynak (plan/restore açıklaması):** https://neon.com/blog/neon-free-plan-1-gb-per-project (02.10.2026) ; https://neon.com/blog/three-ways-to-use-your-snapshots .

## 8. TEST kanıtı ve UAT sınırı

**İzole TEST:** Neon lucky-pond-26462894 / br-round-wind-balw5c6m / ux02_test. Salt okunur kontrol: **2 proje, 4 hedefli görev, 4 görev-soru ilişkisi, 4 ünite, 1 onaylı + 3 incelemede soru, 0 kayıtlı kitap**, iki V3/V4 migration finished. Bu sentetik TEST, Production'a karıştırılmadı. TEST Vercel PR #117 Preview READY. RELEASE-01'in 865/865 CI PASS kaydı korunur.

**Tek zincirin durumu:** Proje/yazar/görev/bağlı soru/editör/Word birim ve izole PostgreSQL kabul parçaları PASS; **tek gerçek oturumlu tarayıcı/HTTP zinciri baştan sona ve kayıtlı kitabı yeniden açıp Word indirme UAT'si BİLİNMİYOR**. TEST ortamında 0 kayıtlı kitap bulunması, uçtan uca başarıyı desteklemiyor. **A** daraltılmış kod paketi henüz mevcut olmadığından onun kabulü de BİLİNMİYOR. Mevcut rol-özel TEST şifrelerini raporlamayın/istemeyin.

**Kullanıcıya en fazla beş adımda tek UAT:**
1. TEST Genel Koordinatör: proje oluştur/var olanı seç, aktif yazarı ata ve pozitif soru hedefli görev ver.
2. TEST Yazar: görevin **Soru taslağı oluştur** yolunu aç, soruyu kaydet, çıkıp yeniden giriş yaparak aç ve editöre gönder.
3. TEST Editör: soruyu incele, revizyon iste; yazar düzeltip yeniden gönderir; editör ONAYLANDI yapar.
4. TEST Genel Koordinatör: onaylı soruyu tek bölümlü V2 kitaba al, kaydet, yeniden aç; sıra/içerik ve snapshot'ı kontrol et.
5. Word öğrenci nüshasını indir; soru sırası, metin, istenen biçim ve öğrenci nüshasında cevapların saklandığını doğrula; PASS/FAIL ve kanıtı tek seferde bildir.

Bu beş adım teknik otomasyonla çalıştırılabildiği ölçüde tekrar manuel istenmemeli. Gerçek kullanıcı eylemi yoksa UAT'yi PASS yazmayın.

## 9. 02 CANLI için kesin uygulama sırası (yetkili geçiş emri; HENÜZ İCRA İZNİ DEĞİL)

**Ön şart / 01 TEST:** Mevcut PR #117 üzerinden rol/V4/V5'ten ayrılmış **tek A-minimal release kodu** üretilir; IL role enum/izinleri main ile aynı kalır, yalnız V3'nin model/API/UI bağımlılıkları alınır. Yayın kapsamı dışı PR #113/#116 ve P3/finans açık kalır; yeni PR/dal açılmaz. **Bu kod değişirse hedefli test + bir tam CI + Publishing + Word + bir UAT** alınır. Başarılı mevcut CI'yi nedensiz tekrarlama.

**CANLI-01 — Salt okunur kimlik kapısı:** main ve release SHA'sını, PR kapsamını, Vercel Production DATABASE_URL/PRISMA_DATABASE_URL/POSTGRES_URL'nun Neon **calm-band / br-soft-salad / neondb** ile tam eşleşmesini *gizli değerleri açığa çıkarmadan* teyit et; ortak host/DB kimliği ve ortam izolasyonunu logla. Yanlış hedef → **NO-GO**.

**CANLI-02 — Veri envanteri:** Production rol sayıları, iki IL hesabı ve il kapsamlarının değişmeden kalacağını; proje/yazar/görev/soru/Book/BookChapter/BookQuestion, telif ve audit kayıtları için önce sayaçları al. Herhangi bir kullanıcı/branş/rol dönüşümü PLAN A'da YASAK.

**CANLI-03 — Geri dönüş güvencesi:** Yeni Production snapshot/alternatif mantıksal yedek + izole restore PASS; kota ve maliyet onayı; bakım/yazma dondurma penceresi; restore süresi ve olası veri kaybı sınırı belirlenir. Backup/restore başarısız → **NO-GO**.

**CANLI-04 — Son yayın kapsamı ve açık operasyon onayı:** A-minimal migration listesi yalnız **20261029010000_task_question_production_v3**; rollback sürümü 643cc3a5; dışarıda kalan fonksiyonlar sabit. Kullanıcının açık yazılı **Production migration + env + deploy** onayını ayrıca al. Bu belge onay sayılmaz.

**CANLI-05 — Kontrollü şema geçişi:** Onaydan sonra yalnız sürümle eşleşen V3 additive migration; *PR117'nin tüm migrations klasörüne karşı toplu "prisma migrate deploy" YAPMA*. DDL öncesi schema hash, sonrası sütun/FK/default/check doğrula. Başarısızlıkta uygulama geçişini durdur.

**CANLI-06 — Uygulama deploy ve V2 bayrakları:** A-minimal kod SHA'sının onaylı Production deploy'u. V2 kitap API/UI için Production flag'lerini yalnız onaylı Neon host+DB attestation doğrulamasından sonra kontrollü etkinleştir; P3/V5/UX03/CORE-01A/finans otomasyonunu açma. Release flag onayı ve deploy ayrı kayıtlanır.

**CANLI-07 — Tek pilot smoke/UAT:** Genel Koordinatör→proje→yazar→görev→soru kaydet/aç→editör onayı→V2 kitabı kaydet/aç→Word indir; ayrıca iki eski IL hesabının üyelik/il kapsamını ve mevcut 5 kitabı etkisiz, salt okunur doğrula. Teknik PASS ayrı, kullanıcı UAT PASS ayrı.

**CANLI-08 — GO/ROLLBACK:** Hata/403 yetki regresyonu, yanlış 409, kitap soru sırası, veri kaybı, V2 Word 500 veya yanlış DB hedefi olursa yazmayı dondur ve Bölüm 7 rollback dizisini uygula. Başarı halinde dondurmayı kaldır, Production SHA'yı ve yeni durum raporunu 03 MİMARİ'ye aktar.

## 10. Nihai GO/NO-GO ve devir protokolü

**Bugün: NO-GO (Production'a yazma yok).** Açık engeller:
- **FAIL:** A-minimal kod paketi ve onun tek CI/UAT'si henüz yok. Mevcut #117'nin 865/865 PASS sonucu olduğu gibi A'ya taşınamaz.
- **FAIL:** İki IL hesabı branşsız; B rol migration'ı ilk pilotta yasak.
- **FAIL:** Yeni Production yedek/snapshot + restore doğrulaması yok.
- **FAIL:** V2 server+UI Production release flag'leri kapalı.
- **BİLİNMİYOR:** Vercel gizli DB hedefi ile Neon Production birebir eşleşmesi, gerçek ücret/restore kotası, gerçek uçtan uca kullanıcı UAT.

**Şartlı GO:** Tek A-minimal SHA'da CI ve UAT PASS; Production DB target PASS; yedek + izole restore PASS; V2 gate attestation PASS; kullanıcıdan ayrı açık migration/env/deploy onayı alındığında **02 CANLI** uygulayabilir. Bunlardan biri sağlanmazsa **NO-GO** korunur.

**Durum satırı:** 03 MİMARİ | RELEASE-02 karar ve salt okunur ön kontrol | main 643cc3a5 / PR #117 dc55ee9e / kanıtlı kod 7c7da4e7 | geçmiş CI PASS, yeni UAT BİLİNMİYOR | Production'a etki YOK | Risk: iki IL hesabı, yedek, env attestation | Sıradaki sahip: **01 TEST — dar A paket**, ardından **02 CANLI — yalnız kullanıcı onaylı geçiş**.
