# UX03 — Güncel main bazlı, izole release adayının birleştirme sözleşmesi

**Tarih:** 25 Ekim 2026 · **Rol:** 01 TEST / 03 MİMARİ · **Ortam:** yalnız GitHub DRAFT PR ve izole Vercel Preview.  
**Base:** `643cc3a524cb54c497cda550980fbc78f999be4d` (Production'daki GO-0 runtime DB identity kontrolü, MATCH=true).  
**Kaynak:** [PR #104](https://github.com/saliharici/prolig/pull/104) ve onun üzerine kurulmuş [PR #106](https://github.com/saliharici/prolig/pull/106), HEAD `47493bb6434180da1fb7b4d0d7ef175ca51ed4ee`. [Issue #107](https://github.com/saliharici/prolig/issues/107) **CLOSED/PASS**; başarılı eski UX03 TEST kabulü yeniden icra edilmez.

## Freeze / GO-0 sınırı

- Kullanıcı Neon Launch ücretli yükseltmesini reddetti. Tek Production snapshot `snap-polished-mode-b2ebbvhy` (11 Ekim) **korundu**; snapshot kotası dolu (`HTTP 422`). Eski tek snapshot **silinmedi**; yeni snapshot/izole restore PASS değildir.
- [Issue #108](https://github.com/saliharici/prolig/issues/108) snapshot/restore aşaması **DONDURULDU / NO-GO**. Bu, UX03'ü **geliştirme/Preview için serbest** bırakır; **Production migration/merge/deploy için izin değildir**.
- Production `DATABASE_URL`, `AUTH_SECRET`, `PROLIG_GO0_DB_ATTESTATION` ve Production Neon branch **değişmez**. P3 özel PNG varsayılan Production OFF kalır.

## Bu bağımsız PR neleri çözer?

1. Eski #104/#106 stacked PR'leri körlemesine main'e birleştirmek yerine yalnız UX03 ile ilgili dosyaların **güncel main** üzerine tek atomik taşıma işlemi. Eski #109'un **immutable eski Production SHA'sına sabit runtime probe script'i kesinlikle taşınmadı**.
2. `api/v1/management.ts` üzerinde UX03 reset talep/tamamlama handler'ları ile yeni Production GO0 observer `maybeLogGo0IdentityOnce` **birlikte korunur**. Health public yanıtı aynı kalır.
3. Recovery varsayılan OFF; backend Production açma koşulları ayrı dual flag, exact origin/Host ve doğrulanmış sender, e-posta sağlayıcı secret'ı ile fail-closed. Frontend ayrıca Vite Production flag'iyle kapalıdır. Preview'daki test e-posta ayarları Production'a kopyalanmaz.
4. `User.authVersion` JWT sürüm zorlaması recovery OFF olsa bile aktiftir; legacy sürümsüz JWT 401 ve ilk yetkili canlı sürümde yeniden giriş etkisi beklenir. ADR-005 rollback kısıtları geçerlidir.
5. `prisma/migrations/20261024010000_ux03_password_recovery` sadece ayrı UX03 additive SQL'dir. Standard `prisma migrate deploy` tüm migrations klasörünü çalıştıracağı için **Production'da yasaktır**; P3 migration'ı istemeden çalıştırabilir. [#107](https://github.com/saliharici/prolig/issues/107) seçici TEST Prisma kabulü korunur.

## TEST ve release kapıları

- GitHub CI ve izole branch scoped regression, build, lint: yalnız **yeni entegrasyonun** sonucu yeniden değerlendirilir. Önceden kullanıcı PASS olan password reset ve source #107 migration testi gereksiz tekrarlanmaz.
- Bu yeni Preview branch için ayrı Neon TEST `DATABASE_URL` tanımlı değilse uygulama API/e-posta gerçek kabulüne girilmez; PROD veya başka Preview'ın credential'ı alternatif yapılmaz.
- **Production NO-GO**: güvenilir güncel snapshot + **izole restore PASS** elde edilmeden, ve ayrıca şema önce-kod sonra/rollback/oturum yeniden giriş etkisi için yeni **somut işlem onayı** alınmadan bu PR main'e merge/deploy olmaz. Başarılı testler Production onayı yerine geçmez.
- İlk 7 günlük login token sürüm kısıtı: `authVersion` enforcement etkinleşirse mevcut sürümsüz JWT cookie'ler oturum yeniden girişine düşer. Canlı geri dönüş önce güvenli auth sürüm tabanı oluşturulmadan eski `26548720` veya `643cc3a5` sürümüne otomatik rollback değildir.
- **Sıradaki TEST teslimi:** CI yeşil, bağımsız Preview host ve branch veritabanı izolasyon kontrolü; mevcut kapalı PROD gate devam eder.

**Durum:** Sadece geliştirme/entegre TEST adımına geçildi. Ücretli plan, snapshot silme, Neon migration, canlı env, `main` merge veya Production yayın işlemi yapılmadı.
