# P2 live HTTP acceptance — final resolution 2026-10-17

**FINAL RESULT: PASS — 6/6 real localhost HTTP/API handler ↔ isolated Neon PostgreSQL tests** on P2 feature commit `ec0d1a13`, after PR #28 fixed Vitest timeouts and cleanup races.

User PowerShell result: `Test Files 1 passed (1)`, `Tests 6 passed (6)`, `Duration 48.00s`, `P2 live API ↔ isolated Neon acceptance: PASS`. All four formats (A-D, A-E, TRUE_FALSE, OPEN_ENDED) create/read/edit/reopen/submit PASS; authorization refusal and incomplete OPEN_ENDED/stale revision guards PASS.

**Independent read-only post-test check:** Neon main and isolated acceptance branch each retain 5 Question rows, zero `P2-HTTP-UAT-%` and zero `P2-TXN-20261017-%` rows, full current Question snapshot hash matches (`a34adf9c66590a5f7802a1dc8eebbe91`). Historical acceptance-only `ActivityLog #529` (QUESTION_SUBMITTED, entityId=84) remains; main has 46 Question logs and acceptance has 47; the extra log was not deleted.

**Scope:** Real local HTTP endpoints + Prisma/Neon. No production deploy, browser UAT, actual email-password login, editor approval/royalty workflow, or other module release acceptance. SSL-mode and concurrent pg query deprecations remain nonfatal technical follow-ups.

---

## Historical first failure (superseded by final PASS)

## Verified user run
- `npx prisma generate`: PASS (Prisma Client 7.10.0).
- `node scripts/p2-live-http-acceptance.mjs --run`: Neon read-only preflight PASS, Vitest **6 tests: 2 passed, 4 timed out at 5000ms**.
- Passed cases: authentication/authorization guard; incomplete open-ended submission and stale-PATCH rejection.
- Four completion tests (A-D, A-E, TRUE_FALSE, OPEN_ENDED) **have not passed**.
- SSL compatibility and overlapping pg query warnings are separate follow-ups.

## Neon read-only post-run recheck
- Neon project `calm-band-45633698`, acceptance branch `br-quiet-tree-b2ganqkl`: 5 questions, 0 `P2-HTTP-UAT-%` question rows.
- Main branch `br-soft-salad-b2vb8sdr`: also 5 questions, 0 `P2-HTTP-UAT-%` rows.
- One acceptance-branch-only audit row remains: `ActivityLog.id = 529`, `QUESTION_SUBMITTED`, `entityId = 84`, with no current Question #84. Main has 46 Question logs vs acceptance 47. Leave this row unchanged pending separate controlled disposition.
- Do not describe the full HTTP-PG acceptance as PASS.

## Next step
- PR #28 extends remote DB test timeouts and waits for all test case/HTTP work to complete before cleanup, checking audit logs tied to each test row. Verify CI; land on **P2 feature branch only**.
- Local test worktree: `D:\Proje\pro-lig-p2-acceptance`; its detached ref must be carefully updated without touching source worktree's uncommitted logos.
- Follow a read-only preflight again before re-running approved isolated test. No `main` / production writes.
- User's `.env.p2-acceptance.local` remains gitignored and private.
