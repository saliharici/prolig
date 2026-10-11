# P1-D sandbox database bootstrap — isolated Neon (2026-10-11)

## Operator-verified findings

- Existing PRO-LIG local connections point to Neon.
- New separate Neon project: neon-yellow-candle, independent of pre-existing prolig-pilot.
- New PostgreSQL database: prolig_p1d_sandbox, role neondb_owner, Frankfurt region.
- Vercel Storage previously showed no Connected Projects for the new Neon resource. Vercel Production environment values have NOT been independently examined.
- The user rotated a previously exposed connection password; never request, print, or paste the new password or connection strings.
- Local pooled DATABASE_URL and non-pooled DIRECT_URL are in Git-ignored .env.p1d.local, not the ordinary .env or .env.development.local.
- The user's separate read-only Node connection check confirmed both pilot connections work, match the expected database, and use a different host from the original local environment. Write authorization flags remain false.
- No pilot schema migration or pilot user seed has been executed.

## Read-only inspection

Files:
- scripts/p1d-sandbox-inspect.mjs: reads only .env.p1d.local, checks DB name, Neon endpoint separation and both read-only flags, compares against prior local environment hosts, queries public schema metadata from both pilot connections inside BEGIN READ ONLY transactions. Does not emit secrets or change data.
- tests/p1d-sandbox-inspect.test.ts: source contract tests for these non-destructive safeguards.

PowerShell:

    cd D:\Proje\pro-lig
    git pull --ff-only
    node --check scripts/p1d-sandbox-inspect.mjs
    npx vitest run tests/p1d-sandbox-inspect.test.ts
    node scripts/p1d-sandbox-inspect.mjs

For a truly empty database, expect zero public tables, no Prisma migrations table, and no User table. Stop if the schema unexpectedly contains objects. Do not run scripts/p1d-pilot-check.mjs yet: it expects tables and fixtures which have not been installed in the sandbox.

## Setup plan — separate operator authorization REQUIRED before writes

1. Review read-only results. Confirm the new Neon project is independent from the existing production deployment.
2. Implement/use a sandbox-only guarded bootstrap, loading DIRECT_URL and DATABASE_URL from .env.p1d.local. Revalidate server/database identity, host separation from existing environments, empty public schema, and explicit authorization immediately before any database mutation.
3. Apply the seven already checked-in Prisma migrations to this EMPTY sandbox only. Never run migrate deploy with ordinary .env defaults or on the existing project.
4. Prepare six fake role-specific pilot credentials and a dedicated AUTH_SECRET locally. Existing prisma/seed.ts expects .local/prolig-pilot-credentials.env. DO NOT reuse that existing file for the new sandbox. Extend seed with a separately protected sandbox credentials path or dedicated seed runner first; keep originals unchanged and no password rotation.
5. Seed fake role users, author profile, province/branch/project, author assignment. Verify the permissions and linked pilot project read-only.
6. Only after a later explicit approval, run isolated question create/GET/PATCH/two-session 409 integration with explicit write gates and post-test cleanup, using a verified sandbox-only process environment.
7. Run the browser acceptance scenarios on a separately configured pilot app, never by connecting the sandbox database to the currently deployed PRO-LIG app.

## Recovery and boundaries

- No migration, seed, create, delete, reset, branch merge, deployment, or Production change is authorized by this inspection step.
- If any write-stage command fails later, stop, preserve non-secret diagnostics, and request additional instructions. No migrate reset, database drop or destructive cleanup without separate scope confirmation.
- Existing GitHub main, current PRO-LIG Neon database and Vercel Production remain untouched.

## Operator read-only empty-schema acceptance — PASS, 2026-10-11

The operator confirmed:
- JS syntax check PASS; `tests/p1d-sandbox-inspect.test.ts`: **3 passed/3**.
- `node scripts/p1d-sandbox-inspect.mjs`: **PASS**, independently checked two connection types and verified separate Neon host from the original local PRO-LIG configuration.
- Public table count **0**, Prisma migration table **absent**, User table **absent**. No write statements were executed.
- Node/pg emitted a non-blocking SSL mode advisory about future semantics; consider explicit `sslmode=verify-full` if consistent with Neon guidance. Do not print connection strings.

**Operator approval to inspect is not approval to mutate.** Before bootstrap, receive explicit permission to create schema plus six fake pilot accounts, passwords and project in **only** this newly created sandbox. After permission, prepare a bootstrap runner that blocks inherited .env settings, positively identifies both Neon server and PostgreSQL database, verifies initial blank schema, and uses only separately created sandbox credentials. No schema write or seed has run yet.

## Sandbox schema and fixture bootstrap approved — implementation (2026-10-11)

