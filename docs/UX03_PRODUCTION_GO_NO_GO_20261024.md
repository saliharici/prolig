# UX-03 — Production GO/NO-GO ve devir kapısı (24.10.2026)

> **Durum: NO-GO (yayın onayı değildir).** Güncel kaynak: GitHub PR #104, HEAD `c5d5ee70b14337da5fa80871071294774fd1c582`; Production `main` `2654872084c4fd3190ab5d6b345a8509f6d89564`. Bu dosya izole TEST dalında oluşturulmuştur. Production deploy/migration/env yazımı yapılmadı.

## Tamamlanmış kabul — tekrarlama
- Gerçek izole UX-03 Resend test e-postası teslimi, parola sıfırlama ve yeni parola ile giriş: **KULLANICI PASS**.
- İzole Neon çocuk dalı: `lucky-pond-26462894 / br-sweet-cherry-bahq4egt / ux02_test`; UX-03 migration şema ve izolasyon **PASS**.
- PR #104 içindeki `tests/ux03-negative-handler-acceptance.test.ts`: sahte TEST persistence ile gerçek API işleyicisi üzerinden kullanılmış tokenın **HTTP handler 400**, eski çerezin **HTTP handler 401**, yeni çerezin **HTTP handler 200** davranışı **TEST PASS**. **Gerçek dağıtılmış Preview HTTP UAT değildir**.
- GitHub `verify`, `scoped`, `p2-real-db`, `book-real-db` **PASS**. Vercel Preview READY.
- TEST ortamındaki güvenli anahtarlar ve Resend göndericisi yalnız `feat/ux03-mainline-safe-preview-20261024` Git dalına bağlıdır.

## Salt-okunur Production envanteri
- Vercel canlı `prolig.vercel.app` alias `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` dağıtımında, `main=26548720...`, READY. Production'da UX-03 için `UX03_*` ortam değişkeni tespit edilmedi (gizli değer okunmadı).
- Bağlı Neon araçlarının proje listesinde **gerçek Production Neon projesi görünmüyor**. Canlı `DATABASE_URL` gizli değerini açıklamak veya tahmin etmek yasaktır. Production şemasının UX-03 için hazır olup olmadığı **BİLİNMİYOR**.
- `prisma/migrations/20261024010000_ux03_password_recovery/migration.sql` ayrı çocuk TEST dalında doğrulandı. DDL yeni iki tablo ile `User.authVersion INTEGER NOT NULL DEFAULT 0` ekler; Production'a uygulanmadı.
- Yeni Prisma Client / `api/v1/auth/login.ts` / `getCurrentUser` kodu `authVersion` sütununu sorgular. Production'da sütun yoksa doğrudan kod merge'i **canlı girişleri bozabilir**. Bu nedenle **şema önce, kod sonra** ayrımı zorunludur.
- Mevcut `AuthGate` ve `previewOrigin()` kontrolü Production için kasıtlı olarak kapalıdır. Preview PR'ın doğrudan merge edilmesi **özelliği canlıya açmaz**; ayrıca Production'a özel, varsayılan OFF release gate'i tasarlanmalı, TEST'te kabul edilmelidir.

## Yalnız yetkili CANLI operatör için ŞEMA OKUMA komutu (şimdi çalıştırılmadı)
Bu repodaki `scripts/ux03-production-schema-readonly.mjs`, bağlantı değerini **göstermez** ve yalnız **BEGIN TRANSACTION READ ONLY / ROLLBACK** kullanır. GitHub Actions tarafından otomatik çağrılmaz. Kasıtlı olarak yalnız ilgili canlı bağlama sahip güvenli çalışma oturumunda çalışır. Operatör canlı veritabanının doğru host/db kimliğini **ayrı ve doğrulanmış Production kaynaktan** belirlemelidir; önce iki kimliği birebir eşleştirir. `PROLIG_UX03_READONLY_PREFLIGHT=YES`, `PROLIG_EXPECTED_PRODUCTION_DB_HOST`, `PROLIG_EXPECTED_PRODUCTION_DB_NAME`, `DATABASE_URL` değerleri güvenli ortama tanımlanır. Komut:

```bash
node scripts/ux03-production-schema-readonly.mjs
```

