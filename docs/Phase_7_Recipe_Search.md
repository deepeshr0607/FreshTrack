# Phase 7 — server-only Spoonacular search

Implemented on 15 October 2026 after user account/key setup. Phase 6 remains deferred.
This is a local backend slice; the real mobile recipe flow and hosted integration remain pending.

## Behavior

POST /api/v1/chef/suggestions accepts only an empty JSON object. Existing verified Neon identity,
no-store responses and server-scoped Chef ingredient reads apply. Every request re-reads the
current household's ACTIVE/unarchived today/tomorrow calendar window. No client identity, pantry
list, ingredient override or dietary filter is accepted. Empty windows return NO_NEAR_EXPIRY without
a provider call. No results return NO_RESULTS; usable results return READY.

The provider receives only up to twenty normalized, case-deduplicated ingredient names (at most
1,000 combined characters). The documented findByIngredients endpoint accepts names rather than
quantity constraints; exact stored quantities remain in the authenticated response, not the
provider request. Pantry IDs, account data, purchase prices and the rest of inventory are not sent.
Names containing commas or excessive lengths fail explicitly rather than changing search meaning.
There is no ingredient alias/staples matrix yet. Duplicate purchases are not aggregated by quantity.

Spoonacular authentication uses x-api-key, not a query parameter. The host/path are fixed and
redirects refused. Requests have an eight-second timeout, bounded 512 KB JSON streaming and strict
summary parsing. No raw provider errors, URLs with keys, account secrets or response bodies are
logged. Returned summaries contain provider IDs/titles, approved HTTPS images, provider ingredient
names/original descriptions and a Spoonacular backlink. Zero-used matches are excluded; ranking
uses used ingredient count, missing count, then stable ID. Summary search does not provide
instructions/prep time/diets. No fabricated directions or unsupported dietary promises are added.
Provider missing ingredients refer only to this request's rescue ingredients plus the provider's
ignorePantry option, not a full-household missing-ingredient comparison.

Per-verified-account request limit is six per minute per backend process; provider requests are
spaced by a process-local 1.1-second gate. Rapid different searches receive retryable 429 rather
than a costly automatic retry. Identical concurrent searches coalesce. Bounded process memory
caches at most 100 normalized-name searches for five minutes, with expiry timers and cloned outputs.
Cache entries contain only provider summaries, never identity/Pantry IDs or quantities; every
service call still refreshes membership/eligible ingredients. Nothing is persisted in the database.
Key rotation clears cached/in-flight lookup references; stale in-flight errors cannot reject the
new credential. Auth rejection clears cache and requires corrected credentials. Quota rejection
clears cache and blocks uncached calls until UTC midnight within that process. 429 backs off for
one minute. Timeout/network/schema/auth/quota errors use safe, distinct codes. Serverless instances
do not share rate/cache/quota state; these controls are not a global hard spending cap.

## Verification on 15 October

| Check | Result |
|---|---|
| Backend environment key check | Configured; only a presence label printed |
| Backend npm run build and npx tsc --noEmit | Passed |
| Root npx tsc --noEmit | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 172/172 passed |
| Backend node --test tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs | 66/66 passed, including 12 new provider/service/HTTP tests |
| Backend npm test -- --runInBand | Health 1/1 passed |
| One live createSpoonacularProvider().search(['tomato', 'rice']) using ignored backend/.env | Passed: five parsed recipe summaries; no instruction calls |
| git diff --check / changed-source review | Passed |

The live probe used two generic test ingredients, not household data. It checks the real key and
provider adapter, not live household selection, hosted HTTP, mobile display or recipe details.
It consumed one small search request; no automatic live calls run in the unit suite. No database
fixture writes or cleanup obligations were created. The local key remains only in ignored
backend/.env. It was not copied into source, mobile or Vercel in this slice.

Tests cover minimization/header authentication, no-key/empty and name bounds, cache cloning/TTL,
coalescing/backpressure, quota reset, key rejection/rotation, provider failures/malformed/oversize
responses, valid ranking, current ingredient reads, empty result/window states, authentication,
client override rejection and account HTTP limits. Timeout HTTP mapping is tested with an injected
failure; an actual native or provider timeout was not induced. The first attempt to write the test
file used a root-relative path from backend and failed without creating a file; corrected path and
all subsequent checks passed.

No mobile/config/dependency changes: exports/Expo Doctor/lint not repeated. Earlier 15 October
all-platform exports passed; Doctor20/21 recommends six patches; existing mobile missing-lint-script
and backend missing-ESLint gaps remain. No dependency, schema, migration, production or deployment
change. No phone check requested for undeployed backend-only behavior.

## Official provider references checked

- https://spoonacular.com/food-api/docs#Search-Recipes-by-Ingredients
- https://spoonacular.com/food-api/docs#Authentication (header alternative)
- https://spoonacular.com/food-api/docs#Rate-Limiting-Quotas
- https://spoonacular.com/food-api/pricing (maximum one-hour cache, direct Free backlink requirement)

## Exact next slice

Implement bounded server-only recipe-information access for shortlisted provider IDs with actual
instructions/servings/times/source attribution, then ingredient/staple matching and missing-list
logic. Preserve supplied UI designs when connecting real Recipes/details/loading/error states.
Before phone verification, configure the development Vercel Preview secret, deploy verified code
and check authenticated hosted household/provider integration. Do not claim the existing prototype
is connected or Phase 7 complete. Phase 6/8/9 and prior Phase 5 native acceptance gaps remain deferred.
