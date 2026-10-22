# UX-01 · Preview-only yayıncılık arayüzü

Base: 5f59de6722f660157e540ca9485ae3d267405e14
Branch: feat/ux01-publisher-experience-20261022

## Kapsam
- Kurumsal ana sayfa, giriş ekranı ve gerçek rol panellerinde ortak bordo-kâğıt tasarımı.
- Süper Admin yayınevi/tema ve Branş Koordinatörü yalnız görsel prototip; 7 rol sekmeli galeri.
- Backend, oturum, gerçek roller, yetkiler, Production DB/env/migration ve yayın süreçleri değiştirilmedi.
- İl Koordinatörü gerçek rolü ve Bölge Koordinatörü korunur.

## Kabul kontrolü
1. Preview / Panel Tasarımları: tüm rol sekmelerini ve örnek verilerin prototip olduğunu gör.
2. Gerçek giriş formu: şifre göster/gizle, hata ve odak davranışı.
3. Yetkili test hesaplarında gerçek rol panelleri; hızlı bağlantılar yalnız mevcut permissions listesinden.
4. Masaüstü-mobil düzen, sticky navigasyon, soru/stüdyo/telif/yayın işlevleri değişmemeli.
5. CI ve Vercel build ayrı; kullanıcı görsel onayı ayrı PASS/FAIL.
