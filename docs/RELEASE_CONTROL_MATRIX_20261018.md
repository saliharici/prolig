# PRO-LIG — P0 sürüm/özellik matrisi ve yayın kapıları
**18 Ekim 2026 · Kanonik aktif geliştirme dalı:** `feat/p2-professional-question-editor-20261012`. Bu belge **herhangi bir dağıtımı veya veri yazma işlemini yetkilendirmez**.

## 1. Üç ayrı durumun adı

1. **GitHub feature:** React/Vercel/Prisma modülleri burada geliştirildi. Son tamamlanmış ürün envanteri ve güncel source-of-truth için `docs/PRODUCT_INVENTORY_AND_RELEASE_ROADMAP_20261018.md`.
2. **GitHub main / Production:** main'in SHA'sı ve bağlı Vercel dağıtımının gerçek SHA'sı ayrı ayrı gözlemlenmeden aynı sürüm olduğu iddia edilmeyecek. `vercel.json`, P2 feature için `git.deploymentEnabled=false` içeriyor.
3. **İzole acceptance:** `D:\Proje\pro-lig-p2-acceptance` ve yalnızca `p2-acceptance-20261017` Neon dalı. Özgün 5 soru, mevcut audit kayıtları ve pilot sahiplik korunur. Bu ortamın PASS sonucu Production PASS değildir.

## 2. Özellik bayrakları — kaynak, kapsam, bağımlılık

| İsim | Çalıştığı yer | Varsayılan | Etkinleşme / bağımlılık |
|---|---|---|---|
| `VITE_QUESTION_STUDIO_P1` | Vite build, `src/questions/studio-runtime-flags.ts` (saf kural: `studio-release-flags.ts`) | OFF | Yalnızca **literal** `true`; P1 görünümü |
| `VITE_QUESTION_STUDIO_P1C` | Vite build | OFF | `P1=true` ve `P1C=true` birlikte; encrypted draft recovery yalnız YAZAR |
| `VITE_QUESTION_STUDIO_P2_EDITOR` | Vite build | OFF | `true` ise rich editor, mevcut legacy fallback korunur |
| `VITE_QUESTION_STUDIO_P2_TYPES` | Vite build | OFF | `P2_EDITOR=true` **ve** `P2_TYPES=true` birlikte rehberli multi-type UI |
| `PROLIG_QUESTION_TYPES_P2` | Vercel API server env, `question-type-validation.ts` | OFF | `true`; DB migration `20261014120000_question_types`, API authorizasyonu ve grade/typed cevap doğrulaması ayrıca gereklidir |
| `PROLIG_P2_LOCAL_GUARDED_WRITES` | Sadece ayrı test runner özel yapılandırması; frontend kodunda sandbox işareti | OFF | Production'da **KESİNLİKLE OFF**. Bu bayrak tek başına hiçbir backend işlemine izin vermez |

**İzinli hazır kombinasyonlar** (ön yüz): hepsi OFF = legacy form; sadece `P1` = P1 çalışma alanı; `P1+P1C` = encrypted recovery; sadece `P2_EDITOR` = rich editor ama multi-type kapalı; `P2_EDITOR+P2_TYPES` = P2 rehberli editör. **Yarım P2_EDITOR/P2_TYPES** konfigürasyonu rehberli modu açmaz. **İleriye dönük yayın** için frontend P2, server P2 ve DB migration sürümleri birlikte kontrol edilmeli; bu belge bayrakları otomatik açmaz.

## 3. Canlı/örnek veri ayırımı

- Gerçek oturum: `src/main.tsx → AuthGate → DemoApp`; `DemoApp` tarihsel isimli **aktif ürün kabuğudur**.
- Ana sayfa Muhasebe “Son ödeme durumları”, `GET /api/v1/payments` üzerinden yüklenen ve kimlik kapsamlı gerçek `ApiPayment` verisine dayanır.
- Ana sayfa Genel Koordinatör “Son işlemler”, `GET /api/v1/audit-logs` ile sunucudan gelen gerçek `ActivityLog` ve sadece **GENEL_KOORDINATOR** yetkisi üzerinden görüntülenir. Bozuk/erişilemeyen veri uyarı gösterir, mock'a düşmez.
- Diğer ana sayfalarda “Güncel soru durumları”, `GET /api/v1/questions` ve sunucu rol/il/branş/sahiplik kapsamlı **aktif soru snapshot'ı**dır. Başlıklar `status`/son güncelleme alanından üretilir; **işlem geçmişi/submit zamanı** olarak sunulmaz.
- `src/demo/model.ts` içinde geriye uyumluluk için yerel seed/localStorage altyapısı **hala kodda** bulunmaktadır. Bu P0 adımında mevcut diğer uygulama davranışı bozulmasın diye silinmedi; **ana sayfa canlı hareket kartlarında gösterilmez**. Demo datanın aktif hiçbir üretim ekranında kalmadığı iddia edilemez: sonraki ayrı kod envanteri gerekebilir.
- Ödeme rakamları API yüklenirken veya başarısızken `0` ile yanlış başarı taklidi yapmaz; `—`/hata durumu gösterir. Audit API beklenmedik body için güvenli hata döndürür.

