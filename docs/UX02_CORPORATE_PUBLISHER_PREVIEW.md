# UX-02 · PRO-LIG Kurumsal Yayınevi ve Çalışan Girişi

**Karar:** Issue #95. **Base:** `5f59de6722f660157e540ca9485ae3d267405e14`. **Branch:** `feat/ux02-corporate-publisher-login-20261022`.
**UX-01:** Taslak PR #94'ten kod alınmadı; bağımsız dal.

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
