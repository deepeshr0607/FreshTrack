# Phase 8 — first monthly analytics backend slice

16 October 2026. Implemented locally and tested. No mobile UI connection or deployment yet.

## API and metric policy

GET /api/v1/analytics/summary?month=YYYY-MM requires the existing verified identity. Month is
optional and defaults to the current household calendar month. One strict month is accepted;
request bodies, repeated/nested keys and identity/household/timezone selectors are rejected.
Responses use existing success/error envelopes and no-store. Missing membership returns409;
database/unsupported configuration failures return redacted503.

The service reads membership and grouped immutable event snapshots in one RepeatableRead transaction.
Every SQL event query binds household and subject and rechecks membership. No current Pantry price,
category, quantity or outcome timestamp is used to calculate financial totals. No writes occur.

For each purchase, select its latest genuine STATUS_CHANGED/RESTORED transition at or before asOf,
across all months, before selecting the requested month. ACTIVE reversals remove original outcomes
retrospectively. Reconfirmation counts once at the new outcome's timestamp with its new immutable
snapshot. Same-status no-ops, CREATED, EDITED and ARCHIVED events do not create additional outcomes.
An archive alone does not erase a confirmed historical outcome. The existing Pantry service creates
strictly increasing per-item timestamps; event ID is a deterministic tie-breaker. Future import
paths must preserve chronological transition ordering. This endpoint presents corrected effective
outcomes, not a historical “what the app knew at month-end” ledger or gross action count.

Response groups:

- wasted: explicit, non-SYSTEM confirmed Waste.
- consumedBeforeOrOnExpiry: explicit consumption on/before snapshot expiry day.
- consumedAfterExpiry: explicit consumption after snapshot expiry day.
- unconfirmed: ASSUMED_CONSUMED and SYSTEM-sourced outcomes, excluded from confirmed groups.

Each group has count, purchaseCount/purchaseCostMinor, estimatedCount/estimatedCostMinor and
unknownCount. All costs are exact integer paise strings; sums use PostgreSQL bigint and BigInt
serialization, allowing totals above the per-entry integer limit without floating-point rounding.
Zero purchase value is known zero; null/UNKNOWN is excluded from sums and counted separately.
The snapshot total is authoritative for the whole entry. Quantity is not multiplied into it.
Partial-consumption events are not supported by the current Pantry model and are not claimed here.
Consumed value is not called “money saved”; estimated prices are never blended into purchase totals.

The current household timezone defines month grouping (including after a timezone change). The
outcome's immutable timezone defines consumption-day comparison with snapshot expiry. INR is the
only supported currency; unsupported household/event currency fails closed rather than mixing money.
No assumed consumption is generated and no missing-price/category estimate is invented.

The SQL uses parameterized DISTINCT ON with explicit ordering and AT TIME ZONE, reviewed against
[PostgreSQL SELECT documentation](https://www.postgresql.org/docs/current/sql-select.html) and
[date/time documentation](https://www.postgresql.org/docs/current/functions-datetime.html).
It scans scoped transition history before aggregation; existing household/item/time indexes remain.
Large-history query performance has not been load-tested. Transaction timeout bounds availability.

## Actual verification

| Command/check | Result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npx tsc --noEmit and npm run build | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 189/189 passed |
| Selected backend regression command below | 107/107 passed, including seven analytics tests |
| Backend npm test -- --runInBand | Health1/1 passed |
| Read-only development SQL integration command below | 4/4 passed |
| git diff --check | Passed |

```sh
# backend/
node --test tests/analytics.test.cjs tests/recipe-ranking.test.cjs tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs
ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/analytics.integration.test.cjs
```

HTTP/service tests validate auth, query/body rejection, defaults, membership, exact serialization,
empty/zero/unknown/estimate handling, unsupported configurations and redacted failures. Read-only
Neon tests run the exact production aggregate with CTE tables shadowed by synthetic VALUES. They
read/write no application records and require the existing pinned development target guard and
explicit test opt-in. Coverage includes reversal across months, reconfirmation/new snapshots,
same-status and edit duplicates, future transitions, repeated reads, foreign household/subject,
Kolkata midnight, UTC regrouping versus snapshot expiry timezone, leap/year boundaries, empty months
and sums exceeding the per-entry integer limit. No fixture cleanup obligation was created.

An initial root npm run build was invalid (no root build script); corrected to backend/npm run build.
Existing lint gaps (root script absent, backend ESLint missing) and Doctor20/21 patch recommendations
remain recorded from Phase7. Not rerun: Expo Doctor/exports/device tests, since mobile/runtime/native
configuration and dependencies are unchanged. This does not imply those checks pass anew.

## Changed files and next step

Added backend lib/analytics.ts, services/analytics.ts, routes/analytics.ts and two test suites;
registered the router/injectable service in app.ts and added canonical shared analytics wire types.
Updated README, AGENTS and implementation plan status. No schema, migration, dependency, environment,
provider, production or deployment changes. Existing Demo/Analytics screens still display prototypes.

Next: reuse these effective-outcome rules for monthly series/previous-month comparisons, then connect
the supplied Analytics/Insights designs with honest labels and accessible chart states. Live overdue
reconciliation remains available from Phase5; connecting its count is a later Phase8 slice. Phone
verification will follow the mobile connection; there is no new phone control to test in this slice.
Phase6 remains deferred and Phase9 has not started.