- User explicitly approved creating the **seven checked-in Prisma migration schemas, six fake pilot role users and one math pilot project** in **only** the new `neon-yellow-candle / prolig_p1d_sandbox` Neon environment. The read-only operator inspection previously showed zero public tables. No authorization for Vercel Production, original Neon, merging main, database deletion/reset, or unrelated accounts.
- Branch-only implementation: `scripts/p1d-sandbox-bootstrap.mjs` plus `tests/p1d-sandbox-bootstrap.test.ts`. `prisma/seed.ts` now optionally accepts `PROLIG_PILOT_CREDENTIALS_PATH` but retains the old path when omitted; sandbox mode additionally checks the exact dedicated credentials file and target database name. No existing credentials are reused.
- The bootstrap loads pooled and direct URLs **only** from Git-ignored `.env.p1d.local`, validates their names, Neon host match, actual DB identity, compares with original local .env/.env.development.local Neon hosts and inspects the schema in READ ONLY transactions. Expected original `PROLIG_PILOT_DB_CONFIRMED=false`, `PROLIG_P1D_ALLOW_WRITES=false`; the script refuses unexpected public objects.
- Default mode: `node scripts/p1d-sandbox-bootstrap.mjs --plan` (or no arguments) = **READ ONLY**. Shows planned 7 migrations, 6 artificial roles, 1 example math project. No credentials are generated and no DB writes occur.
- **Apply** is available only with two deliberate operator actions, after `--plan` passes: set PowerShell environment variable `PROLIG_P1D_APPLY_CONFIRM=CREATE-prolig_p1d_sandbox` and invoke `node scripts/p1d-sandbox-bootstrap.mjs --apply`. The driver rechecks both connections and the empty schema before writes; this is *separate* from the original `.env` and not a Prisma default invocation.
- Apply writes a **new** private `.local/p1d-sandbox-credentials.env` (create-only, never overwrite) containing six random pilot passwords and a separate sandbox `AUTH_SECRET`. It then spawns the bundled Prisma CLI with **sanitized explicitly sandbox-targeted child environment**, `migrate deploy`, verifies all seven migrations, generates the Prisma client locally, seeds six accounts + a project using that private file and verifies the final records. Raw subprocess output is suppressed to reduce accidental connection-string leaks.
- If any stage fails: **STOP**. Do not rerun `--apply` or use `migrate reset`; first examine the read-only inspection and non-secret diagnostics. Prisma DDL cannot be assumed all-or-nothing across multiple migration files. This is a one-time empty-database bootstrap, not a general-purpose migration/update tool.
- **No migrations, seeds, or real DB integration tests have been executed by the assistant**; user's PowerShell is required. The new bootstrap code has not yet received the operator's local syntax/unit test/plan report.

### Next operator step (READ ONLY ONLY)

```powershell
cd D:\Proje\pro-lig
git pull --ff-only
node --check scripts/p1d-sandbox-bootstrap.mjs
npx vitest run tests/p1d-sandbox-bootstrap.test.ts
node scripts/p1d-sandbox-bootstrap.mjs --plan
```

Expected PLAN PASS while table count remains zero. Do not paste `.env.p1d.local`, any password or a full DB URL. The user may share only safe command results. Once plan passes, follow explicitly documented apply process with a second deliberate command; until then no DB writes.

## Operator executed sandbox schema and fake pilot fixtures — PASS (2026-10-11)

- Windows operator report: `node --check scripts/p1d-sandbox-bootstrap.mjs` PASS, `npx vitest run tests/p1d-sandbox-bootstrap.test.ts` 4/4 PASS; `--plan` PASS in read-only mode.
- Explicit authorized `--apply` used a process-scoped confirmation and exited 0. Output confirmed **7/7 Prisma migrations**, **6 test-only role accounts**, **1 math pilot project**, local Prisma generation and dedicated secret file; command confirmed a clean empty schema before migration. No actual secret was shared in terminal report.
- Pre-existing `.env` and `.env.development.local` remained unchanged per the bootstrap design; no existing PRO-LIG project/database or Vercel deployment was targeted.
- **New read-only acceptance tool:** `scripts/p1d-sandbox-verify.mjs` checks 7 migration records, exact six fake roles/emails, role status and hash presence, author geography, editor branch/grade, editor-assignment, province coordinator, math pilot project and ProjectAuthor assignment. `tests/p1d-sandbox-verify.test.ts` guards its read-only code path.
- **NEXT OPERATOR COMMAND (READ ONLY):** `git pull --ff-only`, `node --check scripts/p1d-sandbox-verify.mjs`, `npx vitest run tests/p1d-sandbox-verify.test.ts`, then `node scripts/p1d-sandbox-verify.mjs`. Share only PASS/FAIL lines, never connection URLs/private file contents.
- **Do not rerun `--apply`**; its empty-schema check should reject the now-migrated sandbox. No write integration test has yet been authorized separately.

