
# GO-0 / ADR-007 — Production kurtarma kapsamı, RPO-RTO, rollback ve izleme

**Tarih:** 26.10.2026 · **Sahip:** 03 MİMARİ · **Durum:** KARAR TASLAĞI / uygulanabilir operasyon sözleşmesi · **Production GO:** HAYIR

**Hedef:** GitHub `saliharici/prolig` main `643cc3a524cb54c497cda550980fbc78f999be4d`; Vercel `prolig.vercel.app` deployment `dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc` (READY); Neon project `calm-band-45633698` / `prolig-pilot`, default branch `br-soft-salad-b2vb8sdr` / `main`, DB `neondb`, direct endpoint prefix `ep-aged-rice-b21dkfno`. **Kod, DB, Vercel env ve deployment değişikliği yoktur.**

## 1. Kanıt / hangi kısım tamam?

1. 25 Ekim Production runtime için `MATCH=true` **OPERATÖR PASS** ve git/deployment eşleşmesi; geçmiş SHA'lara uygulanmaz.
2. 26 Ekim V3 Production `pg_dump -Fc` AES-GCM arşivi ve ağsız yerel PG18 `pg_restore` **OPERATÖR PASS**. Rapor `prolig_PRODUCTION_20261026_115940_RAPOR.json` okunarak kaynak öncesi/sonrası ve restore sayımları **birebir** doğrulandı; bağlı Neon sorgusunda **12/12 sayısal alan ARAÇ PASS**. Şifreli arşiv rapor boyutu **137054 bayt**, raporda SHA-256 **`1fa653ff287c469a3827ffc40ba5a6679d9b0e44d4041ddae49553596a84198f`**. Arşiv baytları erişilebilir olmadığından hash'i bağımsız yeniden hesaplanmadı.
3. Şifreli arşivin farklı güvenli yerde ikinci kopyası ve şifreleme parolasının ayrı saklanması **KULLANICI/OPERATÖR PASS**. İki arşivin byte-hash eşitliği veya parolanın yeniden kullanılabilirliği **ARAÇ PASS değil**. Bir kere kabul edilmiş veri yedeği/restore döngüsü sırf konuşma değişti diye tekrar edilmez.
4. Eski tek Neon snapshot (11 Ekim) korunuyor; Free snapshot kotası `HTTP 422`. **Neon PITR/güncel snapshot PASS değildir**. Tek başarılı mantıksal yedek PITR'ın birebir alternatifi değildir.

## 2. Kurtarma envanteri ve veri sınırları

| Bileşen | Bugünkü bilinen kanıt | Bu arşivden ne geri gelir? | Açık risk |
|---|---|---|---|
| PostgreSQL `public` + `neon_auth` | 27 + 9 tablo, User 14, Question 8, Book 4, BookQuestion 6, CompensationEntry 13, Payment 1, Project 2, başarılı migration 9 | Operatörün PG18 restore PASS verdiği veritabanı şeması ve içerik | PostgreSQL küresel roller/cluster yetkileri ve provider işletim metaverisi `pg_dump` dışında olabilir; ayrıca güvenli envanter gerekir |
| Yayın ve finans tutarlılığı | BookQuestion snapshot, tahakkuk ve ödeme tabloları kaynak kod ve SQL ile mevcut | Yedek anındaki soru/kitap/audit/telif/ödeme kayıtları | Yedek anından sonraki onay ve ödemeler kendiliğinden geri gelmez. Yeniden oynatma çift tahakkuk/ödeme yaratmamalı |
| Dış medya bağlantıları | Production `QuestionAsset=3`, üçü de `VIDEO_URL`; `FileRecord=0`, dolu soru `imageUrl=0`, avatar URL=0 | Üç URL referansı/metadata DB ile geri gelir | Videoların üçüncü taraf barındırmadaki **içeriği arşivde değildir**; URL çalışırlığı doğrulanmadı |
| P3 özel PNG | Production `PrivateGeometryAsset` tablosu **YOK**, private PNG gate kapalı | Production private PNG dosyası beklenmez | İzole P3 Preview storage Production kurtarma kaynağı değildir; gelecekte canlı açılırsa ayrı storage/export sözleşmesi gerekir |
| Kod ve deployment | GitHub full SHA + Vercel deployment ID READY | Doğru SHA'dan yeniden build/deploy mümkün olabilir | Rollback sırasında DB/JWT sürüm uyumu; önceki deploy'un otomatik güvenli olduğu varsayılmaz |
| Vercel env/secrets, DNS, email provider, storage ve PG global rolleri | Uygulama config/erişim için gereklidir, bağlantı metadata'sı var | **Bu .pgdump arşivine dahil değildir** | Ayrı, yetki kontrollü secret kurtarma ve kaynağı doğrulanan konfigürasyon gerekir; secret değeri GitHub'a/sohbete yazılmaz |

**Mevcut veri kapsamı sonucu:** 26.10 veritabanı yedeği bugünkü temel soru/kitap/telif kayıtlarını geri yüklemek için güçlü kanıttır. Dış video içeriği ve çalışma ortamı/secret bağımlılıkları kapsanmaz. Production'da P3 aktifleştirilmiş sayılmaz.

