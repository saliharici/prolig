# GO-0 — Ana kod tabanından izole runtime DB kanıt hazırlığı

**Tarih:** 25.10.2026  
**Ortam:** Yeni bağımsız Preview branch; **Production değişmedi**  
**Base SHA:** `2654872084c4fd3190ab5d6b345a8509f6d89564`  
**Konu:** [Issue #108](https://github.com/saliharici/prolig/issues/108)  
**Bağımsız mevcut TEST:** [PR #109](https://github.com/saliharici/prolig/pull/109) eski Production dağıtımına sabitlenmiş 20/20 simülasyon PASS; aynısını yeniden çalıştırmak yerine **yeni davranışın** negatif sınırları hedeflendi.

## Çözülen boşluk

Mevcut immutable Production `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` üzerinde güvenilir operatör kod yürütme kanalı **doğrulanmadı**. Dağıtım dosyalarını Vercel API'den açma denemesi `404 File tree not found` döndü. PR #109'un eski deployment ID/SHA'sına bağlı betiği, başka bir yeni SHA'ya taşınırsa doğal olarak `MATCH=false` verir; eski dağıtım için PASS iddiası da taşıyamaz.

**Bu PR eski dağıtımın çalışma zamanı kanıtı DEĞİLDİR.** Ama ayrı onayla yayımlanabilecek **yeni** dağıtımda, yeni SHA'nın runtime loguna bağlı DB identity delili sağlamak amacıyla hazırlanmıştır.

## Uygulama tasarımı

1. `api/v1/_lib/go0-db-attestation.ts`: `process.env.DATABASE_URL` değerini **yalnız bellekte** ayrıştırır. Production Vercel marker, proje/commit/ref/deployment-id/repo/URL kimliği eksikse veya URL **beklenen Neon direct compute host** `ep-aged-rice-b21dkfno.c-6.eu-central-1.aws.neon.tech` + veritabanı `neondb` değilse **hiç DB bağlantısı açmaz**.
2. Yalnız eşleşen adrese, **3 saniye timeout**, `BEGIN TRANSACTION READ ONLY`, `SET LOCAL statement_timeout = 2500ms`, tek `SELECT current_database()`, başarılı `ROLLBACK` ve `client.end()` işlemleri. Herhangi bir hata `MATCH=false`.
3. Sadece `PROLIG_GO0_DB_ATTESTATION=1` **ayrı onaylı Production env bayrağı ve yeni onaylı Production deployment** ile etkili olur. Bayrak yoksa `GET /api/v1/health` cevabı da DB okuması da öncekiyle aynı. Var ve uygun ortamdaysa mevcut public health cevabı **değişmez**, operatörün Vercel **deployment-scoped runtime logs** bölümüne sadece Boolean JSON (`PROLIG_GO0_IDENTITY`) yazılır. Yeni public route yoktur; DSN, parola, SQL satırları veya driver hataları loglanmaz. Aynı sıcak lambda instance içinde en çok bir kez denenir.
4. Bu yalnız yeni deployment için kanıttır. Operatör güncel deployment ID, `VERCEL_GIT_COMMIT_SHA`, canonical alias ve timestamp'i Vercel API'den ayrıca bağlamalıdır. Logdaki `MATCH=true` hiçbir zaman *eski* `26548720` SHA'sına mal edilemez.
5. Bir kere log görüldüğünde operatör **kanıt kapsamını kayıt altına alır**; kısa ömürlü tanı davranışını kapatma ancak **sonraki deployment** ile efektif olur. Vercel'de env değerini değiştirmek eski immutable deployment'a retroaktif uygulanmaz. Rollback, authVersion migration gibi başka canlı değişiklik yapılmadıysa önceki `26548720` READY deployment'ına dönebilir; yeni UX03 authVersion kullanıma alındıysa sürüm-kontrolsüz geri dönüş yasaktır.

## Çıkış/kabul
- TEST yeni negatif zincir: Preview, sahte git/ref/project/host, pooler, bozuk URI, offline DB, BEGIN/SELECT/ROLLBACK/close fail, yanlış DB, logda secret sızmaması, bayrak varsayılan OFF, tek-instance tek deneme.
- CI check/syntax/lint/build sonucu bağımsız kanıtlanmadan **TEST PASS** yazma.
- Yeni Preview otomatik deployment oluşursa **Production credential veya Production DB kullanma**; branch için ayrı Neon TEST bağlama kanıtı yoksa Preview API kabulü BİLİNMİYOR.
- Production'da `PROLIG_GO0_DB_ATTESTATION` env ekleme/düzenleme, main'e PR merge ve deploy **bu DRAFT PR ile yetkilendirilmedi**. Gereken: ayrı somut onay ve rollback koşulu. Deploy öncesi hassas `DATABASE_URL` ve `AUTH_SECRET` Production-target kayıtları **zaten var**; onları yeniden yaratma/değiştirme. Yeni SHA deploy olmadan mevcut Production runtime için MATCH kanıtı çıkarılamaz.
- GO-0 ancak **gerçek deployment-scoped runtime `MATCH=true`** + doğru Production Neon metadata + ayrıca onaylanmış güncel snapshot/izole restore PASS ile tamamlanabilir.

**Risk:** Sağlık kontrolü bayrak açıkken ilk soğuk başlatmada en fazla yaklaşık 3 saniye ek DB bağlantısı nedeniyle yavaşlayabilir; yanlış ortam ise fail-closed log bırakır. Bayrak default OFF iken bu risk yoktur. Vercel aboneliği log saklama süresi kısa olabilir; operatör tetikleme ve okuma işlemlerini aynı kabul oturumunda yapmalıdır.