## P1-D live relational acceptance completed; question preflight prepared

- Operator confirmed `node --check scripts/p1d-sandbox-verify.mjs` PASS, five local source safeguards PASS, and live `node scripts/p1d-sandbox-verify.mjs` PASS. Verifications include separate sandbox pooled/direct DB identity, seven finished migration records, all six fake pilot user roles and password-hash presence, author/editor/coordination geography and math branch, editor grade, editor branch assignment and project-author relationship. The acceptance tool made no writes.
- Newly added `scripts/p1d-sandbox-question-gate.mjs` + `tests/p1d-sandbox-question-gate.test.ts`. Default `--preflight` is read-only: checks dedicated pilot config, local separate auth secret and all six generated test credentials, compares against original Neon hosts, then calls `scripts/p1d-pilot-check.mjs` with sanitized sandbox-only process environment. Any absence/mismatch stops the check. Does not change persistent pilot flags.
- Operator may run only the safe **read-only** next step until independently approving question writes:

    cd D:\Proje\pro-lig
    git pull --ff-only
    node --check scripts/p1d-sandbox-question-gate.mjs
    npx vitest run tests/p1d-sandbox-question-gate.test.ts
    node scripts/p1d-sandbox-question-gate.mjs --preflight

- The question integration mode writes a temporary question, changes its status, verifies stale PATCH 409, and attempts cleanup. Since partial cleanup can occur on failure, it requires separate explicit authorization. DO NOT run `--run-integration` or set `PROLIG_P1D_QUESTION_TEST_APPROVAL` until authorization and read-only preflight PASS. Existing standalone `p1d-pilot-check` MUST NOT be invoked without the launcher because it may otherwise source default .env. Never share credential files, passwords, or connection URLs.

## P1-D operator-approved question roundtrip completed — 20/20 PASS (2026-10-11)
- With explicit and separate approval for temporary test Question/ActivityLog writes ONLY inside the verified isolated sandbox, operator invoked `node scripts/p1d-sandbox-question-gate.mjs --run-integration` and removed the write approval token in PowerShell finally.
- `P1-D pilot identity and fixture preflight: PASS`. `tests/integration/question-db.test.ts`: **20/20 PASS**, 21.07 seconds, no failed tests, process exit 0.
- Observed live create/GET/draft PATCH/persistent roundtrip; stale two-session PATCH 409 with first edit preserved; submit/revision/edit/resubmit/approval lifecycle; read-scope decisions (MUHASEBE forbidden, coordinators allowed); QUESTION_CREATED audit.
- Temporary question and related ActivityLog are cleaned up by suite afterAll; its ID-specific counts are asserted zero on success.
- Two advisory log messages: SSL `sslmode=require` future compatibility; concurrent `client.query()` deprecation warning likely warrants diagnosis before pg@9. Do not call the warnings failures or suppress without investigation.
- **DB ACCEPTANCE PASS ≠ PRODUCTION RELEASE READY.** No browser UX test proving conflict reconciliation/encrypted draft recovery yet, and API PATCH expectedUpdatedAt revision has compatibility consequences for older clients. Original Neon, Vercel Production, GitHub main not touched.
- Next safe operator check: `node scripts/p1d-sandbox-verify.mjs` (READ ONLY), then after appropriate sandbox-specific browser app configuration verify the visual flow and full non-DB build/test. Keep `.env.p1d.local` and `.local/p1d-sandbox-credentials.env` private.

## Independent browser preview implementation — initially read-only

After 20/20 write integration PASS, user independently re-ran `node scripts/p1d-sandbox-verify.mjs`: PASS for 7 migrations, 6 pilot user roles, writer/editor/coordinator scope and project relationship. No write.

Important: plain `npm run dev` serves Vite but not Vercel functions; running the connected `vercel dev` could load existing app environment configuration. To avoid accidentally targeting the original PRO-LIG database, **do not use generic Vercel dev** for P1-D sandbox browser acceptance.

New branch-only files:
- `scripts/p1d-sandbox-browser.mjs` — read-only preflight first; --serve opens a sandbox-only local browser (no question writes), --serve-write requires separate explicit operator browser-UAT approval.
- `scripts/p1d-sandbox-browser-app.ts` — Express+Vite local-only 127.0.0.1:3137; sandbox runtime variables supplied by independent allowlisted child environment, local fake JWT secret. Only exposes auth login/me/logout, question GET and project GET by default, and denies all other application APIs. Mutating question requests explicitly blocked (403) until separately authorized mode. Vite does not read ordinary .env and denies local secret file paths.
- `tests/p1d-sandbox-browser.test.ts` — five static safety invariants (not a complete dynamic HTTP/browser test).

