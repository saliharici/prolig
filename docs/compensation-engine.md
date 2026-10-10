# PRO-LİG Compensation Engine

## Authority model

- Only `GENEL_KOORDINATOR` can create, replace, or deactivate compensation tariffs.
- `MUHASEBE` can read tariffs and calculated earnings but cannot change tariff policy.
- Tariff changes are versioned. Existing earned amounts are never recalculated from a newer tariff.

## Earning model

| Role | Earning basis | Unit |
| --- | --- | --- |
| YAZAR | Approved question | Question |
| EDITOR | Question approved by that editor | Question |
| IL_KOORDINATORU | Completed assigned project | Project |
| BOLGE_KOORDINATORU | Completed assigned project | Project |
| GENEL_KOORDINATOR | Completed assigned project | Project |

A project-specific tariff overrides the general tariff for the same role and earning type.

## Snapshot guarantee

Each earned amount is written to `CompensationEntry` with:

- the rule used,
- role and earning type,
- quantity,
- unit price,
- calculated amount,
- project/question source,
- deterministic unique `sourceKey`,
- earned timestamp.

Changing a tariff later does not mutate old `CompensationEntry` rows.

## Workflow hooks

- Question approval creates the author earning and, when the reviewer is an editor, the editor earning in the same database transaction as the workflow transition.
- Project transition to `Tamamlandi` creates the assigned coordinator earning in the same transaction.
- Missing tariffs never invent an amount; they produce an auditable `COMPENSATION_RATE_MISSING` activity.
- `sourceKey` prevents duplicate earnings for the same source.

## Serverless constraint

Compensation endpoints are rewritten into the existing `api/v1/management.ts` function. No additional Vercel function is introduced.

## Current scope

This foundation calculates earned amounts. Payment-period batching and settlement against the payment ledger are intentionally the next phase.
