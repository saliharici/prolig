# PRO-LIG — Yeni sohbet başlangıcı (17 Ekim 2026)

> **Aktif durum: P2 Question Studio yerel gerçek HTTP/API ↔ izole Neon PostgreSQL kabulü 6/6 PASS.** Bu, Production veya tüm tarayıcı arayüzü kabulü anlamına gelmez.

## Okuma sırası

1. `docs/AI_HANDOFF.md` (bu dosya)
2. `docs/AI_ACTIVE_STATE.md` (teknik mimari, şube ve güvenlik sınırları, son test)
3. `docs/P2_HTTP_TIMEOUT_20261017.md` (ilk başarısız deneme ve 17 Ekim başarılı tekrar)
4. `docs/AI_PROJECT_CONTEXT.md` (roller, hakediş, yetki ve mimari)
5. Gerekirse `docs/AI_CURRENT_STATE.md` (P0/P1 uzun geçmiş)

## Son doğrulanmış işlem

- **Repo** `saliharici/prolig`, P2 feature branch `feat/p2-professional-question-editor-20261012`.
- **Kod commit (kabul testi sırasında)** `ec0d1a137de985067f3cee41d98e7686f38edfb1` (PR #28 merged). Bu belge için başka bir docs-merge gelince branch SHA değişir; GitHub'dan doğrula.
- Kullanıcının özel Git worktree dizini `D:\Proje\pro-lig-p2-acceptance`; detached HEAD ile P2 feature commit üzerinde ve git durumu temizdi. `npx prisma generate` PASS.
- Son komut `node scripts/p2-live-http-acceptance.mjs --run` → branch preflight PASS, **Vitest 6/6 PASS**, 48 saniye; localhost gerçek Vercel question API handler'ları ve izole Neon'da CREATE / GET / PATCH / submit, yetki engeli ve 409/incomplete kontrolü.
- **Neon bağımsız salt-okunur kontrol**: main ve acceptance dallarında 5'er soru, her ikisinde 0 adet `P2-HTTP-UAT-%` ve 0 adet `P2-TXN-20261017-%`, bütün mevcut Question satırlarının hash özeti aynı `a34adf9c66590a5f7802a1dc8eebbe91`; P2 migration her ikisinde tamam.
- İzole acceptance dalında eski timeout denemesinden **1 denetim kaydı hâlâ mevcut**: `ActivityLog.id=529`, `QUESTION_SUBMITTED`, `entityId=84`. Main'de bu kayıt yok. **Silinmedi; ayrı kayıt hijyeni kararı gerekir.**

## Güvenlik / açık kapsam

- `main` / Vercel Production / Neon main verileri ve Vercel ortam değişkenlerini değiştirme. `D:\Proje\pro-lig` ana worktree içindeki kaydedilmemiş logo dosyaları ve untracked klasörler korunmalı.
- Neon izole kabul branch'i `br-quiet-tree-b2ganqkl`, proje `calm-band-45633698`. Neon main `br-soft-salad-b2vb8sdr`. Parola, JWT veya gitignored `.env.p2-acceptance.local` içeriğini isteme/paylaşma.
- Tam tarayıcı P2 görsel kabulü, gerçek dağıtım doğrulaması, tüm diğer modüller, editör onay/telif tahakkuku ve production release **bu 6 test kapsamında değil**.
- SSL-mode gelecek sürüm uyarısı ve `pg client.query() while executing` deprecation ayrı teknik borç; testleri engellemedi.

**Sıradaki mantıklı adım:** P2 özelliğinin **ayrı test ortamındaki tarayıcı kabulünü** ve release öncesi uyumluluk/yetki kontrol listesini planla. Kullanıcıdan production merge için ayrıca açık onay gelmeden üretim işlemi yapma. Geçmiş testleri tekrar koşturma, yalnızca değişen kod veya yeni risk bunu gerektiriyorsa tekrarla.