Next operator step, **read-only only**:

    cd D:\Proje\pro-lig
    git pull --ff-only
    node --check scripts/p1d-sandbox-browser.mjs
    npx vitest run tests/p1d-sandbox-browser.test.ts
    node scripts/p1d-sandbox-browser.mjs --preflight

When PASS, command to start local READ-ONLY UAT frontend (requires operator to confirm local readiness first):

    node scripts/p1d-sandbox-browser.mjs --serve

Then visit http://127.0.0.1:3137 ; log in with sandbox fake user only (password is stored privately in .local/p1d-sandbox-credentials.env, not to be shared). Login does not change DB. Some other PRO-LIG modules are intentionally unavailable here; focused acceptance is Question Studio. Stop with Ctrl+C. The local browser runtime is not yet operator tested; report symptoms instead of claiming it works.

For real browser question create/PATCH and two-tab 409 visual UX, request another explicit authorization and launch in guarded --serve-write mode. Consider collecting browser screenshots with passwords, JWT cookies and private URLs concealed. DO NOT paste secret files or credential values.

## Operator approved isolated browser write/concurrency and encrypted-recovery UAT (2026-10-11)
- First browser read-only preflight, five safety tests, local server, pilot writer login, dashboard and question/project views PASS. User confirmed pilot math project appears in Studio project selector.
- User explicitly consented to temporary browser question create/edit/two-tab 409 conflict/encrypted recovery/deletion ONLY in prolig_p1d_sandbox. Not Production/main/original database.
- Encrypted draft recovery needs VITE_QUESTION_STUDIO_P1 and VITE_QUESTION_STUDIO_P1C. Both now enabled via local sandbox browser Vite config define; no Vercel changes.
- Operator: Ctrl+C existing read-only server, git pull --ff-only, node --check scripts/p1d-sandbox-browser.mjs, npx vitest run tests/p1d-sandbox-browser.test.ts, node scripts/p1d-sandbox-browser.mjs --preflight.
- Then explicitly approved write UAT in PowerShell:
    $env:PROLIG_P1D_BROWSER_UAT_APPROVAL = 'ALLOW_BROWSER_QUESTION_WRITES_IN_prolig_p1d_sandbox'
    try {
      node scripts/p1d-sandbox-browser.mjs --serve-write
    } finally {
      Remove-Item Env:\PROLIG_P1D_BROWSER_UAT_APPROVAL -ErrorAction SilentlyContinue
    }
- Local browser only: http://127.0.0.1:3137. Only use fake pilot writer password from private sandbox credentials file. First create/reopen temporary question; then local encrypted recovery; then two-tab stale PATCH must show 409 and comparison without overwriting local text. Cleanup temporary question via UI and re-run read-only health verification after stopping server. Never reveal any password/passphrase/URL. Browser write mode not yet operator-run.

## P1-D ENCRYPTED BROWSER DRAFT RESTORE ACCEPTED — USER REPORTED PASS (2026-10-11)
- User supplied browser screenshots showing local preview's P1-D Studio dirty badge, "Bu cihazda şifreli taslak kurtarma" active, "Şifreli kurtarma kopyası güncellendi", form with draft body/four answer options/selected correct answer/solution, "Ara ver" confirmation, and reopening the unsaved draft.
- Following explicit instructions to pause, hard-refresh browser (Ctrl+Shift+R), re-enter the separate recovery passphrase and use "Şifreli taslağı kurtar", the user stated they repeated ALL steps and all PASS. This is **user-reported real browser reload/recovery UX acceptance**, not an independent cryptographic audit or evidence that backend record was saved.
- The temporary question was NOT yet confirmed persisted to PostgreSQL by a browser write. The previous Studio screenshot had "Genel Soru Havuzu" selected; user must choose "PILOT-MAT-8-001" before saving. Real two-tab 409 compare and final test record deletion remain OPEN.
- Existing user permission covers disposable browser question create/update, two-session 409 test and cleanup ONLY on neon-yellow-candle/prolig_p1d_sandbox; not other DB or Production.
- Next operator step: with authorized --serve-write local preview still running, select assigned mathematics pilot project in restored Studio draft, keep four unique answer options and chosen correct answer, click "Taslağı kaydet"; verify ONE question in the list, reopened content/project persists. Then carefully stage two-tab stale edit 409. Keep separate recovery passphrase private.
