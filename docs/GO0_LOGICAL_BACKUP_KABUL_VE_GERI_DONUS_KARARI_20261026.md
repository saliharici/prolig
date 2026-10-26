# GO-0 | Mantıksal Production yedeği ve güvenli geri dönüş kararı
**26.10.2026 · Sahip: 03 MİMARİ · Durum: KOŞULLU MİMARİ KABUL / Production migration için NO-GO**  
**Tek yetkili canlı hedef:** Vercel `prolig` / `prolig.vercel.app` / `main 643cc3a524cb54c497cda550980fbc78f999be4d` / deployment `dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc`; Neon `prolig-pilot` / `calm-band-45633698` / `main br-soft-salad-b2vb8sdr` / `neondb` / direct endpoint `ep-aged-rice-b21dkfno`. SECRET/TOKEN/Yedek içeriği GitHub'a konulmaz.

## 1. Mevcut kanıtın kapsamı
- 25.10.2026: güncel Production deployment-scoped, READ ONLY kimlik gözleminde `PROLIG_GO0_IDENTITY MATCH=true` **OPERATÖR PASS**. Bu sadece söz konusu SHA/deployment içindir.
- 26.10.2026: operatör V3 konsol çıktısı `pg_dump -Fc` akışından **AES-256-GCM şifreli dosya üretimi ve şifre çözülerek doğrulama PASS**, `postgres:18-alpine` `--network none` izole `pg_restore --exit-on-error` **PASS**, tablo ve kritik kayıt sayımı eşleşmesi **OPERATÖR PASS**.
- Oluşturulan raporun yalnız konumu biliniyor: `D:\\PROLIG_GIZLI_YEDEK\\prolig_PRODUCTION_20261026_115940_RAPOR.json`. **Rapor dosyasının gerçek içeriği/şifreli arşiv burada incelenmedi; hash, byte büyüklüğü, kritik sayaçların gerçek değerleri bağımsız doğrulanmadı.**
- Önceki 11.10.2026 Neon snapshot `snap-polished-mode-b2ebbvhy` korunuyor; Neon Free planda ikinci manuel snapshot `HTTP 422 snapshots limit exceeded`. **Yeni Neon snapshot/PITR PASS değil.**
- Bu adımda Production DDL/DML, migration, env, deploy, merge, data deletion, storage/secret aktarımı yok.

## 2. ADR/karar: ücretsiz planda mantıksal yedek alternatif kabulü
**KOŞULLU KABUL:** Güncel, bütünlüğü ve bağımsız geri yüklemesi kanıtlanmış `pg_dump -Fc` + güçlü şifreleme + bağımsız saklama, Neon'un ücretsiz plandaki **güncel manuel snapshot** gereksiniminin yerine bir **sürüm-öncesi mantıksal geri kazanım alternatifi** olarak kabul edilebilir. Bu *Neon snapshot*, zaman içinde istenen saniyeye dönüş (PITR), Storage dosyası yedeği, Vercel env/secrets yedeği veya işlem anı sonrasındaki kayıtları kurtarma garantisi **DEĞİLDİR**.

**Kritik sınır:** Mantıksal yedek geri döndürülürse yedek alınmasından sonraki değişiklikler kaybolabilir. Schema/finans/JWT değişiklikleriyle önceki uygulama sürümüne kör rollback yapılamaz. `authVersion` değişmişse sürüm-kontrolsüz eski SHA'ya dönüş ADR-005 gereği yasaktır.

## 3. Kapanış kabul matrisi
| Kabul kapısı | Durum | Eksik kanıt / koşul |
|---|---|---|
| A. Production main SHA + Vercel READY + runtime DB MATCH | **OPERATÖR PASS** | Sadece kayıttaki yeni deployment için |
| B. Güncel şifreli mantıksal Production yedeği | **OPERATÖR PASS** | Arşiv SHA-256, boyut, raporun gerçek alanları henüz incelenmedi |
| C. PG18 ağsız izole restore + kritik sayım eşleşmesi | **OPERATÖR PASS** | V3 raporu içindeki kaynağa/kurtarılana ait sayımlar incelenmedi |
| D. Arşiv saklama ve geri bulunabilirlik | **BİLİNMİYOR** | Doğrulanmış en az 2 ayrı fiziksel/servis kopyası, biri farklı cihaz/konum; erişimi sınırlı, şifreli; parola ayrı güvenli yerde |
| E. Kurtarma kapsamı ve RPO/RTO | **KISMİ PLAN** | Backup sonrası değişiklik kaybının kabulü, Storage/object ve uygulama env/secret/DB-role sınırları, restore senaryosunda fiili süre RTO: **BİLİNMİYOR** |
| F. Deploy/rollback + izleme | **KISMİ PLAN** | 02 CANLI operasyon sahibi, değişim sonrası hata eşikleri, gözlem erişim durumu; uygulama giriş/rol smoke; public bundle secret incelemesi |
| **GO-0 bütünsel** | **NO-GO / KAPANIŞ BEKLİYOR** | D–F ve rapor incelemesi tamamlanmadan tüm Adım 1 PASS yazılmaz |

