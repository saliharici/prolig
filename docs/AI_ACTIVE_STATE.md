> **18 Ekim 2026 — P0 sürüm/veri bütünlüğü notu (bu PR):** GitHub'daki envanter PR #42 `feat/p2-professional-question-editor-20261012` dalına alındı (başlangıç SHA `7f2573e949c3e86305a1646de497637e5752b8da`). Ardından P0-01/P0-04/P0-05: ana sayfa artık demo `data.activities` olaylarını gerçek işlem gibi göstermiyor, P1/P2 frontend flag'leri `src/questions/studio-release-flags.ts` dosyasında merkezileştirildi, `README.md` ve `docs/RELEASE_CONTROL_MATRIX_20261018.md` güncellendi. **Bu belgede aşağıdaki erken SHA ve "sıradaki tek hedef P2-E" maddeleri tarihseldir**; güncel roadmap `docs/PRODUCT_INVENTORY_AND_RELEASE_ROADMAP_20261018.md`. P0 CI sonucu ayrıca doğrulanmalıdır. `main`, Vercel Production ve Neon dallarında yazma/yayın yapılmadı. Açık PR #32 ve #36 korumaları sürer; kritik gerçek editör onayı ve ödeme kabulü tamamlanmış sayılmaz.

# PRO-LIG — Güncel sohbet devri / AI active state

**Son doğrulama:** 2026-10-17 (Türkiye yerel tarihi). **Kaynak:** GitHub `saliharici/prolig`, operatör PowerShell çıktıları ve Neon doğrudan SQL sorguları.

> **YENİ SOHBETE BAŞLAYAN ASİSTAN:** Önce bu dosyayı, `docs/AI_HANDOFF.md` ve `docs/AI_PROJECT_CONTEXT.md` ile birlikte oku. Bu dosya en yeni özet; `docs/AI_CURRENT_STATE.md` uzun geçmiş dosyasıdır ve son sayfaları P1-D / 11 Ekim döneminde bitmektedir. Mutlaka GitHub branch/PR/CI durumunu yeniden sorgula. Buradaki test sonuçlarını canlı doğrulanmış bir testmiş gibi genelleme.

## 1. Temel proje ve sınırlar

