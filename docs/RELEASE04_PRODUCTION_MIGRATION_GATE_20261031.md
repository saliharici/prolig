# RELEASE-04 — Production migration ve geri dönüş kapısı
**Tarih:** 2026-10-31 · **Durum:** G1 tarihsel checksum provenansı ÇÖZÜLDÜ; diğer yayın kapıları NO-GO — Production değişmedi.  
**Takip:** Issue #119 / PR #118. **Yetki:** 03 MİMARİ karar; 01 TEST GitHub kodu; 02 CANLI yalnız onaylı Production operasyonu.

## Hedef

Production canlı adresi `https://prolig.vercel.app/` korunarak, V3 görev–soru şeması ve Branş Koordinatörü rolü eklemeli biçimde getirilecek. Eski `IL_KOORDINATORU`, 15 mevcut kullanıcı, 2 proje, 11 soru, 5 kitap ve finansal/tarihsel kayıtlar korunacak. **P3 private PNG** Production'da etkinleştirilmeyecek. Yeni dal, ayrı test sitesi, Codex ve tekrarlanan test kampanyaları yok.

## ÖNEMLİ ÇÖZÜM — 31.10.2026 (GitHub kaynak + Production ledger doğrulaması)

**G1 / tarihsel checksum uyuşmazlığının gerçek nedeni: SQL içerik farkı değil, LF ↔ CRLF satır sonlarıdır.** GitHub'da 5 tarihsel migration dosyasının `LF` içeriği SHA-256 olarak Production ledger ile farklı görünüyordu. Beşinin de satır sonu `CRLF` olarak yeniden oluşturulunca SHA-256, ilgili `_prisma_migrations.checksum` değeriyle **bire bir eşleşti (5/5)**. Diğer dört dosya mevcut biçimiyle eşleşiyor (4/4). Bu, 9 başarılı tarihsel migration dosyasının **bayt düzeyinde yeniden üretilebilir olduğunu** gösterir; geçmiş SQL kaynak kodu veya Production kayıtları değiştirilmedi.

**Uygulanan düzeltme:** `scripts/release04-stage-production-migrations.mjs` artık yalnız hash bire bir tutarsa beş tarihsel dosyayı **geçici dağıtım adayına CRLF baytlarıyla** yazar; GitHub `prisma/migrations` kaynakları değiştirilmez. Dosyaların on-disk SHA-256 değerini yeniden doğrular. P3 migration'ı **seçili adaydan dışlanır**. Tek katı hazırlık modu hem CI hem sonraki onaylı yayın içindir; `--local-ci` ile checksum bypass yok. `RELEASE04_MANIFEST.json` hangi dosyaların CRLF'ye dönüştürüldüğünü ve doğrulanmış hash'leri içerir.

**G1 sonucu:** Önceki beş uyuşmazlık **kaynak provenansı bakımından çözüldü**. GitHub CI'nin son kaynak SHA'sına ait sonuçları ayrıca doğrulanmadan otomatik PASS verilmez. Production release kararı hâlâ G2–G5 bağımlılıklarına tabidir.

## Salt-okunur kanıt — 31.10.2026 (ilk gözlem, yukarıdaki bulguyla uzlaştırıldı)

- GitHub `main` / Vercel READY: `643cc3a524cb54c497cda550980fbc78f999be4d`; restore-adayı deployment `dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc` (DB geri dönüşü değildir).
- Neon Production kimliği: project `calm-band-45633698`, branch `br-soft-salad-b2vb8sdr`, DB `neondb`.
- `_prisma_migrations`: **9 başarılı**, `20261018221000_publishing_book_chapters_v2` için **1 rolled-back deneme** ve daha sonraki başarılı uygulama; bu kayıtlar silinmez.
- **İlk gözlemdeki tarihsel SQL checksum farkı (nedeni CRLF olarak çözüldü):** Aşağıdaki 5 migration dosyasının PR #118 / main üzerindeki mevcut içeriğinin SHA-256 değeri, Production migration ledger değerinden farklıdır. GitHub dosyalarının LF hâli ledger ile farklıydı; CRLF baytlarına dönüştürülmüş hâllerinin tamamı ledger ile bire bir eşleşti:
  1. `20261009013000_member_scope_management`
  2. `20261010190000_compensation_engine_foundation`
  3. `20261010210000_payment_period_settlement`
  4. `20261011115000_question_media_assets`
  5. `20261018221000_publishing_book_chapters_v2`
- 4 diğer tarihsel migration SHA-256 ile **bire bir eşleşti**. Kaynak dosyalarının ilk LF hâlindeki fark, yukarıda doğrulanan CRLF geri yüklemesiyle açıklanmıştır.
- P3 `20261021120000_p3_private_geometry_assets` Production'a **uygulanmamış**; varsayılan `prisma.config.ts` hâlâ `prisma/migrations` dizinini kullanıyor ve P3 içeriyor.

## Hazırlanan teknik çözüm — GitHub kaynak kodunda, Production'a uygulanmadı

