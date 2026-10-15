# PRO-LIG P2 — recovered local development snapshot (2026-10-14)

Input: user-provided `PROLIG_P2_KAYNAK_20261014-013739.zip` (302 source files + export information), reportedly on feature branch `feat/p2-professional-question-editor-20261012`, local HEAD `eb9bc1b`.

## Work completed in this recovery copy

- Wired the pre-existing `GuidedQuestionStudio` into `src/DemoApp.tsx`, keeping the existing full-length P1 editor as the default fallback. The guided editor is activated only when both `VITE_QUESTION_STUDIO_P2_EDITOR=true` and `VITE_QUESTION_STUDIO_P2_TYPES=true` are set at build time.
- Added propagation of typed question data to form snapshot, pause/recovery, edited-question loading, create/PATCH payloads, and editor review preview. The guided form retains a single source of truth for existing fields, with a supplemental state for type-specific fields.
- Kept the five-step UI and tabbed A–E option editor from the recovered source. Only the final step exposes the submit button; navigation itself triggers no API call.
- Removed accidental typed-feature enablement from the existing P1-D `--serve-p2` and `--serve-p2-write` launchers; they must not enable typed writes while the new schema migration has not been approved and applied in an isolated DB. P2 single-type rich text can remain behind its existing flag.
- Added typed question tests for four/five-choice, True/False, open-ended and backwards-compatible four-choice request contracts.

## Release blockers, not resolved here

1. **Schema/API parity:** `prisma/migrations/20261014120000_question_types/migration.sql` exists in source but has NOT been applied. Prisma client generated from the new schema will query columns that do not exist on the existing P1-D sandbox. Do not run the recovered API/browser against that sandbox until its schema compatibility and migration are independently checked.
2. **No npm dependency installation:** This sandbox could not reach npm registry, so `npm run lint`, Vitest and build were not executed successfully here. The code has been syntax-transpiled, and pure TypeScript business functions can be tested offline; full project checks are mandatory on the user's machine.
3. **No production data actions** were taken. No migration/seed, Neon writes, Vercel deploy, GitHub push or main merge.
4. **Vercel Preview DB isolation** remains unverified. Do not push to the connected branch if it will auto-deploy a Preview against production DB.
5. The recovery ZIP is a source snapshot without `.git` metadata. Apply changes on top of the user's existing local branch and **review the diff**; do not replace the entire repository or overwrite more recent local changes.

## Safe next actions

- Save a backup of the current local working tree.
- Apply the supplied patch to the same branch and inspect conflicts.
- Run `npm ci`, `npm run lint`, `npx vitest run --exclude "tests/integration/**"`, `npm run build` and isolated read-only inspection on a machine with dependencies.
- Prepare a **dedicated** sandbox migration plan and read-only schema verification before any multi-type DB UAT or flag activation. Preserve P1 legacy behaviour.
- Determine Vercel Preview project/branch DB identity without disclosing secrets before feature-branch push.
