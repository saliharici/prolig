# PROLIG-RELEASE-01 — CI Onarım ve Yayın Adayı Raporu

**Tarih:** 29.10.2026  
**Sahip:** 01 TEST — Geliştirme ve Kabul  
**Depo:** `saliharici/prolig`  
**Kanıtlanmış kod SHA:** `7c7da4e756346b0ef7320090f31489a240de2574`  
**Referans `main` / Production SHA:** `643cc3a524cb54c497cda550980fbc78f999be4d`  
**Çalışma dalı:** `feat/branch-coordinator-v3-20261027`, PR **#117 — DRAFT / NOT MERGED**  
**İzole TEST Preview:** https://prolig-k4kdzt8zx-salih22.vercel.app/ — Vercel READY  
**Karar:** **CI-READY / PRODUCTION-BLOCKED.** CI onarımı PASS; canlıya geçiş için veri/rol migration planı ve ayrı 02 CANLI onayı gerekir.

## 1. Başlangıç durumu ve PR envanteri

| Kanıt | Başlangıç | Onarım sonrası |
|---|---|---|
| Genel CI birim/sözleşme testleri | **55 FAIL, 806 PASS; 25 başarısız dosya** (toplam 861) | **0 FAIL, 865 PASS; 122/122 dosya** |
| Lint / API ve UI TypeScript | Önceki çalışmalarda hatalar vardı | **PASS** |
| Vite build | CI başarısı doğrulanmamış | **PASS** |
| Navigasyon tarayıcı kabulü | Emekli İl Koordinatörüyle otomasyon nedeniyle FAIL | **PASS** |
| Publishing izole PostgreSQL | **FAIL** | **PASS** |
| P2 izole PostgreSQL | PASS | **PASS** |
| Word gerçek motor görsel QA | PASS | **PASS** |
| Vercel TEST Preview | Mevcut Preview | **READY**, son kod `7c7da4e7` |

**GitHub Actions son doğrulama:** Pro-Lig CI run `40790108516`: **success**; Publishing V2 Isolated PostgreSQL `40790108604`: **success**; P2 `40790108547`: **success**; Word Visual QA `40790108597`: **success**. Çalıştırma: yalnız yeni kod/test değişikliği sonrasında; aynı başarısız işi değişiklik olmaksızın tekrar tetikleme yapılmadı.

**PR envanteri:** Toplam **41 açık PR** doğrulandı. PR #117 ilk incelemede **76 değişen dosya / 35 commit** içeriyordu; onarım tek başına bu taslak PR üzerinde yapıldı. PR #113 (UX03) açık/taslak, baş SHA `c3fe2b4f87df34753403b372b36a8663974f2df5`; PR #116 (CORE-01A) açık/taslak, SHA `d980df3a884d4e671c70f45b96c8cf191311a7d9`. Bunlar birleştirilmedi, kapatılmadı veya bu sürüme otomatik alınmadı.

## 2. A — Gerçek ürün ve yayın güvenliği düzeltmeleri

