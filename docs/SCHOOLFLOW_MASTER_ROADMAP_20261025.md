# SCHOOLFLOW — YAZAR MERKEZLİ ÜRÜN VE TİCARİ PİLOT ANA YOL HARİTASI
**Sürüm:** 2.0 · **Tarih:** 25.10.2026 · **Karar sahibi:** 03 MİMARİ · **Durum:** Yeni önceliklendirilmiş uygulama planı, henüz tamamlanmış işler değil  
**Kaynak sırası:** GitHub main / gerçek Vercel–Neon → ilgili dosya/PR → tarihli ortak durum kaydı.  
**Doğrulanan main:** `643cc3a524cb54c497cda550980fbc78f999be4d` (25.10.2026). Önceki `02_ORTAK_DURUM_KAYDI.md` 22.10.2026 tarihlidir ve eski SHA içerir.

## 1. Amaç ve sabit marka sınırı
**SchoolFlow** yazılım sahibinin bağımsız ürünü ve ileride ayrı Super Admin platformudur. **PRO-LIG**, SchoolFlow'un ilk potansiyel yayınevi müşterisidir; geliştiricinin yayınevi/markası değildir. `https://prolig.vercel.app/` PRO-LIG kimliğinde kalır. Firma anlaşması gerçekleşmese de SchoolFlow'un yazar ağı ve yayıncılık motoru başka firmalara taşınabilir kalır. **ZirveNefesi** bağımsızdır; bu iş paketine girmez.

**Ürün omurgası:** YAZAR → kişisel soru kütüphanesi → kendi kullanımı (editör/onay/telif yok) **veya** yayınevine gönderim → kaynak/özgünlük ve TYMM incelemesi → editör revizyonu/onayı → kitap/Word → sözleşmeli tahakkuk ve ödeme takibi. Yazar ağının değeri bir müşteri sözleşmesine bağımlı değildir.

**Başarı:** Yazar kendi hesabıyla orijinal sorusunu bağımsız kaydeder, tekrar açar, düzenler, bir soru setinden Word çıktısı alır. Yayınevine ayrıca göndermeyi seçerse izinli editör onaylar, kaynak/TYMM kayıtlarını inceler, yalnız sözleşmeye uygun telif doğar. Firma gerçek hesapla bunu görebilir; ikna için sahte bir ikinci demo uygulaması yapılmaz.

## 2. Şimdi mevcut kanıtlar — üzerine inşa edilecek parçalar
- `prisma/schema.prisma`: `Question.projectId` **nullable**, `authorUserId` gerçek sahibi, `Question.status` içerik yayım akışı; `BookQuestion.snapshot` donmuş kitap kaydı; `CompensationEntry.sourceKey` tahakkuk tekilleştirme.
- `api/v1/questions/index.ts`: `YAZAR` kendi projesiz (`projectId=null`) TASLAK sorusunu oluşturabiliyor. `api/v1/questions/[id]/workflow.ts`: yayınevi onayı yetkili EDITOR/GENEL_KOORDINATOR tarafından; `approve` ile mali tahakkuk transaction içinde.
- Profesyonel Soru Stüdyosu, P2 çoklu tür, matematik/medya, kitap V2–Word, rol bazlı üyelik, yazar ve kişisel tahakkuk ekranı kodda mevcut. Önceden doğrulanmış soru editör ve P3 özel PNG–Word test PASS'leri korunur. **P3 özel PNG Production'da açık DEĞİL.**
- Mevcut DB tek kurum modelidir, tenantId/çok firma izolasyonu kanıtlanmış değildir. `IL_KOORDINATORU` henüz kodda; ürün kararı **`BRANS_KOORDINATORU` = bağlı bölge ∩ atandığı branş**. Eski iki kullanıcı otomatik dönüştürülmez.
- `PR #113` UX03 hâlâ DRAFT, `#108` Production backup/restore GO-0 NO-GO. Her ikisini görsel/yazar özelliği geliştirmesine blokaj yapma; bunları Production auth/schema değişikliklerinde ayrı dikkate al.
- TYMM referansı: `https://tymm.meb.gov.tr/ogretim-programlari` ve `https://mufredat.meb.gov.tr/Programlar.aspx`. **Programın yılı, sınıf/derse göre uygulanırlığı ve resmî kaynak kaydı** saklanmadan TYMM uygunluk damgası yok.

