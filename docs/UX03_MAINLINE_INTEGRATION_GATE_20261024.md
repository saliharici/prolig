# UX-03 — Şifre kurtarma güncel main Preview entegrasyonu

Tarih: 24.10.2026 · İcra: 01 TEST · **Yalnız izole Preview, Production değil.**

## Devir kanıtı
- Önceki izole kod: PR #99 / c726c679fe2f8f6076f01b6236742c4a16807086; onun UX-02 taslak base dalı tarihsel kaldı.
- Yeni dal: `feat/ux03-mainline-safe-preview-20261024`; kaynak `main` 2654872084c4fd3190ab5d6b345a8509f6d89564.
- İlk kapsam: 15 dk tek kullanımlık HMAC kurtarma token'ı, otomatik etkinleştirme olmadan yalnız aktif hesaplar, hız sınırları, pasif hesaplara aynı yanıt, authVersion tabanlı oturum iptali, güvenli cookie.
- Kullanıcının çalışan üye oluşturma/rol arayüzü olduğu gibi korundu. Mevcut UX-04 video/UX-05 kitaplık/Bootstrap tasarımı üzerine entegre edildi.
- Preview dışındaki ortamlarda kurtarma bağlantısı gösterilmez; API zaten Preview doğrulaması olmadan 503 döner.

## Yayına çıkış için zorunlu engeller
1. İzole Neon üzerinde migration uygulanmadı; User.authVersion, PasswordResetToken/Rate tabloları test DB'de doğrulanmadı. Bu PR, yeni User kolonu için Prisma client query'leri içerdiğinden **Production DB migration olmadan main'e asla birleştirilemez.**
2. Doğrulanmış gönderici/domain, ayrı TEST alıcısı, özel e-posta/pepper ve Preview origin ayarları doğrulanmadı. Bu nedenle gerçek e-posta teslimi, parola reseti, eski oturumu iptal ve kullanıcı girişi UAT **PASS değildir**.
3. Var olan pasif YAZAR hesabı bu özellik yoluyla aktivasyon kazanmaz. İlk erişim, kimlik doğrulama ve ayrı yönetici yetki süreci olmadan açılmayacak.
4. Production DB değişikliği, env/secrets ve PR merge/deploy için ayrı açık işlem onayı; rollback koşulu ve test gerekir.

## Sonraki iş
01 TEST: yetkili izole migration ve doğrulanmış TEST mailbox sağlandığında sınırlı uçtan uca kabul; 03 MİMARİ: aktivasyon politikası; 02 CANLI: ancak ayrıca Production yayın onayı. Bu doküman tek başına yayın izni değildir.
