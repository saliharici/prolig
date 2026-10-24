# UX03-PROD-GATE-01 — ADR-005 / P3'süz migration kanıtı

**Yetki sınırı:** yalnız 01 TEST. Kaynak: Issue #105 ve PR #104. Production GO değildir; main, canlı Neon, canlı env, merge ve deploy yasaktır.

## Kalıcı oturum güvenliği

- User.authVersion her korunan API çağrısında getCurrentUser veya /auth/me üzerinden kontrol edilir. Kurtarma OFF veya Production ortamı bu kontrolü ASLA kapatmaz.
- TEST seçimi: sürümsüz legacy JWT da 401 ile reddedilir. İlk Production sürümünde mevcut kullanıcıların yeniden giriş yapması gerekebilir; bu davranış 03 MİMARİ kararına tabidir. Yedi günlük gevşek geçiş uygulanmaz.
- Password reset authVersion değerini atomik artırır; profil updatedAt değeri oturumu bozmaz.
- Mail OFF yalnız talep/tüketim endpointini kapatır; eski iptal edilmiş JWT'yi diriltmez. Schema hazır olmadan kod yayını NO-GO. İlk artıştan sonra sürüm denetimi yapmayan eski uygulamaya rollback YASAK.

## Default OFF kurtarma ve gönderici

- Production backend koşulları: UX03_RECOVERY_ENABLED=true, UX03_PRODUCTION_RECOVERY_ENABLED=true, VERCEL_ENV=production, UX03_PUBLIC_ORIGIN exact https://prolig.vercel.app, UX03_VERIFIED_SENDER_DOMAIN eşleşmesi, UX03_VERIFIED_SENDER_CONFIRMED=true, özel UX03_RESEND_API_KEY / UX03_TOKEN_PEPPER. Sender @resend.dev Production için yasak.
- Bu env şartları güvenli kapıdır fakat Resend alan adı doğrulamasının gerçek sağlayıcı kanıtı DEĞİLDİR; 02 CANLI bunu ayrıca belgelemelidir.
- TEST backend allowlist: yalnız https://prolig-git-feat-ux03-mainline-safe-preview-20261024-salih22.vercel.app. Origin/Host/forwarded Host ve JSON content type denetlenir. UI Production build'de varsayılan gizli; ayrı VITE_UX03_PRODUCTION_RECOVERY_UI_ENABLED=true ve kanonik host gerektirir. Frontend flag sunucu kapısını açamaz.
- TEST secret, mailbox ve sentetik kullanıcı Production'a kopyalanmaz.

## P3'süz UX-03 şema geçişi — uygulama planı ve sınır

**Önkoşul:** 02 CANLI salt-okunur Production host/DB/branch kimliği MATCH, güncel backup ve izole restore tatbikatı PASS ve ayrı operasyon onayı. Şu an NO-GO.

1. Geçerli Production şemasından tamamen izole / geçici TEST clone kur; maskelenmesi gereken kişisel veriler temizlenir. Production'a doğrudan bağlanma.
2. Kontrollü ortamda kaynak Prisma migrations klasörlerinin değişmeyen byte kopyalarından geçici migration paketi üret: daha önce uygulanan migration'lar aynen, yalnız yeni 20261024010000_ux03_password_recovery dosyası eklenecek; P3 migration klasörü 20261021120000_p3_private_geometry_assets KESİNLİKLE bulunmayacak. Orijinal repoya yazma.
3. İzole clone için özel Prisma config ile migrations.path geçici paketi, datasource.url yalnız doğrulanmış izole klonu gösterir. Desteklenen prisma migrate deploy komutunun ledger kaydını Prisma'nın kendisinin yazmasına izin verilir. _prisma_migrations elle INSERT/UPDATE, resolve --applied ile yalan kayıt yasak.
4. Önce/sonra: User.authVersion INTEGER NOT NULL DEFAULT 0, PasswordResetToken/PasswordResetRate, indeksler ve FK var; UX03 ledger ve SQL checksum eşleşir; P3 tablo=0/ledger=0; kullanıcı, rol, oturum, soru, kitap, ödeme satır sayısı ve FK sağlamlığı sabit; kaynak/test parent ve Production değişmedi.
5. Desteklenen migration paketinin izole disposable clone üzerinde başarılı çalışma kanıtı olmadan gerçek Production için onay verilemez. Standard prisma migrate deploy tam repoda P3'ü de uygulayabilir: yasaktır. Rollback'te DROP yok; güvenli ileri düzeltme veya ayrıca onaylanmış restore tercih edilir.

### 24.10.2026 mevcut salt-okunur Neon TEST gözlemi
- PROLIG TEST project lucky-pond-26462894 / child br-sweet-cherry-bahq4egt / ux02_test: User.authVersion=1, PasswordResetToken=1, PasswordResetRate=1, UX03 tamamlanmış migration kaydı=1, P3 tablo=0, P3 ledger=0.
- Parent br-autumn-bread-bavbkz51 üzerindeki bu altı göstergenin tamamı=0. İzolasyon PASS.
- UYARI: Child schema ve ledger önceki işlemde doğrudan SQL transaction ile yazılmıştı. Bu kanıt tek başına Prisma migrate deploy/ledger otomasyonunun güvenilirliğini kanıtlamaz. Bu adım için ayrıca disposable clone üzerinde resmi Prisma koşusu gereklidir.
- Bu paket yalnız negatif güvenlik regresyonlarını test eder; önceki mail/reset/login UAT testleri tekrarlanmaz.
