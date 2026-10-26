# GO-0 | Mantıksal Production yedeği ve güvenli geri dönüş kararı
**26.10.2026 · Sahip: 03 MİMARİ · Durum: KOŞULLU MİMARİ KABUL / Production migration için NO-GO**  
**Tek yetkili canlı hedef:** Vercel `prolig` / `prolig.vercel.app` / `main 643cc3a524cb54c497cda550980fbc78f999be4d` / deployment `dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc`; Neon `prolig-pilot` / `calm-band-45633698` / `main br-soft-salad-b2vb8sdr` / `neondb` / direct endpoint `ep-aged-rice-b21dkfno`. SECRET/TOKEN/Yedek içeriği GitHub'a konulmaz.

## 1. Mevcut kanıtın kapsamı
- 25.10.2026: güncel Production deployment-scoped, READ ONLY kimlik gözleminde `PROLIG_GO0_IDENTITY MATCH=true` **OPERATÖR PASS**. Bu sadece söz konusu SHA/deployment içindir.
- 26.10.2026: operatör V3 konsol çıktısı `pg_dump -Fc` akışından **AES-256-GCM şifreli dosya üretimi ve şifre çözülerek doğrulama PASS**, `postgres:18-alpine` `--network none` izole `pg_restore --exit-on-error` **PASS**, tablo ve kritik kayıt sayımı eşleşmesi **OPERATÖR PASS**.
- **26.10.2026 raporu okundu ve dahili tutarlılık doğrulandı:** `prolig_PRODUCTION_20261026_115940_RAPOR.json`; zaman `2026-10-26T11:59:40.487Z` (Türkiye `14:59:40`); target `calm-band-45633698` / `br-soft-salad-b2vb8sdr` / `neondb` / direct endpoint prefix `ep-aged-rice-b21dkfno.`. `backup=PASS_ENCRYPTED_CRYPTO_VERIFIED`; `restore=PASS_ISOLATED_PG18_COUNTS_MATCH`; `productionWrite=false`, `migration=false`, `snapshotChanged=false`. Arşiv rapor boyutu **137054 bayt**; arşiv SHA-256 **`1fa653ff287c469a3827ffc40ba5a6679d9b0e44d4041ddae49553596a84198f`**. Bu SHA-256 yalnız raporda kayıtlıdır, arşiv baytları erişilebilir olmadığından bağımsız yeniden hesaplanmadı.
- **Rapor sayaçları:** `sourceBefore == sourceAfter == restored` tüm alanlarda birebir eşit (DB `neondb`; `public_tables=27`, `neon_auth_tables=9`, `users=14`, `questions=8`, `books=4`, `earnings=13`, `payments=1`, `payment_periods=0`, `projects=2`, `roles=6`, `migrations=10`, `migrations_applied=9`). **Ayrı Neon salt-okunur SQL sorgusu aynı 12 sayısal alanın tamamında eşleşti; bu sayıların Production baseline'a uygunluğu ARAÇ-DOĞRULANDI**. Kriptografik şifre çözme ve gerçek izole restore çalışması ise **OPERATÖR PASS**, arşivin içeriği bu sohbet tarafından yeniden restore edilmedi.
- Önceki 11.10.2026 Neon snapshot `snap-polished-mode-b2ebbvhy` korunuyor; Neon Free planda ikinci manuel snapshot `HTTP 422 snapshots limit exceeded`. **Yeni Neon snapshot/PITR PASS değil.**
- Bu adımda Production DDL/DML, migration, env, deploy, merge, data deletion, storage/secret aktarımı yok.

## 2. ADR/karar: ücretsiz planda mantıksal yedek alternatif kabulü
**KOŞULLU KABUL:** Güncel, bütünlüğü ve bağımsız geri yüklemesi kanıtlanmış `pg_dump -Fc` + güçlü şifreleme + bağımsız saklama, Neon'un ücretsiz plandaki **güncel manuel snapshot** gereksiniminin yerine bir **sürüm-öncesi mantıksal geri kazanım alternatifi** olarak kabul edilebilir. Bu *Neon snapshot*, zaman içinde istenen saniyeye dönüş (PITR), Storage dosyası yedeği, Vercel env/secrets yedeği veya işlem anı sonrasındaki kayıtları kurtarma garantisi **DEĞİLDİR**.

**Kritik sınır:** Mantıksal yedek geri döndürülürse yedek alınmasından sonraki değişiklikler kaybolabilir. Schema/finans/JWT değişiklikleriyle önceki uygulama sürümüne kör rollback yapılamaz. `authVersion` değişmişse sürüm-kontrolsüz eski SHA'ya dönüş ADR-005 gereği yasaktır.

