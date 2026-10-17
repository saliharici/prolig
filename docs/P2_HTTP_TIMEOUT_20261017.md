# P2 live HTTP test — 2026-10-17

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
