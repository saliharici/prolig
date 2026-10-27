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
