> **18 Ekim 2026 — P0 sürüm/veri bütünlüğü notu (bu PR):** GitHub'daki envanter PR #42 `feat/p2-professional-question-editor-20261012` dalına alındı (başlangıç SHA `7f2573e949c3e86305a1646de497637e5752b8da`). Ardından P0-01/P0-04/P0-05: ana sayfa artık demo `data.activities` olaylarını gerçek işlem gibi göstermiyor, P1/P2 frontend flag'leri `src/questions/studio-release-flags.ts` dosyasında merkezileştirildi, `README.md` ve `docs/RELEASE_CONTROL_MATRIX_20261018.md` güncellendi. **Bu belgede aşağıdaki erken SHA ve "sıradaki tek hedef P2-E" maddeleri tarihseldir**; güncel roadmap `docs/PRODUCT_INVENTORY_AND_RELEASE_ROADMAP_20261018.md`. P0 CI sonucu ayrıca doğrulanmalıdır. `main`, Vercel Production ve Neon dallarında yazma/yayın yapılmadı. Açık PR #32 ve #36 korumaları sürer; kritik gerçek editör onayı ve ödeme kabulü tamamlanmış sayılmaz.

# PRO-LIG — Aktif sohbet devri (17 Ekim 2026, P2-E)

> **Aktif durum:** P2 4-format gerçek localhost HTTP↔izole Neon **6/6 PASS**; pilot YAZAR gerçek tarayıcı sentetik soru CREATE→REOPEN→PATCH→REOPEN **PASS** ve temizliği bağımsız doğrulandı; P2-E **editör iş akışı mock sözleşmesi 11/11 PASS**, PR #33 yalnızca P2 feature dalına birleştirildi. **Gerçek tarayıcı editör onayı, ücret tahakkuku ve Production release henüz kabul edilmedi.**

## Yetkili okuma sırası

1. Bu dosya: `docs/AI_HANDOFF.md`.
2. `docs/P2_EDITOR_DECISION_UAT_20261017.md` — P2-E 11 iş akışı/mock testi, editör kapsamı ve onay → ödeme riski.
3. `docs/P2_BROWSER_UAT_20261017.md` — salt-okunur 5 adım ve dört soru türü görsel kontrolü.
4. `docs/AI_ACTIVE_STATE.md` — mimari, branch ve Neon sınırları (bazı erken aşama notları tarihsel olabilir).
5. `docs/P2_HTTP_TIMEOUT_20261017.md` — 6/6 gerçek HTTP-Neon ilk timeout ve nihai PASS.
6. **Yazmalı tarayıcı raporu henüz yalnızca açık PR #32 dalında:** `feat/p2-browser-guarded-write-20261017:docs/P2_BROWSER_WRITE_UAT_20261017.md`. PR #32'nin özelliği P2 ana geliştirme dalında **yok**.

## Kod ve iş akışı

