# PRO-LIG P2 — izole gerçek tarayıcı kabulü (1. etap: salt-okunur)

**Amaç:** Gerçek React/Vite arayüzünü ve gerçek GET API işleyicilerini bağımsız `p2-acceptance-20261017` Neon dalı üzerinden görüntülemek. Bu etap **hiçbir veriyi kaydetmez/değiştirmez**. Daha önce **6/6 PASS** olan localhost HTTP/Neon testinin yerine geçmez; onun kullanıcı arayüzü kabulüne hazırlıktır.

## İzolasyon

- GitHub kodu: `feat/p2-professional-question-editor-20261012` geliştirme dalı; ana repo `D:\Proje\pro-lig` dosyalarına dokunma.
- Yerel test worktree: `D:\Proje\pro-lig-p2-acceptance` (detached HEAD normal).
- Gizli bağlantı dosyası: `.env.p2-acceptance.local` (gitignored, yalnızca mevcut ayrı Neon kabul dalı).
- Kabul Neon compute hostu: `ep-wild-sea-b2wlp46v.c-6.eu-central-1.aws.neon.tech`. `main` compute hostu ve Vercel bağlantısı kesinlikle kullanılmaz.
- Sunucu yalnızca `127.0.0.1:3138` portunda dinler, farklı Host/Origin isteklerini reddeder.
- Oturum açma: `/__p2-uat` yerel rol seçici pilot kullanıcıları **geçici test JWT'siyle** açar. Şifre gerekmez; gerçek parola/login süreci test edilmez. Yalnızca `YAZAR` ve `EDITOR` pilotları.
- `GET /api/v1/auth/me`, `GET /api/v1/questions`, `GET /api/v1/projects` gerçek API işleyicileridir. Diğer API işlevleri bloklanır; hiçbir POST/PATCH/DELETE/iş akışı/profil yazması açık değildir.
- Vite, ayrı config ile başlar; ortam dosyalarını yüklemez; gizli klasörleri sunmaz. `vercel dev`, seed veya migration çalıştırılmaz.

## Kullanım

PowerShell'de:

```powershell
cd D:\Proje\pro-lig-p2-acceptance
git status -sb
git fetch origin
git switch --detach origin/feat/p2-professional-question-editor-20261012
npx prisma generate
node scripts/p2-browser-acceptance.mjs --preflight
```

Son komut `PASS` verdikten sonra:

```powershell
node scripts/p2-browser-acceptance.mjs --serve
```

Tarayıcıda **`http://127.0.0.1:3138/__p2-uat`** adresini açıp **Pilot YAZAR** seçin. Sonra aynı yerel sayfaya dönerek **Pilot EDİTÖR** görünümünü ayrıca kontrol edin. Sunucuyu kapatmak için PowerShell'de **Ctrl+C**.

## Görsel kabul kontrol listesi

- [ ] Pilot YAZAR oturumunda P2 beş adımlı Soru Stüdyosu görünür; dört seçenekli / beş seçenekli / Doğru-Yanlış / Açık Uçlu türler seçilebilir.
- [ ] Dört seçenekli soruda A–D; 5 seçenekli için lise/Mezun sınıfı seçildiğinde A–E görünür; 8. sınıfta beş seçenek geçersiz uyarısı çıkar.
- [ ] Doğru-Yanlış alanı ve Açık Uçlu model yanıt/rubrik alanları görsel ve klavye açısından kullanılabilir.
- [ ] Soru gövdesi TipTap araçları, matematik işareti/önizleme, Türkçe karakterler ve uzun metin test edilir.
- [ ] Önizleme (masaüstü ve 390px mobil) alanlarında taşma/odak/erişilebilirlik sorunları gözlemlenir.
- [ ] Pilot YAZAR ile `PILOT-MAT-8-001` projesi listelenir; proje seçimi 8. sınıfa kilitler.
- [ ] Pilot EDİTÖR rolüyle yazarın yeni soru oluşturma yetkisi yok; farklı rol görünümü doğrulanır.
- [ ] Gözlem sonrası sunucu durdurulur; salt-okunur modda soru sayısı / denetim kayıtları değişmemiş olmalıdır.

**Not:** Butonların ekranda görünmesi, yazmanın mümkün olduğu anlamına gelmez; bu aşamada kaydetme isteği 403 ile bloklanır. Tarayıcıda gerçek soru oluşturma, kaydetme, yeniden açma ve temizleme için ayrıca **güvenli yazmalı ikinci etap** hazırlanmalı; P1-D sandbox'ın anahtar/bağlantı dosyaları asla kullanılmamalı.

## Mevcut gerçek HTTP kabul sonucu

17 Ekim 2026: 6/6 PASS, 48 saniye, `ec0d1a13`. Sonrasında Neon `main` ve izole kabul dallarında 5'er soru, yapay soru kalıntısı 0, orijinal Question satır özetleri eşleşiyor. İzole dalda önceki timeout denemesinden `ActivityLog #529` tarihi kayıt olarak kaldı; otomatik silinmedi.
