# PRO-LIG · Yayın Üretimi ve Yönetim Platformu

> **Güncel durum (24.10.2026):** Production `main` için son doğrulanan SHA `2654872084c4fd3190ab5d6b345a8509f6d89564` (`UX-06`) ve Vercel Production READY. Profesyonel Soru Stüdyosu canlı, kullanıcının görsel PASS kabulü var; P3 özel PNG Production'da KAPALI. UX03 parola kurtarma izole TEST'te operatör PASS, ancak Production kimlik/yedek/restore kapıları nedeniyle NO-GO. **Kanonik 7 adımlı güncel tamamlama planı:** [PROLIG_7_ADIM_TAMAMLAMA_PLANI_20261024.md](docs/PROLIG_7_ADIM_TAMAMLAMA_PLANI_20261024.md). Aşağıdaki 18 Ekim tarihli envanter ve PR notları tarihî bağlamdır; güncel kaynak veya dağıtım yerine kullanılmaz. Eski PASS'ler tekrar test edilmez.

**Durum (18 Ekim 2026):** PRO-LIG'in aktif ürünü, yayıncılık süreçleri için **geliştirme/pilot aşamasındadır**; bu depo içindeki P2 özelliklerinin tamamı henüz Production'da kabul edilmiş değildir. Geliştirme dalı `feat/p2-professional-question-editor-20261012`, GitHub `main` ve Vercel Production birbirinden ayrı sürümlerdir. Özelliklerin kodlanmış olması canlı yayına alındığı anlamına gelmez.

## Ürün kapsamı

Altı kanonik rol: `GENEL_KOORDINATOR`, `BOLGE_KOORDINATORU`, `IL_KOORDINATORU`, `EDITOR`, `YAZAR`, `MUHASEBE`.

Aktif geliştirme kodu üyelik ve kullanıcı yönetimi, coğrafi/branş bazlı yetkiler, projeler, görevler, yazar ağı, mesajlar, duyurular, Soru Stüdyosu, editör iş akışı, telif kuralları, ödeme dönemleri, raporlar ve yönetim panelini içerir. Önemli bölümlerin gerçek veritabanı, finansal bütünlük ve Production kabulleri **ayrı yayın ön koşuludur**. Multi-tenant Süper Admin, Word/PDF matbaa kitabı dizgisi ve doğrudan medya yükleme ayrı gelecek fazlardır.

## Kanonik çalışma mimarisi

- **Ön yüz:** React 19, Vite, TypeScript; giriş noktası `src/main.tsx → src/auth/AuthGate.tsx → src/DemoApp.tsx` (son dosyanın tarihi adı *DemoApp* olmakla birlikte etkin ürün kabuğudur).
- **Backend:** Vercel Functions `api/v1/*`, `vercel.json` yönlendirmeleri; kimlik ve işlem yetkileri sunucuda da doğrulanır.
- **Veri:** Prisma 7 + PostgreSQL / Neon, `prisma/schema.prisma`; yönetilen migration'lar `prisma/migrations/`.
- **Finans:** `CompensationEntry` tahakkukları ile `Payment` ödeme işlemleri **farklı defterlerdir; toplamları doğrudan toplanmaz**. Tarife değişikliği eski tahakkuku yeniden hesaplamaz.
- **Referans / arşiv kodu:** `src/App.tsx`, `legacy/*`, `temp_restore/*`, `server.ts` aktif runtime değildir. `src/demo/model.ts` içinde kalan eski örnek seed/localStorage altyapısı referans/geriye uyumluluk kaynağıdır; ana sayfanın canlı işlem kartları bu verileri kullanmaz.

## Geliştirme ortamı

Node.js 24 (GitHub CI sürümü) ve npm:

```sh
npm install
npm run lint
npx vitest run --exclude 'tests/integration/**'
npm run build
```

`npm run dev` Vite ön yüzünü başlatır; **tek başına Vercel API ve PostgreSQL'i sağlamaz**. Yerel tam uygulama akışı için Vercel Development ve doğru yapılandırılmış **ayrı pilot veritabanı** gerekir. Ortam kimlik bilgilerini GitHub'a veya sohbete eklemeyin. `.env.example` yalnızca yer tutuculardan oluşur. **Gerçek DB bağlantısını üretim dalına bağlayarak rastgele seed/migration/test çalıştırmayın.**

