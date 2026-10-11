# PRO-LIG current state — 2026-10-11
GitHub main: 10b34f2e4090ac52164bde573f3029beca50ba13. Question media feature HEAD: 7244eec546dd280554c14a0f01defdd202e4a3c9 (7 ahead of main). Work branch: feat/permission-workflow-stabilization-20261011 from media-studio HEAD.
Antigravity audit reports 71 tests, 9 failures; lint/build PASS. Failures: YAZAR profile DB integration; EDITOR/IL project visibility; question workflow 403/409. These failures have not been independently reproduced through GitHub connector.
Source check: `getCurrentUser` selects `branchAssignments`; Prisma `User` defines relation to `UserBranchAssignment`. Audit reports relation unavailable in dev database. Investigate schema/migration deployment safely; do not remove relationship solely to hide failure. Scope builders already implement some geography and writer isolation; exact test failure stacks needed.
No feature code change, main merge, Vercel production deploy, or DB migration performed in this sprint yet.
Next: reproduce failures in isolated test DB; implement minimal authorization fixes; pass full test suite, lint and build, then obtain user acceptance before production.

## P0 update — 2026-10-11
- Question workflow ID parsing fixed and API regression tests added in the review branch (commits e6154fbd and 3e49217d).
- Pilot workflow fixture updated to align question grade with assigned editor grade; this has NOT been rerun against a pilot DB.
- Read-only diagnostic added: `node scripts/diagnose-branch-assignment.mjs` (commit 3d52ef8f). Requires explicit pilot-DB confirmation and queries only table/migration metadata. It does not apply migrations.
- Author DTO and scope source review shows own-profile filter is already present; exact failing integration response is still unknown. Do not loosen this access control without evidence.
- Test failures remain unverified; no claim that P0 is complete. No main merge, Vercel deploy or database mutation performed.

## P0 follow-up
- Strict ID validation now applies to question detail PATCH/archive/delete and workflow routes (commits ca090d0b and earlier e6154fbd). Malformed PATCH regression tests added (98fd4117). CI/test execution still pending.
- Development DB's UserBranchAssignment existence has NOT been verified; diagnostic is available but deliberately not executed against unknown DB.
- The local audit's nine failures remain open pending isolated integration rerun. Do not infer that ID hardening resolves those failures.

## P0 verification from local Windows run — 2026-10-11
- User ran `node scripts/p0-check.mjs`: lint/types PASS, 75/75 focused tests PASS, Vite build PASS.
- User ran `npx vitest run --exclude "tests/integration/**"`: 45 test files PASS, 405/405 tests PASS, 0 failed.
- Mocked DB Error/Tx Error stderr in question-handlers are expected injected error scenarios, not failing tests.
- Earlier two editor-grade authorization failures disappeared after user safely stashed a pre-existing local modification of `api/v1/_lib/question-access.ts`. Keep stash preserved; do not reapply without review.
- The test DB integration suite, actual `UserBranchAssignment` table, migration parity and live feature acceptance remain UNVERIFIED. No production approval given.

## Pilot DB read-only diagnostic — 2026-10-11
- User ran `node scripts/diagnose-branch-assignment.mjs` with the pilot confirmation environment variable.
- Results: `UserBranchAssignment: present`; `_prisma_migrations: present`; `20261007204000_editor_branch_index` finished=true, rolled_back=false.
- Driver emitted a future SSL-mode semantics warning; diagnostic query completed successfully.
- This confirms the checked connection has the expected branch assignment table; it does not prove all migrations are applied, pilot DB isolation, or DB integration test success.
- Next gate: run isolated pilot DB integration tests with safety confirmation, inspect failures, and then evaluate P1 editor rollout.

## Pilot integration findings — 2026-10-11
- User ran `npm run test:integration`: 30 passed, 4 failed, 5 skipped (39 total).
- Author test expected Istanbul, but pilot author's recorded province is Bursa. Editor and province-coordinator project visibility and provincial question visibility failed; likely fixture geography divergence rather than access-rule error.
- Existing `prisma/seed.ts` does not update an existing YAZAR AuthorProfile province/branch. Added fail-fast preflight guard (8590fbaf) to prevent future partial mutations in this case, and read-only `scripts/diagnose-pilot-scope.mjs` (79f785d9) to compare pilot geographic/project assignments.
- No existing pilot data modified or reset. No assertion relaxed. A deliberate, independently approved pilot fixture reconciliation may be required after read-only verification.
- Previous non-DB suite: 405/405 pass, lint/build pass. P0 DB integration remains BLOCKED.

## Pilot fixture scope diagnostic result — 2026-10-11
- Confirmed pilot author province Bursa, region Marmara.
- Mismatch: provincial coordinator scope vs author province; editor grade vs canonical project grade.
- In scope: author/editor geography; project and editor branch; writer-project assignment.
- Added `scripts/reconcile-pilot-fixture.ts` as dry-run default with optional guarded two-record transaction. Commit ebd389d6. Do not apply without explicit approval, isolated pilot DB verification, and dry-run review. The repair aborts if author has district/institution affiliation.
- DB integration still 30 passed / 4 failed / 5 skipped pending pilot reconciliation and rerun.

## P0 fixture repair implementation — 2026-10-11
- Determined pilot EDITOR provinceId=null, assignedRegion=Marmara (valid regional scope); provincial coordinator Istanbul, existing author Bursa with district/institution associations.
- Reworked guarded repair script to PRESERVE author province/district/institution and instead align only canonical pilot IL coordinator to the author province, and canonical pilot editorGrade to the project's targetGrade. Dry-run is the default; --apply requires explicit pilot-only env acknowledgement. Commit 11d0ab62.
- Author DB integration now verifies reported author location against persisted profile instead of assuming Istanbul. Commit 14ec8b67.
- Seed uses existing author province for pilot provincial coordinator and sets editor region/grade for pilot scope going forward. Commit f01f0401.
- These code changes have NOT yet been locally linted/tested and NO pilot DB mutation was executed. Must run dry-run review, explicit guarded apply if correct, full 405+ non-DB suite and DB integration suite. Production and main remain unchanged.