## 3. Tek işlik sıra — bitiş ölçütü olmadan sıradakine geçilmez

| Sıra | Öncelik / Paket | En küçük gerçek teslim (tek mantıklı iş paketi) | Kabul ölçütü |
|---|---|---|---|
| 0 | **P0 / Kaynak ve kapsam dondurma** | Eski PASS'leri envanterle, güncel main + Preview + doğru TEST Neon kimliğini doğrula; tek aktif ürün dalı ve kısa P0 eksik listesi. Eski issue/PR zincirlerini körlemesine birleştirme. | Tek sahipli sıra; SHA/DB/Preview belli; Production yazısı yok; tekrar test yok. |
| 1 | **P0 / Yazarın bağımsız soru kullanımı** | Mevcut Question Studio ve `projectId=null` ile kişisel kütüphane; şahsi soru seti/koleksiyon; kaydet/yeniden aç/düzenle; onaysız kendi Word çıktısı ve cevap anahtarı. `Yayınevine Gönder` ayrı işlem. | YAZAR→kişisel soru→Word gerçek kullanım PASS; EDITOR/ONAYLANDI/tahakkuk **oluşmaz**; yabancı yazar 403/404; mevcut yayınevi kitap motoru bozulmaz. |
| 2 | **P0 / Kaynak beyanı ve özgünlük kontrolü** | Yazar kaynak/kendi üretimi/uyarlama/izin beyanı; ilk sürüm iç havuzda birebir SHA ve yakın metin (`pg_trgm`) eşleşmesi; editör için kanıtlı risk raporu ve izin/revizyon kararı. Sonradan izinli kitap referans kütüphanesi. | Kopya/değiştirilmiş örnek işaretlenir; benzer TYMM kazanımını ölçen farklı soru otomatik intihal ilan edilmez; yüksek risk çözülmeden yayınevi onayı/telif yok; kişisel kullanım etkilenmez. |
| 3 | **P0 / Maarif Modeli içerik eşleştirmesi** | Resmî MEB programı + sürüm/yıl + ders/sınıf + öğrenme çıktısı/süreç bileşeni/ölçme kanıtı eşleme. Önce **tek ders ve tek sınıf** için doğrulanmış pilot. Etiket var / uzman inceledi ayrımı. | En az birkaç örnek soru doğru resmî kaynakla eşleştirilmiş; bilinmeyen kod otomatik uydurulmaz; editör eşleme gerekçesini görür; doğrulanmayan soruya TYMM PASS yazılmaz. |
| 4 | **P0 / Yazar ağı, rol ve telif şeffaflığı** | Yazar profil/ağ görünürlüğü isteğe bağlı; davet/portföy; `IL_KOORDINATORU`→`BRANS_KOORDINATORU` için bölge ∩ atanmış branş yetkisi; yazarın kendi değerlendirme tarihçesi, izinli kullanım ve `CompensationEntry` statüsü. Mevcut proje/kitap akışındaki yalnız kopuk bağları düzelt. | Farklı bölge/branş 403/404; aynı soru kişisel kullanımda tahakkuk yaratmaz; editör onayı doğan ücret tekil; başka yazarın audit/telif/IBAN verisi görülmez. |
| 5 | **P0 / Mevcut PRO-LIG'de gerçek firma pilotu** | `prolig.vercel.app` üzerinde gerçek, ayrı firma değerlendirici hesapları; YAZAR→EDITÖR→kitap/Word→telif görünümü, bölge+branş ve Muhasebe rolü; kullanıcının gördüğü eksiklere yönelik tek düzeltme döngüsü. Sahte ikinci demo, gerçek para transferi ve izinsiz marka değişimi YOK. | Bir firma temsilcisi kendi izinli rolüyle gerçek kayıtlar üzerinde süreci tamamlayabilir; sunumun hangi ekranları gerçek, hangi kısımları pilot olduğu açık; kısa firma geri bildirim kaydı. |
| 6 | **P1 / SchoolFlow platform, veri taşınabilirliği ve ölçekleme** | Ayrı SchoolFlow Super Admin control plane (firma kaydı, logo/tema, lisans, davet, askıya alma); PRO-LIG ilk tenant konfigürasyonu. Yazar/soru kimliği, kullanım hakkı, referans kayıtları ve medya manifestini kurumdan bağımsız taşınabilir hâle getir. İkinci firma kullanılacaksa kanıtlanmış DB+Storage izolasyonu önce gelir. | PRO-LIG marka/rolü SchoolFlow admin'e karışmaz; portatif içerik/metadata dışa alınıp test DB'de okunur; ikinci firma verisi ayrı izole edilmeden müşteri açılmaz. |