- GitHub `saliharici/prolig` — aktif feature `feat/p2-professional-question-editor-20261012` son code SHA `5a01c1efade11ffaffcb4125aa46c4c3f8a300a3` (PR #33 squash). Doküman merge sonrasında SHA değişir; yeniden sorgula.
- **PR #32 AÇIK / MERGE YOK:** `feat/p2-browser-guarded-write-20261017`, SHA `711014cc2477987fd896248f0054e13ee6703c32`; önceden merge aracı platform güvenlik kontrolüyle engellendi, korumayı aşmaya çalışma. 11. saat başka branch'e kaçak taşıma veya main merge yok.
- **PR #33 MERGED yalnızca feature:** `test/p2-editor-decision-contract-20261017`, yeni dosya `tests/p2-editor-decision-contract.test.ts`; GitHub CI lint/test/build/navigation PASS; **11/11** senaryo mock Prisma+session+compensation ile iş akışı API handler'ını sınadı. Belge `docs/P2_EDITOR_DECISION_UAT_20261017.md`.
- Kullanıcının ana Windows dizini `D:\Proje\pro-lig` üzerinde **kaydedilmemiş logo ve diğer değişiklikler var**, dokunma. Ayrı test worktree `D:\Proje\pro-lig-p2-acceptance`, son kullanıcının çalıştığı detached branch SHA `d7afb11` (PR #32 test runner sürümü); özel `.env.p2-acceptance.local` kimseye aktarılmamalı. Kullanıcıdan tüm çalışmaları sıfırdan başlatmasını isteme.

## Gerçek P2 kabul sonuçları

- **HTTP API/Neon:** 17 Ekim, Vitest 6/6 PASS, gerçek localhost API↔izole Neon; 4 seçenek D, 5 seçenek E, Doğru/Yanlış, Açık uçlu, yetki ve eski PATCH koruması. CI gerçek Neon'u test etmiyor, kullanıcının ortamında koşuldu.
- **Yazar görsel:** Beş aşama, 10. sınıfta A–E, Doğru/Yanlış, Açık Uçlu model cevap/rubrik/ölçüt; editör karar menüsü ekranda. PR #31 branş açıklaması düzeltmesi PASS; yazarın Genel Soru Havuzu branşı Matematik görünüyor.
- **Yazar gerçek tarayıcı kalıcılık:** P2 acceptance Neon'da `P2-UAT-BROWSER-20261017` işaretli `#92`, `PILOT-MAT-8-001` / 8. sınıf / pilot yazar, A=10 B=11 C=12 D=13 doğru C; CREATE/REOPEN/PATCH/REOPEN PASS. Kullanıcı açık onayla `scripts/p2-browser-acceptance-cleanup.mjs --question-id 92 --apply` çalıştırdı: #92 + 2 audit log temizlendi; iki izin değişkeni silindi.
- **Bağımsız son Neon salt-okunur denetim:** main `br-soft-salad-b2vb8sdr` ve acceptance `br-quiet-tree-b2ganqkl`, proje `calm-band-45633698`, database `neondb`; iki dalda da 5'er orijinal Question, `#92=0`, `P2-UAT-BROWSER-20261017%=0`, diğer eski P2 test markerları 0, #92 Asset/Compensation/Audit=0, Question digest **`a34adf9c66590a5f7802a1dc8eebbe91`** iki dalda aynı. Eski kabul dalı `ActivityLog #529` tek tarihi kayıt olarak korunuyor (main yok); bu kaydı ayrı onay olmadan silme.
- **P2-E yeni mock-only test:** 11/11 PASS; author submit, editor revision/note/resubmit, reject, approve => `accrueQuestionApproval` çağrısı, yetkisiz ve yanlış branş/il/sınıf, not sınırı, eksik typed cevap, arşivli/tekrarlı karar. **Bu gerçek editör kararının Neon'a yazıldığı veya telifin üretildiği anlamına gelmiyor.**

## P2-E editör tarayıcı görsel kabulü — 17 Ekim 2026

- Kullanıcı, `node scripts/p2-browser-acceptance.mjs --serve` ile açtığı izole tarayıcı önizlemesinde pilot **EDITOR** rolünün inceleme penceresini ve **Onayla / Revizyon İste / Reddet** ile editör notu gösterimini **PASS** olarak bildirdi. Bu **kullanıcı teyitli SALT-OKUNUR GÖRSEL PASS** sonucudur; karar kaydedilmedi, soru durumu değişmedi, ücret tahakkuku yapılmadı.
- Mevcut `scripts/p2-browser-acceptance-app.ts` (açık PR #32 dalı) `--serve` modunda **tüm yazmaları**, `--serve-write` modunda **workflow /submit /request_revision /reject /approve dahil tüm kararları** bilerek engelliyor. Bu nedenle mevcut tarayıcıda gerçek revizyon döngüsü *henüz test edilemez*; kullanıcıdan `Kararı Kaydet` basmasını isteme.
- Sıradaki kontrollü kabul **YAZAR TASLAK → INCELEMEDE → EDITOR REVIZYON → YAZAR REVIZYON → INCELEMEDE** (varsa son durumda INCELEMEDE) olmalı. Yalnızca yeni, özel işaretli sentetik 8. sınıf Matematik sorusu; tam sahiplik/proje/branch kontrolü, istisnasız `approve`/telif/ödeme engeli, ayrı yazma onayı, ayrı temizlik onayı, canlı DB öncesi mock test ve bağımsız son snapshot doğrulaması.
- **Temizlik kritik:** Mevcut `p2-browser-acceptance-cleanup.mjs` yalnızca `TASLAK` sentetik #92 benzeri kaydı siliyor; workflow sonrası `REVIZYON` veya `INCELEMEDE` soruyu **temizlemez**. Yeni test yazılmadan önce, yalnızca yeni revizyon test işaretine bağlı, son durumları doğru doğrulayan, medya/telif/ödeme 0 zorunlu kontrolü ve tek-ID atomik temizlik mekanizması ayrı kod incelemesine tabi tutulmalı. Mevcut PR #32 koruma kapsamını atlatacak alternatif merge/push/araç kullanılmamalı.
- Önceki 5 gerçek sorudan **hiçbirinde** workflow başlatma; eski izole `ActivityLog #529` silinmeyecek. `main`, Neon main ve Production korunacak.

## Güvenlik / sıradaki aşama

- **Asla** GitHub `main`, Vercel Production, Neon main, kullanıcı logosu veya `.env` değiştirme; genel kullanıcı tablolarında yazma/DELETE yok. Şifre, JWT, bağlantı URL'si isteme.
- **P2-E editör salt-okunur ekranı PASS (kullanıcı teyidi)**. Sıradaki hedef yalnızca yeni sentetik soru ile kontrollü yazar → editör revizyon döngüsü; ancak mevcut `--serve` ve `--serve-write` workflow'u engeller, test altyapısı ve status-aware cleanup ayrıca tasarlanmalıdır.
- **Onay/telif riski:** `approve` işleyicisi transaction içinde `CompensationEntry` ve ActivityLog üretebiliyor. Mevcut 5 soruda editör onayı DENEME; ödeme / telif doğuran çağrılar için ayrıca izolasyon ve açık onay olmadan yazma yetkisi verme.
- PR #32'nin açık kalmasını ve eski güvenlik merge engelini aşmaya çalışma. PR #33 test başarısı bu kuralı değiştirmiyor.

**Bir sonraki en mantıklı adım:** Yeni, bağımsız işaretli yapay soruya özgü, **approve/ödeme tamamen kapalı** yazar → editör revizyon döngüsünün guarded tarayıcı ve status-aware tek-ID cleanup tasarımını mock testlerle doğrula; gerçek Neon yazmaları için ayrı açık izin al. Production için ayrıca kullanıcı izni gerekir.
