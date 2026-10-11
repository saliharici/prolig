# PRO-LIG P1-D — Pilot round-trip, optimistic concurrency and manual revision review

**Date:** 2026-10-11
**Branch:** \`feat/question-studio-p1d-safe-roundtrip-20261011\`
**Parent:** P1-C branch, operator-run frontend gate 446/446 PASS.
**Release status:** Implemented for feature-branch verification; local frontend gate and isolated DB integration NOT YET RUN for P1-D.

## Reason for this change

Previously \`PATCH /api/v1/questions/{id}\` used conditional \`updateMany(where: { id, status: question.status, updatedAt: question.updatedAt })\` where \`question.updatedAt\` came from a fresh read within the same request. That does not prevent two sequential browser tabs from overwriting each other. For example, Tab A and Tab B both load revision R0; Tab A patches to R1; Tab B sends only content, the handler reads R1 and overwrites with stale B text.

## P1-D contract

- \`PATCH /api/v1/questions/{id}\` requires \`expectedUpdatedAt\` (canonical ISO \`YYYY-MM-DDTHH:mm:ss.sssZ\`), set to the revision the author actually opened.
- Missing precondition: HTTP **428**. Invalid revision: HTTP **400**. Already changed server revision: HTTP **409**; no new write, asset mutation or audit. Concurrent race between initial read and DB update also resolves to 409 through the atomic updateMany predicate.
- All successful patches explicitly advance \`updatedAt\` by at least 1 ms; even rapid sequential edits receive different revision tokens. The atomic predicate also includes id, authenticated author ID, status and the client revision.
- Existing authoring UI always sends \`editingQuestion.updatedAt\`. For 409/428, local form values remain intact and Save is locked. A scoped read-only \`fetchQuestions('all')\` retrieves the latest question and shows side-by-side field comparisons for stem, grade, project, each option, correct answer, explanation and media. The user can explicitly abandon their local draft and reopen a still-editable latest question. No automatic merge/retry or forced overwrite.
- \`PATCH\` callers that do not send a revision now receive HTTP 428. This is **intentionally breaking** for older/direct API callers; do not deploy until all integrations are audited. New create/POST, lifecycle and editorial workflow APIs are unchanged.
- P1-C opt-in encrypted local draft recovery and preexisting P1-B pause/resume remain intact. Server 409 does not automatically persist or merge local content; copy important local edits before discarding.

## Validation tiers

### Frontend + handler automated tests — no DB changes

\`\`\`powershell
cd D:\Proje\pro-lig
git status
git fetch origin
git switch --track origin/feat/question-studio-p1d-safe-roundtrip-20261011
node scripts/p1-check.mjs
\`\`\`

If local branch exists, \`git switch feat/question-studio-p1d-safe-roundtrip-20261011\` then \`git pull --ff-only\`. Never force-reset, delete untracked files, merge or deploy. Prior P1-C baseline 446/446. P1-D adds eight non-DB handler cases and four comparison/safety cases; **expected nominal 458 non-DB tests**. Rely on actual runner summary, not estimates.

### Read-only isolation preflight + pilot DB integration — separate explicit authorization

**Do not run** the DB test on an unconfirmed instance. Prepare a genuinely isolated pilot Postgres database and the existing isolated pilot fixtures. Never point pilot tests at Production or the real editorial database. The preflight reads the connection URL privately (it does not print it), compares its hostname with \`PROLIG_P1D_DB_HOST\`, queries \`current_database()\` and checks it equals \`PROLIG_P1D_DB_NAME\`. The database name must contain \`pilot\`, \`test\` or \`sandbox\`. It also checks for both exact pilot writer and editor fixture accounts.

Set \`DATABASE_URL\` and \`AUTH_SECRET\` in the existing isolated pilot environment only; never paste secrets into chat. Explicitly set \`PROLIG_PILOT_DB_CONFIRMED=true\`, \`PROLIG_P1D_DB_HOST\`, and \`PROLIG_P1D_DB_NAME\` after checking their actual values. Then run:

\`\`\`powershell
node scripts/p1d-pilot-check.mjs
\`\`\`

The runner performs **read-only preflight first**; only after PASS does it start \`vitest run tests/integration/question-db.test.ts\`. The integration test itself requires an internal verified marker from the runner and only creates a temporary question fixture. Its existing \`afterAll\` cleanup deletes test question activity logs and the question. It tests create/GET/PATCH and option/explanation roundtrip, a two-session stale 409 with no overwrite/audit, and the remaining editorial workflow. If the guard fails, **stop**. Do not set a "confirmed" flag on an unverified database just to make a test run.

### Browser acceptance after unit/DB checks

1. Browser tab A and tab B as the same authorized pilot writer each open a **single disposable pilot question** with identical revision.
2. Tab A edits and successfully saves; confirm latest content on reopen.
3. Tab B edits using its older loaded state and attempts save: expect 409, local content retained, Save locked, side-by-side comparison populated.
4. In tab B, explicitly select "Yerel taslağı bırak ve güncel soruyu aç" after copying any desired text; verify updated A content opens and fresh edit can be saved.
5. Confirm option/answer/explanation/media fields round-trip; verify P1-C recovery and legacy P1-B pause/resume are still safe.
6. Check stale edit does not create duplicate activity logs or overwrite server media.

## Open risks / production gate

- The P1-D change introduces required \`expectedUpdatedAt\` and therefore must be coordinated with any non-React API clients.
- Timestamp CAS solves sequential and overlapping author PATCH. It does not add editor workflow version tokens or server-side edit history; those require separate follow-up.
- No pilot DB has been queried or modified by the assistant during this implementation. No schema migration or seed was introduced.
- Browser accessibility, multiple browsers, offline queue, real latency/credential expiry and Production policy review remain pending.
- **No merge to main, Production deployment or database migration authorization** is implied by P1-D development approval.

## 2026-10-11 operator gate accepted — preflight-only default
- Verified operator log: UI and API `tsc --noEmit` PASS; all 458/458 non-database tests across 49 files PASS; Vite production *compilation only* PASS (no deployment).
- Subsequently hardened `scripts/p1d-pilot-check.mjs` to perform **only read-only identity checks when run with no arguments**. This change supersedes any earlier implication that invoking the script by itself runs integration writes. The safety change and corresponding assertion were committed after the 458-test log and are not yet locally rechecked.
- Prerequisite: human-verifiable isolated pilot Postgres DB. Do not set `PROLIG_PILOT_DB_CONFIRMED=true` without verifying it is NOT any real editorial/Production DB. The preflight checks host, explicit DB name and two pilot account signatures, but these technical checks alone cannot prove organizational isolation.
- First run (READ-ONLY): `node scripts/p1d-pilot-check.mjs`; do not share DATABASE_URL/password/secret. A missing-configuration failure is expected when isolated pilot is not configured; do not bypass it.
- Separate later run **only after explicit confirmation and permission for pilot test writes**: set `PROLIG_P1D_ALLOW_WRITES=true` in the user-verified pilot environment and invoke `node scripts/p1d-pilot-check.mjs --run-integration`. The runner still validates DB identity before starting an integration suite that creates and deletes a disposable test question.
- No main merge, Production deployment, schema migration, seed or real data mutation.