## P0 isolated-pilot DB gate verified — 2026-10-11
- Operator applied guarded pilot-only two-record repair; transaction COMMITTED: provincial coordinator scope Istanbul(34) -> Bursa(16); editorGrade 9 -> 8. Sınıf. Author province, district, institution were preserved.
- Read-only pilot scope diagnosis returned all seven boolean authorization/project checks true.
- `npm run test:integration`: 34 passed, 0 failed, 5 skipped across 6 files (5 passed, 1 skipped). Skipped tests are settlement-db and MUST NOT be described as validated.
- Previous no-DB suite: 405 passed, 0 failed across 45 files; TypeScript/lint PASS. Build previously PASS before latest pilot-fixture-only code edits, therefore fresh build verification advisable.
- P0 core permission/project/question integration gate PASSED. Remain: evaluate explicitly skipped settlement DB tests and latest build/non-DB rerun; no merge to main or Vercel Production without separate user acceptance.

## P0 core acceptance gate — verified 2026-10-11
- Latest user-run `npm run test:integration`: 34/34 executed tests PASS, 0 FAIL, 5 SKIPPED (`tests/integration/settlement-db.test.ts`), across 5 passed files and 1 skipped.
- Pilot payment test also PASS (1.85s) following 15s test-only timeout accommodation; a prior 5s timeout was intermittent. No payment business logic altered.
- Prior user-run 405/405 non-DB tests PASS; TypeScript/lint PASS. Fresh complete build and non-DB rerun after latest commits is still advisable for final release signoff.
- P0 CORE authorization, project visibility, question revision and approval, and canonical payment integration ACCEPTANCE MET in isolated pilot tests; settlement DB integration explicitly NOT tested.
- Scope remains feature branch; main and Production NOT merged/deployed. Separate explicit merge/Production permission required.

## P0 CORE CLOSED — local verification 2026-10-11
- User-run latest feature-branch build: `npm run build` PASS, Vite 1700 modules transformed; non-blocking >500 kB chunk advisory.
- User-run latest non-DB suite: `npx vitest run --exclude "tests/integration/**"` — 45/45 files, 405/405 tests PASS, 0 FAIL.
- Immediately preceding pilot DB suite: 34/34 executed tests PASS, 0 FAIL; 5 settlement DB tests SKIPPED. Earlier lint/tsc PASS.
- P0 CORE scope (permissions, project visibility, author/editor question lifecycle, pilot payment) meets technical acceptance on feature branch. NOT a blanket claim for settlement DB or production deployment.
- Deferred follow-up: explicit settlement DB fixture and skipped tests; Vite JS chunk optimization; PostgreSQL client SSL/deprecation warnings.
- No merge to main, no Production deployment, no doctoral independent-copy changes. Await separate explicit acceptance before either promotion.

## P1-A opt-in structured preview implementation — 2026-10-11
- Isolated P1 branch: `feat/question-studio-p1-structured-preview-20261011`, based on P0 core closing commit `6fe4dc33`.
- Implemented: lossless legacy-to-typed-document adapter; React-escaped structured preview (lists, table, formatting, safe HTTPS links, TeX source fallback); four options and existing media placements; gated 1200-char table insertion; scoped CSS; automated P1 security/compatibility test source; single-command `node scripts/p1-check.mjs` and implementation plan.
- Feature flag `VITE_QUESTION_STUDIO_P1=true` enables experimental preview on local development; default legacy renderer and all existing API/database writes are unchanged. NO new Prisma schema or migration; NO autosave/version persistence yet.
- IMPORTANT: new P1 code has NOT yet been locally compiled/tested by operator. Do NOT state that P1 tests passed. User to run `node scripts/p1-check.mjs`, inspect local preview and report output.
- GitHub status for P1 commit indicated Vercel build rate-limit / quota block, not verified code build failure; Vercel MCP access to existing `salih22` scope returned 403, so deployment logs not available. No manual deployment authorized.
- Next: fix any P1 gate failures, verify browser view; then evaluate editor and math-typesetting library, IME/undo/a11y/asset safety and HTTP 409 unsaved draft recovery in subsequent stage.

## P1-A first local test and repair — 2026-10-11
- User ran `node scripts/p1-check.mjs` on P1 branch. Test suite: **419 PASS** across 46 test files (including 14 P1 tests); however `npm run lint` and `npm run build` FAILED due to malformed JSX in `src/DemoApp.tsx` at math toolbar button. P1 acceptance therefore FAILED.
- Root cause: prior ad-hoc JS string replacement contained `$'` sequence, interpreted by String.replace as a replacement token, injecting duplicate tail content and breaking math button syntax. This was an implementation error, unrelated to database.
- Reconstructed `src/DemoApp.tsx` from intact P0 baseline, applied P1 imports/table helper/gated preview and exact toolbar changes with literal-safe replacements; repaired result has only 37 changed lines vs P0, math control restored, duplicate tail removed. Commit bc3e4f4.
- Strengthened P1 regression assertions for toolbar integrity and duplicate injection (fe7dc3e), made P1 gate stop immediately on first failed stage to save resources (05fb602).
- **Critical:** repaired P1 branch has not yet been retested locally; obtain `npm run lint`, 419+ tests, and build PASS before visual acceptance. Vercel preview may be build-rate-limited; local `npx vercel dev` occupied localhost:3001 in user's earlier run.
- No schema migration, DB modification, main merge or Production deployment.