1. **Üretim ilerlemesinde arşiv sorusu hatası:** `api/v1/_lib/production-progress.ts` daha önce arşivlenmiş, göreve bağlı onaylı soruları sayıyordu. Artık `getQuestionArchiveStateMap` ile arşiv dışındakiler sayılıyor; onay/inceleme/revizyon/eksik hedef tutarlı. `tests/release01-production-progress.test.ts` davranış regresyonunu doğrular.
2. **Kabul edilmemiş V5’in Production’a sızması:** Var olan V2 Production yayıncılık bayrağı V5 arayüzünü yanlışlıkla açabilecek durumdaydı. Eski tek-bölümlü `PublishingWorkbenchV2` ve çok bölümlü `PublishingWorkbenchV5` ayrı bileşenlere alındı. Aradaki `PublishingWorkbench` V5’i yalnız `VITE_VERCEL_ENV=preview` **ve** `VITE_PUBLISHING_V5_PREVIEW=true` birlikteyse açar. Yeni bayrak yalnız PR #117 TEST dalının Vercel Preview ortamına eklendi; Production env değişmedi. `tests/release01-v5-gate.test.ts` Production fail-closed davranışını doğrular.
3. **Yetki hatası gibi görünen eski `200/409` testleri:** BRANS rolünün kapsam dışı projeyi yönetme isteğinin **403** döndürmesi güvenlik açısından doğrudur. Gerçek `409` ilişkili soru bulunan projede değişiklik denemesi, bu projeyi gerçekten yönetebilen GENEL rol altında doğrulandı. Kaynak yetki kontrolü test geçirmek amacıyla gevşetilmedi.
4. **Soru oluşturma / yeniden açma / kaydetme:** Yeni görev bağlantılı soru işlemleri ve V2 kitabın mevcut sürüm korumalı kaydet-yeniden açma davranışı korunuyor; kitap kayıt yanıtındaki bölüm/soru sırası sunucudan kontrol ediliyor. Bu onarımda ayrı Production verisiyle uçtan uca giriş yapılarak yeniden kabul yapılmadı.

## 3. B — Eski test sözleşmeleri ve güncellemeler

Toplam onarım farkında **27 test dosyası** değiştirildi; hedeflenen alanlar:
- `IL_KOORDINATORU` rolü yerine `BRANS_KOORDINATORU`: proje, soru, yazar, görev, üyelik, mesajlaşma, duyuru, telif ve rapor testlerinde il/province eşleşmesi kaldırıldı; branş atamasının **pozitif/negatif yetki senaryoları** eklendi.
- `AUTHOR_REPORT_FORBIDDEN` ve `PROJECT_AUTHOR_PERFORMANCE_FORBIDDEN` eski İl Koordinatörü fixture'larından doğuyordu. BRANS için yazarlar yalnız atanmış branştan seçiliyor; koordinatör ekranında bireysel kazançlar açılmıyor.
- Görev DTO'suna sorular ve hedef alanları eklenince eski sahte Prisma nesneleri `questions: []` içermiyordu; sahte ilişki tamamlandı, gerçek kodda eksik ilişkiden kaynaklanan üretim hatası varsayılmadı.
- Proje listesine otomatik ilerleme sorgusu eklendiğinden mevcut test Prisma `task.findMany` sahtelemesi tamamlandı.
- DOCX paketinde dinamik içindekiler için artık `word/settings.xml` dahil **8 OOXML parçası** var; ZIP ve içindekiler alanlarıyla test ediliyor. Sıra ve dondurulmuş kaynak koruma şartları kaldırılmadı.
- V1/V2 yayıncılık kaynak metnine aşırı bağımlı eski JSX testleri, yeni iki sürümlü yapının kontrollü davranışına göre uyumlandı; V5 bölüm sırası, mükerrer soru ve arşiv soru engelleri korunuyor.
- Tarayıcı navigasyon betiğinde eski İl Koordinatörü rolü yerine yeni BRANS rolü eklendi; BRANS'ın **Üye Yönetimi** erişiminin bulunmadığı kontrol ediliyor.
- P3 özel PNG için kapsamı aşan Production etkinleştirmesi yapılmadı.

## 4. C — Çalıştırma ve ortam sorunları

- TEST/Preview'da Neon hedefi doğrulandı: `lucky-pond-26462894`, TEST dal `br-round-wind-balw5c6m`, **`ux02_test`**, rol `ux02_owner`. V3/V4 iki migration kayıtlı; 4 hedefli görev, 4 görev bağlı sentetik soru ve 4 üretim ünitesi korundu.
- Kullanıcı şifresi, secret, Production bağlantısı ve gerçek Production verisi açığa çıkarılmadı.
- Vite `import.meta.env` tiplerinin API-only TypeScript test hedefiyle çakışması, V5 bayrak mantığı bağımsız `publishing-v5-gate.ts` dosyasına ayrılarak giderildi.
- GitHub Actions’ın yerel geçici PostgreSQL ve Playwright tarayıcı işleri son turda **PASS**. Production Neon migration çalıştırılmadı.

