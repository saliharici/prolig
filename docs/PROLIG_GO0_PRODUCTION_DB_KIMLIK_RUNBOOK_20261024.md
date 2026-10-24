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
| Vercel env metadata | 96 kayıt; `DATABASE_URL` sadece `development` ve branch-scope `preview`; `target=["production"]` **YOK** | **KONFİGÜRASYON RİSKİ**; mevcut eski deployment'ın runtime snapshot'ı bağımsız kanıtlanmadı |
| Vercel connectors | Proje connector kaydı `[]`; marketplace team `neon` + `prisma` kurulumu mevcut ama ilişkilendirilen `projects=[]` | Entegrasyon kurulu olması uygulamanın Production DB kimliğini kanıtlamaz |
| Neon bağlamı | Beklenen `prolig-pilot` project `calm-band-45633698`, main branch `br-soft-salad-b2vb8sdr`, DB `neondb` (önceki #108/#109 kanıtı) | Bağlı Neon hesaplarının listesinde proje görünmüyor; **yanlış TEST projesi alternatif olamaz** |
| Vercel errors | Node/pg SSL ve URL deprecation uyarı grupları okundu | Tek başına DB MATCH veya outage kanıtı değil; 30 dk current-deployment log grubunda kayıt görülmedi |

**Kesin ayrım:** `Vercel READY` = deployment hazır; `DATABASE_URL` Production metadata'da yok = şu anki proje ayarlarında uyumsuzluk riski; `MATCH=BİLİNMİYOR` = etkin deployment'ın hangi DB host/branch'i kullandığına ilişkin bağımsız runtime kanıtı yok. Bu durum **yanlış DB bağlantısı FAIL** diye ilan edilmez.

## 2. Doğrulama rotası — kolay olanı önce
### Kapı G0-A — sadece mevcut ortam bilgisi
- **Yetkili Production operator** Vercel projesinin Production Environment Variables hedefini (değerler gösterilmeden) kontrol eder; `DATABASE_URL` etkin değerinin **var/yok** bilgisini, hangi deployment için etkili olduğunu ve değişkenin kaynağını (project/marketplace/deployment) not eder.
- Hiçbir `DATABASE_URL`, `AUTH_SECRET`, `TOKEN_PEPPER` vb. gizli değeri GitHub'a, sohbete veya açık log'a yapıştırma. Testin Neon credentials'ını Production'a **ASLA** kopyalama.
- Projede `DATABASE_URL` kaydı yeni Production deploy için yoksa, bunu **G0-A: FAIL (config future deployment)** olarak raporla; güncel READY deployment'ın runtime URL'si yine `BİLİNMİYOR`.

### Kapı G0-B — gerçek runtime kanıtı
- Mevcut Vercel Serverless deployment **değişmez bir artifact**. Repo'ya sonradan eklenen `scripts/ux03_runtime_db_identity_check.mjs` [#109](https://github.com/saliharici/prolig/pull/109) **eski Production fonksiyonunda kendiliğinden çalışmaz**; local/CI/Preview/sandbox sonuçları `26548720` runtime kanıtı olarak sayılmaz.
- Aynı mevcut deployment fonksiyon prosesi içinde güvenilir, ayrıca yetkili kod yürütme veya Vercel'in kendi teyitli deployment-runtime env provenance inceleme yeteneği **kanıtlanırsa**, yalnız host/proje/branch/DB `MATCH=true/false` ve deployment ID + zaman; dışarı DSN, kullanıcı, şifre, SQL veri satırı çıkarma yok.
- Bu kanal yoksa **G0-B: BİLİNMİYOR** ve bugünkü deployment üzerinde PASS iddiası yok. Genel erişime açık diagnostik uç nokta veya bypass token oluşturulmaz.

### Kapı G0-C — kontrollü Production değişikliği seçeneği (AYRI İŞLEM ONAYI ZORUNLU)
G0-B mümkün değilse **yeni geçerli deployment üzerinde** güvenli teşhis uygulanması için önce 01 TEST, **mevcut main bazlı tek bağımsız küçük Preview PR** üretir; stacked #104/#106/#109'u körlemesine Production'a taşımaz.

**Teknik koşullar:**
- Yeni deployment'da yalnız DB identity check; UX03 JWT/enforcement/migration değişikliği ve P3 migration/storage bayrakları **YOK**.
- **Önce** proje Production `DATABASE_URL`/auth secret hedefinin doğru olduğu, gerekli runtime env'nin Vercel'in güvenli mekanizmaları ile hazır bulunduğu teyit edilir. Eksikse değişken ekleme işlemi dahi ayrı hedef ve gerekçe ile onaylanır; TEST sırrı kopyalanmaz.
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
- Vercel onaylı erişim **PASS**, fakat Neon `calm-band...` erişimi **BİLİNMİYOR**. Neon link/erişim sorununu çözmeden backup yetkilendirmesi talep etme.

## 5. Tek seferlik açık işlem onayı için sunulacak şablon
**İşlem:** [somut tek değişiklik, ör. Production env `DATABASE_URL` oluştur/güncelle]  
**Tam hedef:** Vercel team/project, canonical hostname, mevcut deployment ID; hedef Neon project/branch/DB  
**Ön kontrol:** secret ve çalışacak db kimlikleri, mevcut kullanıcıların etkisi, Preview negatif PASS, doğru rollback SHA  
**Uygulama:** read-only mi, env/deploy/backup/migration mı?  
**Rollback:** önceki env version, deployment ID, kurtarma ve oturum invariant'ı  
**Kabul:** hangi booleans/loglar, kim operator, FAIL koşulu  
**Açık onay:** yalnız bu tek işlem için alınır, diğer etkili işlemlere yayılmaz.

### Bugünkü durum
`G0-A = KONFİGÜRASYON RİSKİ`, `G0-B = BİLİNMİYOR`, `G0-C = HAZIRLIK`, `BACKUP/RESTORE = BİLİNMİYOR`; **GO-0 = NO-GO**.

**Güvenli sonraki sahip:** 03 MİMARİ karar/iş kapsamı → 01 TEST yalnız yeni eksik izole Preview kod/negatif test → 02 CANLI koşullu, ayrı onaylı Prod teşhis/backup. Tek sohbetten takip edilebilir; roller operasyon sınırını tarif eder.