Çıktı yalnız boole şema varlığı ve `schemaReady` durumudur; `productionReleaseApproved` her zaman `false`. `schemaReady=false` bu aşamada hata değil, Production migration'ın henüz yapılmadığının kanıtıdır. Bu komut migration veya yayın izni değildir.

## Şema önce — kod sonra GO kapıları
1. **03 MİMARİ:** Aktif/Pasif hesap, ilk şifre/üyelik aktivasyonu, kullanıcı oturumlarının toplu iptali ve doğrulanmış gönderici alan adı politikası; onaylı ADR. Eski parola reseti, Pasif hesabı etkinleştirme yolu **olamaz**.
2. **02 CANLI / yalnız salt-okunur:** Production veritabanı bağlantısının gerçek Neon proje/dal/db kimliği; mevcut `_prisma_migrations`, `User.authVersion`, yeni tablo envanteri. Gizli URI/anahtarlar sohbete veya PR'a yazılmaz. Yetkili ortamda çıktı kaydı sağlanır.
3. **01 TEST:** Production kapısı için varsayılan kapalı `UX03_RECOVERY_ENABLED` ve `VERCEL_ENV=production` yalnız **açık allowlist, doğrulanmış HTTPS PRO-LIG origin, verified sender** koşulları altında etkinleştirilebilen ayrı mimari PR; Preview'a bağlı `allowUx01DesignPreview()` genelleştirilmez. Reddetme/rollback/aktivasyon/sesssion testleri izole çalışır.
4. **02 CANLI + ayrıca açık kullanıcı işlem onayı:** Mevcut veri yazım yükü, son yedek/restore noktası, tam migration diff, varsa schema lock süresi, ileriye dönük geri dönüş (roll-forward) planı. **Yalnız additive schema migration**, başarı kanıtlanmadan UX-03 kod/flag deploy yok. Veritabanını geri almak için DROP/RESET uygulanmaz.
5. **02 CANLI + ayrıca açık merge/deploy onayı:** Önce schema uyumlu release; Production kurtarma flag **OFF**, mevcut giriş/rol/üye akışı smoke PASS; ancak sonra verified sender ve gerçek Production origin ile flag açma. Resend `onboarding@resend.dev` Production göndereni değildir.
6. **02 CANLI:** Sınırlı kullanıcı kabulü; e-posta teslimi, bir kez token, eski oturumun reddi, Pasif durumun korunması, erişim yetkileri ve hata izleme. Sorun halinde önce flag OFF / güvenli önceki Production deploy; veri kaybı yaratacak DB geri alma yapılmaz.

## Sahip ve devri
```text
PRO-LIG DEVİR v1
İŞ KİMLİĞİ: UX03-PROD-GATE-01
GÖNDEREN → ALICI: 01 TEST → 03 MİMARİ → 02 CANLI
ORTAM: izole Preview tamam; Production henüz NO-GO
SORUN VE AMAÇ: UX-03 şifre kurtarmayı gerçek kullanıcı sistemine güvenli aktarım
YAPILAN: TEST gerçek e-posta/reset/login kullanıcı PASS; negatif API-handler test PASS; Production release inventory hazırlanıyor
DOĞRULAMA: PR #104 SHA c5d5ee70b14337da5fa80871071294774fd1c582; CI PASS; Production main 26548720 READY
DB/MIGRATION: yalnız child TEST Neon migration PASS; Production şeması BİLİNMİYOR
FEATURE FLAGS: UX03_RECOVERY_ENABLED yalnız Preview TEST dalında; Production'da YOK
GÜVENLİK VE ROL: Pasif aktivasyonu yok; Production için yeni explicit allowlist + verified sender şart
GERİ DÖNÜŞ: Feature flag OFF; eski güvenli kod; DB schema silinmez
BİLİNMEYEN / ENGEL: bağlı Neon'da Production proje görünmüyor; canlı DB host/db eşleştirmesi, backup, Production sender ve gerçek deployed HTTP kabulü eksik
BİR SONRAKİ TEK ADIM: CANLI salt-okunur Production schema identity + MİMARİ prod gate ADR; sıralı release planı
KARAR GEREKSİNİMİ: Production migration, env, merge ve deploy için ayrı açık kullanıcı onayı gerekir
```
