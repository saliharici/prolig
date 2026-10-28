# PRO-LIG V3 — Görev → Soru → Üretim → Kitap (izole TEST)

2026-10-29 | Sahip: 01 TEST | PR #117 / dal: feat/branch-coordinator-v3-20261027

## Gerçek değişiklikler
1. `Task.targetQuestionCount` (0 = eski/manuel görev), `Question.taskId` (nullable) ve FK. Mevcut soru verileri yeniden atanmaz. Yeni görev kaynaklı soru, görev ID'si, proje ve yazara ait görev atamasını API'de kontrol eder.
2. Yeni görevlerde sayısal soru hedefi girilir; görev ve proje DTO'su gönderilen/revizyonda/onaylanan soru sayılarını gerçek `taskId` üzerinden türetir. Proje ilerlemesi yalnız hedef tanımlı görevlerde `min(100, onaylı/hedef×100)`. Eski görevlerde elle girilen proje ilerlemesi korunur. Görev durumu soru onayı yerine geçmez.
3. Genel Koordinatör projeden Yayın Hazırlık Atölyesine geçer, yalnız seçili projede ONAYLANDI + arşivlenmemiş soruları tek tıkla kitap listesine seçer. Mevcut Book/BookQuestion kalıcı kaydetme ve sürüm doğrulama mekanizması kullanılır; yeni bir baskı/dizgi motoru icat edilmez.
4. Yazar görevi soruyu yeni görev bağlantısıyla açar; taskId yazımdan sonra sabittir. Yanlış göreve, başka projeye/başka yazar adına bağlama sunucudan engellenir. Görev ilişkiliyse silme ve başka yazara aktarma da engellenir.

## İzolasyon
Şema migration: `20261029010000_task_question_production_v3`, **yalnız PR #117 için izole Neon `ux02_test` dalında**. Production için ayrıca migration onayı ve geri dönüş planı şarttır.
Kitap API'sinin yeni Preview erişim kuralı, test dalı + test env işareti + tam host + DB adı + DB rolü eşleşmesine bağlıdır. `PROLIG_BOOKS_V2_ENABLED=true` gerekir; yanlış ortamda kapalı kalır. P3 private PNG gate'i değiştirilmez.

## Kabul ve sınırlar
Kabul akışı tek tur: Branş Koordinatörü hedefli yazar görevi → Yazar görev bağlantılı soru kaydeder → Editör mevcut akışla onaylar → Proje sayıları değişir → Genel Koordinatör onaylı soruları seçerek kaydedilmiş kitap taslağına aktarır.
Önceden PASS alan temel editör revizyon döngüsü yeniden test edilmez.
Mevcut eski sorular ve eski sayısal hedefi olmayan görevler otomatik eşleştirilmez.
