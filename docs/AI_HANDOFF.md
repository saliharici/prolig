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

## P2 tarayıcı kabul hazırlığı — 17 Ekim 2026

- `scripts/p2-browser-acceptance.mjs` ve `scripts/p2-browser-acceptance-app.ts` ile **sadece gerçek GET API'leri** kullanan yeni bağımsız Neon P2 tarayıcı önizlemesi PR #30 için hazırlandı; önceki P1-D tarayıcı ortamıyla karıştırılmayacak.
- Tarayıcı çalışma planı ve ekran kontrol listesi: `docs/P2_BROWSER_UAT_20261017.md`. Ortam: `D:\\Proje\\pro-lig-p2-acceptance`. Önce CI / ilgili PR merge doğrulanmalı, sonra salt-okunur `node scripts/p2-browser-acceptance.mjs --preflight`, ardından `--serve`.
- İlk etapta YAZAR ve EDITOR pilot rollerinin gerçek arayüzünde P2 ekranları incelenecek. **Kayıt ve silme bloklu; tarayıcıda kalıcı kayıt henüz doğrulanmadı.** Yerel rol seçici parola ile giriş değil, test JWT oturumudur. Salt-okunur görsel kabul PASS ise ayrı yazmalı etap tasarlanacak.

## P2 gerçek tarayıcı kayıt kabulü — 17 Ekim 2026 (SON DURUM: PASS)

- **Görsel kabul:** P2 beş aşama, 10. sınıf A–E beş seçenek, doğru/yanlış, açık uçlu model cevap/rubrik/değerlendirme alanları ve editör inceleme görünümü gözlemlendi. PR #31 ile yazarın genel havuzdaki `Branş` alanı oturum profilinden dolduruldu ve her editöre özel yer tutucular eklendi. Kullanıcı `Matematik` görünümünü PASS olarak doğruladı.
- **Gerçek tarayıcı kayıt/düzenleme:** Kullanıcı bağımsız test worktree'inde `d7afb11` commit'ini ve `3716ef55e7c0ec9805a96a061c59e3cc039b580f` browser launcher blob'unu doğruladı; `node scripts/p2-browser-acceptance.mjs --preflight` PASS. Ardından izole localhost `--serve-write` modunda pilot YAZAR / `PILOT-MAT-8-001` / 8. sınıf ile **#92** işaretli taslak oluşturma → kaydetme → yeniden açma → soru kökünü düzenleme → kaydetme → tekrar açma yapıldı; gerçek Neon sorgusunda içerik `5 + 7 işleminin sonucu kaçtır?(P2 düzenleme testi)`, dört seçenek `10,11,12,13`, doğru cevap `C`, statü `TASLAK` ve marker `P2-UAT-BROWSER-20261017` doğrulandı. **Gerçek tarayıcı persistence ACCEPTANCE: PASS.**
- **Temizlik:** Kullanıcı ayrı `node scripts/p2-browser-acceptance-cleanup.mjs --question-id 92` DRY-RUN PASS (2 audit, 0 media/compensation) ardından **açık onayıyla** `--question-id 92 --apply` yaptı; çıktı `CLEANUP PASS`. Yerel `PROLIG_P2_BROWSER_WRITE_APPROVAL` ve `PROLIG_P2_BROWSER_CLEANUP_APPROVAL` değişkenlerini kaldırdı.
- **Bağımsız Neon salt-okunur SON KONTROL:** `br-soft-salad-b2vb8sdr` main ve `br-quiet-tree-b2ganqkl` kabul dallarında **5'er Question**, `id=92` **0**, `P2-UAT-BROWSER-20261017%` **0**, eski `P2-HTTP-UAT-%` ve `P2-TXN-20261017-%` **0**, `#92` QuestionAsset/CompensationEntry/ActivityLog kayıtları **0**, mevcut Question veri özeti iki dalda da `a34adf9c66590a5f7802a1dc8eebbe91` (eski dondurulmuş özetle eşleşiyor). Eski kabul dalına özel `ActivityLog #529` **1**, ana dalda **0**; tarihi kayıt korunuyor. Question audit toplamı main=46 / acceptance=47.
- **GitHub:** Tarayıcı guarded-write kodu ve cleanup aracı **PR #32** `feat/p2-browser-guarded-write-20261017` dalında; GitHub CI lint / unit / build / navigation PASS, **PR #32 henüz birleştirilmedi**. Yerel test bu dalın `d7afb11` sürümünde PASS oldu. `feat/p2-professional-question-editor-20261012` dalı ise `58839cd0` tabanındadır. PR #32'nin açık olması acceptance'ın geçersiz olduğu anlamına gelmez ancak kodun P2 feature dalında henüz bulunmadığı unutulmamalı.
- **Sınır:** Vercel Production, GitHub main, Neon main üzerinde hiçbir yazma/deploy yapılmadı. Bu bir **pilot YAZAR, 8. sınıf, 4 seçenekli sentetik taslak** için gerçek tarayıcı kabulüdür; editör karar kaydı / telif, production login, çoklu rol uçtan uca ve beş seçenekli tarayıcı persistence **bu test kapsamında değildir**. Beş seçenekli A–E gerçek HTTP API↔Neon önceki 6/6 testinde PASS.
- **Ayrıntılı kayıt:** `docs/P2_BROWSER_WRITE_UAT_20261017.md`; eski görsel matris `docs/P2_BROWSER_UAT_20261017.md`. `D:\Proje\pro-lig` ana çalışma klasöründeki kaydedilmemiş logolara ve özel env dosyalarına dokunma.

**Sıradaki mantıklı adım:** Önce PR #32'nin kod inceleme / feature-only merge durumunu netleştir; ardından P2 editör kararları, rol kapsamı, tarayıcı persistence genişletmesi ve production öncesi uyumluluk kontrol listesini ele al. Kullanıcıdan production merge için ayrıca açık onay gelmeden üretim işlemi yapma. Geçmiş testleri tekrar koşturma, yalnızca değişen kod veya yeni risk bunu gerektiriyorsa tekrarla.
