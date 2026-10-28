# PRO-LIG — Yayın Üretim Planlaması V4 (5 aşama)
Tarih: 2026-10-29 | Rol: 01 TEST | PR: #117 | Dal: feat/branch-coordinator-v3-20261027

## Hedef
Görevden soruya bağlı, bölüm/ünite bazında planlama ve eksik soru görünürlüğü; mevcut kitap taslağı ve editör kontrolünü tekrar yazmadan koordine etmek.

## Beş ürün geliştirmesi
1. **Kitap/proje üretim planı:** Proje detayında 30 adede kadar kalıcı ünite/bölüm; sıralı gösterim ve sorumlu koordinatör kapsamı.
2. **Ünite hedefi ve termin:** Her ünitenin hedef soru adedi (1-10000) ve isteğe bağlı termin tarihi. Değişiklikler kapsam kontrolüyle kayıt ve audit log'a düşer.
3. **Yazar iş dağıtımı:** Yazar görevlerinin `Task.unitPlanId` ile gerçek üniteye bağlanması; aynı proje doğrulaması, yazarlı görev şartı, görev soruları varsa başka üniteye taşımanın reddi. Görev kartında ünite görünür.
4. **Eksik soru ve gecikme raporu:** Ünite hedefi eksi bağlı görevlerin ONAYLANDI statüsündeki soru sayısı (negatif olmaz); henüz dağıtılmamış hedef, fazla dağıtım, geciken ünite ve yazar bazlı açık iş. Taslak/inceleme/revizyon, onaylı sayısına eklenmez. Ünitesiz eski görevler raporda ayrıca uyarılır, keyfi eşleştirilmez.
5. **Kitap hazırlık kontrolü:** Genel Koordinatörün onaylı soruları ünite sırası ile mevcut kitap taslağına seçebilmesi. Tüm ünitelerin hedefi ve dağıtımı tamamlandığında plan `ready` tavsiye durumu gösterir; bu **nihai yayın izni değildir**. Mevcut V2 kitap editörü hâlen *tek bölüm* kaydeder, çok bölümlü dizgi vaadi yoktur. Kısmi kitap taslağı mümkün, nihai yayın otomatik gerçekleşmez.

## Ortam ve veri
Yalnız `lucky-pond-26462894` / `br-round-wind-balw5c6m` / `ux02_test` (owner `ux02_owner`).
Migration `prisma/migrations/20261029030000_unit_production_plan_v4/migration.sql` uygulanıp `_prisma_migrations` tablosuna kaydedildi.
Dört örnek TEST ünitesi (Matematik: Tam Sayılar, Rasyonel Sayılar; Fizik: Kuvvet, Hareket) oluşturuldu ve ilgili mevcut dört TEST göreviyle eşlendi. Canlı kullanıcı soruları, görev status'ları veya editör kararları değişmedi.

## Güvenlik ve geçiş
Ünite okuma/yazma yalnız GENEL/BÖLGE/BRANŞ_KOORDINATORU; yazma yetkisi `canManageProject` ile il/branş kapsamına bağlı.
Görev yazma ayrı `canManageTask` ve proje ile aynı ünitede kalma kontrolünü korur.
Production migration/merge/env değişikliği YAPILMADI. Main merge canlı deploy tetikleyebilir; CANLI sahibinin açık onayı ve rollback planı olmadan merge yok.
P3 Private PNG Production'da açılmadı.

## Kabul sınırı
V3'teki yazar–editör revizyon döngüsünün önceki PASS'i korunur. Yeni V4 için yalnız plan oluşturma/düzenleme, yeni göreve ünite seçme, açık hesaplaması, kitap seçim sırası tek paket olarak incelenir.
Vercel READY sadece derleme kanıtıdır, manuel kabul kanıtı değildir. Lint/API TS/test sonuçları çalıştırılmadıkça PASS yazılmaz.