## 3. Kapanış kabul matrisi
| Kabul kapısı | Durum | Eksik kanıt / koşul |
|---|---|---|
| A. Production main SHA + Vercel READY + runtime DB MATCH | **OPERATÖR PASS** | Sadece kayıttaki yeni deployment için |
| B. Güncel şifreli mantıksal Production yedeği | **OPERATÖR PASS + RAPOR OKUNDU** | Boyut ve SHA-256 rapordan kaydedildi; gerçek arşiv bayt hash'i bağımsız doğrulanamadı |
| C. PG18 ağsız izole restore + kritik sayım eşleşmesi | **OPERATÖR PASS + 12/12 SAYIM ARAÇ PASS** | Raporun üç sayı kümesi eşit ve canlı Neon SQL 12 sayısal alan ile aynı; gerçek restorasyonun bağımsız tekrar testi yapılmadı |
| D. Arşiv saklama ve geri bulunabilirlik | **İKİNCİ KOPYA + AYRI PAROLA OPERATÖR PASS / HASH BEKLİYOR** | Kullanıcı ikinci güvenli kopyayı ve parolanın arşivlerden ayrı saklanmasını PASS olarak teyit etti; parolanın değerine erişilmedi. İki dosyanın SHA-256 eşitliği ve gerektiğinde parolaya erişim bağımsız doğrulanmadı |
| E. Kurtarma kapsamı ve RPO/RTO | **KISMİ PLAN** | Backup sonrası değişiklik kaybının kabulü, Storage/object ve uygulama env/secret/DB-role sınırları, restore senaryosunda fiili süre RTO: **BİLİNMİYOR** |
| F. Deploy/rollback + izleme | **KISMİ PLAN** | 02 CANLI operasyon sahibi, değişim sonrası hata eşikleri, gözlem erişim durumu; uygulama giriş/rol smoke; public bundle secret incelemesi |
| **GO-0 bütünsel** | **KISMİ / NO-GO** | Rapor+canlı Neon 12/12 ve ikinci kopya/ayrı parola operatör teyidi tamamlandı. İki kopya hash eşitliği bağımsız doğrulanmadı; E–F kurtarma kapsamı, kabul edilmiş RPO/RTO, izleme ve güvenli rollback henüz PASS değil |

## 3.1. Kurtarma kapsamı, RPO/RTO ve izleme sözleşmesi — 26 Ekim

- [**GO-0 / ADR-007 — Kurtarma kapsamı, RPO/RTO, rollback ve izleme**](GO0_KURTARMA_KAPSAMI_RPO_RTO_IZLEME_ADR_20261026.md) belgesi, mevcut canlı Neon ve Vercel kayıtları ile `main` kaynaklarına göre hazırlandı.
- Salt-okunur Production medya kontrolünde `QuestionAsset=3` (tamamı `VIDEO_URL`), `FileRecord=0`, dolu `Question.imageUrl=0`, dolu kullanıcı `avatarUrl=0`, P3 özel PNG tablosu=0 doğrulandı. Veritabanı bu üç video URL'sini saklar; harici video dosyalarını veya Vercel secret değerlerini saklamaz.
- **Önerilen RPO hedefi ≤24 saat** ancak günlük güncel ve geri kazanılabilir yedek akışı ile mümkündür. Bugünkü tek yedek, sürekli `RPO≤24h` kanıtı **değildir**.
- **Önerilen RTO hedefi ≤8 saat**, fakat uygulamaya güvenli dönüş için baştan sona süre ölçümü yapılmadı. Bu bir hizmet garantisi veya PASS değildir.
- Vercel Runtime Errors erişimi doğrulandı; görülen SSL/`url.parse`/`client.query()` deprecation uyarıları **kendiliğinden SEV-1/outage kanıtı değil**. Yeni alarmlar kurulmadı.
- JWT `authVersion`, telif/ödeme defterleri, soru ve kitap snapshot'ları nedeniyle Production ana DB'ye doğrudan restore veya kör rollback yapılmaz. İzole kurtarma/uzlaştırma ve ayrı somut işlem onayı zorunludur.
- **Mimari politika tanımlandı; işletimsel uygulama tamamlanmadı.** D–F kapılarının tümü PASS olmadan GO-0 bütünü **KISMİ / NO-GO** olarak kalır.

