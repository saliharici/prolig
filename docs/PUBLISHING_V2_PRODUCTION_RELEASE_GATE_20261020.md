# PRO-LİG Yayıncılık V2 — Production release gate (20.10.2026)

Durum: HAZIRLIK / BLOKE. Bu dal çalışma planıdır; Production etkinleştirmesi, migration ve merge değildir.

## Doğrulananlar
- #57 → #58 → #59 → #60 sıralı PR zinciri; GitHub CI sonuçları başarılı.
- Kullanıcının Neon panelinden bildirdiği `prolig-pilot/main` kaynaklı `backup-pre-publishing-v2-20261020` yedek branch'i bulunuyor.
- `restore-test-publishing-v2-20261020` dalında reset sonrası seçilmiş beş tablonun kayıt sayıları yedekle eşleşti: User=13, Role=6, Project=2, Question=6, Book=0.
- Bu eşleşme tam veri bütünlüğü veya kusursuz disaster-recovery testi iddiası değildir.

## Kesin yayın engelleri (çözmeden PROD işlem yok)
- [ ] Vercel Production DATABASE_URL'nin **gizli değeri paylaşılmadan** `prolig-pilot/main` ile birebir eşleşmesi yetkili ortamda makinece doğrulanmalı (entegrasyon sayfasının prolig-pilot açması yeterli kanıt değil).
- [ ] Production'daki mevcut `_prisma_migrations`, Book ve Question durumunun salt okunur envanteri; şema etkisi ve yedek zaman damgası.
- [ ] Yedekten geri alma için operasyon prosedürü: hedef, RPO/RTO, yeni yazılan kayıtların akıbeti, durdurma/yeniden açma ve doğrulama. `main` üzerinde reset veya yıkıcı rollback yok.
- [ ] İzole staging'de migration'ın eski veriyi koruduğuna dair karşılaştırma ve tekrar çalıştırma/çakışma koşullarının testi.
- [ ] Sunucu yetki matrisi ve regresyon: GENEL_KOORDINATOR, diğer 5 rol, sahiplik, 403/404, snapshot/answer-key mahremiyeti, request forgery / oturum çerezi, 409 optimistic concurrency.
- [ ] Production'a özel feature-gate tasarımı ayrı kod PR'ı ve test ile uygulanmalı. Bugünkü `bookApiPreviewEnabled()` fonksiyonu Production'da **her zaman false** döner; sadece env flag eklemek yeterli değildir.
- [ ] UI'da iki Preview flag'ine bağlı ekranların Production'da nasıl açılacağı ayrıca tasarlanmalı. Prod'a yanlışlıkla test verisi veya demo iddiası taşınmamalı.
- [ ] Vercel prod proje erişimi, değişken kapsamı, deployment rollback ve sürüm kontrolü.
- [ ] Production üzerinde veri migration'ı ile kod deploy'u ayrı kontrollü işlem olarak uygulanmalı; önce geriye uyumlu schema, sonra kod ve feature flag.
- [ ] Production öncesi son backup/restore point ve deploy için net GO/NO-GO.

## Önerilen sıra
1. Sadece okuma: Vercel/Neon hedef eşlemesi ve şema envanteri.
2. Ayrı şube üzerinde Production feature gate + test; Preview güvenliği korunur.
3. İzole staging migration + API kabulü, yetki/sahiplik testleri.
4. Son yedek ve geri dönüş provası, yayına çıkış kontrolü.
5. Sıralı PR entegrasyonu, schema migration, kapalı feature ile deploy.
6. Sınırlı yetkili smoke test, kontrollü açılış ve gözlem.

Bu dökümanın eklenmesi hiçbir Production izni kullanmaz ve canlı sistemde değişiklik yapmaz.