## P1-A LOCAL FRONTEND ACCEPTANCE PASSED — 2026-10-11
- Operator pulled P1 code at GitHub head f40331d and ran `node scripts/p1-check.mjs`.
- `npm run lint`: PASS (Prisma generate, UI TypeScript, API TypeScript).
- Non-DB regression suite: **419 passed / 419 executed, 46 test files passed** (includes 14 P1 tests).
- `npm run build`: PASS (Vite v8.3.0, 1703 modules); JS chunk >500 kB is **non-blocking** performance advisory.
- Controlled DB Error / Tx Error messages during `question-handlers` negative-path unit tests are expected: those 69 tests passed.
- **P1-A source/build/test gate PASSED; visual/browser acceptance is still outstanding.** Latest P1 branch has NOT undergone renewed live pilot-DB integration, which remains a separate gate. Previously P0 pilot suite passed 34 with 5 settlement tests skipped.
- Next: run local preview with `VITE_QUESTION_STUDIO_P1=true`, compare four-choice/editor preview, structured table, TeX-source fallback, links, browser keyboard/responsive behavior and default flag-off fallback. New persisted rich text, WYSIWYG editor, formula typesetting, autosave conflict resolution, history and DB migration remain out of P1-A scope.
- No main merge, Production deployment, or database changes were authorized or performed.

## P1-A screenshot visual review — 2026-10-11
- User supplied two screenshots of the local opt-in question studio preview, desktop width.
- Observed in screenshots: side-by-side authoring/preview, inline text styles and lists, rendered two-column table, source fallback for inline math, embedded video thumbnail, media list, four A-D answer options with D highlighted, explanation and positive preflight panel.
- Visual issues to address during P1-B: text/preview readability (small font and faint helper labels); invalid link placeholder appears as literal source because its URL is incomplete (safe, but needs actionable validation).
- **Evidence boundary:** screenshots DO NOT establish save/reload persistence, end-to-end new-question creation, correct mobile/responsive behavior, keyboard/IME, alt-text enforcement, or role/security behavior. Treat visual acceptance as desktop preview observations, NOT complete P1-A product signoff.
- Before progressing to persisted rich-text edits, validate roundtrip save/reopen, no data loss on HTTP 409, feature-flag-off legacy display, and pilot-only access with existing backend checks.
- Next milestone: P1-B editor proof-of-concept; prioritize unsaved draft recovery, Turkish keyboard/IME, font legibility and math renderer decision; database and production remain untouched.

## P1-B safeguard workspace — IMPLEMENTED, not yet operator-tested (2026-10-11)
- Branch `feat/question-studio-p1b-safe-workspace-20261011` was created from P1-A visual review commit `79d8895`. User approved proceeding to P1-B; that approval is **not** evidence of successful save/reopen or authorization to deploy.
- Added `src/questions/studio-state.ts`: deterministic in-memory form fingerprint, including unsubmitted media input fields.
- `src/DemoApp.tsx`: on HTTP 409 no destructive server-side re-open; preserves unsaved question draft and displays actionable error. Synchronous save lock + loading/disabled/inert authoring controls avoid duplicate sends/changes during pending save. Close and cancel require confirmation if dirty; beforeunload warning on browser reload; successful save clears form only after server acknowledgment.
- `src/questions/studio-workspace.css`: opt-in full-viewport workspace via `VITE_QUESTION_STUDIO_P1=true`; larger text, responsive editing/preview, sticky actions. Legacy flag-off modal and backend endpoints remain unchanged.
- Added `tests/question-studio-p1b.test.ts` (15 nominal test cases: fingerprint, field changes, 409 source/close guard, opt-in CSS) and `docs/QUESTION_STUDIO_P1B_SAFE_WORKSPACE.md` with acceptance matrix.
- No DB schema changes, migrations, seed, `main` merge or Production release. No rich-text WYSIWYG or actual math typesetting yet. Draft remains in-memory: browser crash/reload cannot restore it automatically.
- **NEXT REQUIRED GATE:** user checks out new branch, executes `node scripts/p1-check.mjs`. Expected non-DB total around 434 (419 P1-A + 15 P1-B); do not claim PASS before output. Then pilot-only human/browser save-reopen and 409 reproduction.

## P1-B frontend gate PASS — operator verified 2026-10-11
- On `feat/question-studio-p1b-safe-workspace-20261011`, operator ran `node scripts/p1-check.mjs` after pulling `1356f0b` test updates.
- UI and API TypeScript/lint PASS; 47/47 test files PASS; **434/434 non-DB tests PASS**, including 15 P1-B tests; Vite v8.3.0 production bundle compilation PASS (1705 modules).
- Vite emitted a non-blocking >500 kB chunk warning (main JS ~708.27 kB). Negative-path DB Error/Tx Error stderr from mocked question handlers is expected; question handler tests PASS.
- **P1-B automated source gate ACCEPTED.** This is not P1-B browser/manual acceptance and does not validate P1-B runtime 409 conflict, save/reopen round-trip, multi-session behavior, accessibility/mobile, or live pilot DB integration. The in-memory guard does not persist drafts through crashes/reloads.
- Next manual pilot-only checks: (1) flag-on fullscreen/mobile layout, (2) dirty-form close cancel/confirm, (3) save then reopen/compare question data, (4) genuine two-session 409 conflict and local draft preservation, (5) flag-off legacy view.
- No main merge, Vercel Production deployment, seed, or schema change authorized or performed.

## P1-B user testing: pause/resume issue repaired in feature branch (2026-10-11)
- User screenshotted and confirmed narrow-screen responsive layout is satisfactory, but exiting/canceling question authoring caused previously written text to vanish on reopening.
- Root cause: old safe close handler only warned then unmounted form, while `openQuestionForm()` always cleared all input; no paused-draft recovery existed.
- Repaired in feature branch: owner+question-scoped in-memory paused drafts, confirmation Cancel keeps form in place, Confirm pauses with copy, reopening matching question restores all form content including options/correct answer/media. Successful API save invalidates the paused copy. New dirty-state action label: "Ara ver".
- Updated/extended P1-B tests; **these changes are NOT locally tested yet**. Last prior verified gate: 434/434, lint PASS, build PASS; **rerun** `node scripts/p1-check.mjs` before browser acceptance.
- State is not durable across reload, browser close, crash, remount. Never interpret UI pause as DB save.
- No main merge, Production deployment, schema migration or database write.

