# PRO-LİG — Kalıcı kitap V2: migration ve API yayın kapısı

**18.10.2026 · Durum: TASLAK PR, VERCEL PRODUCTION'A MERGE EDİLMEYECEK**

## 1. Mimari

Mevcut `Book` kayıtlarını ve `Project` ilişkisini aynen tutarız. V2 için:
- **Book**: `revision` (1'den başlar, iyimser eşzamanlılık), `layoutColumns` (1 veya 2), isteğe bağlı `createdByUserId`, `createdAt`, `updatedAt`.
- **BookChapter**: kitap FK'si, başlık, benzersiz `(bookId, sortOrder)`; kitap silme sonrası sessiz çocuk kaybını önleyen `RESTRICT` bağı.
- **BookQuestion**: bölüm FK'si, sıralama, isteğe bağlı kaynak soru FK'si, `sourceQuestionUpdatedAt`, `snapshot JSONB`. Soru kaynağı silindiğinde yalnız `questionId` NULL yapılır; kaydedilmiş metin/cevap anahtarı/görsel metadata snapshot'ı kalır.
- **Snapshot V1**: soru tipi, soru kökü, seçenekler, doğru cevap, Doğru/Yanlış, açık uçlu model cevap, çözüm, görsel metadata, yazar adı, kaynak ID ve güncelleme tarihi. Kaynak sorunun cevap anahtarı yalnız yetkili yayıncı kitap yanıt bölümünde kullanılır.
- Şemada `Book.revision` **çakışma tespiti** içindir. Henüz geçmiş her revizyonu ayrı geri yüklenebilir edisyon olarak saklamaz. Gerçek kitap sürüm geçmişi için ayrıca `BookEdition` modeli ve yayın dondurma işlemi gerekir.

Migration dosyası: `prisma/migrations/20261018221000_publishing_book_chapters_v2/migration.sql`.
Bu dosya GitHub'a yazılmasıyla **Neon üzerinde çalışmaz**.

## 2. Yazma API'si için zorunlu güvenlik sözleşmesi — henüz uygulanmadı

**Yeni API endpoint'i henüz eklenmedi. Bu bir yayın engelidir.** Gelecekte `POST/PATCH /api/v1/books`:
1. `getCurrentUser(req)` ile oturum ve **sunucuda** yalnız `GENEL_KOORDINATOR` yetkisi.
2. Kitap projesini DB'de doğrula, arşiv/kapsam/tenant politikalarını uygula. Gelecekteki tenant mekanizması henüz yok; çok kiracılı izolasyon varmış gibi varsayma.
3. İstemci gönderdiği `status`, `snapshot`, `authorName`, `sourceQuestionUpdatedAt` gibi alanlara güvenme. Yalnız başlık/düzen/bölüm ve soru ID'lerini al.
4. Transaction içinde ilgili soru kayıtlarını **sunucudan yeniden yükle**. Tümü `ONAYLANDI`, arşiv dışı ve aynı `projectId` olmalı; soruların kaynak sürümü kontrol edilmeli.
5. `prepareBookDraft` saf sözleşmesini bu kayıtlara uygula. Çift soru ID'si, yanlış proje, boş bölüm, 300 soru/30 bölüm üstü ve geçersiz sorular **400/409** ile reddedilmeli.
6. Mevcut kitabı değiştirirken `UPDATE Book ... WHERE id=? AND revision=?` koşullu yazma ile **iyimser kilit**; eşleşmeyen sürüm `409`. Başlık, bölüm ve sıra değişiklikleri tek transaction olmalı. Unique sıra indeksleri nedeniyle sıralama atomik sil-yeniden oluşturma veya iki-aşamalı güvenli yeniden numaralandırma ile yapılmalı.
7. `Dizgi Aşamasında` dışında bir durumdaki kitabı, yayın onayı ve immutable edition uygulaması olmadan değiştirme. Kayıt ve yetki denetimlerini ActivityLog'a ekle.
8. Oluşturulan kitap yalnızca yetkili proje içinde GET ile erişilebilir olmalı. Cevap anahtarı içeren snapshot'lar öğrenci/public endpoint'inde görünmemeli. **V1 yalnızca frontend yetkisine dayalıdır; yeni yazma API'sinde bu kesinlikle yeterli değildir.**
9. Kod gerçek `GET /api/v1/questions` listesinin tüm evreni kapsadığını varsaymamalı. Soruların varlığı ve kapsamı her yazma isteğinde sunucuda tekrar doğrulanmalı.

## 3. Migration öncesi bağımsız kontrol kapıları

- [ ] Kullanıcıdan **ayrı, açık schema migration izni** ve hedef Neon dalı onayı.
- [ ] Production Vercel `DATABASE_URL` bağlantısının doğru Neon proje/dal ile eşleşmesi (gizli URL metni paylaşmadan).
- [ ] Son yedek/snapshot ve **bağımsız geri yükleme provası**, beklenen veri saklama süresi.
- [ ] Mevcut `Book` ve `Question` kayıt sayısı, mevcut migration listesi, fark/etki analizi.
- [ ] Önce bağımsız staging dalında migration, eski `Book` satırlarının aynı kaldığını doğrulama; kısıt ve FK testleri.
- [ ] Gerçek HTTP sunucu yetkisi, proje çapraz erişim, farklı kullanıcının iki eşzamanlı kitap değişikliği için atomiklik ve 409 kabulü.
- [ ] Yayınlama, editör revizyon ve soru arşivinin kitap snapshot'ına etkisi; silme/geri dönüş testleri.
- [ ] Sınırlı pilotta yazma ve okuma onayı, veri değişmeyen gözlem, geri dönüş işletim planı.
- [ ] DB ve Vercel dağıtımını **ayrı** onayla; başarısız migrasyonda mevcut veriyi düşürerek rollback YAPMA.

## 4. Değişmeyecekler

- Bu taslak PR **birleştirilmez**; Production'a yeni tablo/kolon **uygulanmaz**.
- Var olan V1 Yayıncılık ekranı salt okunur kalır. Kalıcı kayıt düğmesi **eklenmez**.
- Gerçek yazar/editör soru onayları, mevcut telif tarifeleri, tahakkuk ve ödemeler değişmez.
- Başka bir Google/GitHub/Vercel/Neon hesabına veya doktora platformuna işlem uygulanmaz.
- Word/DOCX ve matbaa PDF hâlâ ayrı geliştirme; PDF baskı önizlemesi bu migration ile matbaaya hazır hale gelmez.

## 5. Risk özeti

| Risk | Azaltma |
|---|---|
| Başka projeden/onaysız sorunun kitaba girmesi | Sunucu kaynaklı projeye bağlı onaylı soru re-fetch ve saf sözleşme |
| Onaydan sonra kaynak sorunun değişmesi | Snapshot + kaynak güncelleme tarihi; yeniden hazırlama ve editör gözden geçirme |
| Aynı kitabın iki kullanıcı tarafından düzenlenmesi | `Book.revision` + transaction, 409 |
| Yanlışlıkla soru/proje silinmesi | Soru FK'si `SET NULL`; kitap bölüm FK'si `RESTRICT` |
| Eski Book kayıtlarının değişmesi | Yalnız ek kolonlar için varsayılan değer; migrasyon sonrası satır/alan karşılaştırması |
| Öğrenciye cevap anahtarı sızması | Gelecekte sunucu DTO'su ve rol bazlı kırpma; public erişim yok |
| 1. baskı içeriğinin sonradan değiştirilmesi | V2'de yalnız taslak yazma; sürüm dondurma ve `BookEdition` ayrı faz |

## 6. V2-API geliştirme dalı (ayrı, Production'a kapalı)

- Stacked dal: `feat/publishing-book-api-v2-preview-20261018` → taban dal `feat/publishing-book-persistence-v2-draft-20261018`.
- `GET /api/v1/books`: yalnız giriş yapan Genel Koordinatörün kendi taslaklarını listeler; en fazla 100 kayıt. `GET /api/v1/books/:id`: kendi kitabını, bölümlerini ve cevap içeren snapshot'larını döner. Diğer kullanıcının kitabı için `404`.
- `POST /api/v1/books`: yalnız `projectId, title, layoutColumns, expectedRevision: null, chapters: [{title, questionIds}]`; sorular transaction içinde sunucudan yeniden yüklenir, onay/proje/arşiv şartları karşılanınca snapshot oluşur.
- `PATCH /api/v1/books/:id`: aynı alanlar, `expectedRevision` zorunlu. Kayıt yalnız sahibince, hâlâ `Dizgi Aşamasında` ise güncellenir. Koşullu revizyon artırma + tek Serializable transaction ile eski bölüm/soru bağlantıları değiştirilir; eski veya yarışan sürüm `409`.
- Her başarılı oluşturma/güncelleme bir `ActivityLog` kaydı üretir. Otomatik tekrar yok; yetki ve veri reddinde kalıcı işlem oluşmaz.
- **Hard gate:** Production'da API doğrudan `404`. Normal Preview'da da `404`. Test olmayan preview erişimi yalnız `PROLIG_BOOKS_V2_ENABLED=true`, `PROLIG_BOOKS_V2_DB_NAME=prolig_v2_uat`, `VERCEL_ENV=preview` ve ayrı Neon `/prolig_v2_uat` veritabanı varsa açılır. Bu ayarlar **hiçbir ortamda otomatik değiştirilmez**.
- CI `publishing-books-isolated-postgres.yml`, sadece GitHub Actions'ın `127.0.0.1:5432/prolig_book_ci` **atılabilir** PostgreSQL hizmetinde migration uygulayıp gerçek kitap oluşturma, açma, stale revision, iki eşzamanlı PATCH, arşiv reddi, soru silindiğinde snapshot saklama ve denetim kaydını kontrol eder.
- Bu dalda tarayıcıdan **Kalıcı Kaydet** düğmesi yoktur. Production'a açılacak API ve V1 ekranıyla bağlantı, yedekleme ve tenant kapsamı ancak ayrıca onaylanmış sonraki fazdır.

**İzolasyonun sınırı:** Unit testler ve CI PostgreSQL, Production veri saklama/geri yükleme provası yerine geçmez. Ayrıca `Book.revision` yalnız mevcut taslak çakışmalarını çözer; geri yüklenebilir tüm edisyonların sürüm geçmişini henüz sağlamaz.
