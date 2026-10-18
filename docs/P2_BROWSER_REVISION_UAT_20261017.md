# P2-E — İzole tarayıcı yazar–editör revizyon kabulü: PASS (18.10.2026)

## Tamamlanan kabul ve temizlik

- Kullanıcı, yerel pilot YAZAR / EDİTÖR tarayıcısında sunucu işaretli **#93** yapay sorunun oluşturulmasını, `TASLAK → INCELEMEDE → REVIZYON → INCELEMEDE` durumlarını, editörün gerekçeli revizyon talebini ve düzeltilmiş çözümün editörde görünmesini **PASS** bildirdi.
- Tek kimlikli `scripts/p2-browser-revision-cleanup.mjs --question-id 93` salt-okunur DRY-RUN: **PASS** — 5 audit, sıfır medya/muhasebe, son durum INCELEMEDE.
- Ayrı kullanıcı onayıyla `--apply`: **REVISION CLEANUP PASS** — yalnız #93 ve ona ait 5 `ActivityLog` silindi; script kendi son durum kontrolünü yaptı.
- Bağımsız Neon kabul dalı **salt-okunur** doğrulama: `originals=5`, `synthetic=0`, `audit=0`, `assets=0`, `compensation=0`, `historical=1`; **FINAL READ-ONLY CHECK: PASS**. Eski `ActivityLog #529` korundu.
- Bu kabul yalnızca **izole test dalı** içindir. Özgün soru içerikleri için yeni bir main↔acceptance digest karşılaştırması yapılmadı. Canlı editör ONAYLA/REDDET, ücret/telif, ana Neon, gerçek kullanıcı giriş akışı ve Production kapsam dışıdır.
- PR #32, güvenlik kod incelemesi ve PASS CI ardından 18 Ekim'de **yalnızca P2 geliştirme dalına** birleştirildi (`d65e739`). PR #36 da o hedefe yönlendirildi; `main` ve Production'a dokunulmadı.

## Önceki kabul planı (tarihsel notlar)

Aşağıdaki plan ilk hazırlık aşamasında yazılmıştır. İçindeki “henüz PASS değil”, “PR #32 açık” ve “önceki PR #36 hedefi” ifadeleri yukarıdaki **tamamlanan kabul kaydından önceki durumu** anlatır.

## Kapsam

Kullanıcı 17 Ekim 2026'da salt-okunur pilot EDİTÖR arayüzündeki Onayla / Revizyon İste / Reddet ve not alanını PASS bildirdi. P2-E iş akışı işleyici mock testleri 11/11 PASS ve PR #33 yalnızca P2 feature dalına alındı. Yeni çalışma **PR #32 açık browser guarded-write altyapısının ÜZERİNDE, ona hedeflenen ayrı alt PR'dır**. Önceki PR #32 merge güvenlik engeli aşılmayacak.

Yeni `--serve-revision` modu, önizlemeyi **yalnızca localhost** adresinde ve **yalnızca `br-quiet-tree-b2ganqkl` Neon izole dalında** çalıştırabilir. Ayrı, geçici bir `PROLIG_P2_BROWSER_REVISION_APPROVAL` gerekir. Kod ve CI onayı **canlı veritabanı yazma izni değildir**.

## İzinli operasyon ve durum matrisi

| Rol | Durum | Eylem | Beklenen |
| --- | --- | --- | --- |
| pilot.yazar | yeni test `TASLAK` | CREATE/PATCH | Yalnızca proje PILOT-MAT-8-001, 8. Sınıf, **4 seçenekli** ve sunucu `P2-UAT-REVISION-20261017` işaretli tek yapay soru |
| pilot.yazar | `TASLAK` | `submit` | `INCELEMEDE` |
| pilot.editor | `INCELEMEDE` | `request_revision`, 1–600 karakter not | `REVIZYON` |
| pilot.yazar | `REVIZYON` | PATCH/yeniden `submit` | `INCELEMEDE` |
| herhangi rol | herhangi durum | `approve`, `reject`, archive, DELETE, ücret/hakediş, kullanıcı değişiklikleri | 403 / DENY |
| roller kapsam dışı; eski 5 soru | herhangi durum | her yazma | 403 / DENY |