## P1-B pause/resume frontend gate PASS — operator verification 2026-10-11
- Operator pulled branch through 913c12f and ran `node scripts/p1-check.mjs`.
- `npm run lint` UI/API TypeScript PASS; 47/47 test files, **437/437 tests PASS**, including 18 P1-B tests; Vite v8.3.0 build PASS (1705 modules).
- Main JS bundle ~714.12 KB; non-blocking chunk-size advisory. Mocked `DB Error` and `Tx Error` negative-path diagnostics do not indicate failing tests.
- This validates **non-DB frontend automated checks only**. In-memory paused-draft browser behavior (Ara ver -> confirm -> reopen, cancel stays), live pilot save/reopen and real 409 handling still require user manual confirmation.
- Pause/resume does not survive refresh, closing the tab, crash, or React app remount; never imply durable persistence.
- No Production deployment, merge to main, or database changes. Do not rerun all automated gates unless code changes again.

## P1-B PAUSE/RESUME BROWSER ACCEPTANCE PASSED — 2026-10-11
- User explicitly confirmed all four manual checks passed in the local P1-B UI: (1) enter stem/four options/explanation, (2) choose Cancel on "Ara ver" confirmation and retain open form, (3) confirm pause and close form, (4) reopen "Yeni soru" and recover stem/options/correct answer/explanation.
- This **accepts in-memory pause/resume behavior**, in addition to the previous operator-run 437/437 frontend tests, TypeScript/lint PASS and build PASS. Narrow-screen layout was previously confirmed satisfactory.
- Do **not** overstate as durable draft storage. Reload/tab close/crash persistence has NOT been implemented; save/reopen server round-trip, real multi-session 409 conflict and full accessibility/IME remain pending.
- Proposed next controlled milestone: privacy-aware and user-isolated durable local draft recovery design, then professional rich-text editor and math rendering under separate gates. No additional feature implementation has been authorized in this message.
- No main merge, Vercel Production, schema change or database write.

## P1-C OPT-IN ENCRYPTED RECOVERY — implementation awaiting local frontend gate (2026-10-11)
- User explicitly approved the next controlled milestone after P1-B user-confirmed 4/4 in-memory pause/resume and 437/437 automated tests.
- New branch `feat/question-studio-p1c-encrypted-draft-recovery-20261011` (from P1-B). No main merge or production deployment.
- Added `src/questions/studio-durable.ts`: opt-in AES-256-GCM encryption with 210,000-iteration PBKDF2/SHA-256, per-save salt+IV, user ID/email+question ID storage scope, seven-day TTL, content inside ciphertext, conditional commit to prevent late writes after successful backend save. Passphrase (at least 12 chars) is NOT persisted and must be re-entered after browser reload.
- Browser control gated by BOTH `VITE_QUESTION_STUDIO_P1=true` and `VITE_QUESTION_STUDIO_P1C=true`; then explicit user passphrase and enable required. Debounced encrypted local recovery copies; on pause a final encrypted copy is written before close. On browser reload, open matching New Question or editable existing question, enter passphrase and press Recover. Existing question updatedAt mismatch locks server save until intentional manual reconciliation; in-memory paused draft carries this conflict state.
- Successful existing POST/PATCH invalidates pending local encryption and removes the matching encrypted copy. No DB/schema/API contract or account/role code altered; legacy flag-off behavior preserved. UI and styles implemented, plus 9 WebCrypto security tests and existing regression assertions updated.
- Risks/limits: origin/browser-profile-specific, localStorage can be evicted, no cross-device sync, shared-machine metadata visible and active XSS not prevented by encryption, browser forced close in debounce window could lose latest keystrokes, actual live backend CAS missing.
- Details: `docs/QUESTION_STUDIO_P1C_ENCRYPTED_RECOVERY.md`.
- **MUST VERIFY NEXT**: On local P1-C branch, `node scripts/p1-check.mjs`; nominal target 446/446 non-DB tests, lint and Vite build PASS; **not yet executed**. Then user-assisted browser reload/close recovery + passphrase/no-overwrite tests. No production promotion authorized.

## P1-C LOCAL GATE FIRST RUN FAIL — JSX syntax, patch pending verification (2026-10-11)
- Operator checked out P1-C branch and ran `node scripts/p1-check.mjs`. UI TypeScript check failed with TS2657 at `src/DemoApp.tsx:2096` and TS1005 at approximately line 2178. Cause: missing closing `}` for `{durableFeatureOn && <section ...>` before the question-studio editor layout.
- Patched `</section>` to `</section>}` in the unique P1-C recovery panel boundary (commit `2f3dccb`). Added a regression assertion to existing `tests/question-studio-p1c.test.ts` normalizing CRLF and guarding `</section>}\n<div className="question-studio-layout"` (commit `c107642`). No feature behavior, backend, DB, main, or production change.
- **NOT YET VERIFIED:** operator must run `git pull --ff-only` then `node scripts/p1-check.mjs` on P1-C branch. Previous run stopped at first TypeScript failure; tests and build did not execute. Nominal target 446/446 tests, lint and Vite build PASS; do not claim until log supplied.

