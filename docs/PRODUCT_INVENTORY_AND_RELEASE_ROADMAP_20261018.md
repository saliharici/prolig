# PRO-LIG — Ürün envanteri, açık işler ve yayın yol haritası
**Tarih:** 18 Ekim 2026 · **İnceleme kapsamı:** `saliharici/prolig` GitHub kaynak kodu, açık PR'lar, otomatik testlerin son başarılı sonucu ve P2 kabul belgeleri. **Neon'da bu envanter için yeni sorgu/yazma veya Vercel deploy yapılmadı.**

## 1. Kaynak sürüm ve karar

- İncelenen **aktif geliştirme dalı:** `feat/p2-professional-question-editor-20261012`; inceleme anındaki HEAD: `556a6a34b90f9543d232284df26fd1011d17d6c1` (PR #41 squash).
- GitHub **main** inceleme anındaki HEAD: `e4e8eb641c742303768b3484298d9c78dc130c2d`. Aynı sürüm **DEĞİL**. `vercel.json` içindeki `git.deploymentEnabled["feat/p2-professional-question-editor-20261012"] = false`; bu dalın Production'a yayımlandığı iddia edilemez.
- Son ilgili otomatik CI (PR #41; run `39069687848`): **lint, unit/contract, build, navigation PASS**. Bu sonuç canlı Production veritabanında tam uçtan uca kabul demek değildir.
- `README.md` hâlâ geçmiş **statik/demonstrasyon** modelini ve `npm run dev` akışını anlatıyor; kanonik `src/main.tsx → src/auth/AuthGate.tsx → src/DemoApp.tsx` ve `api/v1/*` işlevleri ile güncellenmeli. Eski `src/App.tsx`, `legacy/*`, `temp_restore/*`, `server.ts` aktif üretim mimarisi değildir.
- Temel ürün modeli: **tek yayın organizasyonuna yönelik** 6 rol, React/Vite/TypeScript, Vercel API, Prisma 7, Neon PostgreSQL. Kullanıcının ayrıca planladığı doktora araştırma platformu **ayrı sistemdir**; bu envanter onun veritabanıyla veya hesaplarıyla ilgili değildir.

**Durum kodları:** **K** = aktif dalda kodu var, otomatik kontrolleri mevcut; **S** = kısmi / uçtan uca ya da yayın öncesi doğrulaması eksik; **Y** = talep veya geleceğe dönük hedef, aktif üründe tamamlandığı kanıtlanmadı. Bunlar yüzde veya Production kullanımı beyanı değildir.

## 2. Kanıta dayalı modül envanteri

| # | Modül | Durum | Kaynak ve bugün eldeki kanıt | Açık iş / teslim ölçütü |
|---|---|---|---|---|
| 1 | Kurumsal açılış ve giriş | **K/S** | `src/public/PublicLanding.tsx`, `src/auth/AuthGate.tsx`, `api/v1/auth/*`, `tests/frontend-auth.test.ts`, `tests/auth.test.ts` | Tasarım PR #18/#19 ile yayın stratejisini netleştir; oturum süresi/güvenlik, parola kurtarma ve barındırılan ortam kabulü |
| 2 | Üyelik başvurusu / üye yönetimi | **K/S** | `src/membership/*`, `api/v1/management.ts`, `tests/member-access.test.ts` | Rol, il, ilçe, branş ve hiyerarşiyle az sayıda yetki odaklı entegrasyon kabulü; davet/şifre kurtarma yaşam döngüsünü netleştir |
| 3 | Roller ve coğrafi/branş yetkisi | **K/S** | 6 kanonik rol; `src/demo/model.ts`, `api/v1/_lib/*-access.ts`, yetki regresyon testleri | Ekran görünürlüğü + API işlem yetkisi + veri kapsamını tek matriste sürümle; özelleştirilebilir müşteri rol tasarımını **Süper Admin** ile karıştırma |
| 4 | Yazar Ağı / profil | **K/S** | `src/authors/*`, `src/profile/ProfileModal.tsx`, `api/v1/authors/*`, profil/yazar testleri | Gerçek kullanıcı/kurum veri kalitesi, özel alanlar ve il sınırı kabulü |
| 5 | Proje oluşturma, atama, durum ve arşiv | **K/S** | `src/projects/ProjectManagementModal.tsx`, `api/v1/projects/*`, `tests/project-*.test.ts` | Gerçek kurum ölçeğinde yaşam döngüsü ve yetki kabulü; tamamlanan projeden telife geçişi ayrıca doğrula |
| 6 | Görev takibi | **K/S** | `src/tasks/TaskTracking.tsx`, `api/v1/_lib/task-handler.ts`, task testleri | Atama, süresi geçen görev ve çoklu rol/sorumlu senaryolarında hedefli kabul |
| 7 | Kurumsal mesajlar | **K/S** | `src/messages/*`, `api/v1/_lib/message-handler.ts`, ilgili testler | Bildirim/takip ihtiyacını ve teslim/okundu tutarlılığını kullanıcı ihtiyacına göre kararlaştır |
| 8 | Duyurular | **K/S** | `src/announcements/*`, `api/v1/_lib/announcement-handler.ts`, ilgili testler | Hedef kitle ve arşiv yetki kabulü; gerçek bildirim dağıtımı ayrı kapsam |
| 9 | Profesyonel Soru Stüdyosu P2 | **K/S** | 4/5 seçenek, doğru/yanlış, açık uçlu, TipTap/önizleme; `src/questions/*`, `api/v1/questions/*`, P2 kontrat ve gerçek localhost HTTP→izole Neon **6/6 PASS** | `VITE_QUESTION_STUDIO_P2_EDITOR`, `VITE_QUESTION_STUDIO_P2_TYPES`, `PROLIG_QUESTION_TYPES_P2` bayraklarını sürüm tablosuyla tanımla; hostingde sınırlı kabul |
| 10 | Yazar gerçek tarayıcı taslak kalıcılığı | **S** | 17.10.2026: bağımsız izole Neon'da sentetik #92 CREATE→REOPEN→PATCH→REOPEN **PASS**, kontrollü temizlik doğrulandı | Bu korumalı tarayıcı altyapısı **açık PR #32** dalında; ana P2 feature'a birleştirilmiş değil; güvenlik engeli atlanmadan çözüm |
| 11 | Editör kararı / revizyon / ret / onay | **S** | `api/v1/questions/[id]/workflow.ts`; mock editör sözleşme testleri **11/11 PASS**; editör inceleme penceresi **kullanıcı görsel PASS** | Gerçek tarayıcıda YAZAR→EDITOR→REVİZYON→yeniden gönderim **henüz PASS değil**; `approve` maddi tahakkuk yaratabilir. PR #36, PR #32 üzerinde **taslak** |
| 12 | Soru medya varlıkları ve arşiv | **K/S** | `QuestionAsset`, `src/questions/media.ts`, soru varlık/archival mantığı, sorular API | Link/URL ve medya ilişkilendirme var; **sunucuya gerçek dosya upload + depolama + tarama** ayrı gereksinim. Arşiv geri alma ve telif etkileri sınırlı kabul ister |
| 13 | Telif ve ücret tarifeleri | **K/S** | `src/compensation/CompensationRulesPanel.tsx`, `api/v1/_lib/compensation-engine.ts`, `docs/compensation-engine.md` | Genel Koordinatör ücret politikası, sürümlü fiyat ve eksik fiyat olaylarının uçtan uca kabulü; eski tahakkukların değişmemesi |
| 14 | Hakediş ve ödeme dönemleri / mutabakat | **K/S** | `src/compensation/CompensationEntriesPanel.tsx`, `PaymentPeriodsPanel.tsx`, `api/v1/_lib/payment-*.ts`, `docs/compensation-phase2.md` | İzole yerel ödeme dönemi/mutabakat kabulü belgeli; **native çoklu bağlantılı PostgreSQL eşzamanlılık** ve hosted uçtan uca mali kabul tamamlanmadan Production ödeme başlatma |
| 15 | Raporlar / Proje Üretim / Yazar Performansı | **K/S** | PR #37–#40 geliştirildi, `src/reports/*`, `src/projects/ProjectProductionOverview.tsx`, `ProjectAuthorPerformancePanel.tsx` | Gerçek rol kapsamlı kayıtlarla doğruluk / filtre toplamı / CSV + finans alanı gizleme kabulü. **Tahakkuk ve ödeme tutarı birbiriyle toplanmaz** |
| 16 | Genel Koordinatör Üretim ve Yönetim Paneli | **K/S** | PR #41, `src/overview/*`, geciken proje, editör kuyruğu, yazar üretimi, ödenmemiş tahakkuk; son CI PASS | Barındırılmış ortam ve veri eksikliği/hata durumları; gösterimdeki kaydın gerçekten güncel ve scope içinde olması |
| 17 | İşlem geçmişi / denetim izleri | **K/S** | `api/v1/management.ts?action=auditLogs`, `src/audit/*`, testler | Ana sayfadaki bazı **`data.activities`** kayıtları hâlâ **localStorage demo** kaynağından geliyor; bunları gerçek ActivityLog ile karıştırma. İşlem geçmişinde tek gerçek veri kaynağı kararı |
| 18 | Üretim için soru kitabı / Word–PDF dışa aktarım | **Y** | `prisma/schema.prisma` içinde `Book` modeli var; etkin dizgi/export modülü tespit edilmedi | Onaylı sorulardan kitap/ünite, cevap anahtarı, görsel/formül, Word+matbaa PDF, telif ilişkisi |
| 19 | Çok şirketli yapı / Süper Admin | **Y** | Kanonik altı rol ve tek-ürün veri modeli; tenant/şirket izolasyonu ve tenant provisioning akışı tespit edilmedi | Ayrı bir faz: tenant veritabanı kapsamı, roller, şirket kurulumu, logo/tema, ücret tarifesi, güvenlik, tenant migrasyon/testleri |
| 20 | Üretken yapay zekâ iş akışı | **Y/S** | `@google/genai` bağımlılığı ve eski `legacy/api/ai/*` izleri var; etkin `api/v1/ai` servisi saptanmadı | Kullanım amacı, KVKK/izin politikası, model-kota, kalite doğrulaması, tutarlı eğitimsel çıktı sözleşmesi belirlenmeden “hazır” denmez |
| 21 | Production yayın ve işletim | **Y/S** | CI PASS ve Vercel route dosyası var; P2 dalı için deploy açık değil; `main` farklı | Staging, migration planı, yedek/geri dönüş, env & secrets, operasyon izleme, yayın öncesi rol/mali güvenlik kapısı |

## 3. Tamamlanan kabulün gerçek sınırı

**Doğrulanmış:** P2 için 17 Ekim'de gerçek **localhost HTTP + izole Neon 6/6**; pilot YAZAR'ın gerçek tarayıcıda sentetik soru oluşturma/yeniden açma/düzenleme ve temizliği; pilot EDITOR modalının **yalnızca salt-okunur görsel PASS** sonucu; PR #33 mock workflow testleri **11/11 PASS**. PR #37–#41 CI lint/unit/build/navigation PASS ve **yalnızca P2 feature** dalına squash-merge. GitHub son ilgili CI #41: https://github.com/saliharici/prolig/actions/runs/39069687848 .

**Doğrulanmamış:** gerçek tarayıcıda editörün durum değiştirmesi, onayın gerçek muhasebe tahakkukuna uçtan uca etkisi, Production migration/deploy, büyük veri ölçeği ve çok kullanıcılı native DB finans rekabeti. Otomatik birim testi bu boşlukların yerine geçmez.

**Açık PR'lar (18.10.2026):** #32 güvenlik kontrolü nedeniyle açık ve merge edilmedi; #36 bunun dalını hedefleyen bağımlı taslak, merge edilmedi; #18 sunum konsepti ve #19 kurumsal bordo tema `main`a açılmış **taslak** PR'lar, Production/marka kararı değildir. PR #15 değil **GitHub Issue #15** P2 zengin soru editörü kapsam başlığı olarak açık.

## 4. Öncelikli eksik işler ve bitiş kriterleri

| Öncelik | İş paketi | Bitiş koşulu | Tür |
|---|---|---|---|
| **P0-01** | Release kapsamı ve sürüm/feature-flag matrisi | Kanonik P2 modları açıkça seçilmiş; tüm roller için aynı sürüm, gizli pilot testi Production'da kapalı; `main` ve Vercel değişiklikleri ayrı yayın onayına bağlı | Ürün / altyapı |
| **P0-02** | Kritik iş akışı son kabulü | **Yeni sentetik** soruda yazar→editör→revizyon döngüsünü izole Neon'da, durum/yetki ve kesin temizlik planıyla bir kez doğrula; onay/tahakkuk testi ancak ayrıca açık güvenli planla | Güvenlik / doğrulama |
| **P0-03** | Finansal mutabakat ve eşzamanlılık | Native PostgreSQL çoklu bağlantı ve tüm ödeme dönemi değişmezleri PASS; iptal/yeniden hazırlama, tekrar ödeme, idempotency, audit ve toplam kontrolü | Muhasebe / güvenlik |
| **P0-04** | Gerçek veri – demo ayrımı | Ana sayfada örnek Activity ve finans izleri gerçek kayıtlardan açıkça ayrılmış veya kaldırılmış; üretim raporları yalnız yetkili sunucu verisine dayanıyor | Veri güvenilirliği |
| **P0-05** | Yayın/runbook ve eski belgelerin düzeltilmesi | `README.md`, `AI_HANDOFF.md`, `AI_ACTIVE_STATE.md` yeni HEAD ve gerçek mimariyi gösteriyor; yedek/restore, tek staging, rollback ve gözlem planı hazır | Operasyon |
| **P1-01** | Kurum içi gerçek kullanıcı pilotu | Az sayıda yetkili hesap için rol-geografi/üyelik/proje/görev/mesaj/duyuru ve rapor senaryoları tek kabul listesinde | Ürün kabulü |
| **P1-02** | Soru kitabı Word/PDF dizgisi | Onaylı sorudan bölüm/kitap düzeni, telifli yazar bilgileri, yanıt anahtarı ve görsel/formül uyumu | Yayıncılık |
| **P1-03** | Medya dosya depolama | URL ile ilişkilendirmenin ötesinde kontrollü upload, boyut/tür kontrolü, izin ve lifecycle | Yayıncılık / altyapı |
| **P1-04** | Kurumsal tasarım kararı | PR #18/#19 ile çatışmayan tek tema/logo, mobil ve erişilebilirlik onayı; kullanıcı yerel logo dosyalarına dokunma | Tasarım |
| **P2-01** | Şirketler için Süper Admin / multi-tenancy | Her tenant için veri/satır kapsamı, hesap açılışı, şirket bilgileri ve bağımsızlık, migration ve temalı uygulama planı onaylanmış | Yeni mimari |
| **P2-02** | Yapay zekâ servisleri | Eğitimsel geçerlilik, gizlilik, kota, maliyet ve insan editör denetimi ile somut ürün akışı | Ayrı ürün fazı |

**Not:** P0 birimleri onlarca tekrar manuel teste dönüştürülmeyecek. Her kritik risk için **bir** sınırlı ve kanıta dayalı kabul senaryosu; rutin regresyonu CI yapacak.

## 5. Önerilen uygulama sırası

1. **En değerli ilk sprint:** `P0-01 + P0-04 + P0-05`: Yeni modül eklemeden ürünün **tek gerçek sürüm ve veri kaynağı** sorunlarını düzelt. Ürün görünümünde örnek hareket/gerçek hareket ayrımını kaldır; release planı ve bayrak tablosu oluştur. Bütün işlemler feature PR ve CI üzerinden.
2. **İkinci sprint:** `P0-02 + P0-03`: Yalnız kritik veri değiştiren akışların bir defalık izole kabulü. PR #32 üzerindeki merge güvenlik kontrolünü **atlama**; PR #36'yı üretime veya P2 feature'a doğrudan taşımadan bağımlılığını çöz.
3. **Üçüncü sprint:** staging + gerçek kullanıcılı küçük pilot + Production için **ayrı, açık kullanıcı onayı**. Veritabanı migration, finansal onay/ödeme, Vercel deploy ve `main` birleştirme bu envanter kapsamındaki izin değildir.
4. Pilot kararlı olunca Word/PDF yayıncılık ve medya; çok şirketli Süper Admin mimarisi ancak ayrı güvenlik ve veri izolasyonu tasarımıyla ele alınır.

## 6. Değiştirilmeyecek güvenli sınırlar

- `D:\Proje\pro-lig` yerel çalışma dizinindeki tamamlanmamış logo/tema düzenlemelerine dokunulmaz.
- Neon `main` ve bağımsız `p2-acceptance` dallarındaki orijinal 5 soru korunur; bu rapor için **hiçbir veritabanı yazma işlemi yapılmaz**. Geçmiş `ActivityLog #529` değiştirilmez.
- Açık PR #32 / #36 güvenlik sınırları korunur. User approval olmadan `main`, Production, veritabanı migration/seed, onay/ödeme/doğrudan finans etkisi **yok**.
- Doktora için planlanan bağımsız platformun Google/GitHub/Vercel/DB hesapları PRO-LIG ile birleştirilmez.

## 7. Hızlı kaynak haritası

- Kanonik mimari: `docs/CANONICAL_ARCHITECTURE.md`
- İş ve yetki sözleşmesi: `docs/AI_PROJECT_CONTEXT.md`
- P2 gerçek kabul ve sınırları: `docs/AI_HANDOFF.md`, `docs/P2_EDITOR_DECISION_UAT_20261017.md`
- Muhasebe/telif: `docs/compensation-engine.md`, `docs/compensation-phase2.md`
- PR #37 finans raporlaması, #38 proje üretimi, #39 yazar performansı, #40 karşılaştırma raporları, #41 Genel Koordinatör paneli (**P2 feature'a birleşti**)
- `prisma/schema.prisma`, `api/v1/*`, `src/DemoApp.tsx`, `src/reports/*`, `src/overview/*`
