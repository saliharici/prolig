# P3-AA — İzole Preview gerçek kullanım kabul planı

**Kapsam:** Yalnız `feat/p3aa-private-png-studio-ui-20261021` Vercel Preview dalı, Neon `wandering-hill-34960596` / `br-misty-base-bac3oqzr` / `neondb`, private bucket `prolig-p3-geometry-test`.

**Production kesinlikle kapsam dışı:** `main`, `prolig.vercel.app`, Production env ve gerçek kullanıcı verileri değişmeyecek. PR #91 taslaktır; merge izni verilmedi.

## Ortam ayarları

Vercel > Project `prolig` > Settings > Environment Variables bölümünde **Preview**, **yalnız P3-AA Git dalı** seçilmeli. Başka dala veya Production hedefine değer girilmemeli.

- `DATABASE_URL`: Neon test projesi `neondb` bağlantı dizesi; yalnız Neon Console üzerinden güvenli şekilde kopyalanır.
- `AWS_ENDPOINT_URL_S3`: `https://br-misty-base-bac3oqzr.storage.c-8.eu-central-1.aws.neon.tech`
- `AWS_REGION`: `eu-central-1`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: Neon Console > Storage/Scoped Credentials > **PROLIG P3-Z isolated preview QA** hesabının S3 kimlik bilgileri (encrypted, yalnız Preview/Git branch). Sohbete, GitHub dosyasına veya ekran görüntüsüne yazılmaz.
- `PROLIG_P3_PNG_UPLOAD_ENABLED=true`
- `PROLIG_P3_BOOK_EXPORT_ENABLED=true`
- `PROLIG_BOOKS_V2_ENABLED=true`
- `AUTH_SECRET`: mevcut ve geçerli Preview kimlik doğrulama gizlisi; Production sırrı manuel kopyalanmaz.
- `VITE_P3_PRIVATE_GEOMETRY_ENABLED=true`, `VITE_QUESTION_STUDIO_P1=true`, `VITE_QUESTION_STUDIO_P2_EDITOR=true`, `VITE_QUESTION_STUDIO_P2_TYPES=true`, `PROLIG_QUESTION_TYPES_P2=true`: P3-AA dalına özel yapılandırıldı.

**Not:** Gizli değişkenlerin servisler arası otomatik aktarımı engellendi. QA için Neon Storage kimlik bilgileri kullanıcı tarafından Vercel'in gizli değişken ekranına girilmeli. Harici bir dosyaya veya sohbet mesajına yapıştırılmamalı.

## Dağıtım ön şartı

2026-10-21 denemesinde Vercel API 402 / `api-deployments-free-per-day` (günlük 100 dağıtım) nedeniyle yeni Preview oluşturamadı. Yaklaşık 24 saatlik kota yenilenmesini bekleyin veya Vercel hesap panelinde mevcut sınırı doğrulayın. **Kota aşmak için Production deploy yapılmaz.**

Git branch adı ve deploy commit'i doğrulanmadan test başlatılmamalıdır. SSO korunmalı.

## Kontrol akışı

1. P3-AA Preview'da test hesabıyla (**aktif YAZAR**) giriş yap; bağımsız P3 test veritabanındaki, yazarın kendisine ait **TASLAK veya REVIZYON** soruyu aç.
2. Soru stüdyosu > 2. adım > **Özel çizimler** alanının yalnız kaydedilmiş sorularda göründüğünü kontrol et.
3. Ufak RGBA PNG yükle. Arayüzde `geometryUpload` özel kovaya yüklemeyi, `geometryBind` HMAC makbuzu ve en son soru sürümüyle ilişkilendirmeyi tamamlamalı. Yanıtta `linkedToQuestion=true` ve yeni `updatedAt` görülmeli; istemciye S3 URL verilmemeli.
4. Soruyu kapatıp yeniden aç. `geometryList` kayıt kimliklerini göstermeli; **Görüntüle** `geometryRead` üzerinden özel PNG'yi sunmalı.
5. Yanlış kullanıcı/soru, kilitli veya arşivli soru, yanlış Origin, bozuk PNG ve eski `expectedUpdatedAt` denemeleri reddedilmeli. Testler yalnız yapay test verisiyle yapılmalı.
6. Onaylı test sorusunu yetkili Genel Koordinatör ile test kitabı taslağına ekle; özel PNG manifesti dondurulmalı.
7. Word dosyasını oluştur. Kaydedilmiş PNG `word/media` paketine eklenmeli. Eksik/yanlış sürümlü özel görselde Word üretimi 422 ile durmalı.
8. Word dosyasını Microsoft Word'de açıp görselin ölçülerini ve sayfa yerleşimini **gözle doğrula**.

## Kapanış

İzole test veritabanında `PrivateGeometryAsset` tablosu ve Prisma migration kaydı mevcut; tablo ilk oluşturulduğunda boştu. QA başlamadan `SELECT count(*) FROM "PrivateGeometryAsset"` ile referans durumunu al; test bitiminde yalnız test kayıtlarını denetle. Production migration veya merge yapma.

**Kabul ölçütü:** Otomatik CI PASS + gerçek Preview yetki kontrolleri PASS + yükle/bağla/yeniden aç PASS + Word görsel kabul PASS. Şu anda **yalnız otomatik CI PASS** doğrulanmıştır.
