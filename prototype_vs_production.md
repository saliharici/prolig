# Pro Lig: Prototip vs. Üretim (Production) Farkları

Bu sunumda gösterilen sürüm bir **İş Akışı Prototipi (Workflow Prototype)** niteliğindedir. Yayına çıkmadan önce arka planda tamamlanacak mühendislik farkları şunlardır:

## 🟢 Prototipte Şu An Çalışan ve Kanıtlanan Yapılar
1. **İlişkisel Veritabanı ve Sahiplik:** Vercel Postgres üzerinde Yazarlar, Projeler ve Sorular arası tam (FK) bağlantı kurularak "Sadece kendine ait olanı görme" kuralı test edildi. Yazarın başkasının sorusuna veya onaylı soruya müdahale edememesi kanıtlandı.
2. **Rol Bazlı Erişim (RBAC):** Yönetici, Editör, Muhasebe ve Yazarın sadece kendi yetki ekranlarına (View) ve yetki izinlerine (API Endpoint) ulaşabilmesi mimarisi oturtuldu.
3. **Gerçek Zamanlı UI - API Bağlantısı:** Sayfa yenilense de (F5) durumun kaybolmaması (Persistent Session) sağlandı. LocalStorage bağımlılığından güvenli HTTP Cookie mimarisine geçildi (Sunum dışı güvenlik testleri yapıldı).

## 🟡 Üretim (Canlı Yayın) İçin Geliştirilecek Modüller
1. **Güçlü Şifreleme ve Gerçek Kayıt:** Sunumda kullanılan "Tek tıkla giriş (Rol Seçimi)" kaldırılacak; yerine e-posta, şifre ve bcrypt kullanılarak uçtan uca şifreli kayıt/onay mekanizması (JWT, Session Rotation) bağlanacak.
2. **Gelişmiş AI İşlemi:** Sunumda "Ön İzleme" (Preview) olarak işaretlenen Gemini entegrasyonu, gerçek prompt mühendisliğiyle branş bazlı (Matematik/Fizik) kural setleriyle çalışacak şekilde genişletilecek. Rate limit (Kota sınırları) üretim için ince ayarlanacak.
3. **Resim / Matematiksel Denklem Yükleme (S3 / Cloudinary):** Prototipte sadece metin (text) olan Soru Havuzuna; formül editörü (KaTeX/MathJax) ve sunucu taraflı güvenli resim/pdf yükleme entegrasyonu dahil edilecek.
4. **Gerçek (Dinamik) Dashboard KPI'ları:** Şu anda sunum amaçlı kısmi statik duran rapor grafikleri, tamamen veritabanından çekilen anlık toplamlar (SUM, COUNT) ile otomatik çalışır duruma çekilecek (Finans/Muhasebe kısmı).
5. **PDF Çıktı:** Onaylanan soruların tek tuşla Word/PDF formatında yayın evi matbaa dizgisine uygun çıktısı (Export) verilecek.