1. `scripts/release04-stage-production-migrations.mjs`: 9 mevcut tarihsel migration ve 3 yeni migration için açık izin listesi; her tarihsel dosya için özgün SHA-256 veya **CRLF'ye dönüştürülünce bire bir eşleşen SHA-256** gerekir. Başka hiçbir SQL dönüşümüne izin vermez. GitHub'daki tarihsel SQL dosyalarını veya Production ledger'ı değiştirmez.
2. `prisma/.release04-production-migrations`: Git tarafından izlenmeyen tekil dağıtım aday dizini. Çıktıda tüm **9 tarihsel checksum Production ile aynı**, 3 yeni migration mevcut ve P3 migration **yok**. `RELEASE04_MANIFEST.json`, kaynak hash'lerini, aday hash'lerini ve dönüştürülen beş dosyayı listeler.
3. `prisma.config.release04.ci.ts`: Yalnız `127.0.0.1/localhost` ve `prolig_release03_ci` adlı ephemeral PostgreSQL'i kabul eder, Production'a bağlanmaz.
   `prisma.config.release04.production.ts`: **Gelecekteki onaylı 02 CANLI işlemi için kaynakta hazır, henüz kullanılmıyor.** Varsayılan Prisma config değildir. Yalnız GitHub `refs/heads/main`, açıkça onaylanmış tam SHA, onaylanmış Neon endpoint hostu, `sslmode=verify-full`, kesin `neondb` ve ayrı yayın onay değişkeniyle çalışır; 12 dosyanın SHA-256 değerleri ve P3 yokluğunu ayrıca doğrular. Bu yapılandırmanın varlığı tek başına migration/deploy izni değildir.
4. `.github/workflows/release03-minimal-v3.yml`: Aynı katı dosya hazırlama mekanizmasını kullanır; ardından izole PostgreSQL'de seçilmiş şemayı uygular. `scripts/release04-verify-v3-branch-schema.mjs` V3, tarihsel IL, yeni BRANS ve **P3 tablosunun bulunmadığını** denetler.
5. Bekleyen üç migration: `20261029010000_task_question_production_v3` (Task.targetQuestionCount ve Question.taskId), `20261031010000_release04_expand_branch_coordinator_enum` (BRANS enum ADD VALUE), `20261031011000_release04_seed_branch_coordinator_role` (rol satırı).

## Production geçişi için tamamlanması gereken kapılar

**G1 — Migration provenansı (kaynak düzeyinde ÇÖZÜLDÜ, son CI sonucu ayrıca izlenir):** 5/5 dosya CRLF ile, 4/4 dosya doğrudan Production SHA-256 değeriyle eşleşti. Hazırlama aracı checksum uyuşmazlığında durur, tarihsel kaynakları ve ledger'ı değiştirmez. P3 aday paketten dışlanır.

**G2 — Preflight:** 02 CANLI, işlem öncesi veritabanı kimliğini, mevcut 9 başarılı + 1 geri alınmış kaydı, P3 yokluğunu ve V3 kolonlarının yokluğunu yeniden doğrular. Gerçek geri dönüşün restore maliyeti/erişimi ve atomik yedek/branch noktası teyit edilmeden deploy yok.

**G3 — Kod sürümü:** Tek release SHA'sında uygulama hem tarihsel `IL_KOORDINATORU` hem `BRANS_KOORDINATORU` okur; yeni BRANS rolleri için bölge∩branş yetkisi var. Önceki deployment'ın yeni BRANS hesabını desteklemediği unutulmasın. Kullanıcıların eski role dönüşü sessizce yapılmaz. Raporlar/kitap/mesaj/duyuru/finans modülleri açıkça RBAC denetimli; yapılmadıysa deny.

**G4 — Yayın sırası:** Mevcut kayıtların salt-okunur durumu → operasyon onayı ve geri dönüş noktası → **seçilmiş, kontrol edilmiş SQL migration** → birleşik uygulama deploy → sağlık/veri tutarlılık kontrolü → atanacak BRANS kullanıcıları için yetkili Bölge/Genel Koordinatörün açık branş seçimi. Hiçbir adım önceki adımdan varsayımsal PASS devralmaz.

**G5 — Geri dönüş:** Migration eklemeli olduğu için tarihi IL ve mevcut finans korunur; ancak **eski Vercel deploy tek başına BRANS rolünü tanımaz.** Yeni BRANS hesapları oluşmuşsa yalnız uygulama rollback'i yeterli değildir. Önceden hazırlanmış çift-rol uyumlu kurtarma sürümü/ileri düzeltme veya yetkili hesap kapsamı uzlaştırması gerekir. Eski Enum değerini silme ve `DROP` veya tablo restore etme bu işin kapsamında değildir.

## Doğrulanmış otomatik kabul kanıtı

GitHub commit `bf6ce72476dd687ed2dba639d2cfc08be58561cd`: **4/4 PASS** — Pro-Lig CI, Publishing V2, P2 Isolated PostgreSQL ve RELEASE-04 (P3 hariç, satır sonu uzlaştırılmış 12 migration'lı ephemeral PostgreSQL).

Bu kanıt yalnız belirtilen commit içindir; sonraki kod commitleri ayrıca doğrulanır. Production Neon'a migration, `main` merge ve Vercel Production deploy **yapılmamıştır**.

## Şimdiki hüküm
**G1 kaynak provenansı çözüldü. Production: G2–G5 tamamlanana kadar NO-GO.** Sonuç doğrulanmadan `main` merge / deploy / Production migration / gerçek üye rol değiştirme yok. Denetlenmemiş hiçbir adıma PASS yazma.