## P1-C ENCRYPTED RECOVERY FRONTEND GATE PASS — 446/446 — 2026-10-11
- Operator checked out P1-C branch and ran `node scripts/p1-check.mjs` after JSX panel closure fix.
- UI and API TypeScript/lint PASS; **48/48 test files PASS, 446/446 non-database tests PASS** including 9 P1-C encrypted-draft tests; Vite v8.3.0 production bundle build PASS, 1707 modules.
- Main JS ~714.69 kB (gzip 232.33 kB) emitted only a nonblocking code-splitting warning; mocked DB Error/Tx Error stderr occurred in expected negative-path tests and `question-handlers.test.ts` PASS.
- P1-C **frontend automated gate accepted**, but **NOT browser/manual acceptance**, live pilot DB save/reopen, two-session 409 check, nor merge/Production approval.
- Next: in the same local origin/browser profile, run `VITE_QUESTION_STUDIO_P1=true`, `VITE_QUESTION_STUDIO_P1C=true`, `npx vercel dev`; exercise explicit opt-in, 12+ character independent passphrase, after-idle encrypted autosave, Ara ver, browser reload, password recovery and original form content. Do not use actual account password.
- Distinguish cryptographic unit tests from actual browser storage capability. Never claim persisted recovery until manual confirmation. Preserve untracked user files; no main merge, Production, migrations, or DB writes.

## P1-C four-step browser acceptance — user approval 2026-10-11
- The user responded "hepsini onaylıyorum" to the four proposed manual browser steps: prepare a complete question and activate encrypted recovery, pause, reload the same browser/origin, and recover with the separate passphrase.
- Record as **user approval of the P1-C browser acceptance scenario**, not independent observation of the screen or runtime telemetry. If we need an explicit audit claim that all steps executed and passed, request detailed operator results.
- Previously operator-verified automated frontend gate: 446/446 tests and Vite build PASS (48/48 files). The feature remains on the P1-C branch, gated by `VITE_QUESTION_STUDIO_P1` and `VITE_QUESTION_STUDIO_P1C`.
- Outstanding gates: isolated pilot database POST/PATCH save and reopen roundtrip, real multi-session 409/stale-version and reconciliation, recovery on same origin after restart, browser storage/permission and accessibility checks, and any production operational privacy review. These remain **not independently validated**.
- No authorization for merging to main, deploying Production, altering schema, migrating or seeding the database. Next staged milestone should verify pilot backend compatibility and concurrency before advancing to rich-text/math editing.

## P1-D CAS & PILOT ROUNDTRIP — implementation awaiting operator gate (2026-10-11)
- User explicitly approved P1-D staged work: isolated pilot DB identity check, create/save/GET reopen, two-session stale 409 handling, and safe version comparison. Created branch `feat/question-studio-p1d-safe-roundtrip-20261011` from P1-C. No main or production merge.
- **Discovered gap:** original PATCH read `question.updatedAt` during the request and used that in conditional updateMany. It protected against changes *during a request* but not stale content from a browser tab that opened the question before another tab's completed save.
- Updated `api/v1/questions/[id].ts` to **require** client `expectedUpdatedAt` revision: 428 when missing, 400 malformed ISO, 409 if stale, then atomic updateMany uses author ID + status + client-opened revision. Every successful PATCH explicitly advances updatedAt by ≥1ms. No database migration.
- `src/DemoApp.tsx` sends the originally opened revision. On 409/428 it preserves all local fields, locks Save and displays a read-only side-by-side comparison of local text/options/answer/explanation/assets vs latest scoped server question, with an explicit confirmation action to discard local edits and reopen the latest still-editable version.
- New `src/questions/revision-compare.ts`; corresponding scoped CSS. Frontend source test `tests/question-studio-p1d.test.ts` adds 4 cases. `tests/question-handlers.test.ts` adds 8 unit cases for missing/bad/stale/CAS. `tests/integration/question-db.test.ts` adds real GET-after-PATCH and two-session stale 409 assertions with cleanup-safe guard.
- Dedicated `scripts/p1d-pilot-check.mjs` performs **read-only** explicit host/DB-name (must contain pilot/test/sandbox) and fixture identity check **before** spawning mutating isolated `question-db.test.ts`. The integration suite requires internal verified marker; no DB commands have been executed in this chat. Do not run pilot integration against production/real data.
- **Breaking API contract:** clients that directly PATCH without `expectedUpdatedAt` now receive HTTP 428; coordinate external clients before any deployment. GET/POST and editorial workflow remain unchanged.
- Detailed plan: `docs/QUESTION_STUDIO_P1D_SAFE_ROUNDTRIP.md`.
- **NEXT GATES NOT VERIFIED:** On P1-D branch `node scripts/p1-check.mjs` (nominal nonDB target 458/458, lint and Vite build PASS); then only after user confirms isolated pilot DB host/name and fixtures run `node scripts/p1d-pilot-check.mjs`, followed by browser tab A/B scenario. No merge to main, Production, migrations, seed or live DB writes.

## P1-D FIRST FRONTEND GATE — JSX FAIL, PATCHED, NOT RETESTED (2026-10-11)
- Operator switched to `feat/question-studio-p1d-safe-roundtrip-20261011` and ran `node scripts/p1-check.mjs`. UI `tsc --noEmit` stopped at `src/DemoApp.tsx:2147`: TS1005 missing `}`. No non-DB tests or Vite build ran on that attempt.
- Cause: the P1-D conditional alert `{questionConflictLookupFailed && <p ...></p>` lacked the final `}` before the existing P1-C encrypted-recovery panel.
- Fixed JSX precisely: `</p>}` in commit `5426d960`. Added Windows CRLF-normalizing source regression test for the JSX boundary in `tests/question-studio-p1d.test.ts` (latest test correction `e9ca3c78`).
- Static source review verified both the P1-D alert and P1-C panel close correctly. **Do not assert test PASS until user pulls and reruns `node scripts/p1-check.mjs`**.
- No main merge, Production deployment, seed, migration, or DB writes; only P1-D feature branch files.

