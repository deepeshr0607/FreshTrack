# Phase 7 — real recipe details and instructions

Implemented on 15 October 2026 after authorization for the next small Phase 7 slice.
Phase 6 remains deferred. This slice is local backend work, not a mobile release/deployment.

## Endpoint and authorization

GET /api/v1/chef/recipes/:recipeId returns { data: { recipe } } after existing verified Neon JWT
middleware. IDs must be canonical positive decimal integers at most 2147483647. Query strings and
bodies are rejected. Details and suggestions share a six-per-minute, verified-account limit per
backend process. Existing no-store headers and safe request-ID error envelopes apply.

The service re-reads the current membership-scoped active/unarchived rescue window through the
existing Chef service, then obtains the current ranked shortlist via the existing cached provider
search. A detail request is permitted only for one of those IDs. Empty/no-match windows, disappeared
shortlist entries and unknown recipes return safe RECIPE_NOT_AVAILABLE/404 rather than fetching
arbitrary details. Ingredient/household changes are re-evaluated on every detail request. This is
an eligibility check, not a claim that a public recipe belongs to one account. No household/Pantry
snapshot is reused across accounts. No new database writes or historical events are introduced.

## Provider-backed data

The provider-information endpoint is called only on demand for a selected shortlisted ID. Optional
nutrition/wine/taste extras are explicitly false. The same bounded request implementation now serves
both search and details: header-only key, fixed host/path, no redirects, eight-second timeout,
512 KB JSON streaming bound, safe auth/quota/rate/timeout/availability errors, coalescing and shared
process-local rate/quota state. Search and details use separate keys in the existing combined
100-entry, five-minute cache. Expiry timers remove entries; callers receive clones. Key changes,
provider authorization rejection and quota exhaustion retain the prior clearing rules. No automatic
provider retries or instructions bulk prefetch are introduced.

Validated details contain real provider ingredients with nullable provider IDs/amounts and units,
servings and total/preparation/cooking times, structured named instruction groups and numbered
steps, optional display-only raw instructions, source name/URL/credits/license and a Spoonacular
backlink. Missing/unknown times (including provider -1) remain null. No default servings/directions
are invented. Missing structured steps can use actual provider instruction text; if neither exists,
instructionStatus is UNAVAILABLE. The next UI slice must show that state instead of mock directions.

Provider markup is converted to plain display text, common named/numeric entities decoded, and
script/style content removed. Source links are validated HTTP(S) URLs without credentials/ports;
these external source pages are never fetched by the backend. Images retain the Spoonacular HTTPS
host allowlist. Size/step/ingredient bounds, ordered steps and matching provider ID fail closed.
Only selected fields leave the backend; provider bodies/headers/key/driver errors are not logged.
No full-Pantry ingredient availability or missing-item comparison is claimed by this endpoint.

The date-only rescue convention remains today/tomorrow in the household timezone, not an exact
rolling 48-hour instant window. Near-expiry selection, caching and process-local rate limitations
from the previous reports still apply. A detail requested immediately after an uncached search can
receive the shared 429/backpressure response; callers should expose Retry rather than retry-loop.
Serverless instances do not share caches/limits. No dietary filtering or global spending cap added.

## Actual verification

| Check on 15 October | Result |
|---|---|
| Backend npm run build and npx tsc --noEmit | Passed |
| Root npx tsc --noEmit | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 172/172 passed |
| Backend node --test tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs | 80/80 passed, including fourteen new detail tests |
| Backend npm test -- --runInBand | Health 1/1 passed |
| One generic live search followed by one shortlisted detail using real adapter/service | Passed: five search summaries; selected recipe had nine ingredients, AVAILABLE instructions, four structured steps, servings, total time and source URL |
| git diff --check / changed-source and secret review | Passed |

The live probe used injected generic tomato/rice inventory and the ignored local backend key. It
exercised the real provider and shortlist service path, not real household/database selection,
Neon sign-in, hosted HTTP or mobile display. It made two small provider requests with a delay to
respect the shared rate gate. Output was limited to counts/presence labels; no credentials or raw
recipe content was printed. No fixture database writes or cleanup obligation. Unit/HTTP tests use
injected adapters and cover parsing, missing instructions, HTML conversion, IDs/links/bounds,
cache isolation/cloning/expiry, shared rate/quota state, failures, fresh shortlist authorization,
empty-window blocking, authenticated HTTP validation and safe errors. Transport timeout mapping is
covered by injected HTTP failure, not an induced real provider timeout.

An initial build command was mistakenly issued at root and failed (no root build script); the
correct backend build passed. No unrelated script change. Exports/Doctor/lint were not repeated:
mobile runtime/config/dependencies did not change. Earlier 15 October all-platform/35-route exports
passed; Doctor20/21 recommends six patches; existing root lint/absent backend ESLint gaps remain.

No package, Expo config, Prisma schema/migration, environment, Vercel deployment or production
change. Local credentials remain only in ignored backend/.env. No phone verification is requested
for this undeployed backend-only slice; existing mobile Recipes/details remain prototypes.

## References and next step

Official docs checked: https://spoonacular.com/food-api/docs#Get-Recipe-Information and the existing
Authentication/Rate-Limiting-Quotas sections. Existing five-minute cache stays below the provider's
one-hour ceiling: https://spoonacular.com/food-api/pricing .

Next: shared full-Pantry ingredient/staple matching with explicit unknown quantities/aliases and
consistent missing-item derivation, then connect the supplied Recipes/details/shopping UI with
real loading/no-results/quota/unavailable-instructions states. Development Preview key/deployment,
real household/provider integration, phone QA, ranking/filter completion and final Phase 7 review
remain pending. No Phase 6, 8 or 9 implementation.
