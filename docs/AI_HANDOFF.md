# PRO-LIG — Yeni sohbete devir (tek başlangıç noktası)

**Son güncelleme:** 2026-10-17. Bu dosya güncel iş akışının giriş kapısıdır; geçmişten gelen eski “P0 / 9 hata” talimatları artık aktif iş değildir.

## Yeni sohbette ilk yapılacaklar

1. GitHub `saliharici/prolig` reposunda **önce `docs/AI_ACTIVE_STATE.md` dosyasını**, ardından `docs/AI_PROJECT_CONTEXT.md` ve ihtiyaç duyulursa uzun geçmiş için `docs/AI_CURRENT_STATE.md` dosyasını oku.
2. **Güncel** `feat/p2-professional-question-editor-20261012` dalının SHA/PR/CI durumunu, Neon branch kimliklerini ve kullanıcının son terminal çıktısını yeniden doğrula.
3. Bir işi “PASS” saymadan önce gerçekten çalıştırılmış testin çıktısını veya doğrulanmış GitHub/Neon kanıtını kullan.
4. **Asla** üretim `main` dalına merge/deploy veya Neon `main` veritabanına test sorusu yazma. Parolaları/DB bağlantı dizelerini isteme, loglama veya GitHub'a koyma.
5. Her yeni başarının ve açık engelin sonunda `docs/AI_ACTIVE_STATE.md` dosyasındaki **“Kaldığımız tam adım”** bilgisi feature-branch PR ile güncellensin.

## Şu anki aktif görev (ayrıntı AI_ACTIVE_STATE.md içinde)

- P2 Question Studio dört format; GitHub PR #26, feature commit `0290b719` üzerinden güvenli canlı API kabul testi hazırlandı.
- Gerçek Neon SQL testleri ve GitHub CI başarılı; ancak canlı HTTP↔PostgreSQL Vitest denemesi 0 testte durdu: `generated/prisma/client.js` eksik.
- Kullanıcı ayrı test worktree `D:\Proje\pro-lig-p2-acceptance` klasöründe çalışıyor. `.env.p2-acceptance.local` dosyası **gizli, gitignore kapsamındaki** test bağlantısı.
- **Kullanıcıya şimdi önerilecek TEK ADIM:** test worktree içinde `npx prisma generate`. Sonucu PASS ise `node scripts/p2-live-http-acceptance.mjs --run` testine geç; FAIL ise önce satırları incele.
- Mevcut ana worktree `D:\Proje\pro-lig` içinde değiştirilmiş logo dosyaları ve izlenmeyen dosyalar var. **Reset/clean/branch checkout ile dokunma.**

## Başka sohbette kullanılacak kısa başlangıç mesajı

“PRO-LIG çalışmasına kaldığımız yerden devam et. GitHub `saliharici/prolig` içindeki `docs/AI_HANDOFF.md`, `docs/AI_ACTIVE_STATE.md` ve `docs/AI_PROJECT_CONTEXT.md` dosyalarını sırayla oku; sonra aktif feature HEAD ve Neon test dalını doğrula. Yerel test worktree'deki son durum, Prisma Client eksikliği yüzünden 0 testle duran P2 canlı API kabulüdür. Production/main ve ana worktree değişikliklerini koru, sıradaki tek güvenli adımı söyle.”
