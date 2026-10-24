# UX03-PROD-GATE-04 — 01 TEST runtime kimlik kontrolü

**Kaynak:** 02 CANLI tarafından hazırlanan `ux03_runtime_db_identity_check.mjs` ve `UX03_GATE04_runtime_kontrol_talimati.md`. Kapsam, yalnız izole TEST kodu/negatif test; Production NO-GO korunur.

## İki ayrı doğrulama

1. **Beklenen hedef:** Vercel `dpl_B3eqisNTSV7iXXvuf8rvAaGuLwSX` / commit `2654872084c4fd3190ab5d6b345a8509f6d89564` (READY, Production); Neon `prolig-pilot` / `calm-band-45633698` / `main` `br-soft-salad-b2vb8sdr` / `neondb`. Bağlı Neon proje ve branch compute metadata doğrudan endpoint hostu ile eşleşti. Pooler adresi de metadata'da mevcut, ancak `pooler_enabled=false`; bu yüzden test betiği yalnız doğrulanan **direct** endpoint'i kabul eder.
2. **Çalışan uygulamanın gerçek hedefi:** Production fonksiyon içindeki **mevcut** `DATABASE_URL` okunmadan belirlenemez. Vercel Project env metadata, build, Preview, geliştirici bilgisayarı veya `vercel env pull` *runtime kanıtı değildir*.

## TEST dosyası ve kapılar

- `scripts/ux03_runtime_db_identity_check.mjs` yüklenen operatör betiğinden fail-closed biçimde güçlendirildi. Bir HTTP route/API export'u oluşturulmadı.
- Runtime sistem işaretleri **tam** eşleşmeli: `VERCEL=1`, `VERCEL_ENV=production`, SHA, `VERCEL_PROJECT_ID`, `VERCEL_DEPLOYMENT_ID`, benzersiz `VERCEL_URL`. İlgili sistem env mevcut değilse başarısızlık. Bunlar gerekli koşullar ama tek başına güçlü yetkilendirme veya gerçek süreç kanıtı değil; 02 CANLI ayrıca deployment metadata ve güvenilir operatör yolunu doğrular.
- Gizli `DATABASE_URL` bellekte ayrıştırılır. Direct Neon hostname ve `neondb` tam eşleşmeden bağlantı açılmaz. Şifre/URI/rol/hataya ait metin loglanmaz.
- Gerçek process içindeyse `BEGIN TRANSACTION READ ONLY`, kısa timeout, yalnız `SELECT current_database()`, ardından **başarılı ROLLBACK + connection close**. En ufak belirsizlik/exception => `MATCH=false`, exit 2. Başarılı koşul => boolean `MATCH=true`, exit 0.
- TEST regresyonu fake `pg.Client` ile çalışır; gerçek Production veritabanı veya secrets kullanılmaz. Sahte pozitif PASS yalnız birim testini anlatır, kullanıcı Production eşleşmesi iddiası değildir.

## 02 CANLI uygulanabilir karar

**Önerilen yol:** Mevcut ve aynı SHA'daki Production fonksiyon sürecinde *ayrıca yetkilendirilmiş güvenilir native operator execution* mevcutsa, 02 CANLI mevcut betiğin gözden geçirilmiş sürümünü o süreçte ve izin kapsamındaki bellek içinde çalıştırır; yalnız boolean + denetlenen deployment ID ve zaman dışarı kaydedilir. Production sistemi içinden böyle bir yürütme yolu bu çalışmada **doğrulanmadı**. Özellikle betik mevcut Production artifact'ına dahil olmadığı için bugün kodu eklemeden o SHA içinde çalıştırılabileceği varsayılamaz. Gerçek runtime kanıtı **BİLİNMİYOR / NO-GO**.

**Alternatif:** Mevcut runtime'a izinli erişim yoksa, canlı deploy/endpoint eklemeden bu SHA için MATCH kanıtı üretilemez. İzinli operasyon yetkilisi yeniden tasarlanan güvenli teşhis özelliğini (yeni SHA ve ayrı Production onayı gerektirir) değerlendirir. O durumda endpoint **kamuya açık olamaz**; bağımsız kapatılabilen platform düzeyinde SSO/IAP, sunucu tarafı operatör rolü, kısa ömür, oran sınırlaması, audit, tekrar koruması ve otomatik kaldırma/rollback ile 01 TEST fail-closed kabulünden sonra 03 MİMARİ + 02 CANLI ayrı somut deploy onayı zorunlu. Mevcut talep Production kod/env değiştirme yetkisi vermez. Endpoint'in yeni SHA'sındaki kanıt geçmiş `26548720` deployment'ının runtime kanıtı yerine kullanılamaz.

**Sonraki gate:** `MATCH=true` aynı Production deployment ID ile gerçek operator kanıtı elde edilmeden GO-0 açılmaz; snapshot/restore/migration/env/deploy için ayrıca açık izin gerekir. Önceki #107 PASS/FAIL durumunu veya UX-03 güvenlik testlerini yeniden koşma.
