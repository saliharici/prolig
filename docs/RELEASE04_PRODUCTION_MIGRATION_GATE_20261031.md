# RELEASE-04 — Production migration ve geri dönüş kapısı
**Tarih:** 2026-10-31 · **Durum:** NO-GO — Production değişmedi.  
**Takip:** Issue #119 / PR #118. **Yetki:** 03 MİMARİ karar; 01 TEST GitHub kodu; 02 CANLI yalnız onaylı Production operasyonu.

## Hedef

Production canlı adresi `https://prolig.vercel.app/` korunarak, V3 görev–soru şeması ve Branş Koordinatörü rolü eklemeli biçimde getirilecek. Eski `IL_KOORDINATORU`, 15 mevcut kullanıcı, 2 proje, 11 soru, 5 kitap ve finansal/tarihsel kayıtlar korunacak. **P3 private PNG** Production'da etkinleştirilmeyecek. Yeni dal, ayrı test sitesi, Codex ve tekrarlanan test kampanyaları yok.

## Salt-okunur kanıt — 31.10.2026

- GitHub `main` / Vercel READY: `643cc3a524cb54c497cda550980fbc78f999be4d`; restore-adayı deployment `dpl_BWxhBb9PbHiWANZiPHcikzdDXMBc` (DB geri dönüşü değildir).
- Neon Production kimliği: project `calm-band-45633698`, branch `br-soft-salad-b2vb8sdr`, DB `neondb`.
- `_prisma_migrations`: **9 başarılı**, `20261018221000_publishing_book_chapters_v2` için **1 rolled-back deneme** ve daha sonraki başarılı uygulama; bu kayıtlar silinmez.
- **Tarihsel SQL checksum drift'i:** Aşağıdaki 5 migration dosyasının PR #118 / main üzerindeki mevcut içeriğinin SHA-256 değeri, Production migration ledger değerinden farklıdır. GitHub commit geçmişindeki görünen eski sürümler için henüz ledger ile bire bir uyum doğrulanmadı:
  1. `20261009013000_member_scope_management`
  2. `20261010190000_compensation_engine_foundation`
  3. `20261010210000_payment_period_settlement`
  4. `20261011115000_question_media_assets`
  5. `20261018221000_publishing_book_chapters_v2`
- 4 diğer tarihsel migration SHA-256 ile **bire bir eşleşti**. Başarısız checksum kanıtı, yeni migration'ı otomatik olarak güvenli yapmaz.
- P3 `20261021120000_p3_private_geometry_assets` Production'a **uygulanmamış**; varsayılan `prisma.config.ts` hâlâ `prisma/migrations` dizinini kullanıyor ve P3 içeriyor.

## Hazırlanan teknik çözüm — GitHub kaynak kodunda, Production'a uygulanmadı

1. `scripts/release04-stage-production-migrations.mjs`: 9 mevcut tarihsel migration ve 3 yeni migration için açık izin listesi. Dosya içeriklerini SHA-256 ile karşılaştırır; **kaynakta P3 kalır fakat aday dizine kopyalanmaz**. Beklenmedik/eski migration adı veya eksik SQL varsa hata verir. Üretilen `prisma/.release04-production-migrations` dizini gitignored; `RELEASE04_MANIFEST.json` ile kendi kapsamını yazar. Bu script SQL yürütmez, bağlantı istemez.
2. **Varsayılan mod (Production adayı):** Beş tarihsel checksum farkından herhangi biri sürdükçe `RELEASE04_PRODUCTION_LEDGER_DRIFT_NO_GO` ile durur. Checksum silmek/değiştirmek, `migrate resolve --applied` ile sahte kayıt oluşturmak veya kayıplı geçmiş yazmak yasaktır.
3. **`--local-ci` modu:** Yalnız GitHub CI (`CI=true`) için geçmiş farklarını **açıkça `historicalChecksumCertified=false`** olarak kaydederek P3 dışlayan migration setini oluşturur. Bu modun PASS sonucu **Production geçmişi için PASS değildir**.
4. `prisma.config.release04.ci.ts`: Yalnız `127.0.0.1/localhost` ve `prolig_release03_ci` ephemeral PostgreSQL veritabanında kullanılır; Production bağlantısını reddeder.
5. Mevcut `.github/workflows/release03-minimal-v3.yml`, seçilmiş P3'süz migration zincirini test PG'de uygular. `scripts/release04-verify-v3-branch-schema.mjs` V3 kolonlarını, **eski IL + yeni BRANS** enum değerlerini ve **P3 tablosunun bulunmadığını** doğrular.
6. Açık üç migration: `20261029010000_task_question_production_v3` (Task.targetQuestionCount, Question.taskId), `20261031010000_release04_expand_branch_coordinator_enum` (BRANS enum ADD VALUE), `20261031011000_release04_seed_branch_coordinator_role` (rol satırı). Tarihsel IL kullanıcıları veya finansal kayıtlar güncellenmez.

## Production geçişi için tamamlanması gereken kapılar

**G1 — Migration provenansı (şu an FAIL):** Beş dosya için özgün SQL checksum'ları, güvenilir yedek/ilgili deployment kaynağı üzerinden doğrulanmalı; gerekirse ayrı, açıkça onaylı tarihsel drift uzlaştırma kararı verilmeli. Mevcut `main` SQL'sinin uygulandığını varsayma. Prisma ledger'a `INSERT/DELETE/UPDATE` yapma.

**G2 — Preflight:** 02 CANLI, işlem öncesi veritabanı kimliğini, mevcut 9 başarılı + 1 geri alınmış kaydı, P3 yokluğunu ve V3 kolonlarının yokluğunu yeniden doğrular. Gerçek geri dönüşün restore maliyeti/erişimi ve atomik yedek/branch noktası teyit edilmeden deploy yok.

**G3 — Kod sürümü:** Tek release SHA'sında uygulama hem tarihsel `IL_KOORDINATORU` hem `BRANS_KOORDINATORU` okur; yeni BRANS rolleri için bölge∩branş yetkisi var. Önceki deployment'ın yeni BRANS hesabını desteklemediği unutulmasın. Kullanıcıların eski role dönüşü sessizce yapılmaz. Raporlar/kitap/mesaj/duyuru/finans modülleri açıkça RBAC denetimli; yapılmadıysa deny.

**G4 — Yayın sırası:** Mevcut kayıtların salt-okunur durumu → operasyon onayı ve geri dönüş noktası → **seçilmiş, kontrol edilmiş SQL migration** → birleşik uygulama deploy → sağlık/veri tutarlılık kontrolü → atanacak BRANS kullanıcıları için yetkili Bölge/Genel Koordinatörün açık branş seçimi. Hiçbir adım önceki adımdan varsayımsal PASS devralmaz.

**G5 — Geri dönüş:** Migration eklemeli olduğu için tarihi IL ve mevcut finans korunur; ancak **eski Vercel deploy tek başına BRANS rolünü tanımaz.** Yeni BRANS hesapları oluşmuşsa yalnız uygulama rollback'i yeterli değildir. Önceden hazırlanmış çift-rol uyumlu kurtarma sürümü/ileri düzeltme veya yetkili hesap kapsamı uzlaştırması gerekir. Eski Enum değerini silme ve `DROP` veya tablo restore etme bu işin kapsamında değildir.

## Şimdiki hüküm
**Kodlama/izole CI devam edebilir. Production: NO-GO.** Sonuç doğrulanmadan `main` merge / deploy / Production migration / gerçek üye rol değiştirme yok. Denetlenmemiş hiçbir adıma PASS yazma.
