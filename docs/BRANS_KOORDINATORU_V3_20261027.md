# PRO-LIG V3 | Branş Koordinatörü dönüşümü

**Düzenleme:** 27.10.2026 | **Dal:** `feat/branch-coordinator-v3-20261027` | **Hedef:** izole Preview (Production değil).

## Ürün kararı

İl Koordinatörü yerini **Branş Koordinatörü**ne bırakır. Yeni rol `BRANS_KOORDINATORU` olup yetkisi coğrafi ile değil, kullanıcıya atanmış 1+ branşla belirlenir. Branş ataması yoksa bütün proje/soru/yazar okuma kapsamı boş kalır.

## İş akışı

Genel Koordinatör, kullanıcı oluşturma veya düzenleme ekranından branş koordinatörünü belirler, bir veya daha çok branş seçer. Branş koordinatörü yalnız kendisine atanmış branşlardaki yazar, soru, proje, görev, mesaj ve duyuruları görür/yönetir. Projeyi başka bir branşa taşıyamaz ve başka branşta proje oluşturamaz. Üyelik başvurusu, kullanıcı aktivasyonu/silme ve başka kullanıcıya rol dağıtımı bu rolün yetkisi değildir. Editöre ait soru onaylama yetkisi devredilmez.

## Veri geçişi

`prisma/migrations/20261027010000_branch_coordinator_role/migration.sql`: Mevcut PostgreSQL `RoleCode` enum değeri yeniden adlandırılır. Bu, var olan rol satırını ve bağlı kullanıcıları korur. Tarihsel telif tarifesi ve kazanım kayıtlarındaki düz metin rol kodları yeni değere güncellenir; geçmiş tutar ve ödeme durumları değiştirilmez. `PROJECT_PROVINCE_COORDINATOR` tarihsel, dahili kazanım tipi kimliği korunmuştur ancak görünür Türkçe etiket **Branş koordinasyonu** olur; böylece eski kayıtların bağları kırılmaz.

**Önemli:** Geçişte eski il koordinatörlerine otomatik / tüm branş erişimi verilmez. Her hesabın branş atamasını Genel Koordinatör yapmalıdır.

**Uygulama:** Migration yalnız ayrıca yetkilendirilmiş izole TEST veritabanında, ilgili kodla birlikte çalıştırılır. Production DB migration, main merge, env/deploy için ayrı açık onay gerekir.

**Doğrulama durumu:** Kullanıcı isteğiyle otomatik test kampanyası açılmadı; gerçek Preview işleyişi PASS olarak işaretlenmedi.

## 28.10.2026 — İzole TEST örnek üretim paketi

Branş `br-round-wind-balw5c6m` / veritabanı `ux02_test` üzerinde, yalnızca `TEST` etiketiyle 6 aktif ama parola tanımlanmamış örnek YAZAR (3 Matematik, 2 Fizik, 1 Türkçe), Matematik + Fizik atamalı 1 `BRANS_KOORDINATORU`, 2 örnek kitap projesi (`TEST-MAT-7-2026`, `TEST-FIZ-10-2026`), 4 örnek görev vardır. Örnek kayıtların oluşturulması izole TEST'e mahsustur; Production kapsam dışıdır.

Branş Koordinatörü ilk TEST girişinde `preview-brans@prolig.invalid` için şifresini kendisi belirler. Bu işlem Vercel'in mevcut `/api/v1/auth/login` uç noktası üzerinden yalnız ilgili Preview'a ve tanımlı izole Neon hedefine izin verilerek yapılır. Örnek yazarların parola tanımı yoktur, giriş yapamazlar. Görev formunda proje/branş bağlamı, yalnız projeye atanmış aktif yazarlar, bu projedeki açık görev sayıları ve yeni görev sorumlusu seçimi gösterilir.

Kullanıcı talebi gereği ayrı otomatik test kampanyası başlatılmamıştır. Gerçek Preview rol kabulü kullanıcı tarafından doğrulanmadıkça PASS sayılmaz.

## 28.10.2026 — TEST yazar–editör kabul akışı (PR #117)

İzole Neon dalı `br-round-wind-balw5c6m` / `ux02_test` üzerinde iki örnek editör oluşturuldu:
`preview-editor-mat@prolig.invalid` (Matematik, Ankara, 7. Sınıf) ve
`preview-editor-fiz@prolig.invalid` (Fizik, Erzurum, 10. Sınıf).
İlk şifreleri henüz yoktur. Matematik/Fizik örnek yazar girişleri mevcut `prolig-fixture-mat1@prolig.invalid` ve `prolig-fixture-fiz1@prolig.invalid` hesaplarını kullanır; ilk şifre tanımı yalnız izole Preview ortamına bağlı `/api/v1/auth/login` fonksiyonunun `testFixtureSetup` dalından yapılır.
Parola kod veya konuşma üzerinden paylaşılmaz ve ilk kayıt sonrasında üzerine yazılmaz.

Ayrı TEST akışını göstermek için 2 `INCELEMEDE`, 1 `REVIZYON`, 1 `ONAYLANDI` durumlu tamamen sentetik soru bulunmaktadır. Onaylı soru bir **gerçek editör kararı değildir**; yalnız kitap önizleme ekranını göstermek için oluşturulan örnek kayıttır. Gerçek telif kuralı ve ödeme kaydı oluşturulmadı.

Yazar görev kartındaki `Soru taslağı oluştur` düğmesi var olan soru hazırlama ekranına geçer, projeyi ve sınıfı seçer. Görev–soru arasında ayrı bir veritabanı FK oluşturulmaz; takip **proje** üzerinden yapılır. Editörlerin onay/revizyon/ret yetkisi mevcut sunucu kurallarıyla sınırlıdır, Branş Koordinatörüne editör kararı verilmez.
Genel Koordinatör proje detayındaki `Bu projeden kitap hazırla` düğmesi kitap önizleme sayfasını proje filtresiyle açar. Kitap önizlemesi ve kalıcı V2 yayın dosyası birbirinden farklıdır.

Bu paket Production'da etkinleştirilmedi ve üretime deploy/merge edilmedi. İlgili rol kabulü kullanıcı tarafından gerçekleşince PASS olarak işaretlenecektir.