**Kritik hız ilkesi:** 0–1 doğrudan yürütülecek ilk görev; 2 ve 3 pilotta gösterilebilen dar ama gerçek kanıtlı sürüm olmalı, kapsamları ansiklopediye dönüşmeyecek. Aşama 4 için kapsamlı ağ/pazar yeri kurulmayacak; gerçek yazar profil/davet/telif görünümü yeterli. Aşama 5 kullanıcı onayına sunulur. Aşama 6'nın ücretli/çok firma kısmı ancak ticari talep oluşursa genişletilir. Aşamalar için doğrulanmamış gün sayısı veya otomatik PASS vaat edilmez.

## 4. Veritabanı stratejisi — önce ürün kimliği, sonra pahalı çoklu altyapı

**Mantıksal sınırlar:**
1. `User`/ `AuthorProfile` → kimlik ve profiller. **Yazarın mesleki kimliği SchoolFlow katmanında ele alınacak**, yayınevi çalışan erişimi ayrı. Mevcut tek kullanıcı şemasına tenant'lar arası evrensel erişim varmış gibi davranma.
2. `Question` → soru kimliği/sahibi; `QuestionRevision` immutable revizyon/snapshot; şahsi `QuestionSet` + `QuestionSetItem`.
3. `QuestionSubmission`/yayın projesi → soru yayınevine gönderim/onay; `QuestionUsageGrant` veya hak/lisans kaydı → kullanım kapsamı/izin/sözleşme, içerik ve kaynak hakları yazar hesabıyla karıştırılmaz.
4. `ReferenceSource` + `SimilarityScan` + `OriginalityReview` → kaynak/özgünlük denetimi; ilk sürüm Postgres SHA+yakın eşleşme, dış kitaplar ancak lisanslı/izinli kaynakla.
5. `CurriculumRelease` + `LearningOutcome` + `QuestionCurriculumMap` → TYMM sürüm, öğrenme çıktısı, süreç bileşeni, ölçme kanıtı, inceleme durumu; legacy `objectiveCode` korunur.
6. `CompensationEntry` + `Payment` + `BookQuestion.snapshot` → geçmiş fiyat, kaynak, ödeme ve basılmış kitap metni değişmez. Eser sahipliği, lisans ve telifin hukuki şartları sözleşmeyle belirlenir; sistem bunları otomatik varsaymaz.

**Uygulama kuralı:** Tüm yeni tabloları tek seferde açma. Bir aşamada gerçekten kullanılan en küçük **additive Prisma migration** paketi; eski kolonları kırmadan. Stable id / taşıma UUID'si ve içerik/asset manifesti ekle; `pg_dump` tek başına Neon Storage medya yedeği değildir. Başka kurum verisini ham hâliyle ortak havuza sızdırma.

**Free kullanımı:** `prolig-pilot` Production DB'si korumalı. **Tek önceden doğrulanmış izole TEST Neon** + Preview yeterli; her özellik için yeni Neon proje/branch/snapshot açma. Başarılı local/Preview testten sonra Production migration gerçekten gerekirse küçük **tek seferlik yerel mantıksal yedek + geri dönüş yolu + kapsamlı canlı işlem onayı**, fakat bunu her UI düzeltmesine uygulama. Mevcut tek snapshot/snapshot kotası nedeniyle #108 GO-0 NO-GO durumu değişmiş sayılmaz. Ana kaynağı kesinleştirmeden SQL/DB yazma yapma.

**Yetki olmazsa olmazları:** kişisel soru sadece sahibi; yayınevi onayı editör/genel koordinatör; kişisel çıktı onay/ücret yaratmaz; çapraz bölge/branş erişimi reddedilir; başka yayınevi veya kullanıcı soruları açık edilmez; aynı lisans/approval `sourceKey` çift ödeme doğurmaz; gizli anahtar/IBAN/log maruziyeti yok. Lisans olmayan kitap/içeriğe tarama yetkisi varmış gibi gösterme.

## 5. Çalışma protokolü — hız ve gereksiz testlerin sonu

