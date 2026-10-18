# PRO-LIG P2 — Neon live PostgreSQL acceptance (2026-10-17)

## Target and isolation

- Neon project: `calm-band-45633698` (`prolig-pilot`, organization `Vercel: salih`).
- **Only tested branch:** `p2-acceptance-20261017` (`br-quiet-tree-b2ganqkl`).
- Source: `main` (`br-soft-salad-b2vb8sdr`); new branch is parent-data (schema + data).
- Database: `neondb`; no migrations or seed operations performed.
- P2 migration record: 1 completed; all six typed question columns present.
- Pilot author and editor: 2; project `PILOT-MAT-8-001`: 1; author project assignment: 1.
- Before test: 5 existing questions, 0 matching synthetic marker questions, 46 question audit logs.

## Real database transaction tests

Executed through the Neon SQL connector **with both explicit project_id and branch_id**.
A single PostgreSQL transaction contained a savepoint, synthetic INSERTs, SELECTs,
optimistic-concurrency UPDATEs, a guarded SQL workflow transition, assertions, and
`ROLLBACK TO SAVEPOINT` before committing the outer no-op transaction.

| Scenario | Observation |
| --- | --- |
| Four-choice grade-8 question (D) | INSERT, read-back, content edit and preserved answer: PASS |
| Five-choice grade-10 question (E) | INSERT, read-back, content edit and preserved E/5 options: PASS |
| True/false with false answer | INSERT/read false, edit true, read-back: PASS |
| Open-ended with model/rubric/criteria | INSERT/read, update all 3 fields, read-back: PASS |
| Incomplete open-ended draft | Missing model answer blocked from SQL simulated submission; status remains TASLAK: PASS |
| Outdated revision | `UPDATE ... WHERE updatedAt = original` returned zero rows after prior update: PASS |
| Submission transition | SQL condition-based simulation advanced the four complete test questions to INCELEMEDE: PASS |
| Rollback | Every synthetic test INSERT/UPDATE/transition rolled back: PASS |

All test data was disposable and identified by the `P2-TXN-20261017-` objective-code prefix.

## Post-run evidence

- Acceptance branch question count: **5**; matching synthetic markers: **0**.
- Main branch question count: **5**; matching synthetic markers: **0**.
- Pre/post ordered question content/revision/status digest on acceptance branch identical:
  `0cec588fbf68ab45399b827de7769a1f`.
- Main branch ordered question digest identical to the baseline, too.
- No test-only schema modification, PR merge to main, or production deployment.

## Important acceptance boundary

These tests demonstrate **real PostgreSQL round-trip behavior**, field preservation,
optimistic update predicates, and explicitly simulated submission criteria. They do **not**
execute a real authenticated HTTP session through the PRO-LIG application against this
branch; API role enforcement, user-interface reloading, audit-log creation, live
submission validation, and cleanup of a committed API test question therefore remain
**unverified** by this SQL test.

Previously completed PR #23 tests do invoke the real API handlers but with mocked Prisma
persistence. Combining those results is useful, but **not equivalent to a live end-to-end API acceptance**.

## Next safeguarded live API acceptance

Use only a scoped test environment whose `DATABASE_URL` points to the exact
`p2-acceptance-20261017` endpoint, checked via
`scripts/p2-acceptance-branch-check.mjs`. This check reads the private
`.env.p2-acceptance.local` file (excluded from Git by `.gitignore`), never prints
credentials, and executes read-only SQL. The original
`scripts/p2-pilot-readonly-check.mjs` and legacy P1-D guards remain unchanged.

Before a live API write suite, explicitly verify target branch identity, artificial
pilot author/editor roles, appropriate grades/project assignment and a record-specific
cleanup plan. Five-option grade-10 questions must not be attached to the grade-8 project.
Do not point production/Vercel production environment variables at the test branch.

No acceptance secrets or connection strings are stored in this report.
