# Phase 7 — final development review

Reviewed 15 October 2026 against checkpoint 0229950. Implementation review and regression checks
are complete. Final phone acceptance remains pending for the latest ranking/filter slice. This
review does not mark those phone checks passed and does not start Phase8. Phase6 remains deferred.

## Acceptance evidence

| Plan criterion | Evidence and limit |
|---|---|
| Only near-expiry items influence default search | Authenticated membership-scoped ACTIVE/unarchived rows expiring today/tomorrow supply normalized provider search names. Later-dated inventory affects backend matching/ranking, never the default provider search names. Date-only semantics are explicit; this is not an exact rolling 48-hour query. Scoped query, bounds, empty window and account isolation tests pass. |
| Actual provider ingredient/instruction data | Shortlist-gated details provide real ingredients, servings, total/prep/cooking time, steps and attribution. Missing fields/instructions are explicit. Prior generic live search/detail and user-reported core iPhone checks passed. No generated instructions, nutrition or Gemini claim. |
| Consistent missing items and shopping | Summary/detail share exact names and curated aliases, check-first staples and conservative quantity/unit checks. Name-only candidates deduplicate; shopping controls preserve checked state. Tests and prior core iPhone report pass. Shopping/saved IDs are in-memory only and reset on restart/sign-out; persistent lists were not required for this initial slice. |
| Provider failures/quota show fallback | Header-authenticated bounded transport, timeout, fixed safe messages, process cache/rate controls and per-account HTTP limits are tested. Metadata failures retain ordinary suggestions/shopping and allow retry. Empty/error/retry UI is implemented. Actual phone network-loss/quota/timeout scenarios remain unverified. |
| Secrets and provider content redacted | Mobile calls only authenticated backend HTTPS. Provider key remains backend-only; provider body/errors never enter user messages or logs. Inspected global structured error logging includes request ID/status/code only. Tests assert safe error envelopes and header-only key use. No real secrets were printed or changed in this review. |

## Reviewed behavior and bounds

Reviewed Chef service/routes, Spoonacular provider, shared matching/ranking, mobile API/session,
RealChefContext, real Recipes/details/shopping routes and their tests and slice reports.
Demo remains isolated. Cooking requires explicit Pantry review and does not automatically mark
groceries Used/Wasted. Recipe reads have no database-write or migration side effects.

Rescue ranking weights distinct matched names today=2/tomorrow=1, then distinct rescue count,
Pantry name coverage, fewer shopping candidates, known total time and stable recipe ID. Explicit
metadata loading enables Quick (total time <=15 minutes) and provider-tagged Vegetarian/Vegan.
Unknown metadata cannot pass restrictive filters. Preferences compose with the current shortlist,
search and saved IDs; they are session-only. They do not search the whole provider catalog.
Provider descriptions/tags do not guarantee dietary suitability or precise quantities.

Bounds are explicit: 200 rescue groceries, 1,000 nonexpired active groceries for matching,
20 distinct normalized search names/1,000 joined characters, five provider results, 100 provider
cache entries with five-minute expiry, 512KB provider response, eight-second provider timeout,
100 saved IDs and 200 shopping names. Above-limit inputs fail rather than silently matching an
incomplete inventory. Full Pantry matching remains on the server.

Process-local provider spacing/cache/backoff does not provide a global multi-instance quota
guarantee. A cold filter/detail request can first fetch a shortlist and then encounter rate
backpressure; explicit retry is the current recovery. Selecting filters after metadata is loaded
does not itself make another request. A new Suggest resets metadata and preferences. No background
refresh, offline recipe persistence or account dietary profile was added.

## Checks rerun for this review

| Command/check | Actual result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npx tsc --noEmit and npm run build | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 189/189 passed |
| Selected backend regression command below | 100/100 passed |
| Backend npm test -- --runInBand | Health 1/1 passed |
| Expo export web, iOS and Android | Passed all platforms, 35 routes |
| Existing hosted development Preview health | HTTP200 |
| Tokenless Chef expiring/suggestions/filters/details | All HTTP401 |
| git diff --check | Passed |

```sh
# backend/
node --test tests/recipe-ranking.test.cjs tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs
# root
npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-phase7-review-export
```

Existing maintenance gaps, checked in the preceding slice on the same date and not rerun here:
Expo Doctor20/21 with six recommended Expo patch updates; root lint script missing; backend ESLint
executable missing. These are not passing lint checks. No dependency upgrades were made.

Prior generic live provider probes validated search/detail and five metadata rows; no extra live
provider calls or live database fixture writes were necessary for this documentation-only review.
No runtime, schema, dependency, environment or deployment change was made. Hosted checks used the
existing development Preview with no credentials.

## Remaining acceptance and exact next step

The user reported all core Recipes/details/shopping iPhone checks passed on 15 October. Latest
Quick/Vegetarian/Vegan, metadata loading, clearing/composed filters and shopping-regression phone
checks are explicitly not tested yet, as confirmed by the user during this review. Complete the existing ten-step checklist and record its actual
result before calling full Phase7 phone acceptance complete.

Broader native failure-path, account-transition, accessibility/visual edge cases, Android and signed
iOS build checks remain unverified. Exports establish bundling, not native runtime acceptance.
Phase5 native action-build acceptance and earlier deferred QA retain their existing limits.
Phase6 barcode/OCR is deferred by user; Phase8 real event-based analytics and Phase9 settings/privacy/
release remain unstarted. Do not start another phase until authorized.

## Supporting reports

- [Scoped rescue ingredients](Phase_7_Expiring_Ingredients.md)
- [Provider search](Phase_7_Recipe_Search.md)
- [Real recipe details](Phase_7_Recipe_Details.md)
- [Pantry matching](Phase_7_Ingredient_Matching.md)
- [Mobile Recipes/details/shopping and prior phone report](Phase_7_Mobile_Recipes.md)
- [Ranking and filters](Phase_7_Ranking_Filters.md)