### Soru Stüdyosu özellik bayrakları

Bayrak kararları `src/questions/studio-release-flags.ts`, Vite ortam değişkenleri ise yalnızca `src/questions/studio-runtime-flags.ts` üzerinden okunur. Varsayılan olarak bütün opsiyonel bayraklar kapalıdır. Görsel bayraklar Vite **build anında**, sunucu bayrağı API runtime'da okunur.

| Bayrak | Kapsam |
|---|---|
| `VITE_QUESTION_STUDIO_P1` | P1 çalışma alanı görünümü |
| `VITE_QUESTION_STUDIO_P1C` | P1 ile birlikte şifreli yerel kurtarma |
| `VITE_QUESTION_STUDIO_P2_EDITOR` | Zengin metin editörü (bağımsız) |
| `VITE_QUESTION_STUDIO_P2_TYPES` | P2 rehberli 4/5 seçenek, doğru/yanlış, açık uçlu arayüz; **P2_EDITOR ile birlikte** |
| `PROLIG_QUESTION_TYPES_P2` | API'nin structured soru alanlarına izin verme koşulu; ayrı server-side gate |
| `PROLIG_P2_LOCAL_GUARDED_WRITES` | **Yalnızca izolasyonlu localhost kabulü için**; Production'da etkinleştirilmez |

UI P2 çoklu soru arayüzü ancak iki `VITE_QUESTION_STUDIO_P2_*` değeri **birden literal `true`** ise açılır. `P1C`, `P1` olmadan açılmaz. Sunucu P2 soru türleri için ayrıca `PROLIG_QUESTION_TYPES_P2=true` ve migration uyumu ister. **UI bayrağı yetkilendirme yerine geçmez**. Geçiş ve kapatma matrisi: [Sürüm/Yayın Kapıları](docs/RELEASE_CONTROL_MATRIX_20261018.md).

## Kanıtlanmış kabul ve bilinçli sınır

- P2 4 format için **localhost gerçek HTTP ↔ bağımsız Neon 6/6 PASS** (17 Ekim 2026).
- Gerçek tarayıcı sentetik yazar taslak kaydet/yeniden aç/düzenle **PASS**; özgün veri korunarak temizlik tamamlandı.
- Editörün değerlendirme penceresi **kullanıcı tarafından görsel PASS**, iş akışı ise **mock 11/11 PASS**. Bu sonuç **gerçek tarayıcıda revizyon veya onay/telif üretimi PASS değildir**.
- PR #37–#41 feature'a alındı; ilgili otomatik CI lint/test/build/navigation PASS. Bunlar Production kabulü değildir.
- **PR #32 açık ve daha önce güvenlik kontrolüyle merge engellenmiş**, PR #36 onun üstündeki taslaktır. Güvenlik engeli bir alternatif PR/branch ile aşılmayacak.

## Yayın, yedek ve geri dönüş

**Herhangi bir `main`/Vercel Production birleştirmesi, veritabanı migration, finansal onay ve gerçek ödeme için ayrıca açık kullanıcı kararı gerekir.** Önce staging, rol kapsamı, editör–finans işlem güvenliği, native PostgreSQL finans eşzamanlılık, bağımsız veritabanı yedeği/geri dönüş ve izleme kapıları sağlanmalıdır. PR #32 ve #36 inceleme bekler; doğrudan birleştirilmemelidir.

Detaylı envanter ve yol haritası: [21 modüllü ürün envanteri](docs/PRODUCT_INVENTORY_AND_RELEASE_ROADMAP_20261018.md). Sonraki teslim koşulları: [Sürüm/Yayın Kapıları](docs/RELEASE_CONTROL_MATRIX_20261018.md). Mimarinin tek referansı: [Canonical Architecture](docs/CANONICAL_ARCHITECTURE.md). Doktora araştırma platformu bağımsız repo, Vercel ve veritabanı ile ayrı ele alınır.
