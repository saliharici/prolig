# PRO-LIG P2 — Isolated Pilot Database Acceptance Gate

**Purpose:** determine whether the previously established independent `prolig_p1d_sandbox` database is ready for a P2 typed-question acceptance run. This is a **read-only** identity/schema preflight, **not** the live create/edit/submit test.

## Required configuration

- A separate local `.env.p1d.local` (ignored by Git) holding the sandbox's pooled `DATABASE_URL` and direct `DIRECT_URL`.
- The existing application's `.env` or `.env.development.local` containing at least one database host for separation comparison.
- The expected isolated Neon endpoint and database name pinned in `scripts/p2-pilot-readonly-check.mjs`.
- A completed `20261014120000_question_types` migration **in that sandbox only** and artificial `pilot.yazar@prolig.local` / `pilot.editor@prolig.local` identities.

Do not copy credentials into GitHub issues, pull requests or chat. Do not point either connection to production.

## Safe first command

```powershell
cd D:\Proje\pro-lig
node scripts/p2-pilot-readonly-check.mjs
```

A successful output verifies exact database identity, host separation, P2 migration, required columns and pilot identities. The script uses `BEGIN READ ONLY` and `ROLLBACK`, creates no questions and runs no migrations.

If a check fails, stop; do not weaken safeguards or apply migrations automatically. Confirm the actual independent pilot resource and obtain a separately authorized migration/fixture plan.

## Remaining acceptance work

The existing `tests/question-p2-api-acceptance.test.ts` validates all four answer formats through real API handlers with **mocked** persistence. It does **not** demonstrate live PostgreSQL persistence.

Once the isolated sandbox identity passes, a separate expressly scoped write-test procedure must cover:
1. Create one disposable question per format (four-choice, five-choice/E, true/false and open-ended).
2. Read back persisted answers and rubric; apply revision-checked PATCH; read again.
3. Submit with a complete answer structure, and confirm incomplete open-ended submissions are rejected.
4. Verify that test-only audit records and any media/compensation links are inspected before cleanup.
5. Clean up only explicitly identified artificial questions after separate exact-record verification.

The connected Neon account in the October 17 verification did not expose the established sandbox project, and Vercel project-detail inspection returned a permission error. **No live database acceptance has been run.**