İş akışı çağrıları önce yeni saf politika doğrulamasından, sonra **mevcut gerçek handler** ile yetki ve typed cevap kontrollerinden geçer. Gerekli branch/il/sınıf kapsamı `canWorkflowReview` üzerinden uygulanır. Sağlam ön koşul: her adımda aynı yapay işaret, belirlenmiş proje/yazar, tamamlanmış dört seçenek ve **sıfır medya**.

## Güvenli tek-ID temizlik

Ayrı `scripts/p2-browser-revision-cleanup.mjs --question-id <ID>` komutu varsayılan **salt-okunur DRY-RUN**. Temizlik için **yeni ve bağımsız** `PROLIG_P2_BROWSER_REVISION_CLEANUP_APPROVAL` onayı ve `--apply` gerekir; uygulama ayrı sorulduğunda verilecek. `TASLAK`, `REVIZYON` veya `INCELEMEDE` test statüsünde tam eşleşmiş tek soru; pilot yazar/proje/grade/marker; audit allowlist [`QUESTION_CREATED`, `QUESTION_UPDATED`, `QUESTION_SUBMITTED`, `QUESTION_REVISION_REQUESTED`]; **sıfır QuestionAsset ve CompensationEntry** (questionId / sourceKey), transaction-scoped conditional DELETE. Audit allowlist dışında kayıt varsa **TEMİZLİĞİ DURDUR**; başka veri ya da audit temizleme. Eski tarihsel `ActivityLog #529` korunmalı.

## Çalıştırma kontrol kapıları

1. GitHub CI: lint, unit, build, navigation PASS; yeni P2 revizyon politika testleri PASS.
2. `git status` temiz ve izolasyon kanıtı, branch ve dosya hash doğrulaması.
3. Salt-okunur `node scripts/p2-browser-acceptance.mjs --preflight` PASS.
4. Ana Neon ve izole Neon orijinal soru snapshot'ları eşit; sentetik revizyon işareti **0**.
5. **Kullanıcıya sınırlar açıkça gösterildikten sonra onayla** ve yalnızca `--serve-revision` başlat.
6. Pilot YAZAR yeni sentetik soruyu oluşturup kaydeder; yalnız #ID ve görsel PASS/FAIL paylaşılır.
7. YAZAR Submit → EDİTÖR Request Revision (not zorunlu) → YAZAR PATCH → Submit, arada bağımız Neon sorgularıyla doğrula; hiçbir aşamada APPROVE veya REJECT kullanma.
8. Tarayıcı sunucusu Ctrl+C ile kapatılır; kullanıcı DRY-RUN temizliği çalıştırır; soru kimliği, ilişki, audit/muhasebe kontrol edilir.
9. **Ayrı temizlik izni** alınıp `--apply`; bağımsız Neon salt-okunur son karşılaştırma: 5+5 özgün soru, sıfır yeni marker, sıfır soru/audit/media/telif kalıntısı, ana dal digest değişmemiş.
10. Hem sunucu yazma hem temizleme geçici izin değişkenlerini PowerShell'de sil.

## Kullanıcıdan uzak tutulacak işlemler

- `git merge` / `git clean` / `git reset --hard`, ana `D:\Proje\pro-lig` marka varlıkları, Neon main, Vercel Production, gerçek giriş parolaları veya database URL paylaşımı.
- Daha önce güvenlik kontrolüne takılan PR #32'yi atlamak için ikinci bir `feat/p2-professional-question-editor-20261012` PR merge'i oluşturma; alt PR'nın **hedefi doğrudan açık PR #32 feature branch'i**.
- Test edilmemiş `--serve-revision` kullanımını / canlı sonuçları şimdiden PASS ilan etme.
