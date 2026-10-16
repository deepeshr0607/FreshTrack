# Phase 8 — live SQL verification through Neon HTTPS

16 October 2026. Resumed the series verification blocked at checkpoint778596c.

The six read-only SQL cases now pass on the pinned Neon development branch using its HTTPS SQL
transport. This verifies the exact parameterized production aggregate against PostgreSQL, with
synthetic VALUES CTEs shadowing the application tables. No real household records are read or
written, and there is no cleanup obligation. It is not a Prisma transaction/runtime acceptance test.

The default Prisma integration run still fails to connect, including a retry after an HTTPS wake-up
query. In-memory connect_timeout=20 SELECT1 probes also failed on pooled and direct connections.
A credential-free PostgreSQL TLS handshake succeeded; SELECT1 using the same saved credentials via
Neon HTTPS succeeded. Therefore credentials/database access work over HTTPS, while this laptop's
Prisma path remains unresolved. The evidence does not establish the root cause or prove a router,
provider, TLS or SDK defect. No security settings, credentials, connection URLs or runtime driver
were changed.

## Focused change

Added tests/analytics-https.cjs as an explicitly selected diagnostic transport for the synthetic
suite only. Default tests still use Prisma; ANALYTICS_SQL_TRANSPORT=https opts into fetch. The existing
development-target guard and explicit test consent remain required. It derives the HTTPS host from
the guarded backend connection URL, sends prepared SQL and values separately, rejects redirects,
uses a 15-second timeout and emits only a fixed failure message. Both synthetic table CTEs are
required before sending the known test query; this is a diagnostic guard, not a general SQL parser.
The helper is never imported by backend/src or mobile. No new dependency was installed.

Neon's [official serverless driver documentation](https://github.com/neondatabase/serverless)
describes HTTPS queries as an alternative transport for environments with restricted TCP. Here it
is used only for SQL diagnostics; the Express API retains Prisma and RepeatableRead transactions.

## Actual checks

| Check | Result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npm run build and npx tsc --noEmit | Passed |
| Root strip-types test suite | 189/189 passed |
| Selected backend regressions, including diagnostic guard/redaction test | 115/115 passed |
| Backend npm test -- --runInBand | Health1/1 passed |
| Synthetic SQL suite via HTTPS command below | 6/6 passed |
| Default Prisma SQL suite, including warm retry | 0/6 passed; failed before SQL assertions |
| PostgreSQL TLS handshake | Verified |
| Pooled/direct Prisma SELECT1 with longer timeout | Failed |
| Pooled Neon HTTPS SELECT1 | Passed |
| git diff --check and focused secret/debug scan | Passed |

```sh
# backend/
ALLOW_DEVELOPMENT_DATABASE_TESTS=true ANALYTICS_SQL_TRANSPORT=https node --env-file=.env --test tests/analytics.integration.test.cjs
node --test tests/analytics-https.test.cjs tests/analytics-series.test.cjs tests/analytics.test.cjs tests/recipe-ranking.test.cjs tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs
```

The six cases cover snapshot prices/unknowns/estimates/zero, Undo/reconfirmation across months,
Kolkata expiry/month boundaries, leap/year/large totals, exact series-versus-summary agreement and
DST-observing month grouping. A new pure transport test covers target/opt-in guards, parameterized
body/header handling, row mapping, synthetic-query requirement and redaction on transport failure.

Existing Expo Doctor/lint/native QA gaps remain; exports/Doctor/lint were not rerun because no
runtime, dependency, native or mobile configuration changed. No deployment or analytics screen
connection was made. Existing Analytics/Insights screens still show their prototype figures.

## Exact next step

Use the existing signed-in Settings → Check Backend Database control to verify Prisma from the
already-hosted development API, independently of this laptop's connection problem. Record that
phone diagnostic separately; it verifies hosted database reachability, not new analytics endpoints.
Then connect the supplied Analytics/Insights designs and deploy/test the Phase8 endpoints with
authenticated real-account phone access. Local Prisma failure remains an open development issue.
Phase6 is deferred; Phase9 remains unstarted.
