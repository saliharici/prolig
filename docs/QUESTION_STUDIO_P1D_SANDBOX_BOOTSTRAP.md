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