## 4. Stage / yayın kontrol kapıları

| Kapı | Kanıt | Şu an |
|---|---|---|
| G1 Source ve auth | Branch SHA, `main` diff; 6 rol; runtime `api/v1` ve `Prisma` uyumu | Kod var; staging ayrı |
| G2 CI | `npm run lint`, DB yazmayan birim/kontrat, `npm run build`, Playwright navigation | P2 feature üzerinde geçmiş PR #41 CI **PASS**; yeni P0 PR CI'sı ayrı kontrol edilecek |
| G3 Bayrak koordinasyonu | Frontend+server+DB migration aynı sürüm, Production bayrak tablosu ayrıca onaylı, localhost write işareti OFF | **Yayın için bekliyor** |
| G4 Editör kritik işlem kabulü | Izole *yeni sentetik* soru: author submit→editor revision→author resubmit; ödeme üreten `approve` bundan ayrı finansal izin | **Gerçek browser henüz PASS değil** |
| G5 Finans | Native çoklu bağlantılı PostgreSQL concurrency, ledger↔payment mutabakat, iptal/idempotency/audit | **Hosted + native kabul bekliyor** |
| G6 Kullanıcı | Az sayıdaki gerçek kurumsal roller ve il/branş filtreleriyle staging kabulü, ekran kapsamı | **Bekliyor** |
| G7 Prod operasyon | Açık `main`/deploy onayı, read-only plan ve yedek, migration diff, restore/rollback provası, secret yönetimi, hata izleme ve geri dönme kararı | **Bekliyor / onay verilmedi** |

## 5. Geri dönüş ve operasyonel kararlar

- **Önce:** geliştirilen P0 PR'ı yalnızca feature'a al. `main`, Vercel Production, gerçek Neon/main için terminal komutu veya otomatik deploy yok.
- **Yayın gündeme geldiğinde:** bağımsız staging veritabanı, son migration diff, yedek/snapshot ve geri yükleme testi, canary kullanıcılar, ödeme modülü için tekrar/çift kayıt kontrolü, log/health izleme, tek yönlü feature gate stratejisi yazılı olarak onaylanmalı.
- **Rollback:** başarısız backend/DB migration'da yalnızca frontend eski sürüme dönmek yeterli değildir; şema ve yeni kayıtlar varsa **veri kaybı yaratmadan ileriye dönük düzeltme / restore kararı** gerekir. Canlı `git reset --hard`, drop, seed veya delete önerilmez.
- **Açık korumalı PR'lar:** #32 **açık** ve daha önce merge güvenlik sınırına takıldı. #36 bunun üstünde **taslak**; korunmuş akışı başka dal/PR ile taşıyarak engeli aşma. Önceden geçmiş #92 yapay soru ve audit temizlendi, geçmiş `ActivityLog #529` ayrı izin olmadan silinmez.
- **Logo/yerel:** `D:\Proje\pro-lig` çalışma ağacındaki commitlenmemiş logo/tema korunur. Ürün için planlanan bağımsız doktora hesabı/platformu ayrı repo/Neon/Vercel çalışmasıdır.

## 6. Bundan sonraki operasyonel sprint

`P0-02` izolasyonlu tek kritik revizyon testi ve `P0-03` native finansal mutabakat kabulü için ayrı güvenlik/izin kapıları gerekiyor. Mevcut PR güvenlik engeli çözülmeden yazmalı browser test altyapısını `main`a veya P2 feature'a kestirmeden aktarmak yasak. Yeni ekran modülleri bu kapılardan önce Production'a sürülmemelidir.