## P1-D 457/458 OPERATOR GATE — P1-B ASSERTION FIX PENDING RERUN (2026-10-11)
- User ran `git pull --ff-only` on P1-D and `node scripts/p1-check.mjs`. UI/API TypeScript/lint PASS; 49 test files, 457/458 non-DB tests PASS. **One failing test**: `tests/question-studio-p1b.test.ts` expected old source string `if (e instanceof ApiError && e.status === 409)` but P1-D correctly implements `409 || 428` and keeps the draft visible. Vite production build did NOT run due to test failure.
- Negative-path `PATCH transaction failure` test emitted `TypeError: ... getTime` instead of intended `Tx Error`, because its mocked question omitted updatedAt. Test happened to pass by checking HTTP 500 only; this masked incorrect branch execution.
- Patched ONLY regression test files: `tests/question-studio-p1b.test.ts` now checks 409/428 guard, revision token, conflict state and preservation; `tests/question-handlers.test.ts` supplies fixed fixture revision and explicitly requires `prisma.$transaction` to be called once. Static inspection of assertions against actual sources completed.
- **DO NOT CLAIM VERIFIED PASS YET:** pull latest P1-D and rerun `node scripts/p1-check.mjs`; expected 458/458 tests plus successful Vite compilation if no other issues. No live DB runs or main/Production changes.

## P1-D OPERATOR FRONTEND GATE VERIFIED 458/458 — 2026-10-11
- User supplied full `node scripts/p1-check.mjs` log after pulling commit `0a5c285` on P1-D branch. **UI+API TypeScript PASS; 49/49 non-DB test files, 458/458 tests PASS; Vite v8.3.0 build PASS, 1708 modules**, no deploy. The mocked `DB Error` and `Tx Error` negative-path stderr is expected; Vite JS 726.68 kB has a non-blocking chunk advisory.
- **P1-D automated frontend/handler gate is accepted**. This does NOT validate actual PostgreSQL create/GET/PATCH, two-session live 409, browser UI or Production.
- After operator PASS, the isolated DB runner was safety-hardened: `node scripts/p1d-pilot-check.mjs` now performs **READ-ONLY preflight by default**. Executing integration writes requires BOTH `--run-integration` CLI switch and `PROLIG_P1D_ALLOW_WRITES=true` in addition to existing pilot host, DB, fixture and confirmation checks. Updated existing safety test assertion without adding test count. These latest safety-only changes still await user's local refresh/verification.
- Next: confirm actual separately isolated pilot DB and credentials privately on user PC; run read-only preflight first. Only after explicit DB isolation confirmation consider integration write tests. Never paste DATABASE_URL or AUTH_SECRET, never use main/Production, never seed or migrate.

## P1-D EMPTY SANDBOX READ-ONLY OPERATOR GATE: PASS (2026-10-11)
- Operator executed git pull, node --check scripts/p1d-sandbox-inspect.mjs, npx vitest run tests/p1d-sandbox-inspect.test.ts: **3/3 tests PASS**. Read-only inspection script returned **PASS**, verifying pooled/direct connections, separate existing local PRO-LIG Neon endpoint, expected prolig_p1d_sandbox database, zero public tables, no Prisma migrations table, no User table. No data was modified.
- Previous P1-D non-DB frontend/handler gate: **458/458 tests**, UI/API TypeScript, Vite build PASS (before adding the sandbox inspector tests).
- Environment currently EMPTY. **Schema migrations, pilot seed, or live integration tests have NOT occurred**. Existing deployed Vercel Production env has not been inspected or modified.
- Next gate needs fresh explicit authorization: use separately guarded sandbox-only bootstrap for the seven checked-in Prisma migrations and six fake pilot accounts/project. Do NOT simply run `npx prisma migrate deploy` or `npm run seed:pilot` with default .env; those could target the original database. Dedicated credentials/role scope and DB identity verification must precede any write. No GitHub main merge or Vercel Production promotion.

## P1-D SANDBOX-ONLY BOOTSTRAP PREPARED (2026-10-11)
- User explicitly approved creating database tables, six artificial pilot accounts and an example project ONLY in newly verified `neon-yellow-candle / prolig_p1d_sandbox`; no approval to alter the original PRO-LIG database, Vercel Production, GitHub main or unrelated data.
- Source changes confined to P1-D branch: `scripts/p1d-sandbox-bootstrap.mjs` one-time two-stage installer, `tests/p1d-sandbox-bootstrap.test.ts` four source guards, `prisma/seed.ts` optional isolated credentials path with explicit sandbox target guard, `docs/QUESTION_STUDIO_P1D_SANDBOX_BOOTSTRAP.md`.
- Running bootstrap without `--apply` is READ ONLY. It verifies separate URLs for pooling/direct, expected empty public DB, seven checked-in migration directories, false pilot write flags, and original-vs-sandbox host isolation. Apply additionally requires `PROLIG_P1D_APPLY_CONFIRM=CREATE-prolig_p1d_sandbox`, generates local sandbox-only secret file (6 random passwords + separate AUTH_SECRET), and invokes migration/seed exclusively using explicitly sandbox-targeted sanitized child environment. Outputs secret-free PASS/FAIL only. Stops immediately on any failure; never auto-resets.
- The seed continues to use the original credential path by default; bootstrap sets a separate path `.local/p1d-sandbox-credentials.env`. Original `.env` and `.env.development.local` are not changed.
- **Only source-level static inspection / JS parse has run here. The user's computer has not yet run the bootstrap's syntax checks, tests, read-only plan or apply. No migrations/seeds have occurred; pilot DB remains empty as last observed.**
- Next user commands: `git pull --ff-only`; `node --check scripts/p1d-sandbox-bootstrap.mjs`; `npx vitest run tests/p1d-sandbox-bootstrap.test.ts`; `node scripts/p1d-sandbox-bootstrap.mjs --plan`. Review PLAN PASS before proceeding to explicitly authorized `--apply` stage. Do not run generic Prisma CLI against inherited default .env.

