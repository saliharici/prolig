# Pro Lig - 5 Dakikalık Canlı Demo Senaryosu

**Hazırlık:**
Sunum başlamadan önce terminalden yerel sunucuyu (`npm run dev`) başlatın. Veritabanının `scripts/seed-presentation.ts` çalıştırılarak örnek demo verileriyle dolu olduğundan emin olun. (Bu script LGS/YKS gibi sahte projeleri içerir).

### Adım 1: Yönetici (Yayıncı) Girişi ve Proje Ataması (01:00)
1. Ekranda Giriş Sayfası açık. (Arka planda rastgele değişen şık bir Bing tarzı görsel).
2. **Rol:** `YÖNETİCİ` seçilerek sisteme girilir.
3. Sol menüden **Projeler** (veya Dashboard Proje Ekle) sekmesine tıklanır.
4. "LGS 2027 Matematik Denemesi" projesi listede gösterilir.
5. "Yazar Ata" veya "Yazar Havuzu" (Harita/Liste) kısmına gelinir. Branşı *Matematik* olan demo yazar bu projeye atanır.
   * *Not:* Yönetici ekranında Türkiye Haritası gösterilebilir ("Türkiye'nin her yerinden yazar ağı yönetimi" vurgusu).

### Adım 2: Yazar Deneyimi ve Soru Girişi (02:00)
1. Sağ üstten **Çıkış Yap** denir. (Aynı sekmede oturum yönetimi gösterilir).
2. **Rol:** `YAZAR` olarak tekrar girilir.
3. Sadece yazara özel, sadeleştirilmiş sol menü görünür. 
4. **Soru Havuzu** sekmesine tıklanır. Yazar sadece *kendi boş listesini* görür.
5. **Yeni Soru Ekle** butonuna basılır.
   * **Proje:** LGS 2027 Matematik (Listeden seçilir)
   * **Kazanım:** M.8.1.2 (Örnek kazanım girilir)
   * **Metin:** "Örnek bir LGS matematik sorusu..."
6. *(Ön İzleme)* **Yapay Zekadan Analiz Al** butonuna tıklanır. AI'nin metne uygunluk, yazım kuralları vb. geri dönüş yapması (Preview olarak) gösterilir.
7. Kaydet'e basılır. Soru **"TASLAK"** statüsünde listeye düşer. Durum değiştirilerek **"İNCELEMEDE"** yapılır.

### Adım 3: Editör (Kontrolör) Revizyonu ve Onay (01:30)
1. **Çıkış Yap** -> **Rol:** `EDİTÖR` veya `YÖNETİCİ` olarak girilir.
2. **Soru Havuzu** açılır. Tüm havuz görülür. Yazarın az önce girdiği "İNCELEMEDE" statüsündeki soru açılır.
3. Editör notu kısmına: *"Kazanım koduna göre soru fazla zor olmuş, rakamları küçültelim"* yazılarak statü **"REVİZYON"** yapılır.
4. *(İsteğe Bağlı Hızlı Gösterim)* Yazar rolüne dönülüp revizyon yapılır ve tekrar yollanır.
5. Son olarak Editör soruyu **"ONAYLANDI"** statüsüne çeker. *Vurgu: Onaylı soru kilitlenmiştir, yazar bir daha değiştiremez.*

### Adım 4: Yöneticinin İlerleme Takibi (00:30)
1. Yönetici ana paneline (Dashboard) dönülür.
2. Grafiklerde "Onaylı Soru Sayısı"nın arttığı, projenin % oranının ilerlediği gösterilir.
3. Sürecin WhatsApp/Excel kullanılmadan platform içi bittiği cümlelerle toparlanarak demo bitirilir.
