# Phase 8 — monthly series and previous-month comparisons

16 October 2026. Local backend slice; not deployed or connected to mobile yet.

Update: the six SQL tests subsequently passed using test-only Neon HTTPS. Local Prisma connection
failure remains unresolved. See [transport verification](Phase_8_SQL_Transport_Verification.md);
the failed runs below remain historical evidence, not the latest SQL result.

## Behavior

Authenticated GET /api/v1/analytics/series?month=YYYY-MM&months=6 returns 2–12 ascending month
points ending with the selected month, defaulting to six months through the household's current
month. Each point has the existing summary shape, with a period label COMPLETE, MONTH_TO_DATE or
FUTURE. Empty months have zero known totals and zero counts. COMPLETE describes the calendar,
not a guarantee that every item has a known price. Estimates and unknown counts remain separate.

The comparison names the immediately preceding calendar month and returns exact signed paise
strings (selected minus previous) for recorded-purchase wasted value and consumed value. Consumed
combines before/on-expiry and after-expiry purchase subtotals; it is not called savings. No estimated,
unknown or unconfirmed costs enter these deltas. There is no guessed percentage when the baseline
is zero. Future selected months return null deltas with FUTURE_PERIOD; a current-month comparison
is labelled MONTH_TO_DATE and must not be described as two complete comparable months.

Both summary and series use the same parameterized PostgreSQL aggregate and latest-effective
transition policy, in one coherent membership-scoped RepeatableRead transaction per request. SQL
groups by household calendar month and cost provenance; it selects the latest transition across
all history before filtering the requested range. A restore after the selected range still removes
the superseded earlier outcome. Existing one-month summary response shape is preserved.

Calendar arithmetic uses integer year/month indexes rather than local Date rollovers. Duplicate,
nested, malformed or unsupported selectors, body payloads and ranges before year0001 are rejected.
Count is bounded 2–12 both at HTTP and service boundaries. Identity/household/timezone selectors are
never accepted from clients. Existing verified authentication, no-store, safe error envelopes and
global request limit remain in force. No endpoint accepts a user-owned record ID.

## Checks

| Check | Actual result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npm run build and npx tsc --noEmit | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 189/189 passed |
| Selected backend regression suites | 114/114 passed, including seven new series tests |
| Backend npm test -- --runInBand | Health1/1 passed |
| Read-only Neon SQL integration | Initial, retry and hotspot runs: 0/6 passed, all failed at connection initialization; SQL assertions not reached |
| git diff --check | Passed |

```sh
# backend/
node --test tests/analytics-series.test.cjs tests/analytics.test.cjs tests/recipe-ranking.test.cjs tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs
ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/analytics.integration.test.cjs
```

Seven new HTTP/service/serialization tests cover calendar/count validation, household defaults,
one scoped read, absent/invalid membership results, exact signed deltas beyond JS safe integers,
unknown/estimate separation, empty months, future suppression, period labels and summary compatibility.
The existing four SQL cases are extended by series/summary exact reconciliation after cross-month
Undo/reconfirmation and a DST-observing America/New_York month-boundary case versus UTC regrouping.
These use the exact production SQL with synthetic VALUES CTEs shadowing application tables. No
application records are read, inserted or deleted; no fixture cleanup is required. The pinned
development-target guard and explicit test opt-in remain mandatory.

Connection-result note: initial run and one retry could not connect (0/6 completed successfully).
TCP probes reached both database hosts, but Prisma SELECT1 probes failed. User switched the laptop
to iPhone Personal Hotspot; its retry also failed to connect (0/6). Live SQL assertions remain
unverified. No database/auth/TLS
settings or credentials were changed, and the root cause was not established.

No Expo/native module changes, schema/migration, dependencies, environment changes or deployment.
Existing Doctor20/21 patch recommendations, absent root lint script and missing backend ESLint remain
recorded maintenance gaps; these checks were not rerun. Expo exports/device QA were not repeated
for a backend-only change. Analytics/Insights screens still use their existing prototype figures.

## Next

After live SQL verification, connect the supplied Analytics/Insights designs to the summary/series
data with exact INR display, honest metric labels, month selection, no-data/error/retry states and
accessible trend presentation. Inspect designs and SDK-compatible chart options before choosing
any native dependency. Reuse the existing reconciliation route; its live count integration remains
a later Phase8 slice. Phone verification follows mobile connection; no new phone control exists
in this checkpoint. Phase6 remains deferred; Phase9 has not started.
