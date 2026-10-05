# Pro Lig çalışma kuralları

Bu depo üzerinde çalışırken kredi ve bağlam kullanımını düşük tut:

- Yayındaki önizlemenin giriş noktası `src/main.tsx`, aktif uygulaması `src/DemoApp.tsx` dosyasıdır.
- Kullanıcı özellikle istemedikçe `legacy/`, `temp_restore/`, `dist/`, `node_modules/` ve geçmişte kalan `src/App.tsx` akışını inceleme.
- Önce hedefli `rg` araması yap; yalnızca değişecek dosyanın ilgili bölümünü oku. Tüm depoyu veya büyük dosyaları tekrar tekrar yazdırma.
- Küçük metin, stil ve tek bileşen işleri için düşük akıl yürütme düzeyiyle çalış. Alt ajanları yalnızca kullanıcı açıkça isterse kullan.
- Aynı değişiklik için lint ve build kontrollerini birer kez çalıştır. Yeni bir risk ortaya çıkmadıkça kontrolleri tekrarlama.
- Tarayıcı doğrulamasında ilgili ekranı ve ana etkileşimi bir kez kontrol et. Yapay zekâ üretim düğmelerini test amacıyla çalıştırma.
- Kullanıcının ilişkisiz yerel değişikliklerini koru; yalnızca görev kapsamındaki dosyaları commit et.

