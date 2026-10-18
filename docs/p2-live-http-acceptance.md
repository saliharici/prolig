# P2 canlı HTTP/API + Neon kabul testi

Bu test, `main` veya production üzerinde çalışmaz. Yalnızca aşağıdaki **izole** Neon dalına bağlanır:

| Özellik | Değer |
| --- | --- |
| Neon project | `prolig-pilot` — `calm-band-45633698` |
| Kabul branch | `p2-acceptance-20261017` — `br-quiet-tree-b2ganqkl` |
| Beklenen compute host | `ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech` |
| PostgreSQL database | `neondb` |
| Üretim `main` compute | Test için yasak |

## Çalıştırmadan önce

1. `D:\Proje\pro-lig` içindeki **P2 geliştirme dalına** geçin ve güncel kodu çekin. Gerçek kullanıcıları etkileyen Vercel/production değişkenlerini **değiştirmeyin**.
2. Neon Connect ekranında **yalnızca** `p2-acceptance-20261017` branch'ini seçerek *bu dalın* bağlantı dizesini alın. Bağlantı adresini veya parolayı sohbet, PR, issue veya GitHub koduna koymayın.
3. Repo kökünde git tarafından göz ardı edilen `.env.p2-acceptance.local` dosyasını hazırlayın:

   ```dotenv
   DATABASE_URL="postgresql://<acceptance-user>:<password>@ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   ```

   Bu satır **yalnızca örnektir**. Bağlantı dizesini Neon'dan alıp dosyaya yerel olarak koyun; yer tutucuları sohbet içinde paylaşmayın.

4. Uygun olduğunda sadece **salt-okunur** kontrolü çalıştırın:

   ```powershell
   node scripts/p2-acceptance-branch-check.mjs
   ```

5. Ön kontrol PASS ise ve bağımsız test dalına yapay soru yazılmasını onaylıyorsanız:

   ```powershell
   node scripts/p2-live-http-acceptance.mjs --run
   ```

## Testin yaptığı işlemler

- Yalnızca `127.0.0.1` üzerinde geçici HTTP sunucusunu açar; PRO-LIG'in gerçek API handler'larını çağırır.
- Gerçek pilot yazar ve editör kayıtlarının kimlikleriyle, sadece test süresinde üretilen **geçici imzalama anahtarı** üzerinden oturum çerezlerini doğrular. Kullanıcı parolalarını kullanmaz ve giriş ekranını test etmez.
- Yeni dört seçenekli (D), beş seçenekli (E), Doğru/Yanlış ve Açık Uçlu soru oluşturur, listeden yeniden okur, düzenler ve incelemeye gönderir.
- Yetkisiz kullanıcının isteklerinin reddini, stale revision kontrolünü, eksik model cevaplı soru engelini ve `ActivityLog` kayıtlarını kontrol eder.
- Her test sonunda yalnızca bu çalışmaya ait benzersiz `P2-HTTP-UAT-` işaretli **oluşturduğu** soru kayıtlarını temizler. Önce sahiplik, ilk kayıt kümesinden ayrışma, medya ve telif/ödeme ilişkisizliği kontrol edilir.
- İşlem hata nedeniyle yarım kalır ve güvenli temizlik gerçekleşmezse *manuel inceleme gerekir*. Başka soruları veya ödeme kayıtlarını otomatik silmeyin.

## Sınırlar

- Bu senaryo gerçek HTTP isteklerini localhost'ta, gerçek API handler'ları ve gerçek izole PostgreSQL ile çalıştırır. Vercel'in sunucusuz yönlendirmesi, production deploy, grafik editörün tarayıcı etkileşimi ve gerçek parola ile oturum açma ayrı UAT konularıdır.
- GitHub CI bu yazma testini **çalıştırmaz**. PR doğrulamasında yalnızca TypeScript, sözdizimi, birim testleri, build ve navigasyon kontrolleri çalışır.
- Bu test bir onay/red döngüsünde telif/ödeme tahakkuku üretmez; o akış için ayrıca güvenli kapsam gerekir.