- Her görev başında tek satır: **Hedef | kapsam | TEST ortamı | SHA | bitiş ölçütü**. Kapsamı bir kez belirle; 5–10 mikro-onaya bölme. 01 TEST tek izole Preview branch/tek mantıklı PR; 03 MİMARİ karar; 02 CANLI yalnız toplu, açık Production yayın/geri dönüş onayıyla.
- **Tek aktif bitirilebilir iş paketi (WIP=1).** Her hata için yeni backlog/ADR/PR oluşturma; aynı feature'ın eksiklerini mevcut iş kapsamında çöz. Önceki kullanıcı PASS'lerini tekrar oynatma; mevcut CI kanıtı değişmeyen alanı kapsar. Yeni riske **2–6 odaklı test + kısa rol smoke**; özel parasal yarış veya çapraz izin riski varsa gerekli ilave dar negatif test.
- **Ekran + kalıcı veri + gerçek eylem = teslim.** Yalnız mock sayfa, ekran görüntüsü veya CI build'i özelliğin kabulü değil. Her aşamada kullanıcıya açılabilir Preview + test rolü + örnek senaryo sun; FAIL/BİLİNMİYOR gizleme.
- Production'a deploy/main merge/DB migration/veri silme/secret değişikliği: **etkisi ve geri dönüşü belirlenmiş tek açık işlem onayı**; önceki 'hepsini onaylıyorum' genel ifadesini kalıcı izin sayma. En azından kritik veri yazımında basit bir dışa alma ve tutarlılık kontrolü; büyük snapshot testleri her düzeltmede yok.
- Müşteri temasını sürekli ertelenen ileri aşamaya hapsetme: **1. gerçek kullanım paketi çalışınca** mevcut firmaya ön izleme/pilot erişim yolu hazırla, 2–4 aşamaları gereksinime göre daraltıp hızla tamamla. Bekleyen firmanın somut geri bildirimi soyut mükemmeliyetçilikten üstündür.

## 6. İlk uygulanacak tek iş emri (01 TEST)

**CORE-01A — YAZARIN ŞAHSİ SORU KULLANIMI**  
**Kaynak:** [Issue #115](https://github.com/saliharici/prolig/issues/115). `main` güncel SHA'yı yeniden kontrol et; `src/questions/*`, `api/v1/questions/*`, `src/publishing/*` ve ilgili test dosyalarından mevcut akışı yeniden kullan.  
**İş:** `YAZAR` profili ile `projectId=null` şahsi soru kaydı→yeniden açma→(gerekirse) özel set ekleme→kendi Word çıktı+cevap anahtarı; ayrı `Yayınevine Gönder` akışı ve en az yetkiyle korunan API. Önceden PASS soru editorünü veya özel PNG kabulünü yeniden çalıştırma; özel PNG halen yalnız izinli Preview.  
**Bitiş:** Canlı ürünün kodunu kırmadan izole Preview'da gerçek kaydet/yeniden aç/Word akışı PASS; EDITOR/APPROVED/royalty doğmadığı ve yabancı yazar 403/404 dar negatif kontrolleri PASS; SHA/Preview/TEST Neon kanıtı; eksikler açık rapor.

## 7. Devir ve kapanış
**Ortam:** MİMARİ → 01 TEST; Production değişmedi.  
**Kanıt:** main `643cc3a5`, önceki kullanıcı PASS kayıtları, [#114 PILOT-01](https://github.com/saliharici/prolig/issues/114), [#115 CORE-01](https://github.com/saliharici/prolig/issues/115), [#108 Production gate](https://github.com/saliharici/prolig/issues/108), [ADR-006/SchoolFlow marka](https://github.com/saliharici/prolig/blob/docs/seven-step-roadmap-20261024/docs/ADR006_SUPER_ADMIN_COK_YAYINEVI_20261024.md).  
**Test:** Yeni yol haritası plan ve kapsam kararıdır; yeni kod PASS değildir.  
**Etki:** Veri/kod deploy yok. **Risk:** Mevcut tek kurum DB'sinde çok firma izolasyonu yok; öz kaynak/özel soru/royalty hakları dikkat gerektirir.  
**Sıradaki sahip:** 01 TEST — tek ilk özellik CORE-01A; sonrasında yalnız karar gerektiren konular 03 MİMARİ'ye, yayın 02 CANLI'ya.