## 3. RPO — Recovery Point Objective (veri kaybı toleransı)

**Karar ayrımı:** Amaç/hedef ile gerçekten sağlanan kurtarma noktası aynı şey değildir.

- **Normal üretim işletimi için önerilen hedef: RPO en fazla 24 saat.** Ancak bu sadece **en az günlük otomatik veya denetlenebilir düzenli yeni şifreli yedek**, ayrı kopya saklama ve son başarılı çalışma alarmı kurulursa sağlanabilir. **Bugün otomatik zamanlı yedek/monitor kanıtı olmadığından normal işletimde ölçülebilir RPO = BİLİNMİYOR.** 26 Ekim tek arşivi günler sonra 'son 24 saati güvenceye alıyor' demek yasaktır.
- **Yüksek riskli Production migration / yeni auth sürümü için geçiş politikası:** canlı yazımların yetkili bakım penceresinde durdurulduğu veya tutarlı iş akışı olarak uzlaştırıldığı gösterilecek; geçişin hemen öncesinde gerçekten güncel yedek/snapshot ve izole restore kanıtı ile ledger/tablo baseline sabitlenecek. **Hedef: bakıma alınmış veri seti için sıfır açıklanmamış veri kaybı.** Canlı yazımlar sürüyorsa `RPO=0` iddia edilemez.
- **Finans ve güvenlik değişmezi:** Soru onayı, CompensationEntry, Payment, authVersion gibi etkili kayıtlar **yalnız yedek alındı diye geri sarılamaz**. Kurtarma öncesi/sonrası transaction ledger, sourceKey, ödeme kimlikleri ve cookie/session policy uzlaştırılacak; açıklanamayan çift ödeme/çift tahakkuk varsa **NO-GO**.
- **Gerçekte sağlanan RPO:** 26.10.2026T11:59:40.487Z noktasına ait tek arşiv için restore kanıtı var; **bu nokta sonrasındaki kayıt değişikliklerinin geri kazanımı bilinmiyor**. Kullanıcı işletecekse bu kayıp açıkça kabul edilmeden restore/cutover yok.

## 4. RTO — Recovery Time Objective (servise geri dönüş hedefi)

- **Önerilen başlangıç hedefi: en fazla 8 saat** içinde kritik işlemlere güvenle dönebilmek. Bu bir **planlama hedefidir; ölçülmüş SLA/PASS değildir.** Kullanıcı/operasyonun süre ve veri kaybı toleransı kabul edilmeden bağlayıcı hizmet garantisi oluşturulmaz.
- **RTO başlangıcı:** olayın `SEV-1` ilan edildiği an. **RTO bitişi:** izole/restore edilmiş güvenli kaynaktan kullanıcı login/rol, yetkili API, soru/kitap görünümü ve finansal defter tutarlılığıyla **üretimde güvenli kullanım doğrulandığı an**. Yalnız yerel `pg_restore exit=0` süreyi kapatmaz.
- Mevcut 26 Ekim raporunda **gerçek tam kesinti + uygulama cutover süresi yok**. Dolayısıyla fiilî RTO **BİLİNMİYOR**; 8 saat hedefi doğrulanmış olarak raporlanmaz.
- Ücretsiz plan / single operator gerçekliğinde hedef tutmuyorsa **servis durumu ve kalan veri belirsizliği kullanıcıya açık bildirilir**; yanlış veya çift mali kayıt üretmek pahasına erken açılış yapılmaz.

## 5. SEV-1 / GO-NO-GO izleme sözleşmesi

**02 CANLI** Production olay sahibidir. İzleme yalnız yetkili platform/log alanında; kişisel veri ve secret loglama yok. **Aşağıdaki eşikler önerilmiş operatör politikasıdır; otomatik alarm kurulmuş gibi raporlanmaz.**

| Alan | Gözlem, tetik | Aksiyon |
|---|---|---|
| Canlı yönlendirme + sağlık | `prolig.vercel.app` doğru deployment/SHA değil; `GET /api/v1/health` 3 ardışık başarısızlık (yaklaşık 5 dakika) | SEV-1 inceleme; yeni yayın/şema işlemini durdur; Vercel alias/deployment/log kontrolü |
| DB kimliği | Yeni Production release'in yetkili runtime `MATCH` sonucu `false` veya doğrulanamıyor | **NO-GO**, yanlış DB'ye migration/restore/asla yazma |
| API bozulması | Giriş, soru workflow, kitap, ödeme API'sinde 10 dakikada 3 beklenmeyen 5xx; veya kullanıcı bildirimi ile doğrulanan yaygın işlev kaybı | Operatör müdahalesi; 401/403 yetki reddi ve beklenen 409 iş kuralı hatasını körlemesine 5xx sayma |
| Finans/telif bütünlüğü | Tek kaynak `sourceKey` ile yinelenen tahakkuk, iki Payment, açıklanamayan mali/kitap kayıt uyuşmazlığı **1 örnek dahi** | SEV-1, etkili ödemeleri/yayınları kontrollü durdur, snapshot/ledger koru; otomatik silme/geri sarma YOK |
| Gizlilik/rol sınırı | Yetkisiz soru/telif veya kullanıcı verisi görünmesi **1 doğrulanmış olay** | SEV-1, güvenli erişim daraltma, audit ve olay yanıtı; veri/şifre yayınlama YOK |
| Yedek tazeliği | Önerilen günlük işletim etkinleşirse son güvenilir arşiv 24 saati aşarsa | Uyarı/NO-GO (yeni etkili migration için), yeni güvenli yedek operasyonu ayrı onay |
| Teknik borç | Vercel hata gruplarında `pg-connection-string sslmode`, `url.parse`, `client.query()` deprecation uyarıları var | **Tek başlarına kesinti/SEV-1 değil**; izolasyonlu sürüm yükseltmesinde giderme işi |