## P1-D SANDBOX BOOTSTRAP EXECUTED SUCCESSFULLY (2026-10-11)
- User's Windows PowerShell: `git pull --ff-only` to P1-D branch `1873d7a`; `node --check scripts/p1d-sandbox-bootstrap.mjs` PASS; `npx vitest run tests/p1d-sandbox-bootstrap.test.ts` **4/4 PASS**.
- User independently executed `node scripts/p1d-sandbox-bootstrap.mjs --plan`: read-only PASS with both Neon URLs, 0 public objects, seven migrations, six fake users and one math pilot project planned.
- User authorized **ONLY** dedicated `neon-yellow-candle / prolig_p1d_sandbox` schema+fake fixtures; ran process-scoped `PROLIG_P1D_APPLY_CONFIRM=CREATE-prolig_p1d_sandbox` with `--apply`, then removed confirmation env. **Bootstrap exit code 0**.
- Output confirms: sandbox isolation/empty schema PASS, dedicated local test secrets generated, Prisma `migrate deploy` PASS, all 7 migration records PASS, local Prisma client generation PASS, 6 fake users + 1 project seed PASS, final sandbox user/project count PASS. Seed password file `.local/p1d-sandbox-credentials.env` is private and must not be shared.
- SSL warning from Node pg is advisory about future `sslmode` semantics, not a failed test.
- Further read-only relationship acceptance is available at `scripts/p1d-sandbox-verify.mjs`, with 5 source guard tests. User has not executed it yet. No live CRUD/concurrency integration test, browser UAT, GitHub main merge or Vercel Production deployment has happened; don't conflate bootstrap PASS with production readiness.
- Next step (read-only): `git pull --ff-only`; `node --check scripts/p1d-sandbox-verify.mjs`; `npx vitest run tests/p1d-sandbox-verify.test.ts`; `node scripts/p1d-sandbox-verify.mjs`. All require no new credentials and no new write approval. Follow with separate authorization for actual ephemeral question write tests.

## P1-D POST-BOOTSTRAP ACCEPTANCE PASS — READ ONLY (2026-10-11)
- User ran `git pull --ff-only` to `2274415`, `node --check scripts/p1d-sandbox-verify.mjs` PASS, `npx vitest run tests/p1d-sandbox-verify.test.ts` **5/5 PASS**, `node scripts/p1d-sandbox-verify.mjs` PASS.
- Read-only SQL verified separate Neon sandbox pooled/direct identity; **7/7 Prisma migrations**, **6/6 fake pilot users and six roles**, mathematics author profile/editor/province coordinator compatible scopes and editor branch assignment; matching mathematics pilot project and project-author relation. No DB writes.
- **Safe question test launcher now prepared but not operator-run:** `scripts/p1d-sandbox-question-gate.mjs`; `tests/p1d-sandbox-question-gate.test.ts` (5 static safeguards). The launcher loads `.env.p1d.local` and the independently generated `.local/p1d-sandbox-credentials.env`, constructs sanitized child environment, rechecks original Neon host difference, delegates to existing guarded `scripts/p1d-pilot-check.mjs`. Default/ `--preflight` invokes only SQL SELECT, no questions created. `--run-integration` requires an additional distinct explicit question-write approval token and is NOT yet authorized.
- Next: user `git pull --ff-only`; `node --check scripts/p1d-sandbox-question-gate.mjs`; `npx vitest run tests/p1d-sandbox-question-gate.test.ts`; `node scripts/p1d-sandbox-question-gate.mjs --preflight`; share only non-secret PASS/FAIL lines. After read-only gate passes, separately seek authorization for test question CRUD and 409 stale-write checks; the write mode must not start automatically.
- SSL node advisory is nonfatal. No live question integration, browser UAT, Production deploy or main merge so far.

## P1-D ISOLATED QUESTION DB INTEGRATION ACCEPTED — 20/20 PASS (2026-10-11)
- Operator on Windows PowerShell ran `node scripts/p1d-sandbox-question-gate.mjs --run-integration` with process-scoped `PROLIG_P1D_QUESTION_TEST_APPROVAL=ALLOW_TEMP_QUESTION_WRITES_IN_prolig_p1d_sandbox`; the env variable was cleared with PowerShell `finally`.
- Initial separate Neon sandbox, fake test-secret, and role fixture identity preflight: PASS.
- `tests/integration/question-db.test.ts`: **20 passed / 20**, duration **21.07s** (test execution **18.831s**), exit code 0, both nested runner and launcher reported PASS.
- Confirmed actual sandbox PostgreSQL roundtrip: fake writer CREATE, GET, draft PATCH, reread persisted fields and advanced revision; stale two-session PATCH **HTTP 409** and first edit preserved; submit/in-review, revision request, draft rewrite/resubmit, EDITOR approval; guards for author PATCH when submitted/approved (409), MUHASEBE GET (403), coordinator scope GET (200), QUESTION_CREATED audit.
- Suite `afterAll` deletes the created temporary question and its ActivityLog, checks zero remaining rows for that temporary ID; reported all 20 tests PASS. This is evidence of intended cleanup, but not a guarantee that unrelated test runs left zero rows.
- Non-blocking warnings: Node pg SSL-mode compatibility advisory and `DeprecationWarning: Calling client.query() when the client is already executing a query`. Track the latter as async PG client/concurrent query issue before dependency upgrade (pg@9); not a failure in this run.
- The user-approved test affected ONLY `neon-yellow-candle / prolig_p1d_sandbox`. Nothing was deployed, no GitHub main merge, no Vercel Production database mutation.
- **P1-D DB integration gate passed; overall Production release NOT approved.** Next: post-test read-only sandbox identity/fixture recheck; browser UAT (side-by-side 409 conflict, explicit discard/reopen, encrypted local-draft recovery) in separately configured **sandbox-only** app context; rerun non-DB suite/lint/build on final feature SHA; review breaking API requirement `expectedUpdatedAt` (428 if missing) for compatibility, and inspect PG warnings. Obtain explicit operator approval before main merge and Production deployment.