## 4. Tek geçişlik geri dönüş runbook'u (PLAN; Production'da şimdi uygulanmaz)
1. **Yayın öncesi:** Vercel Production tam SHA/deployment ve Neon project/branch/DB kimliğini doğrula; uygulanacak migration seçici olsun (P3 hariç, root `prisma migrate deploy` yok). Mevcut DB yapısını, migration ledger/checksum'larını, User/Question/Book/CompensationEntry/Payment sayılarını tarihle kaydet. Yüksek etkili yazım öncesinde **yeni**, güncel şifreli mantıksal yedek + izole restore kabulünü ayrıca al. 26.10 tarihli arşiv daha sonraki tarihte otomatik güncel sayılmaz.
2. **Saklama:** Yedeğin iki bağımsız şifreli kopyasını ve SHA-256 eşitliğini kanıtla; parolayı aynı konumda saklama. Başarısız kopya/parola kaybında GO verme. Yedek dosyasını repo, sohbete veya public storage'a koyma.
3. **Olay tespiti:** Kullanıcı giriş/rol uçları, soru/kitap yayın API'si ve mali tahakkuk/ödeme tutarlılığı bozulursa Production veri yazımını **kontrollü, yetkili yöntemle** durdurma kararı al; korumasız bakım uç noktası açma. Vercel hata/log erişimi BİLİNMİYOR ise bunu not et.
4. **Kurtarma:** Orijinal Production main üzerinde DROP/TRUNCATE/RESTORE **YOK**. Yerel/onaylı izole PostgreSQL 18 ya da yeni, Production'a bağlanmamış Neon kurtarma kaynağında önce şifreli arşivi doğrula ve restore et; şema, `_prisma_migrations`, kritik sayımlar, FK/audit/finans ledger ve gerekliyse Neon Auth, DB rolleri, private Storage bağlantıları gibi dış bağımlılıkları kontrol et. Dış varlıklar bu `pg_dump` dosyasının kapsamı dışında olabilir.
5. **Karar ve cutover:** Yedek sonrası oluşturulan kullanıcı/soru/kitap/telif/ödeme değişiklikleri için kayıp/uzlaştırma planını yazılı onayla. Tek aktif yazma kaynağı ilkesiyle DNS/Vercel env/database switch/migration/rollback için **ayrı somut Production işlem onayı** al. JWT `authVersion` için güvenli ileri düzeltme kuralına uy.
6. **Son kabul:** Sağlam restore kaynağı üzerinde login/rol, API, belge çıktısı, kitap snapshot, finans ledger/rapor smoke sonuçlarını değerlendir. Gerçek mali hareket veya gerçek kullanıcı kaydı değiştirme yetkisi bu belgeyle verilmez. RPO ve RTO ancak ölçülen ve kullanıcı tarafından kabul edilmiş değerlerle yazılır; tahminlerden PASS çıkarılmaz.

## 5. Rapor incelemesi kapandı; kalan kanıtlar
**26.10.2026 `_RAPOR.json` kullanıcı tarafından sağlandı, içeriği incelendi.** Hedef, durum booleans, 12/12 sayım, rapor boyutu/hash alanları tutarlı. Parola, bağlantı URL'si ve veri satırları raporda bulunmuyor. Raporu YENİDEN İSTEME; `pg_dump`, `pg_restore`, migration veya A/B testini tekrarlama.

**26.10.2026 kullanıcı teyidi:** Şifreli arşivin ikinci bir haricî disk veya farklı güvenli depolama alanına kopyalandığı **OPERATÖR PASS**. Yedek içeriği tekrar gönderilmeyecek; saklama ortamının ayrıntıları bilinmiyor. Kullanıcı ayrıca parolanın yedekten ayrı güvenli yerde saklandığını **OPERATÖR PASS** olarak teyit etti; parolanın kendisi istenmedi/paylaşılmadı. İki dosyanın SHA-256 eşitliği bağımsız doğrulanmadı. Private Storage/Neon dışı varlıklar, Vercel env/secrets, kabul edilmiş RPO/RTO, güvenli izleme/rollback kapıları ayrıca tanımlanmalı. 26.10 arşivi ilerideki migration öncesi otomatik güncel değildir.

**Bu doküman #108'e bağlı karar eki olup Production yayını, eski snapshot'ı silme veya PR'ı main'e merge etme izni değildir.** Karar güncellemesi ve GO-0 kapanışı: 03 MİMARİ. İleride uygulanacak her Production operasyonu: 02 CANLI + ayrı açık onay.
