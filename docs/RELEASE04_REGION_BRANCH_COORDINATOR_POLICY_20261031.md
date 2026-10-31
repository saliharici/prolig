# PRO-LIG | RELEASE-04 KARAR — Bölge → Branş Koordinatörü yetki devri ve RELEASE-04 geçişi

**Tarih:** 2026-10-31  
**Numara notu:** GitHub Issue #105 içinde ADR-005 numarası UX-03 kararı için zaten kullanılmıştır. Bu belge onu değiştirmez; RELEASE-04 ürün politikasıdır.  
**Durum:** KABUL EDİLDİ (ürün politikası); KOD, MIGRATION VE PRODUCTION DAĞITIMI HENÜZ YAPILMADI  
**Sahip:** 03 MİMARİ (ürün kararı), 01 TEST (mevcut PR #118 üzerinde kod), 02 CANLI (Production yayın)  
**İlgili kayıt:** Issue #119; PR #117 (kaynak), PR #118 (tek entegrasyon hedefi).  
**Çalışma tercihi:** GitHub/Vercel/Neon bağlı araçları; Codex yok, yeni Git dalı ve yeni TEST sitesi yok. Mevcut PASS sonuçlarını tekrarlama. Yayın öncesi teknik zorunlulukları NOT RUN iken PASS yazma.

## 1. Ürün kararı — kanonik yetki modeli

Hedef roller: GENEL_KOORDINATOR, BOLGE_KOORDINATORU, BRANS_KOORDINATORU, EDITOR, YAZAR, MUHASEBE.
- Genel Koordinatör, **tüm bölgelerde** Branş Koordinatörü rolünü ve 1+ branş atamasını yapabilir, değiştirebilir, geri alabilir.
- Bölge Koordinatörü, **yalnız kendi assignedRegion bölgesindeki** Branş Koordinatörü hesabının rolünü, branş atamalarını ve izinli rol içi yetki alt kümesini yönetebilir.
- Branş Koordinatörü **atanmış bölge ∩ atanmış branş(lar)** kapsamı dışında kullanıcı/proje/görev/soru/kitap/rapor/mesaj/duyuru kayıtlarına erişemez. Branş ataması yoksa erişim yok.
- Branş Koordinatörü kullanıcı yönetiminde üst rol yaratamaz, kendine yetki veremez, editör iş akışı onayı veya ödeme/tarife işlemi yapamaz; rol/izin yükseltme delegasyonu yok.
- "Branş tanımı" burada hesaba mevcut MEB branş kataloğundan branş atamasıdır; branş kataloğunun kendisini değiştirme yetkisi **verilmedi**.
- "Rol içi yetkiler" tanımlanacaksa her hak için sunucu tarafında açık action key, deny-by-default, bölge/branş kesişim kuralı ve audit gerektirir; mevcut kodda kişiye özel izin motoru hazır kabul edilmez.

### Temel işlem matrisi

| Eylem | Genel | Bölge | Branş |
| --- | --- | --- | --- |
| Branş koordinatörü hesabı oluştur/rol ata | Tüm bölgelerde | Kendi bölgesinde | Hayır |
| Branş ataması değiştir/geri al | Tüm bölgelerde | Kendi bölgesinde | Hayır |
| Rol içi izinleri ayarla | Üst sınırlar içinde, tüm bölgeler | Üst sınırlar içinde, kendi bölgesi | Hayır |
| Başka bölgenin branş yöneticisini düzenle | Evet | Hayır | Hayır |
| Editör adına soru onayla | Hayır | Hayır | Hayır |
| Tarife/ödeme yöneticisi ol | Ayrı mevcut kurallara göre | Hayır | Hayır |

## 2. GitHub'da doğrulanan mevcut farklılıklar (PR #117, SHA 53a91de7)

- `api/v1/_lib/member-access.ts`: `regionAssignableRoles` yalnız EDITOR ve YAZAR; Bölge, Branş rolü atayamıyor. Mevcut `buildUserReadScope` BRANS için yalnız branş üzerinden erişiyor.
- `src/membership/MemberManagement.tsx`: Bölge Koordinatörü rol listesinden BRANS eksik.
- `api/v1/management.ts`: BRANS için `assignedRegion` dolu olması reddediliyor; `applyAssignment` bölge alanını BRANS için kaydetmiyor.
- `api/v1/_lib/project-access.ts`: BRANS proje erişimi yalnız branchId üzerinden; bölge kesişimi eksik.
- Üye, yazar, proje, görev, soru, mesaj, duyuru, kitap, rapor ve audit API'leri karşılıklı aynı politikayı uygulamalı.
- PR #117 ve #118 **18 dosyada kesişiyor**; #117 doğrudan main'e birleştirilmemeli. #117'deki Preview login fixture/TEST örnekleri, V4/V5 ve P3 özel PNG aktivasyonu bu yayına dahil değil.

## 3. Veri modeli ve bölgesel sahiplik

**Kullanıcı hesabı:** Branş Koordinatörü için `User.assignedRegion` zorunlu; `UserBranchAssignment` üzerinden en az 1 branchId zorunlu. Bölge Koordinatörü hedefin atanmış bölgesini kendi bölgesi dışına taşıyamaz. Genel Koordinatör geçerli bölgeyi seçebilir.

**Proje güvenliği:** Bugünkü `Project` tablosunda güvenilir, tekil bir bölge sahipliği alanı yok. Bu yüzden **yalnız Project.branchId ile BRANS proje erişimi verilemez**. 01 TEST, BRANS işlemi yapabilen projeler için açık bölgesel sahipliği (ör. nullable `managingRegion` + kontrollü atanma) veya açıkça doğrulanabilir eşdeğer bir model belirlemeli. Birden çok bölgeden yazarı olan proje, tek başına belirli bir bölgeye ait sayılmaz. Bölgesel sahipliği belirsiz veya atanmamış proje için BRANS mutasyonları **DENY**, Genel yönetimi devam.

**Soru/görev/yazar ve yan veriler:** Salt proje listesine erişim bütün yazar ve sorularına erişim sağlamaz; ilgili kaydın coğrafyası/aidiyeti ayrıca kanıtlanır. Bölge sınırı hem list/GET hem POST/PATCH/DELETE ve rapor aggregate'lerinde uygulanır. Soru/telif işleminden dolayı yatay yetki genişlemesi olamaz.

**Denetim izi:** Eski/yeni rol, eski/yeni bölge, eski/yeni branş kimlikleri, değişiklik nedeni ve işlem yapan hesap zaman damgasıyla `ActivityLog` içinde; rol ve atama aynı DB transaction'ında. Secret, parola veya kullanıcı verisinin gereksiz kopyası loglanmaz.

## 4. Zorunlu geri dönüş uyumu: eski enum'un doğrudan yeniden adlandırılmasına alternatif

PR #117'nin `20261027010000_branch_coordinator_role/migration.sql` dosyası `ALTER TYPE "RoleCode" RENAME VALUE ...` kullanıyor. **RELEASE-04'te bu migration aynen uygulanmayacak.**

01 TEST tarafından hazırlanacak tercih edilen **additive / expand-contract** akışı:
1. Prisma RoleCode enum'una BRANS_KOORDINATORU **ekle**, IL_KOORDINATORU değerini ilk geçişte **koru**. Mevcut User/Role/Compensation kayıtlarını ve eski kullanıcı oturumlarını dönüştürme. Ek rol satırını veri bütünlüğünü koruyarak oluştur.
2. Aynı sürümde hem tarihsel IL hem yeni BRANS rolünü okuyabilen, BRANS için bölge+branş yetkisini doğru uygulayan geçiş kodu hazırla. Eski IL rolüne **yeni hesap açılmasını** kapat fakat mevcut IL hesaplarını erişim kaybıyla dönüştürme.
3. Genel/Bölge Koordinatörü mevcut iki IL Koordinatörü için **bölge ve branşları bilinçli seçip** atayınca atomik rol dönüştürme gerçekleşsin. Otomatik tüm branşlara yetki atama, sessiz toplu güncelleme veya mevcut teliflerde değişiklik yok.
4. Yeni model yayımlandıktan sonra önceki Vercel sürümüne dönüş ancak yeni BRANS hesaplarının eski kodda nasıl davranacağı açıkça değerlendirildiğinde yapılır. Kod rollback'i tek başına bütün rol yetkilerini geri getirmez; önceki eski IL kullanıcıları korunacağı için kesintisiz geri dönüş olasılığı artar. Rol enum silme/rename ayrı ileri faz ve ayrı karar.
5. Bu bir **mimari tercih**; gerçek SQL ve dağıtım sırası, migrasyon doğrulaması yapılmadan Production PASS sayılmayacak. Onaylı migration isimlerinin checksum'ları değiştirilmez.

## 5. P3 migration izolasyonu ve V3

- Production şemasında yeni V3 gereksinimi `Task.targetQuestionCount` ve `Question.taskId` ile ilgilidir; PR #118 üzerindeki ilişkiler korunur.
- `20261021120000_p3_private_geometry_assets` Production için **izinsiz Preview-only** migration'dır. `prisma migrate deploy` komutunu bu migration dosyasının bulunduğu varsayılan yolda körlemesine çalıştırma.
- P3 dosyasını sahte `resolve --applied` ile migration defterine yazma; geçmiş migration kayıtlarını silme.
- 01 TEST, P3 Preview geçmişini de koruyacak **kalıcı Prisma migration path/policy** düzeni, migration farkı ve yeniden dağıtım senaryosunu kaynak kodda hazırlamalı. Uygulama şeması ile migration yolunun tekrar üretilebilir uyumu denetlenmeli.
- V4 ünite planı, V5 kitap atölyesi, Preview login bypass ve P3 özel PNG Production açılışı bu sürümde yok.

## 6. Kabul ve işlem sınırları

- Mevcut PR #118 kullanılacak; **yeni dal/site yok**. PR #117 doğrudan merge edilmez.
- Kullanıcının isteğiyle tekrarlı uzun test kampanyası yok. Mevcut PASS kanıtları korunur; yeni kod için tip/lint/build, kritik yetki ve migration kontrolü **zorunlu asgari yayına alma kapısıdır**. Yapılmayan test `NOT RUN`.
- Herhangi bir `main` merge, Vercel deploy, Production DB migration veya gerçek hesap değişimi için **son değişiklik seti, hedef SHA, DB etkisi ve geri dönüş** net olmalı. Onay kapsamını aşan yetki/veri değişikliği varsa durdur.
- Production salt okunur baz: 31.10.2026 main SHA `643cc3a5`, PR #118 SHA `3c112b5e`, PR #117 SHA `53a91de7`; 15 kullanıcı, 2 proje, 11 soru, 5 kitap, 6 rol. 2 aktif eski IL hesabının branş ataması yok.
- Neon kurtarma dalı `br-rapid-term-b2g1rg99` READY; yalnızca uygulama rollback'i enum/DB dönüşünü otomatik çözmez.

## 7. Durum

**Karar:** KABUL EDİLDİ.  
**GitHub kod entegrasyonu:** PARTIAL — Üyelik, rol atama, yazar/proje/görev/soru bölge+branş kapsamı ve eklemeli migration dosyaları PR #118 üzerinde; rapor/kitap/mesaj/telif gibi diğer modüller tamamlanmadı.  
**Yeni migration:** SQL PREPARED / NOT APPLIED.  
**Production:** DEĞİŞMEDİ.  
**Sıradaki sahip:** 01 TEST mevcut PR #118'de kod ve minimum CI; 02 CANLI kontrollü yayın; 03 MİMARİ kapsam ve kabul matrisi.

## 8. 31.10.2026 — Üyelik ve rol atama geliştirme paketi

**GitHub kapsamı: IMPLEMENTED ON EXISTING PR #118 (NOT DEPLOYED).**
- `api/v1/_lib/member-access.ts`: Bölge Koordinatörü, BRANS rolüne atama yapabilir. Genel tüm roller için yetkilidir; İl rolü tarihsel olarak korunmuştur.
- `api/v1/management.ts`: BRANS rolü için geçerli mevcut bölge, bir veya fazla geçerli branş ve il alanının boş olması gerekir; Bölge Koordinatörü başka bölge atayamaz. Üye rolü, bölge ve branşlar tek transaction içinde güncellenir; audit önceki/sonraki kapsamı kaydeder. Yeni IL hesabı açılması reddedilir, eski hesaplar korunur.
- `src/membership/MemberManagement.tsx`: Genel tüm bölgeleri, Bölge yalnız kendi bölgesini seçer; Branş Koordinatörü için birden çok branş seçimi ve geçerli rol dönüşümü. Aktif eski IL hesapları düzenleme sırasında geçiş rolü olarak görünür.
- `prisma/schema.prisma`: IL değerini koruyarak BRANS enum'u eklendi. `User.assignedRegion` ve `UserBranchAssignment` zaten vardır; yeni tablo gerekmemiştir.
- `20261031010000_release04_expand_branch_coordinator_enum` ve `20261031011000_release04_seed_branch_coordinator_role`: ADD VALUE ve rol seed işlemleri ayrıldı. **Migration SQL'i yalnız hazırlandı, Neon'a uygulanmadı.**
- `src/demo/model.ts`, `src/types.ts`, `src/DemoApp.tsx`: geçici ikili rol tipi ve gösterim. **31.10 ilk üyelik paketinde BRANS yalnız overview bölümüne erişiyordu**; aşağıdaki bölüm 9 ile yazar/proje/görev/soru için erişim kapsamı eklendi. Rapor/kitap/mesaj/finans yetkileri kapalı.
- `tests/member-access.test.ts`: yeni rol atama hiyerarşisi için mevcut test sözleşmesine asgari doğrulama eklendi. **CI sonucu henüz PASS olarak doğrulanmadı.**

**Açık kalan geliştirmeler:** Tüm işlevsel API'lerin BRANS bölge∩branş kapsamı, proje bölgesel sahiplik modeli, rol içi özelleştirilebilir izinler (ayrı açık sözleşme), P3'ü dışlayan kalıcı Production migration yolu ve DB+Vercel uyumlu geri dönüş mekanizması. Sadece bu üyelik paketinin tamamlanması yayın izni değildir. PR #117 ve #118'in 18 ortak dosyası hâlâ genel bütünleşme kapsamında çözülmelidir.

## 9. 31.10.2026 — Üretim kapsamlı yetkilendirme (GitHub PR #118, Production değil)

**Kod: IMPLEMENTED; otomatik CI sonuçları son kontrolde PENDING.**
- `member-access.ts`: `coordinatorBranchIds` yalnız `UserBranchAssignment` kayıtlarını kabul eder; eski `editorBranchId` kolay yoluna başvurmaz. BRANS için üye okuma yalnız aynı bölgedeki atanmış branş yazarıdır. Üyelik başvurusu, üst rol yaratma ve yabancı bölge erişimi verilmez. Bölge Koordinatörü kendi bölgesindeki BRANS hesabını pasifleştirebilir.
- `author-access.ts`: Yazar havuzu filtreleri **atanmış bölge ∩ atanmış branşlar**.
- `project-access.ts`: Proje okuma/yönetimi için atanmış proje branşı, **en az bir yazar**, projedeki **tüm** yazarların aynı bölge ve proje branşında bulunması zorunlu. Boş, çok bölgeli veya farklı branşlı proje BRANS tarafından görülmez/yönetilmez; açık coğrafi sahipliği belirsiz olan proje fail-closed. Yeni projede en az bir kapsam içi yazar gerekir.
- `task-access.ts`: Görev okuma **yalnız izinli proje kapsamı**; `assignedCoordinatorId` üzerinden kapsam atlatılamaz. BRANS başka koordinatöre görev devredemez, yalnız uygun projede kendine veya o projeye atanmış yazara atayabilir. Durum güncellemede dolaylı assignee bypass'ı engellendi.
- `question-access.ts`: Soru havuzu okuma **yazarın bölge+branşı VE projenin tüm-yazar kapsamı** birlikte sağlandığında mümkün. Editör onayı/değerlendirme yetkisi BRANS'a verilmedi; arşiv/silme işlemleri de şu aşamada kapalı.
- `src/demo/model.ts`, `DemoApp.tsx`, `PublisherExperience.tsx`: BRANS için yazar/proje/görev/soru modülleri açıldı, diğer modüller kapalı. Tasarım prototipi gerçek rol API'siyle karıştırılmıyor.
- `projects/[id].ts`: BRANS başka branşa proje taşıyamaz, son yazarı kaldıramaz, **proje `Tamamlandi` statüsüyle telif tahakkuku tetikleyemez**. Muhasebe ve editörün yetkileri devredilmez.
- `tests/release04-region-branch-scope.test.ts`: Sınırlı birim politikası testi eklendi; önceki uzun test kampanyaları manuel başlatılmadı.
- `scripts/release04-verify-v3-branch-schema.mjs` ve mevcut `.github/workflows/release03-minimal-v3.yml` güncellendi: Eski `RELEASE-03` şema doğrulama dosyası korundu, mevcut otomatik GitHub CI'da `RELEASE-04` şema denetimi **yerel geçici PostgreSQL** üzerinde hem IL hem BRANS enum değerini ve V3 ilişkilerini doğrulamaya ayarlandı. Bu, **Production migration güvenliğine veya P3'e izin vermez**.

**Bilinen sınırlamalar / NO-GO**
1. `Project` tablosunda bağımsız `managingRegion` yok. Proje kapsamı **tüm yazarların coğrafyasından muhafazakâr şekilde türetiliyor**; yazarsız veya bölgeler arası projeler BRANS'a kapalı. İleride tekil bölgesel proje sahipliği gereksinimi ayrı ürün kararıdır.
2. Mevcut PR #118'de P3 Preview migration'ı hâlâ varsayılan Prisma migration dizininde; **Production'a körlemesine `prisma migrate deploy` yapılamaz**. SQL dosyaları hazır fakat Production'a uygulanmadı.
3. İki mevcut İl Koordinatörü hesabına bölge/branşlar otomatik atanmadı. Onaylı gerçek kullanıcı ataması olmadan rol dönüşümü yapılmaz.
4. Rapor, kitap, duyuru, mesaj, finans ve kişiye özel alt-izin motoru BRANS için henüz açılmadı. Yetkilerin tüm API uçlarında tamamlandığı iddia edilmez.
5. Mevcut GitHub Actions CI (yeni commitler için) PASS olarak henüz doğrulanmadı. Değişiklikler Production'a alınmadı; release ve geri dönüş aşaması ayrıca kontrol edilecek.
