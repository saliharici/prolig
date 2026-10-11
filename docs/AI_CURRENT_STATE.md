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