## 5. Tek yayın adayı: dahil / hariç

**Önerilen ilk canlı pilot iş akışı:** GENEL_KOORDINATOR → Proje oluştur/incele → Yazar atama → Görev → Soru hazırlama → Taslağı kaydet → Yeniden aç → Editör inceleme/onay → Onaylı soruyla V2 tek bölümlü Kitap/Word çıktısı. İlk sürümde rol, veri ve etkin modüllerin son Production eşleştirmesi ayrı CANLI kapısıdır.

**Yayın dışı / ayrı PR veya sonraki sürüm:** PR #113 UX03 kurtarma oturumu değişiklikleri; PR #116 CORE-01A kişisel soru kütüphanesi; onaylanmamış V5 çok bölümlü kitap editörü ve yeni server-side doğrudan PDF/dizgi; yeni telif/ödeme/finansal otomasyon; yeni şirket/Süper Admin onboarding. Önceki Production özellikleri korunmalı. V3/V4 schema eklemeleri PR #117'de bulunduğundan merge etkisi ayrıca incelenmelidir; kullanıcıya bunların yayınlandığı söylenmemelidir.

**Adayın yapısı:** Yeni bağımsız PR / main merge yapılmadı. PR #117 içindeki tek kod adayı CI bakımından temizlendi; güvenli Production yayın paketine dönüşmesi için migrasyon ve rol geçişi değerlendirmesi gerekiyor. Bu rapor yayına alma onayı değildir.

## 6. Açık Production engelleri ve devir

**KRİTİK — BRANS rolü migration:** `prisma/migrations/20261027010000_branch_coordinator_role/migration.sql`, PostgreSQL `RoleCode` enum değerini `IL_KOORDINATORU` → `BRANS_KOORDINATORU` olarak *yeniden adlandırır*. Böylece Production'daki eski il koordinatörü kullanıcılarının rol referansları otomatik değişebilir; bunların `branchAssignments` kayıtları ayrı doğrulanmadan yeni branş kapsamına alınamaz. İstenmeyen yetki kaybı veya üretim kesintisi riski vardır. **Bu geçiş planı olmadan PR #117 main'e birleştirilmemeli.**
- **03 MİMARİ:** İlk pilot için BRANS rolünü dahil/erteleyip ertelememe kararı, eski il kullanıcıları → branş ataması tablosu, V3/V4 migrasyon sırası, yayın kapsamı ve dönüş kriterleri.
- **02 CANLI:** Production'ın salt-okunur kimlik/veri kapsam kontrolü, DB yedeği/snapshot, geri dönüş (rollback), ilk pilot hesap/veri kabulü ve ayrı açık dağıtım onayı. Hiçbiri bu TEST işinde yapılmadı.
- **01 TEST:** Son doğrulanan SHA `7c7da4e7` ve dört GitHub Actions işi PASS. Yeni özellik gelişimi değil, varsa yalnız belirlenmiş pilot kapsamı uyarlaması.

**Açık ürün kabul sınırı:** Yerel/CI otomasyonları ve TEST Preview READY, Production üzerinde kimlikli uçtan uca kullanıcı kabulü veya matbaa baskı kabulü anlamına gelmez.

## 7. Sonuç

**Ortam:** TEST Preview + GitHub Actions yerel PostgreSQL  
**İş:** CI onarımı / tek teknik yayın adayının sabitlenmesi  
**Kanıt/SHA:** `7c7da4e756346b0ef7320090f31489a240de2574` (CI'den geçmiş son kod)  
**Test:** Genel CI **865/865 PASS**, Publishing/P2/Word **PASS**, tarayıcı navigasyon **PASS**  
**Etki:** Production ve `main` **değişmedi**; mevcut PR'lar korunuyor  
**Risk:** Production BRANS enum/data migration ve V3/V4 merge kapsamı  
**Sıradaki sahip:** Önce **03 MİMARİ** yayın kapsamı/migrasyon kararı; sonra **02 CANLI** açık onaylı geçiş.
