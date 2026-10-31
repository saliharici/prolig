# PRO-LIG / RELEASE-04 — Aktivasyon ve geri dönüş sınırları

**Tarih:** 31 Ekim 2026 | **Sahip:** 01 TEST kaynak kod, 02 CANLI kontrollü yayın, 03 MİMARİ karar.
**Referans:** Issue #119, PR #118. Production `main` ve Neon'a bu belgeyle işlem yapılmaz.

## 1. Eklemeli DB ve çift rol kuralı

`IL_KOORDINATORU` enum değeri, tarihi İl Koordinatörlerinin 2 gerçek hesabı, tüm tarihsel `CompensationEntry` ve `Payment` kayıtları korunur. `BRANS_KOORDINATORU` ayrı enum olarak eklenir. Kullanıcıya ait `branchPermissions TEXT[] NOT NULL DEFAULT '{}'` alanı yalnız Branş Koordinatörünün izin alt-kümesidir; **hiçbir izin kendiliğinden verilmez**.

**İzin tavanı:** `authors.read`, `projects.read`, `projects.create`, `projects.update`, `tasks.read`, `tasks.create`, `tasks.update`, `questions.read`.
Bölge Koordinatörü **yalnız kendi bölgesindeki** Branş Koordinatörüne bir veya çok branş ve izin alt kümesi atar; Genel Koordinatör bütün bölgelerde aynı yetkiye sahiptir. Sunucu, her işlemde **izin + atanmış bölge ∩ atanmış branş(lar)** şartlarını birlikte uygular. Yetki bağımlılıkları zorunludur. İzin matrisi dışında finans, soru onayı, mesaj, duyuru, kitap, üst rol veya denetim yetkisi devredilemez.

## 2. Aktivasyon kapısı

`RELEASE04_BRANS_ACTIVATION_ENABLED` **yalnız tam olarak `true`** olduğunda yeni Branş Koordinatörü hesapları yönetim API'sinden açılabilir/dönüştürülebilir ve yeni rolün oturumu `getCurrentUser` tarafından kabul edilir. **Değişken yoksa/başka değerdeyse varsayılan OFF.**

**OFF modunda:**
- Aktif Branş Koordinatörü oturumu kabul edilmez.
- Yeni Branş Koordinatörü rolüne atama ve mevcut hesaptan bu role geçiş reddedilir.
- Tarihsel İl Koordinatörleri mevcut rolleriyle hizmet vermeye devam eder.
- Bölge/Genel Koordinatörün mevcut rolleri, yetkileri ve tarihi ödeme kayıtları değiştirilmez.
- SQL enum ve Role satırının eklenmiş olması **rolün aktif kullanıldığı anlamına gelmez.**

**ON modu** daha sonra 02 CANLI tarafından yayın/DB geri dönüş yolu, doğru hedef Neon, kullanıcı yetki matrisi ve operasyon-spesifik açık onay ile açılabilir. Öncesinde kapalı kalır.

## 3. Yayına alma fazları — 02 CANLI tarafından ayrıca onaylanacak

**A — Kod ve veri geçişi (henüz uygulanmadı):**
1. Son SHA / `main` / Production Vercel dağıtımının aynı olduğunu ve başlangıç veri sayılarını salt okunur doğrula.
2. Gerçekten geri yüklenebilir, güncel Neon kurtarma noktası ve geri dönüş koşulunu doğrula. Önceki `br-rapid-term-b2g1rg99` dalının READY olması **geri yükleme testinin PASS olması değildir**.
3. Seçici P3'süz migration setinin tarihsel 9/9 SHA-256 kanıtını ve bekleyen **4 yeni migration'ı** doğrula. `prisma migrate deploy` varsayılan config ile ASLA çalıştırılmaz. `prisma.config.release04.production.ts` ancak yetkili operasyon için tam SHA, bağlantı hostu, `sslmode=verify-full`, tam manifest ve açık işlem onayıyla kullanılabilir.
4. Şema eklemesi tamamlanmadan yeni Prisma client kullanan Production kodunu yayımlama. `main` PR merge işlemi otomatik Production build tetikleyebilir; yayın öncesi koşullar hazır değilse merge yapma.
5. Yeni Production kodunu **aktivasyon OFF** durumunda yayımla; 6 tarihsel rol, mevcut hesap oturumları, soru/proje/kitap/telif ve HTTP health kısa kontrolü; P3 tablo/özellik aktif değil.

**B — Branş hesaplarını ilk kez açma (ayrı operasyon, henüz onaylanmadı):**
1. Bölge/Genel Koordinatör gerçek bölge ve branş(lar)ı seçer. Eski İl Koordinatörlerine otomatik tüm-branş ataması yapma.
2. 02 CANLI, **ON aktivasyon işlemi için** ayrıca gerçek kullanıcı ataması, güncel ileri düzeltme/kurtarma senaryosu ve açık onay alır.
3. Aktivasyondan sonra yalnız açık yetkili kullanıcılar rol yaratabilir ve izinler `ActivityLog` ile izlenir.

## 4. Geri dönüş — yanlış PASS iddiası yasak

**Durum 1: Aktivasyon OFF, yeni BRANS hesabı sıfır.** Önce eklemeli migration sonrası **eski Vercel deployment'ının yeni enum Role satırıyla uyumunu ayrıca kanıtla**. Başarılı kanıt varsa uygulama rollback'i ve DB'nin eklemeli kolon/enumlarını korumak değerlendirilebilir. Eski sürümdeki Prisma enum/Role okuma davranışı test edilmeden bu senaryo PASS değildir.

**Durum 2: Aktivasyon ON veya BRANS kullanıcı sayısı > 0.** Önce aktivasyon bayrağını OFF'a almak BRANS oturumlarını fail-closed yapabilir, ancak bu **eski sürümle otomatik DB uyumu sağlamaz**. Doğrudan önceki `643cc3a5` Vercel deployment'ına rollback NO-GO. Çift-rol uyumlu güncel sürüm için **forward-fix** veya yetkili/denetimli kullanıcı kapsamı uzlaştırması gerekir. Hiçbir BRANS hesabı sessizce YAZAR/IL rolüne çevrilmez; finans ve kullanıcı kayıtları silinmez.

**P3 ve tarihsel migration:** P3 migration'ı Production'a uygulanmaz veya `resolve --applied` ile sahte uygulanmış sayılmaz. Eski 9 başarılı + 1 rolled-back ledger kayıtlarına yazılmaz.

## 5. Yayın kararı

**Mevcut sonuç: NOT DEPLOYED / ACTIVATION OFF BY DEFAULT / ROLLBACK FULLY VERIFIED: NO.** Yetki ve aktivasyon kodu mevcut PR #118'de hazırlanmıştır; CI ve G2–G5 tamamen doğrulanmadan 02 CANLI release yapmaz.

**Ortam | İş | Kanıt/SHA | Test | Etki | Risk | Sıradaki sahip**
GitHub PR #118 | Per-user BRANS grant + staged activation | Son PR HEAD ile eşleştirilecek | Yeni CI kontrolü gerekir | Production: NONE | Legacy app DB enum compatibility, rollback | 01 TEST → 02 CANLI.