- **Repo:** `saliharici/prolig`. Yığın: React/Vite/TypeScript, Vercel API, Prisma, Neon PostgreSQL.
- **Aktif soru stüdyosu geliştirme dalı:** `feat/p2-professional-question-editor-20261012`.
- **En son doğrulanmış geliştirme HEAD (bu not yazılmadan önce):** `0290b719c2254498b3422d23c187f6bf7db81de6` (PR #26 squash). Bu notun kendi docs-PR merge'i sonrası HEAD ilerleyebilir; her zaman yeniden doğrula.
- **MUTLAK SINIR:** `main` ve Vercel Production'a merge/deploy, production DB migration/seed, gerçek kullanıcı/soru silme yok. Her DB işlemi dal ve proje kimliğiyle kapsamlanır. Kod ve test düzeltmeleri feature PR üzerinde.
- **Ayrı doktora projesi:** Yeni bağımsız GitHub/Vercel/Neon yapısı, ayrı DB ve veri modeli. PRO-LIG ile karıştırma.
- Yetki hiyerarşisi ve telif politikası için `docs/AI_PROJECT_CONTEXT.md` esas; test geçirmek için role/grade/province kısıtlarını gevşetme.
- Bağlantı adresi/parola/JWT/özel env dosyaları GitHub'a, konuşmaya veya rapora KESİNLİKLE eklenmez.

## 2. P2 teknik ilerleme ve doğrulanmış kabul sınırları

P2 Question Studio dört soru formatını destekler: çoktan seçmeli 4 seçenek (A-D), çoktan seçmeli 5 seçenek (A-E; **yalnızca 9-12. sınıflar veya Mezun**), Doğru/Yanlış ve Açık Uçlu. PATCH değişen alanları korur, eski revizyon 409, incomplete açık uçlu soru submit engeli. P2 feature flag `PROLIG_QUESTION_TYPES_P2=true` yalnızca izole kabul koşullarında açıktır.

- PR #20: no-op edit guard; PR #21: beş seçenekli E yanıtı korunması; PR #22: typed differential PATCH; PR #23: API handler contract tests (mock Prisma); PR #24: eski P1-D pilot için read-only güvenlik.
- PR #25 (squash `a3ecea35...`): Gerçek Neon PostgreSQL üzerinde dört format INSERT/read/update, stale revision ve SQL koşullu durum simülasyonu; savepoint/rollback. Test 5 yapay kaydı geri aldı. Bu **gerçek veritabanı testidir**, fakat gerçek uygulama HTTP akışı **değildir**.
- PR #26 (squash `0290b719...`): İzole canlı API test runner `scripts/p2-live-http-acceptance.mjs`, suite `tests/integration/p2-live-http-acceptance.test.ts`, kullanım notu `docs/p2-live-http-acceptance.md`; 59/59 test dosyası, lint, build ve navigasyon CI **PASS**. Bu CI yazmalı DB testini **çalıştırmaz**.
- **CANLI API↔İZOLE NEON POSTGRES KABULÜ: 6/6 PASS (2026-10-17).** Kullanıcı `npx prisma generate` komutunu Prisma 7.10.0 ile PASS tamamladı. İlk API denemesi Vitest 5s timeout nedeniyle 2 PASS/4 timeout verdi; bu engel PR #28 ile giderildi (squash `ec0d1a13...`, CI PASS). Kullanıcı gerçek localhost HTTP handler + Neon PostgreSQL kabulünü **6/6 PASS**, 48.00s toplam süreyle tamamladı: yetkisiz create reddi, MC4 doğru D, MC5 doğru E, TRUE_FALSE, OPEN_ENDED, stale PATCH 409 ve eksik cevapla submit reddi. Testler gerçek DB kayıt döngülerini kullandı. **Production deploy, browser P2 UAT ve editör approve/telif tahakkuku bu test kapsamına girmez.**
- `pg-connection-string` SSL uyarısı (require/verify-full gelecekteki semantik) hata sebebi değil; `sslmode=verify-full` ileride tercih edilebilir.

## 3. Neon ortamları: karıştırma

**Kullanılan Neon organizasyonu:** `Vercel: salih`. Proje: `prolig-pilot` (`calm-band-45633698`), Frankfurt `aws-eu-central-1`. Database: `neondb`.

| Dal | Neon branch ID | Rol |
| --- | --- | --- |
| `main` | `br-soft-salad-b2vb8sdr` | Kaynak, **üzerinde yazmalı test YOK** |
| `p2-acceptance-20261017` | `br-quiet-tree-b2ganqkl` | **Tek onaylı P2 canlı test dalı**, `main` parent-data kopyası |
| `p2_multitype_preview_20261015` | `br-nameless-wave-b2o3r7ls` | Schema-only: **pilot kullanıcı/proje yok; migration history 0**; kullanılmaz |
| `backup_pre_p2_enable_20261016` | `br-falling-waterfall-b2wpauq0` | Korunacak yedek |
| `backup-pre-pr16-20261015` | `br-icy-night-b2ptzzn4` | Korunacak yedek |

- Ana host: `ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech` (**yasak yazmalı test**).
- Kabul host: `ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech`; kontrollerde bu host'a tam eşleşme gerekir.
- En son doğrudan Neon recheck (önceki çalışmada): **main 5 soru, acceptance 5 soru, `P2-HTTP-UAT-%` kaydı 0**; acceptance üzerinde 6/6 P2 sütun, 1 tamamlanan migration, 2 pilot kullanıcı, 1 pilot proje, 1 proje-yazar ataması.
- Testler real production verisi içeriyor olabilir: `main` ve kopyadaki 5 soruyu **silme/değiştirme**. Yapay kayıtları sadece benzersiz test prefix'i ve ownership kontrolüyle temizle. `P2-TXN-20261017-%` SQL testleri zaten rollback yapıldı.
- Eski P1-D ayrı Neon sandbox otomasyonunu P2 üzerinde çalıştırma. `scripts/p2-pilot-readonly-check.mjs` eski bağımsız P1-D sandbox'a sabitlenmiştir; bu kabul dalı için `scripts/p2-acceptance-branch-check.mjs` kullanılmalıdır.

## 4. Kullanıcının yerel çalışma ortamı

Windows PowerShell:

- **Ana repo:** `D:\Proje\pro-lig` — yerel branch `feature/corporate-landing-v1-20261014`. Üç `public/brand/prolig-logo-*.png` **değiştirilmiş**; `.agents/`, `.claude/`, `.windsurf/`, çeşitli ZIP, `README.txt`, özel audit raporu vb. **untracked**. **Asla temizle/reset/checkout ile üzerine yazma.**
- **Bağımsız test worktree:** `D:\Proje\pro-lig-p2-acceptance`; `git worktree add --detach ... origin/feat/p2-professional-question-editor-20261012` ile oluşturuldu.
- Test worktree klasöründe `npm ci` yapıldı; `.env.p2-acceptance.local` adlı **gitignored private dosya** ana repodaki dosyadan kopyalandı, `DATABASE_URL` içeriyor. Şifreyi **hiçbir yerde gösterme**.
- Kullanıcı `node scripts/p2-acceptance-branch-check.mjs` çalıştırdı: **PASS**; 6 sütun, pilot kullanıcı/proje, migration ve önceki test işaretlerinin 0 olması doğrulandı.
- Kullanıcı `node scripts/p2-live-http-acceptance.mjs --run` çalıştırdı: branch preflight PASS; Vitest modül import hatası `Cannot find module '../../../generated/prisma/client.js'` ve **0 tests**. **Sonraki güvenli adım `npx prisma generate`**. Bu komut Prisma Client üretir, DB migration veya seed çalıştırmaz.
- `git worktree --detach` nedeniyle bu klasörde rastgele `git pull`/dal değiştirme önerme; önce `git status -sb` ile durum doğrulanmalı. `.env.p2-acceptance.local` gizli kalmalı.

### Kabul sonrası son doğrulama — 17 Ekim 2026

- Kullanıcıdan gerçek test çıktısı: `Test Files 1 passed (1)`, `Tests 6 passed (6)`, `P2 live API ↔ isolated Neon acceptance: PASS`.
- Neon salt-okunur yeniden kontrolü: **main 5 soru, izole kabul dalı 5 soru**; her iki dalda P2 sentetik marker sayısı **0**, mevcut Question veri özeti birebir eşleşiyor (`a34adf9c66590a5f7802a1dc8eebbe91`).
- İzole dalda **47 Question ActivityLog**, main'de **46**; acceptance'da eski denemeden kalan `ActivityLog #529 / QUESTION_SUBMITTED / entityId=84` mevcut. Main'de yok; silinmedi.
- P2 canlı test için **yeniden çalıştırma gerekmiyor**. Sonraki yeni kapsam: tarayıcı P2 UI UAT / release öncesi uyumluluk, güvenlik, rol kapsamı değerlendirmesi ve izole dal audit hijyeni. `main` ve Production için ayrıca izin gerekir.
- Ayrı çalışma klasörü: `D:\Proje\pro-lig-p2-acceptance`; ana çalışma klasörünün değiştirilmiş logosunu, özel `.env.p2-acceptance.local` dosyasını veya production Neon hostunu değiştirme.

## 5. Yeni sohbet devri çalışma protokolü

1. GitHub'dan **önce** `docs/AI_HANDOFF.md`, **sonra** `docs/AI_ACTIVE_STATE.md` (bu dosya) ve `docs/AI_PROJECT_CONTEXT.md` oku.
2. Aktif PR/branch SHA/CI durumunu ve gerekirse Neon test dalının branch ID'sini **canlı doğrula**; eski sohbetin tahminini esas alma.
3. Yeni bir doğrulama/merge/başarısızlıkta bu dosyanın **güncel aşama ve sıradaki tek komut** alanını güncelle (feature branch PR ile).
4. Gerçekte tamamlanmamış adımı PASS olarak yazma; prod yayımlamasını bütün testlerin başarısıyla karıştırma.
5. Kullanıcıya yeni sohbette yalnızca bir sonraki en güvenli operasyonel adımı ver; önceki gereksiz adımları yeniden başlatma.
