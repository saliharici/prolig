# Compensation Engine Phase 2 — Payment Period & Settlement

Starting branch: `feat/compensation-engine`
Starting commit: `466a5e16085daa76fc0ae81715a73eb8c0b7bcc8`

## Financial workflow

CompensationRule determines the price when an earning is created. CompensationEntry
retains that immutable snapshot. PaymentPeriod organizes eligible earnings;
Payment records the actual beneficiary payment. Settlement never recalculates
quantity, unitPrice, amount, ruleId, sourceKey or earnedAt.

- Period: TASLAK → HAZIR → ONAYLANDI → KAPANDI.
- Preparation reserves unallocated HAK_EDILDI entries by paymentPeriodId and
  moves them to ODEME_BEKLIYOR. The reserved set is frozen for settlement.
- Settlement groups that set by beneficiary, creates one Bekliyor Payment per
  beneficiary, and attaches entries as ODEMEYE_ALINDI in one transaction.
- Payment: Bekliyor → Onaylandi → Odendi. Paying synchronizes every attached
  entry to ODENDI with the same paidAt/paymentDate timestamp.
- Closing requires every payment to be Odendi or Iptal and validates reconciliation.
- TASLAK/HAZIR periods can be cancelled with a reason; reservations are released.
- Unpaid Payments can be cancelled with a reason; original snapshot values stay
  unchanged and released earnings can be used in a NEW period. Paid payments
  cannot be cancelled. Cancelled payment amounts and the released entry IDs remain
  in Payment and ActivityLog. Closed periods cannot be mutated.

The physical and Prisma `Payment.authorUserId` fields are retained for existing
clients and integrations. They represent the beneficiary for every role. The DTO
adds `beneficiary`, while preserving the existing `author` compatibility field.
Nullable paymentPeriodId leaves historical payment rows untouched. A unique
(paymentPeriodId, authorUserId) index prevents duplicate beneficiary payments
within one period; legacy rows with a null period retain their former behavior.

## Authorization

| Operation | General coordinator | Accounting | Other canonical roles |
|---|---|---|---|
| Manage tariffs | Yes | No | No |
| Read tariffs | Yes | Yes | No |
| Read earnings | All | All | Own authenticated user ID only |
| Read payment periods | Yes | Yes | No |
| Prepare, settle, pay, cancel, close | No | Yes | No |

Forged userId query/body values do not widen scope. Cursor ownership is checked.
Personal earnings include the related period and payment, without providing
access to other beneficiaries. Aggregate KPIs cover ALL scoped records even when
the list is paginated. Search/filter controls explicitly describe their scope as
the loaded rows.

## Transactions and audit

Prepare/settle/cancel/close and payment actions use Serializable transactions,
conditional state claims, affected-row checks, and database uniqueness. Conflict
codes P2002/P2025/P2034 produce HTTP 409 rather than duplicate financial writes.
Money is summed in BigInt cents; payment storage overflow is rejected.
Payment-period actions serialize on the period row, including payment mutations
versus closure. Exceptions roll back states, links, payments, dates and logs.

Audit records are written at the period/payment level with counts and exact
amounts instead of generating one ActivityLog per earning. Cancellation logs
retain the released entry IDs. Financial period history also blocks user deletion.

Period input uses inclusive calendar dates, encoded as UTC+03 business days and
stored with an EXCLUSIVE next-day boundary. October 2026 is represented as
[2026-09-30T21:00:00Z, 2026-10-31T21:00:00Z). A database check enforces
periodStart < periodEnd. No date-edit or reopening endpoint is exposed.

## API and UI

All new period endpoints use existing `api/v1/management.ts` rewrites; no new
deployable serverless function is introduced. New routes:

- GET/POST `/api/v1/compensation/periods`
- GET `/api/v1/compensation/periods/:id`
- POST `/api/v1/compensation/periods/:id/{prepare,settle,close,cancel}`
- POST `/api/v1/payments/:id/cancel`

The finance center retains its existing tabs and adds Ödeme Dönemleri. The period
view shows liabilities, beneficiary counts, payments and their earning breakdown.
Other roles can open Telif ve Ödemeler to see their read-only Telif Ekstrem.
Buttons enforce role/state restrictions, and server authorization remains decisive.

## Migration and verification

Migration: `20261010210000_payment_period_settlement/migration.sql`

Generated from schema-to-schema diff and reviewed: additive tables/columns,
indexes and restrictive foreign keys; no table/column drop, truncate or Payment
recreation. ON UPDATE CASCADE only maintains foreign-key identity; no cascading
deletion is introduced. Legacy Payment column values were compared before/after
applying the migration to a fresh disposable localhost database.

Verification performed:

- Build PASS; existing bundle-size advisory remains.
- UI/API TypeScript lint PASS.
- `npx vitest run --exclude 'tests/integration/**'`: 360 passed.
- Disposable PostgreSQL engine/PGlite DB tests: 4 passed, 1 native concurrency
  test skipped because this test engine uses one connection.
- Browser → actual API handlers → disposable database → UI PASS: period creation,
  preparation, settlement, approval, payment, closure, writer self-scope and
  general-coordinator read-only access. Uses a local harness for Vercel rewrites.
- Unit tests cover competing state/entry claims and HTTP 409 handling. Native
  multi-connection PostgreSQL concurrency still requires a separate test run.
- GitHub CI is enabled for pushes to the compensation branch, including build.

Native DB integration requires a NEW empty localhost database and explicit
SETTLEMENT_TEST_DATABASE_URL plus PROLIG_SETTLEMENT_TEST_DB_CONFIRMED=true.
The test refuses existing databases, never resets/drops tables, and never reads
production/Pilot DATABASE_URL. Run only the settlement integration file in that
environment. Omit SETTLEMENT_TEST_SINGLE_CONNECTION to include the concurrent test.

## Delivery boundary

Production merge: NOT RUN. Production migration: NOT RUN.
Hosted Vercel deployment: NOT REQUESTED (user reported a deployment limit).
Update the local repository with git fetch/pull once its working tree is clean.
Before running the new backend, apply both compensation migrations to a separate
test database; do not apply them to production as part of a local code pull.
Native concurrency and hosted preview remain the final gates before production.