## 4. Tek geçişlik geri dönüş runbook'u (PLAN; Production'da şimdi uygulanmaz)
1. **Yayın öncesi:** Vercel Production tam SHA/deployment ve Neon project/branch/DB kimliğini doğrula; uygulanacak migration seçici olsun (P3 hariç, root `prisma migrate deploy` yok). Mevcut DB yapısını, migration ledger/checksum'larını, User/Question/Book/CompensationEntry/Payment sayılarını tarihle kaydet. Yüksek etkili yazım öncesinde **yeni**, güncel şifreli mantıksal yedek + izole restore kabulünü ayrıca al. 26.10 tarihli arşiv daha sonraki tarihte otomatik güncel sayılmaz.
2. **Saklama:** Yedeğin iki bağımsız şifreli kopyasını ve SHA-256 eşitliğini kanıtla; parolayı aynı konumda saklama. Başarısız kopya/parola kaybında GO verme. Yedek dosyasını repo, sohbete veya public storage'a koyma.
3. **Olay tespiti:** Kullanıcı giriş/rol uçları, soru/kitap yayın API'si ve mali tahakkuk/ödeme tutarlılığı bozulursa Production veri yazımını **kontrollü, yetkili yöntemle** durdurma kararı al; korumasız bakım uç noktası açma. Vercel hata/log erişimi BİLİNMİYOR ise bunu not et.
4. **Kurtarma:** Orijinal Production main üzerinde DROP/TRUNCATE/RESTORE **YOK**. Yerel/onaylı izole PostgreSQL 18 ya da yeni, Production'a bağlanmamış Neon kurtarma kaynağında önce şifreli arşivi doğrula ve restore et; şema, `_prisma_migrations`, kritik sayımlar, FK/audit/finans ledger ve gerekliyse Neon Auth, DB rolleri, private Storage bağlantıları gibi dış bağımlılıkları kontrol et. Dış varlıklar bu `pg_dump` dosyasının kapsamı dışında olabilir.
5. **Karar ve cutover:** Yedek sonrası oluşturulan kullanıcı/soru/kitap/telif/ödeme değişiklikleri için kayıp/uzlaştırma planını yazılı onayla. Tek aktif yazma kaynağı ilkesiyle DNS/Vercel env/database switch/migration/rollback için **ayrı somut Production işlem onayı** al. JWT `authVersion` için güvenli ileri düzeltme kuralına uy.
6. **Son kabul:** Sağlam restore kaynağı üzerinde login/rol, API, belge çıktısı, kitap snapshot, finans ledger/rapor smoke sonuçlarını değerlendir. Gerçek mali hareket veya gerçek kullanıcı kaydı değiştirme yetkisi bu belgeyle verilmez. RPO ve RTO ancak ölçülen ve kullanıcı tarafından kabul edilmiş değerlerle yazılır; tahminlerden PASS çıkarılmaz.

## 5. Yalnız bir defalık beklenen belge
Operatör `_RAPOR.json` dosyasını **yerel yolda gizli değer bulunmadığını kontrol edip** çalışma sohbetine eklemelidir (URL, parola, token veya gerçek satır kayıtları **gönderilmez**). İncelenecek salt-okunur alanlar: `kind/date/target`, `backup/restore`, `encryptedBytes/sha256`, `sourceBefore/sourceAfter/restored`, `productionWrite/migration/snapshotChanged`. Sahaya yeniden `pg_dump`, `pg_restore`, migration veya A/B testi yaptırılmaz.

**Bu doküman #108'e bağlı karar eki olup Production yayını, eski snapshot'ı silme veya PR'ı main'e merge etme izni değildir.** Karar güncellemesi ve GO-0 kapanışı: 03 MİMARİ. İleride uygulanacak her Production operasyonu: 02 CANLI + ayrı açık onay.
