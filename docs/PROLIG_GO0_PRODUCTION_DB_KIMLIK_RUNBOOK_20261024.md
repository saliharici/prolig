# GO-0 | Production DB kimliği ve güvenli müdahale operasyon dosyası
**Tarih:** 24.10.2026 · **Kapsam:** Adım 1 / salt-okunur kanıt ve ayrıca onaylı kurtarma kararı · **Sahip:** 02 CANLI · **Durum:** NO-GO
**Kaynak SHA:** `2654872084c4fd3190ab5d6b345a8509f6d89564`
**Production deployment:** `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` (READY, `prolig.vercel.app` alias'ı mevcut)
**Vercel project:** `prj_jXxAOO5pMvKLVq8IXhzGekBNOjho`, team `team_0gsMkfeyJBL8S0OVU69Ux4eZ`.

> **Güvenlik kilidi:** Bu belge Production migration, env yazımı, backup/restore, deploy, merge veya veri silme yetkisi vermez. Kullanıcının genel yetki açıklaması bu işlemlerin hedef/etki/rollback içeren ayrı açık onayı yerine geçmez. Önceki [ADR-005](https://github.com/saliharici/prolig/issues/105) ve [#107 TEST kullanıcı PASS](https://github.com/saliharici/prolig/issues/107) değişmez; test tekrar edilmez.

## 1. Salt-okunur tanı — yeni bulgu
**Vercel takım erişimi kullanıcı tarafından onaylandı; 403 çözülmüş:** `get_deployment`, `filter_project_envs(decrypt=false)`, `list_project_connector_connections`, alias ve hata grupları erişilebilir.

| Kanıt | Tarihli gözlem | Yorum |
|---|---|---|
| Git & Vercel | `main 26548720`, READY deployment + kanonik alias eşleşti | **PASS deployment/alias**, DB kanıtı DEĞİL |
| `api/v1/_lib/prisma.ts` | `const connectionString = process.env.DATABASE_URL;` ve değer yoksa `throw new Error("DATABASE_URL is not configured.")` | Runtime'ın doğru env'e ihtiyacı var; `DIRECT_URL` bu API modülünün fallback'i değil |
| `api/v1/_lib/auth.ts` | `getSecret()` doğrudan `process.env.AUTH_SECRET` okur; değer yoksa hata verir | Production-target **`AUTH_SECRET` kaydı VAR**. Değer şifrelenmiş/maskelenmiş; kullanıcıların oturumlarının kullandığı gerçek değerin değişmediği yeni deployment öncesi korunmalı |
| Vercel env metadata — TAM 96 kayıt filtrelendi | `DATABASE_URL` **VE** `AUTH_SECRET` `target=["production"]` sensitive kayıtları **VAR**; her ikisinin metadata zaman damgaları mevcut READY deploy tarihinden önce. Gerçek değerler Vercel read connector'da `decrypted=false` ve maskelidir | **PASS: Production env anahtarlarının kayıt/target varlığı**. **BİLİNMİYOR:** gerçek URL host/DB ve eski immutable deployment'da uygulanan runtime env. Önceki 'Production anahtarı yok' yorumu, kısaltılmış çıktı üzerinden verildiği için yanlıştı; geri çekildi |
| Vercel connectors | Proje connector kaydı `[]`; marketplace team `neon` + `prisma` kurulumu mevcut ama ilişkilendirilen `projects=[]` | Entegrasyon kurulu olması uygulamanın Production DB kimliğini kanıtlamaz |
| Neon bağlamı | `describe_project` ile `calm-band-45633698` / `prolig-pilot` iki bağlı hesaptan **doğrulandı**; `get_default_branch` ile `br-soft-salad-b2vb8sdr` / `main` **PASS** | Liste araması başka varsayılan organizasyona denk gelmiş. **Doğrudan proje-ID erişimi VAR**; yanlış TEST projesi alternatif olamaz |
| Vercel errors | Node/pg SSL ve URL deprecation uyarı grupları okundu | Tek başına DB MATCH veya outage kanıtı değil; 30 dk current-deployment log grubunda kayıt görülmedi |

**Kesin ayrım:** `Vercel READY` = deployment hazır; `DATABASE_URL` ve `AUTH_SECRET` Production hedefli metadata **VAR**; maskelenmiş değerlerin içeriği ve etkin deployment'daki gerçek URL **BİLİNMİYOR**. Vercel `decrypt=true` çağrısı bile iki sensitive değeri `decrypted=false`/boş placeholder olarak döndürdü; bu **gerçek değerlerin boş olduğu kanıtı DEĞİLDİR**. `MATCH=BİLİNMİYOR`, 'yanlış DB' FAIL değildir.

## 1.1 Production Neon meta/veri kurtarma kapasitesi — aynı gün yeni salt-okunur kanıt
- Bağlı Neon bağlantıları (`Primary` ve `PROLIG Neon`) beklenen `calm-band-45633698` proje ID'si ile `describe_project` çalıştırabildi: `prolig-pilot`, org `org-cold-star-93077958`. Varsayılan org'a göre `list_projects` içinde görünmemiş olması erişimin yokluğu değildir.
- `get_default_branch` / `list_branches` ile **`main / br-soft-salad-b2vb8sdr` primary/default** doğrudan kanıtlandı.
- **9 mevcut Neon dalı**, proje sahibi metadata'sında **`branches_limit=10`**. İzole restore yeni branch oluşturacaksa fiilen sadece 1 branch yuvası görünür; maliyet/branch quota ve restore ortamı planı kayıt altına alınır. Var olan branch'ler otomatik silinmez.
- `list_snapshots`: **1 snapshot**, `snap-polished-mode-b2ebbvhy`, `PROLIG_PRE_P1D_RELEASE_20261011`, oluşturulma `2026-10-11T19:32:49Z`; 24 Ekim için güncel veri kurtarma kabulü değildir.
- `get_snapshot_schedule(main)`: `[]`, kayıtlı zamanlanmış snapshot bulunmadı. Neon point-in-time retention `21600 saniye` (6 saat) metadata'sı görüldü; bu uzun süreli yedek garantisi değildir.
- **YENİ SNAPSHOT OLUŞTURULMADI, RESTORE YAPILMADI, HIÇBIR BRANCH DEĞİŞMEDİ.** İlgili Production işlemi için kimlik kapısından sonra ayrıca somut onay ve rollback gerekir.

## 1.2 GO-0 yalnız yeni deployment için gözlemci TEST kabulü — 25 Ekim 2026
- Main SHA `26548720` bazlı bağımsız DRAFT [PR #112](https://github.com/saliharici/prolig/pull/112) / HEAD `41f77fab2668db38d4e10783cc29330033c97355` hazırlandı. Eski stacked UX03 #104/#106/#109 bağımlılığı **yok**.
- Varsayılan **OFF**; yeni public endpoint yok. Mevcut public `GET /api/v1/health` cevabı aynı kalırken **yalnız Production + ayrıca onaylanmış `PROLIG_GO0_DB_ATTESTATION=1` bayrağı** ve beklenen Vercel/Neon hedefi şartlarında bir salt-okunur `SELECT current_database()` yapılır. Operator-scoped Vercel runtime logs'a yalnız boolean rapor düşer; DSN, credential veya veri satırı dışarı verilmez.
- [GitHub CI](https://github.com/saliharici/prolig/actions/runs/40133840982) `SUCCESS`: **GO-0 yeni 23/23 test PASS**, tüm **855/855 test, 119/119 dosya, lint, build ve navigation PASS**; [isolated PostgreSQL workflow](https://github.com/saliharici/prolig/actions/runs/40133841132) `SUCCESS`. [Vercel Preview](https://vercel.com/salih22/prolig/4Lm9GScx15k8XBzdtezAoMyUnzRk) `READY` yeni SHA ile. **Ayrı Neon TEST database bind edilmedi, gerçek Preview DB PASS değildir**.
- Mevcut Production deployment `dpl_B3eqis...` / SHA `26548720` READY **değişmedi**; eski deployment'a yeni observer enjekte edilemez. **Yeni** deployment içindeki `MATCH=true` eski SHA'ya mal edilemez.
- Sıradaki ayrı Production transaction gates: (a) Vercel team/project Production `PROLIG_GO0_DB_ATTESTATION=1` env **açık onayı**, (b) yalnız PR #112 için main merge/deploy + rollback **ayrı açık onay**, (c) Vercel deployment-scoped `MATCH=true` runtime evidence, (d) ayrıca açık onaylı snapshot + izole restore PASS. Env flag OFF yapmak **mevcut deployment'ı değiştirmez**; yeni sürümde kapatılmalı. Önceki `DATABASE_URL` / `AUTH_SECRET` Production env'leri **VAR** ve değiştirilmeyecek.

## 2. Doğrulama rotası — kolay olanı önce
### Kapı G0-A — sadece mevcut ortam bilgisi
- **Yetkili Production operator** Vercel projesinin Production Environment Variables hedefini (değerler gösterilmeden) kontrol eder; `DATABASE_URL` etkin değerinin **var/yok** bilgisini, hangi deployment için etkili olduğunu ve değişkenin kaynağını (project/marketplace/deployment) not eder.
- Hiçbir `DATABASE_URL`, `AUTH_SECRET`, `TOKEN_PEPPER` vb. gizli değeri GitHub'a, sohbete veya açık log'a yapıştırma. Testin Neon credentials'ını Production'a **ASLA** kopyalama.
- **G0-A: PASS (anahtar metadata varlığı)**: Production hedefli `DATABASE_URL` ve `AUTH_SECRET` kayıtları görüldü; değerleri connector güvenlik gereği açıklamıyor. Buradan `MATCH=true` sonucu çıkarma. İleride secret rotasyonu gerekirse sadece yeni somut işlem/rollback onayıyla, eskisinin üstüne körlemesine yazma.

### Kapı G0-B — gerçek runtime kanıtı
- Mevcut Vercel Serverless deployment **değişmez bir artifact**. Repo'ya sonradan eklenen `scripts/ux03_runtime_db_identity_check.mjs` [#109](https://github.com/saliharici/prolig/pull/109) **eski Production fonksiyonunda kendiliğinden çalışmaz**; local/CI/Preview/sandbox sonuçları `26548720` runtime kanıtı olarak sayılmaz.
- Aynı mevcut deployment fonksiyon prosesi içinde güvenilir, ayrıca yetkili kod yürütme veya Vercel'in kendi teyitli deployment-runtime env provenance inceleme yeteneği **kanıtlanırsa**, yalnız host/proje/branch/DB `MATCH=true/false` ve deployment ID + zaman; dışarı DSN, kullanıcı, şifre, SQL veri satırı çıkarma yok.
- Bu kanal yoksa **G0-B: BİLİNMİYOR** ve bugünkü deployment üzerinde PASS iddiası yok. Genel erişime açık diagnostik uç nokta veya bypass token oluşturulmaz.

### Kapı G0-C — kontrollü Production değişikliği seçeneği (AYRI İŞLEM ONAYI ZORUNLU)
G0-B mümkün değilse **yeni geçerli deployment üzerinde** güvenli teşhis uygulanması için önce 01 TEST, **mevcut main bazlı tek bağımsız küçük Preview PR** üretir; stacked #104/#106/#109'u körlemesine Production'a taşımaz.

**Teknik koşullar:**
- Yeni deployment'da yalnız DB identity check; UX03 JWT/enforcement/migration değişikliği ve P3 migration/storage bayrakları **YOK**.
- **Önce** Production `DATABASE_URL` ve `AUTH_SECRET` env **metadata kayıtları var**: onları yeniden oluşturmak/sıfırlamak değil, mevcut Vercel secret sürümlerini korumak esastır. Gerçek runtime host/DB güvenli kanıtlanmadan deploy'a geçme. `AUTH_SECRET` değişirse mevcut oturumlar çıkış yapabilir; TEST sırrı kopyalanmaz; env secret rotasyonu için ayrı somut kapsam/rollback onayı gerekir.
- `MATCH` kanıtı eski deployment için değil, **yeni SHA ve deployment ID için** geçerlidir. Sadece dar operatör yetkisi + SSO/IAP; kamuya açık route sıfır; kısa kullanım; erişim ve kapanış audit'i; response/log yalnız Boolean. Vercel'in mevcut oturum kimliği ve server-side auth sınırları ayrıca doğrulanır.
- Önceden `main 26548720` / deployment `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` kod geri dönüş adayıdır **yalnız DB/oturum şeması veya authVersion değiştirilmediyse**. `authVersion>0` canlıda oluşursa eski JWT sürüm denetimsiz sürüme rollback yasak (ADR-005).
- Aşamalı geçiş: izole Preview/mock negatif kabul (tekrarsız) → her somut Production env ayarı için ayrı onay → diagnostic deployment için ayrı onay → yalnız kendi runtime `MATCH` → teşhis kapat/kaldır planı.
- G0-C hiçbir şekilde anlık uygulanmış varsayılmaz.

## 3. Güncel yedek ve izole restore tatbikatı — AYRI İŞLEM ONAYI
**Başlatma ön koşulu:** G0-B veya G0-C üzerinde doğru **etkin** Production ortam kimliği doğrulanmış olmalı. Beklenen Neon project identity bağlı operatör hesabı tarafından açılabilir olmalı. Yanlış/erişilemeyen proje → **BLOKE**, yeni DB veya TEST projesi kullanılmaz.

**Somut işlemler (onaylandığında):**
1. Production `prolig-pilot/main/neondb` için **zamana bağlı güncel snapshot/backup** oluştur ve onaylı snapshot ID'si ile oluşturma zamanını kaydet; mevcut Production app/DB bağlantısını değiştirme.
2. Snapshot'tan **yalnız yeni, izole restore TEST dalı** oluştur, Production uygulama env'sine bağlama ve gerçek kullanıcılara açma.
3. Yalnız metadata/count/checksum: tamamlanan Prisma migration isimleri/checksum'ları, kritik tablo sayıları (User, Role, Project, Question, Book, CompensationEntry, Payment), FK/index bütünlüğü ve audit/ledger tutarlılığı; gizli/tanımlayıcı satır içeriklerini loglama.
4. Geri alma dokümantasyonu: Production DB üzerinde branch reset/drop/truncate **YASAK**. Rollback yazma durdurma, son sağlam sürüm, snapshot ID ve RPO/RTO, kalan yeni işlemlerin uzlaştırılması; branch temizlik/silme ayrı izin.
5. PASS için snapshot gerçekte oluşturulmuş + restore izole branch'te açılmış ve karşılaştırma geçmiş; `backup dosyası mevcut` tek başına restore PASS değildir.

## 4. İlk Prod yayını için özel güvenlik sınırları
- UX03 kurtarma/mail OFF. İlgili #104/#106 stacked, TEST #107 **kullanıcı PASS**; PROD migration ve JWT release **ayrı yeni işlem onayı**.
- Root `prisma migrate deploy` Production'da **yasak** (P3 migration'ı da tetikleyebilir).
- Geri dönüş adayları ve live SHA ayrı: eski güvenliksizlik rollback sınırı konusunu görmezden gelme.
- Sırf bu operasyon için GitHub PR'ı `main`e merge etme; merge otomatik Vercel Production build'i tetikleyebilir.
- Vercel onaylı erişim **PASS**; Neon `calm-band-45633698` erişimi **salt-okunur metadata PASS**, ana dal kimliği **PASS**. Fakat çalışan Vercel fonksiyonunun bu DB'ye bağlanması hâlâ **BİLİNMİYOR**.

## 5. Tek seferlik açık işlem onayı için sunulacak şablon
**İşlem:** [somut tek değişiklik, ör. Production env `DATABASE_URL` oluştur/güncelle]  
**Tam hedef:** Vercel team/project, canonical hostname, mevcut deployment ID; hedef Neon project/branch/DB  
**Ön kontrol:** secret ve çalışacak db kimlikleri, mevcut kullanıcıların etkisi, Preview negatif PASS, doğru rollback SHA  
**Uygulama:** read-only mi, env/deploy/backup/migration mı?  
**Rollback:** önceki env version, deployment ID, kurtarma ve oturum invariant'ı  
**Kabul:** hangi booleans/loglar, kim operator, FAIL koşulu  
**Açık onay:** yalnız bu tek işlem için alınır, diğer etkili işlemlere yayılmaz.

### Bugünkü durum
`G0-A = PASS (Production-sensitive env kayıtlarının varlığı)`, `G0-B = BİLİNMİYOR (etkin runtime DB hedefi)`, `G0-C = YALNIZ HAZIRLIK`, `BACKUP/RESTORE = BİLİNMİYOR`; **GO-0 = NO-GO**.

**Güvenli sonraki sahip:** 03 MİMARİ karar/iş kapsamı → 01 TEST yalnız yeni eksik izole Preview kod/negatif test → 02 CANLI koşullu, ayrı onaylı Prod teşhis/backup. Tek sohbetten takip edilebilir; roller operasyon sınırını tarif eder.
