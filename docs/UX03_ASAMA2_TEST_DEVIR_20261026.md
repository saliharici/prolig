# PRO-LIG — Aşama 2 / UX-03 TEST devir ve kabul emri
**Tarih:** 26.10.2026 · **Gönderen:** 03 MİMARİ · **Alıcı:** 01 TEST · **Production sahibi:** 02 CANLI · **Karar:** TEST'E GEÇİŞ SERBEST, PRODUCTION NO-GO

## Hedef ve kapsam
**Hedef:** Önceden onaylanmış UX-03 parola sıfırlama + sürümlü JWT oturum geçersizliği entegrasyonunun **güncel main bazındaki PR #113'ünü**, sırf önceki sohbetin kapanması nedeniyle testlerini tekrarlamadan, **yalnız daha önce eksik olduğu kayda giren Preview → izole Neon TEST veritabanı bağlantısıyla** gerçek API kabulüne ulaştırmak.

**GitHub:** `saliharici/prolig`, Production current main `643cc3a524cb54c497cda550980fbc78f999be4d`; TEST [PR #113](https://github.com/saliharici/prolig/pull/113) DRAFT, HEAD `c3fe2b4f87df34753403b372b36a8663974f2df5`, branch `feat/ux03-mainline-integration-isolated-20261025`.  
**Preview:** `dpl_4LdtNxPE1Q2nj9u2oPKeBHsBFHDx`, READY.  
**İzole Neon TEST projesi:** `lucky-pond-26462894`, TEST parent `br-autumn-bread-bavbkz51` / `ux02-test-only`, DB `ux02_test`. UX-03 daha önce test edilmiş child `br-sweet-cherry-bahq4egt` ve disposable Prisma kabul child `br-blue-tree-bat6ig8c` korunur; **bunlara kör migration çalıştırma**. Vercel PR #113 Preview branch filtrelemesinde `DATABASE_URL` branch-scoped env kanıtı bulunmadı (**0 kayıt**); dolayısıyla deployed gerçek Neon/API UAT PASS değildir.

## Korunacak PASS kanıtı — yeniden çalıştırma
- TEST operatör #107 **CLOSED PASS**: seçici additive Prisma UX-03 migration ve P3'ü atlama, 8/8 negatif güvenlik, şifre sıfırlama/form akışları tarihî kullanıcı PASS.
- PR #113 HEAD GitHub [CI run 40136532634](https://github.com/saliharici/prolig/actions/runs/40136532634) **SUCCESS, 875/875 test, 123/123 dosya, lint/build/navigation PASS**.
- UX-03 odaklı [workflow 40136529085](https://github.com/saliharici/prolig/actions/runs/40136529085) **12/12 PASS**.
- Ephemeral PG CI P2 `40136532608` ve Publishing V2 `40136532596` **SUCCESS**.
- Vercel Preview READY, ancak API gerçek test DB E2E PASS değildir. Kayıtları karıştırma.

## 01 TEST — sıradaki tek iş paketi
1. PR #113 HEAD ve Preview deployment SHA'nın birebir eşliğini kilitle; Vercel TEST Preview branch'ine özel env kapsamını meta düzeyinde kontrol et. **Production scope'a dokunma.**
2. Aynı izole TEST Neon projesinden **yalnız UX-03'ün mevcut şemasını taşıyan uyumlu disposable TEST child** seç veya gerekiyorsa oluştur; source parent/test child hesap kimliğini doğrula. Kimliği/rolü belirsiz veya Production DB'ye bağlı durumda **FAIL-CLOSED**. Eski kabul dalına istemeden yazma ve P3 özel PNG Preview ortamını bu işe bağlama.
3. Kullanılan DB'de, PR #113'ün UX-03 gerektirdiği `User.authVersion`, `PasswordResetToken`, `PasswordResetRate` yapısının ve seçici migration ledger'ının varlığını salt okunur kanıtla. Zaten kanıtlı şemaya gereksiz migration tekrar etme.
4. Vercel'de yalnız bu TEST PR branch'ine özel, maskeli/gizli `DATABASE_URL` ve zorunlu TEST auth/env bağımlılıklarını bağla. Neon connection secret, APP secret, mail/provider anahtarını GitHub/ChatGPT/log'a yazma. Production env/secrets hiç değiştirme; izole Preview güvenlik başlıklarını kapatma.
5. **Yalnız eksik gerçek Preview yolunu** kontrol et: login → session `v=authVersion` eşleşmesi, legacy JWT 401, doğru rol/me smoke, recovery default OFF ve uygun response. E-posta teslimini aynı #107 testlerine tekrar sokma; recovery mail gerçek açılışı ayrı iş/izin gerektirir.
6. Kapanış raporu: PR/Preview TEST branch SHA + Neon TEST branch/database kimliği, temel API statü kodları, mevcut CI PASS'lere bağlantılar, yeni E2E PASS/FAIL, Production'a etki 0. Kullanıcıya birden çok PowerShell komutu verme.

## 03 MİMARİ + 02 CANLI sınırı
GO-0'nun **mimari karar dokümanları hazır**, Production rollback/kurtarma koşullarının bütünü **henüz operatör PASS değil**: şifreli yedek/restore kullanıcı PASS, JSON-Neon 12/12 araç PASS, ikinci kopya ve parola operatör PASS; ancak ikinci kopya hash eşitliği, günlük güvenilir RPO, gerçek RTO ve Storage/env restore sınırları eksik. Bu, Aşama 2 **izole TEST çalışmasına engel değil**, Production UX-03 `main` merge, schema migration, env/secret veya deploy için **kesin NO-GO**.

**ADR-005 değişmezleri:** recovery OFF olsa da sürümlü JWT doğrulaması ON; ilk geçişte eski JWT'ler 401 ve kullanıcı yeniden giriş yapar; gerçek `authVersion>0` oluşunca eski kontrolsüz SHA'ya geri dönülmez. Production root `prisma migrate deploy` P3 migration'ı da tetikleyebilir, bu yüzden yasak. Production schema-only UX-03 migrasyon ve ardından release, somut hedef+rollback ve **ayrı açık kullanıcı onayı** gerektirir.

**Sorumluluk:** 01 TEST gerçek Preview DB kabulünü tamamlar → 03 MİMARİ delil/kabul matrisi → 02 CANLI yalnız ayrıca izinle üretim iş emri. DRAFT #113 main'e birleştirilmez; TEST ve Production Neon projeleri karıştırılmaz.
