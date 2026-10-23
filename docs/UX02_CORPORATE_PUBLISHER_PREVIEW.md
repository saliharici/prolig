# UX-02 · PRO-LIG Kurumsal Yayınevi ve Çalışan Girişi

**Karar:** Issue #95. **Base (güncel main):** `2f95d0bf3d68ea9bce3da4fe017d644bbe0ba88c`. **Branch:** `feat/ux02-corporate-publisher-login-20261022`.
**UX-01:** Birleşmiş #94 kazanımları kontrollü merge ile taşındı: gerçek rol karşılama ve yetki filtreli kısayollar, Preview'a sınırlı tasarım galerisi, parola göster/gizle, P3 TS18047 null guard. #96 hâlâ Draft; Production onayı değildir.

## Korunan sınırlar
- Değişiklikler yalnız kurumsal yayım yüzeyi, çalışan giriş görünümü ve hata halinde AuthGate'in kamuya açık gezinimi üzerindedir.
- `src/auth/api.ts`, `api/v1/auth/*`, rol/yetki matrisi, soru, telif, yayıncılık, P3, DB ve env değiştirilmez.
- `/api/v1/auth/me` başarısızsa kurumsal sayfa görünür, fakat oturum doğrulanmış sayılmaz. Giriş başarı iddiası yalnız gerçek `login()` sonrası `fetchMe()` ile oluşur.
- Kitap kapağı, ISBN, kuruluş tarihi, açık adres veya yayınevi verileri doğrulanmadığı için gerçek kayıt gibi sunulmaz.
- Site PRO-LIG'i yayınevi olarak tanıtır; SchoolFlow ile yönetici/tenant yetkisi ilişkilendirmez.

## İnceleme
1. 1440, 768, 360 genişliklerde ana sayfa; menü, logo, hero, bölümler, altbilgi ve yatay taşma.
2. Aynı genişliklerde giriş ekranı; e-posta ve şifre etiketleri, parola göster/gizle, klavye odağı ve hata durumu.
3. `/api/v1/auth/me` 401 veya 500 iken public erişim; 500 halinde durum uyarısı; gerçek panellere yetkisiz erişim yok.
4. Üyelik başvurusu doğrudan mevcut `MembershipApplicationScreen` ile açılmalı.
5. Gerçek oturum servisi Preview'da doğrulanmadan `login PASS` denmez.

**İş kapatma:** Önizleme kullanıcı kabulüne gönderilir; merge/prod yalnız 02 CANLI tarafından açık onayla.

## 22.10.2026 mimari inceleme #6338904582 — tek düzeltme paketi
- Mobil üst çubukta giriş CTA'sı hamburger olmadan görünür; menüdeki giriş yolu korunur.
- Mobil giriş formu kurumsal kimlik açıklamasından önce sıralanır.
- Yayın katalog boşluğu küçültüldü; uydurma eser/ISBN yok.
- İletişim menüsü gerçek iletişim adresi bulunmadığı için "Bizimle Çalışın" olarak yönlendirme amaçlı yeniden adlandırıldı.
- Kurumsal+editoryal bölümlerin düşey boşlukları ve tekrarlanan mesajları azaltıldı.
- Kahraman görseli "KURUMSAL GRAFİK" etiketi ve iç açıklamasıyla motif oldu; kapak iddiası yok.
- `src/auth/api.ts`, server `api/v1/auth/*` ve yetki matrisi değiştirilmedi.
- Genel CI baştan `main` 5f59de6 üzerinde aynı P3 TypeScript üç uyarısıyla zaten FAIL (GitHub 39688082974). Ayrı P3/CI sahipliği; UX-02'ye taşınmadı.

## 23.10.2026 — Main 2f95d0b entegrasyonu / PR #96
- `main` UI/rol kazanımları korunurken UX-02 yayınevi vitrini ve çalışan giriş görünümü birincil kalır.
- `Panel Tasarımları` yalnız Preview/yerel önizleme hostname'inde gösterilir; `?ux01=preview` doğrudan erişim de aynı koşulla sınırlandırılır.
- P3 özel PNG altyapısı açılmadı; `GuidedQuestionStudio.tsx` null daraltma guard'ı yalnız mevcut `main` içeriğinden taşındı.
- Daha önceki 39/39 UX-02 görsel UAT ve anonim `GET /api/v1/auth/me` 401 PASS yeniden çalıştırılmaz; yeni entegrasyon için hedefli kontrat ve tek görsel ekran kontrolü yeterlidir.
- Gerçek `login 200` ve oturumlu `GET /api/v1/auth/me 200` hâlâ doğrulanmadı; sentetik QA hesabı güvenlik reddini dolanarak etkinleştirilmeyecek.
