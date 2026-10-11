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