**Mevcut izleme kanıtı:** Vercel'in yetkili `get_runtime_errors` kümelendirme verisi okunabildi; 4 kategori dönüyor (üçü warning/deprecation, biri önceki tarihte `ROLE_NOT_FOUND`). Bu, bir **izleme erişim kanıtıdır**, otomatik alarm, 7/24 nöbet veya olaysızlık garantisi değildir. Runtime log saklama süresi/erişimi ve public bundle `VITE_*` secret ifşa incelemesi ayrıca **BİLİNMİYOR** olarak kaydedilir.

**Post-release operatör gözlemi önerisi:** Yeni deployment sonrası 0/5/15/30/60. dakikalarda kontrol; ilk 24 saatte en az bir yeniden bakış. Bu adımlar bir gelecek canlı release için plan olup bugün yeni monitoring job veya Production konfigürasyonu kurulmamıştır.

## 6. Değişmez güvenli rollback/roll-forward

1. **Kod rollback:** Yalnız şema ve JWT sürümüyle uyumlu, SHA ve deployment ID'si önceden bilinen sürüme (02 CANLI onayıyla) dön. **`authVersion>0` olduysa eski version-check olmayan SHA'ya rollback yasak** (ADR-005). Default: güvenli ve düşük etkili roll-forward.
2. **Veri olayında:** Existing Production `main` üzerine `pg_restore`, `reset`, `DROP`, `TRUNCATE`, `finalize restore` otomatik yapılmaz. Önce şifreli arşiv bütünlüğü → yalnız izole yeni DB/branch'e restore → schema/migration ledger, finans ve kitap snapshot sayımları → yedek sonrası değişikliklerin kayıp/uzlaştırma tutanağı.
3. **Cutover:** Doğrulanmış, tek aktif yazma kaynağı, doğru Production env, DNS/host, cookie/authVersion, Storage ve DB role konfigürasyonu; **her Production env/deploy/migration/branch switch veri yazımı ayrı açık onay gerektirir**.
4. **Finans kesintisi:** Payment ve CompensationEntry defterlerini toplayıp çift tutar sanma; gerçek ödeme varsa banka/ödeme belge kayıtları DB dışı kaynakla mutabakatlanmadan dönem yeniden kapatılmaz veya ödeme yeniden yapılmaz.
5. **P3 özel PNG:** Üretimde kapalı kalsın; izole P3 storage Prod'a kaynak diye bağlanmasın.

## 7. Karar ve kalan kapılar — 26 Ekim

- **KABUL / korunan kanıtlar:** runtime kimlik operatör PASS; AES şifreli mantıksal yedek ve PG18 izole restore OPERATÖR PASS; rapor üçlü sayaç eşitliği ve Neon 12/12 ARAÇ PASS; ikinci kopya ve parolanın ayrı saklanması KULLANICI PASS. Eski testleri tekrar etme.
- **MİMARİK OLARAK BELİRLENDİ (uygulanmadı):** veri/dış medya/secret ayrımı, önerilen `RPO<=24h` (ancak günlük düzenli bağımsız yedekle), önerilen `RTO<=8h` (yalnız uygulama+servis kabulüyle), kritik incident eşikleri, rollback ve ödeme uzlaştırma prosedürü.
- **GO-0 tam PASS'i engelleyen kanıtlar:** iki kopyanın SHA-256 eşitliğinin bağımsız teyidi; güncel arşivden başka kurtarma noktası/cadence, user-approved RPO/RTO ve erişim/secret/Storage işletim kapsamı; Production'a uyumlu güvenli cutover prosedürünün end-to-end ölçümü; runtime bundle secret ifşa kontrolü. Bu kapıları gelecekte başka fazların geçmiş PASS'lerini tekrar ederek değil, **yalnız eksik noktanın dar doğrulaması** ile kapat.
- **ÜRETİM KARARI:** **Adım 1 = KISMİ / Production migration+deploy için NO-GO**. 03 MİMARİ taslak kararı belgeler, 02 CANLI gerçek kurtarma/yayın operasyonunu ancak ayrıca tam hedef/etki/rollback ve açık onayla yürütür.