## P1-D POST-INTEGRATION SANDBOX RECHECK PASS / LOCAL BROWSER PREVIEW PREPARED (2026-10-11)
- After 20/20 live question integration PASS, user ran `git pull --ff-only` to `07b26dd` and `node scripts/p1d-sandbox-verify.mjs` a second time. PASS: sandbox identity and pooled/direct connectivity, 7/7 migrations, 6/6 artificial role users, compatible writer/editor/province coordinator scopes, math project and author assignment. Read only; no data was modified.
- Examined frontend runtime: `src/main.tsx` uses `AuthGate`; LoginScreen calls real `/api/v1/auth/login`, and question module calls `/api/v1/questions` API. `npm run dev` is Vite UI alone and not a sufficient real API UAT; ordinary Vercel dev can use linked Vercel project vars so it is NOT the sandbox browser command.
- Prepared isolated local P1-D browser preview on same feature branch: `scripts/p1d-sandbox-browser.mjs`, `scripts/p1d-sandbox-browser-app.ts`, `tests/p1d-sandbox-browser.test.ts`. The wrapper defaults to a read-only pilot identity preflight, loads only .env.p1d.local plus separate random sandbox credentials, compares Neon server identity to original local envs, constructs fresh child env with sandbox DB/JWT only. Browser runtime uses local Express+Vite (no Vercel CLI), binds solely to 127.0.0.1:3137, rejects non-local Host/Origin, Vite config/envDir disabled, denies access to local secret files, exposes only auth/login/logout/me, questions and project GET API. **Default --serve is read-only**: question write methods explicitly return 403; no other module APIs enabled.
- Browser write mode `--serve-write` additionally requires separately acknowledged `PROLIG_P1D_BROWSER_UAT_APPROVAL=ALLOW_BROWSER_QUESTION_WRITES_IN_prolig_p1d_sandbox`; **NOT YET AUTHORIZED**. Only artificial pilot questions, no Production data. Do NOT use regular Vercel dev for this acceptance.
- The new local browser adapter has NOT been operator-executed or confirmed end-to-end yet. Next steps: `git pull --ff-only`; `node --check scripts/p1d-sandbox-browser.mjs`; `npx vitest run tests/p1d-sandbox-browser.test.ts`; `node scripts/p1d-sandbox-browser.mjs --preflight`. Review results before `--serve`; no write-mode yet. No main merge/deploy.

## P1-D BROWSER READ-ONLY UI ACCEPTANCE PASS, WRITE UAT APPROVED (2026-10-11)
- User executed initial local read-only browser: 5/5 sandbox-browser tests PASS, "--preflight" PASS, "--serve" opened http://127.0.0.1:3137 with question writes BLOCKED.
- User browser screenshots confirm authenticated fake pilot author, dashboard 1 project / 0 questions, empty question list, New Question Studio, and 8th-grade mathematics pilot project PILOT-MAT-8-001 shown to its assigned author. User independently confirmed this project appears in Studio dropdown.
- User explicitly approved all next browser tests: temporary question creation/edit, two-tab stale PATCH HTTP 409, encrypted local draft recovery and temporary question deletion ONLY in independent neon-yellow-candle/prolig_p1d_sandbox. No original Neon, Vercel Production, main merge/deploy or unrelated app data authorized.
- Source review: durable encrypted draft UI is conditional on BOTH VITE_QUESTION_STUDIO_P1 and VITE_QUESTION_STUDIO_P1C. Enabled both flags only via sandbox browser Vite runtime define in scripts/p1d-sandbox-browser-app.ts; corresponding static test updated. Not yet user-executed.
- User must Ctrl+C to stop current read-only server before git pull; re-run syntax/tests/preflight, then start --serve-write with process-scoped PROLIG_P1D_BROWSER_UAT_APPROVAL=ALLOW_BROWSER_QUESTION_WRITES_IN_prolig_p1d_sandbox. Return on failure, do not use generic vercel dev. First test create/reopen, then encrypted recovery, then two tab conflict, then cleanup and final read-only health check.
- No real browser question writes or two-tab 409/recovery acceptance performed yet. 20/20 separate live SQL/API integration tests passed earlier and post-test read-only health passed.

## P1-D ENCRYPTED BROWSER DRAFT RESTORE ACCEPTED — USER REPORTED PASS (2026-10-11)
- User supplied browser screenshots showing local preview's P1-D Studio dirty badge, "Bu cihazda şifreli taslak kurtarma" active, "Şifreli kurtarma kopyası güncellendi", form with draft body/four answer options/selected correct answer/solution, "Ara ver" confirmation, and reopening the unsaved draft.
- Following explicit instructions to pause, hard-refresh browser (Ctrl+Shift+R), re-enter the separate recovery passphrase and use "Şifreli taslağı kurtar", the user stated they repeated ALL steps and all PASS. This is **user-reported real browser reload/recovery UX acceptance**, not an independent cryptographic audit or evidence that backend record was saved.
- The temporary question was NOT yet confirmed persisted to PostgreSQL by a browser write. The previous Studio screenshot had "Genel Soru Havuzu" selected; user must choose "PILOT-MAT-8-001" before saving. Real two-tab 409 compare and final test record deletion remain OPEN.
- Existing user permission covers disposable browser question create/update, two-session 409 test and cleanup ONLY on neon-yellow-candle/prolig_p1d_sandbox; not other DB or Production.
- Next operator step: with authorized --serve-write local preview still running, select assigned mathematics pilot project in restored Studio draft, keep four unique answer options and chosen correct answer, click "Taslağı kaydet"; verify ONE question in the list, reopened content/project persists. Then carefully stage two-tab stale edit 409. Keep separate recovery passphrase private.
