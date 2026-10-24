# ADR-006A — SCHOOLFLOW ÜST PLATFORMU / PRO-LIG İLK YAYINEVİ (25.10.2026 DÜZELTMESİ)

**Kullanıcının doğrudan marka sahipliği düzeltmesi ve mevcut [Issue #95](https://github.com/saliharici/prolig/issues/95) esas alınır.** Bu bölüm, ADR-006'nın aşağıdaki **"PRO-LIG Süper Admin" adlandırmasını marka yönünden GEÇERSİZ KILAR**; teknik tenant/kimlik/veri izolasyonu önerilerini ise uygun sınırlarla korur.

**SAHİP/ÜRÜN MARKASI:** **SchoolFlow** — geliştiricinin bağımsız platformu ve ayrı **Super Admin (control plane)** kimliği. Super Admin firma oluşturma, lisans, logo/tema/domain, erişim ve platform metaverisini yönetir; PRO-LIG içindeki `GENEL_KOORDINATOR` veya diğer yayıncılık rolü değildir.

**FİRMA / İLK MÜŞTERİ:** **PRO-LIG** — geliştiriciye ait olmayan yayınevi, kendi markasıyla `https://prolig.vercel.app/` üzerinden yayıncılık ekranlarını kullanır. PRO-LIG yazılım platformunun ticari sahip markası olarak anlatılmaz. Platform sahibi/kodun sahibi olmak, yayınevi markasına sahip olmak anlamına gelmez. Firma logosu, ad ve alan adı kullanımı ilgili yetkiye tabidir.

**ÜRÜN AYRIMI:** **ZirveNefesi** başka ve bağımsız bir uygulamadır; PRO-LIG/SchoolFlow tenant tasarımına veya koduna karıştırılmaz. `saliharici/prolig` mevcut yayınevi çalışma alanının deposudur; SchoolFlow platformu ayrı bir kimlik ve dağıtım katmanı olarak ele alınır, geliştirilen mevcut soru/kitap/telif yetenekleri çöpe atılmaz.

**ŞİMDİ:** SchoolFlow platform kimliği ve ilk PRO-LIG tenant konfigürasyonu için **tasarım/izole TEST**; tek müşteri Free pilotu, gerçek rol hesapları, rol dönüşümü `IL_KOORDINATORU`→`BRANS_KOORDINATORU` (**bölge ∩ branş**). Ücretli altyapı ve tam otomatik multi-tenant provisioning firma kabulü sonrasına planlanır. **Tenant izolasyonu henüz uygulanmadı; SchoolFlow Super Admin canlı değil.** Tek DB'ye birden fazla firmanın izolesiz verisi yüklenmez.

**GÜVENLİK:** Super Admin kurumsal içerik/telif erişimine varsayılan sahip değildir; firma içi yetkilere gizli geçiş yok. Firma panelinden SchoolFlow platform yönetimine yetki yükseltilmez. Bu belge değişikliği Production DB, env, release, kullanıcı oluşturma veya branding yayını izni değildir.

---

## ADR-006 (24.10.2026) — Önceki teknik ön taslak (adlandırma yukarıdaki karara tabidir)

# ADR-006 (ÖNERİ) — PRO-LIG Süper Admin ve çok yayınevi mimarisi
**Tarih:** 24.10.2026 | **Sahip:** 03 MİMARİ | **Durum:** ÖNERİ / Production için karar veya izin değil
**Referans kaynak:** `prisma/schema.prisma` (main `26548720`), `docs/CANONICAL_ARCHITECTURE.md`, `docs/PRODUCT_INVENTORY_AND_RELEASE_ROADMAP_20261018.md`.

## Gerekçe ve güncel sınır
PRO-LIG bugün tek kurumlu yapıda altı kanonik role sahiptir:
`GENEL_KOORDINATOR`, `BOLGE_KOORDINATORU`, `IL_KOORDINATORU`, `EDITOR`, `YAZAR`, `MUHASEBE`.
Prisma'da User, Project, Question, Book, CompensationEntry ve Payment kayıtları kurum/tenant kimliği ile kapsamlanmıyor. Genel Koordinatör mevcut sistemde tüm kayıtlara geniş erişim sağlar. **Sadece giriş ekranına yayınevi logosu eklemek çoklu şirket izolasyonu oluşturmaz.** `SUPER_ADMIN` mevcut `RoleCode` rolüne körlemesine eklenirse hesap/paylaşım yetkileri bozulabilir. Yayıncılık, özel soru medyası, telif ve IBAN gibi bilgilerin kurumlar arası erişimi engellenmelidir.

## Ön mimari tercihi: pilotta ayrılmış veri düzlemi
**Öneri:** Merkezi küçük bir **control plane** (tenant kataloğu + abonelik/erişim/alan adı + provisioning durumu + platform audit) ve başlangıç pilotunda **yayınevi başına bağımsız Neon proje/veritabanı + bağımsız storage namespace/bucket + bağımsız şifreleme anahtarı yönetimi**.

- **Artısı:** Tenant A/B arasında sorgu filtresi unutulmasına karşı fiziksel veri ayrımı. Mevcut tek-kurum Prisma modelinin tenant düzleminde daha az kırılarak yeniden kullanılabilmesi. Kurum bazlı yedek, taşıma ve erişim kapatma daha açık.
- **Eksisi:** Her tenant için veritabanı/migration/compute, işlem maliyeti, bağlantı havuzu, anahtar yaşam döngüsü, sistem operasyon yükü büyür. Birkaç yayıneviyle pilot için makul olabilir; çok yüksek tenant sayısında maliyet/işletim incelemesi şart.
- **Alternatif:** Tek paylaşılan veritabanında tüm business tablolarına tenantId, composite FK/unique, sorgu kapsamı + PostgreSQL RLS. Daha ucuz havuzlanabilir ancak tek eksik filtre/privileged connection gizlilik riskini artırır; bütün tablo, endpoint, rapor, background job ve migration için kanıtlı izolasyon gerekir. RLS olmadan yalnız frontend/route `tenantId` güvenli değildir.
- **Karar kapısı:** Maliyet, ölçek ve yasal veri saklama gereksinimleri incelendikten sonra pilot tercih KABUL/RED edilir. **Bugün SQL, tenant DB veya Production env oluşturulmaz.**

## Kimlik ve yetki
1. Global `SUPER_ADMIN` **ayrı platform kimliği ve yetki alanı**; altı tenant rolünün üzerine örtük kurum içi yetki kazanmaz. Kurum kullanıcıları tenant-local, örneğin `TENANT_A/EDITOR`, `TENANT_B/EDITOR`; aynı e-posta adresi iki kuruma ait olabilirse seçim/oturum sınırı açık.
2. İstek için kanonik tenant, **doğrulanmış sunucu-side host/domain registry** + doğrulanmış session tenant binding ile çözülür. Client body/query/header `tenantId` ile tenant veritabanı seçilmez. İsteğe bağlı özelleştirilmiş domain DNS ve sertifika kontrolünden geçer.
3. JWT/session, tenant ve authVersion ile bağlanır; kurum değişiminde yeni session gerekir. Eski JWT'leri otomatik kurumlar arası geçerli sayma. UX03 JWT güvenlik politikasına uyum korunur.
4. Super Admin 'destek amaçlı görüntüle' kullanacaksa: açık tenant sahibi izni, süreli impersonation, audit ve minimum yetki; varsayılan **cross-tenant içerik görüntüleme YOK**.
5. Control plane'de tenant meta ve provisioning durumu haricinde soru, kişisel iletişim, ücret, banka veya özel medya varlığı tutulmaz. Gizli anahtar, raw DATABASE_URL ve müşteri verisi asla uygulama loglarına/GUI/sohbete yazılmaz.

## Kurum oluşturma / şirket formu (ilk MVP sözleşmesi)
**Genel alanlar:** kurum adı, ticari unvan (opsiyonel), kurum kodu/slug (benzersiz), resmî iletişim e-postası, yetkili kişi (kurum sorumlusu), telefon (opsiyonel), varsayılan dil ve ülke, logo dosyası (kontrollü), kurumsal renk, özel alan adı (isteğe bağlı, doğrulamaya tabi), paket/lisans sınırı, başlangıç admin daveti, veri bölgesi seçimi (operasyon kararı).

**Form akışı:** Taslak → yönetici kontrolü → DNS/domain ve lisans doğrulama → PROVISIONING → bağımsız DB ve Storage hazır/şema checksum PASS → tek kullanımlık admin daveti → ACTIVE. Başarısız provisioning `FAILED` ve yeniden denemeye uygun; yarım tenant hiçbir şekilde aktif girişe açılmaz.

**Firma ayarları:** logo, tema, imza/kurumsal sözleşme, telif/ücret tarifeleri, varsayılan bölge/branş, yayın biçimleri, dosya boyutu/format kotaları, rapor erişimi. Mevcut altı kanonik rol ve Genel Koordinatörün tarife yetkisi tenant-içinde değişmez.

## Veri, ödeme ve depolama
- Her tenant'ın User/Role/AuthorProfile/Question/QuestionAsset/PrivateGeometryAsset/Project/Book/CompensationRule/CompensationEntry/Payment/ActivityLog verileri kendi veritabanındadır; genel platform yönetimi finansal işlem yapmaz.
- Soru resimleri özel bucket'ta, güvenli object-key namespace ile; kurumlar arası URL/receipt tekrar kullanımı yetkisiz olmalı. Word kitap snapshot'i tenant içi kayıttan oluşturulur.
- Ücret tarifesi tenant bazlı sürümlenir; geçmiş kazanımın `unitPrice` snapshot değeri korunur. Muhasebe yalnız kendi kurumunda ödeme dönemi yönetir; platform görevlisi tenant finansı görmez.
- Silme/abonelik sonu: anında veri silme yerine `SUSPENDED` read-only/erişim durdurma; sözleşmeli saklama/ihracat ve sonradan onaylı silme. Veri yedekleri ve retention tenant bazında açıklanır.

## Adım adım sıfır-kayıplı geçiş
1. **Önce mevcut ürün:** UX03 Production GO, kitap/editör ve finansal P0 kabul tamamlanmadan mevcut Production DB'ye tenant migration YOK.
2. **Mimari proof-of-concept:** izole TEST control plane ve iki ayrı sentetik tenant DB; ikisi de gerçek Production projesinden ayrıdır. Kimlik/URL, role matrix, ilan edilen kaynak maliyeti ve provisioning error davranışı.
3. **API veri katmanı:** tenant resolution + bir DB client/pool per request sınırı + seçili tenant'a özgü migration manifest; ücret, soru, kitap ve medya endpoint'lerinde client-supplied tenant bypass yok.
4. **Kayıt/sıfır-kayıp:** mevcut şirketi 'ilk tenant' olarak **yeni ayrı tenant DB'ye güvenli yedekten aktar** veya yetkili prod cutover politikasına göre tek aktif tenant başlangıç; checksum/sayaç/audit/finans, FK ve dondurulmuş kitap snapshot karşılaştırılması. Tek başına schema eklemek yeterli değildir.
5. **Dağıtım:** token ve domain cutover, her iki tarafta tek aktif yazma kaynağı; geri dönüş stratejisi çift yazım/çift tahakkuk oluşturmamalı. Snapshot + izole restore PASS ve ayrı Production migration/deploy/tenant go-live izni.
6. **Pilot kabul:** iki kurumun aynı branş/soru ID değerlerine sahip olabileceği düşünülerek A/B çapraz okuma/yazma, ödeme ve özel asset 403/404; hiçbir tenant diğerinin kişisel/telif bilgisine erişemez.

## Değişmezler ve izole kabul matrisi
| Kod | Kritik negatif durum | Beklenen |
|---|---|---|
| TN-01 | Tenant A tokenı ile Tenant B alan adından API çağrısı | 401/403, hiçbir B veri dönüşü yok |
| TN-02 | Body/query üzerinden tenantId veya başka DB seçme | Yasak, server canonical tenant sabit |
| TN-03 | Aynı soru/kitap ID'si A/B içinde var | Yanlış tenant'tan çapraz okuma/Word yok |
| TN-04 | A'nın private PNG receipt/object key'i B'de kullanılır | 403/404, Storage erişimi yok |
| TN-05 | Genel Koordinatör A ile B'nin ödeme/telif raporu | B verisi görünmez |
| TN-06 | Platform SUPER_ADMIN tenant görevi olmadan soru/ücret okur | Varsayılan deny + audit |
| TN-07 | Tenant provisioning DB migration FAIL | Tenant ACTIVE olmaz; güvenli retry |
| TN-08 | Kurum askıya alındı veya domain taşındı | Eski cookie/token ile erişim kapalı |
| TN-09 | Tenant A DB sil/restore talebi | Yazılı onay, yedek/izole restore, B etkilenmez |

## Açık ürün kararları (şimdilik kullanıcıya yeni onay yükü yok)
- Pilot için bağımsız Neon project/tenant ile RLS paylaşımlı DB maliyetini ölç.
- Çalışacak yayınevi sayısı ve barındırma bölgesi, özel alan adı, faturalandırma ve yasal veri saklama politikasını tanımla.
- Super Admin'in varsayılan gizli içerik erişimi **YOK** kuralı onay ön koşulu.
- Kurumların aynı kişiyi ortak yazar/editör olarak davet etmesi varsa, bu henüz merkezi profil birleşimi değildir; bağımsız hesap olarak başlat.

**Sonuç:** ADR-006 şu anda ÖNERİ. 03 MİMARİ, iki sentetik izole tenant PoC ve maliyet/operasyon bulgusunu gördükten sonra kararı bağlayıcı hâle getirir. Production değişikliği veya şifre/paylaşım talebi YOK.
