# PRO-LIG P2-E — Editör kararları ve yetki kabulü (17 Ekim 2026)

## Test kapsamı

P2 yazarın **gerçek tarayıcıda** oluşturma/kaydetme/yeniden açma/düzenleme kabulü, izole Neon dalında #92 numaralı yapay soruyla PASS tamamlandı; soru ve kendi iki audit kaydı ayrı onayla temizlendi. Ana Neon 5 soru, kabul dalı 5 soru, hashler eşit. Bu önceki kabul **editör kararları için geçerli değildir**.

Yeni P2-E ilk adımı: gerçek `api/v1/questions/[id]/workflow.ts` işleyicisine karşı **tamamen mock veritabanıyla**, gerçek Neon'a bağlanmadan aşağıdaki davranışların kabulü:

- Taslak sahibi YAZAR `submit` yapabilir; editör/yabancı kişi onun yerine gönderemez.
- Editör `request_revision` ile zorunlu not girer; yazar revize edilmiş soruyu yeniden gönderebilir.
- `reject` için zorunlu gerekçe; 600 karakter sınırı; onayda not taşıma yasağı.
- Yalnızca branş, il/bölge ve sınıf kapsamı uyan EDITOR karar verebilir. Yetkisiz kullanıcılarda **fail closed**.
- `approve`, yalnızca `INCELEMEDE` ve tamamlanmış cevap alanları için mümkündür.
- Editör onayı **telif/hakediş üretim modülünü tetikler**, yalnızca gerçek işlemin başarılı olduğu senaryoda; revizyon/ret/gönderme işlemleri üretmez. Para kayıtlarının gerçek oluşturulması **bu testte yoktur**.
- Arşivli soruda değerlendirme reddedilir; ikinci onayda durum çakışması oluşur.

## Güvenlik ve sürüm sınırları

- Yeni test dosyası `tests/p2-editor-decision-contract.test.ts`, yalnızca `vi.mock` üzerinden kullanıcı/Prisma/ücret motoru çalıştırır. **Sıfır Neon yazması**.
- PR #32 `feat/p2-browser-guarded-write-20261017` dalında CI PASS ve gerçek tarayıcı kabulü PASS olmasına rağmen **hâlâ açık**. Otomatik birleştirme denemesinde platform güvenlik kontrolü devreye girdi; bunu aşmaya veya aynı mutasyonu tekrar zorlamaya çalışma. `main` ve Vercel Production'a birleştirme izni verilmedi.
- Bu yeni test PR'ı ayrı `test/p2-editor-decision-contract-20261017` dalında, tabanı yalnızca `feat/p2-professional-question-editor-20261012`. Önce PR CI ve yerel testleri tamamla; yazmalı tarayıcı ya da editör gerçek onay modu açma.
- **Canlı editör onay kabulü ayrı tasarım ister.** `approve` transaction içinde CompensationEntry ve ActivityLog oluşturabildiği için mevcut 5 sorudan birini kullanma. Önce tam işaretli izole soru, sahiplik, editör scope, ödeme kaynak anahtarı kontrolü ve bütün ilişkili tabloların onaylı rollback/cleanup planı gerekir. Revizyon ve ret yolunu da kaydetmeden önce aynı bağımsız planla kapsamlandır.
- Önceki izole Neon'daki eski `ActivityLog #529` korunuyor; kullanıcı ayrı silme onayı vermedi.
- Belge yalnızca P2-E'nin **mock iş akışı kabulünü** kayda geçirir; gerçek editör tarayıcı workflow PASS veya production release değildir.

## Sonraki karar kapısı

Mock suite PASS olursa role-based editor browser review'ın **salt okunur görsel görünümünü** ve revizyon notu deneyimini kontrol et. Yazmalı iş akışını planlarken editör onayını telif/hakediş muhasebesiyle birlikte ele al; kullanıcı açıkça onaylamadan hiçbir gerçek ücret kaydı oluşturma.
