# Phase 7 — rescue ranking and recipe filters

15 October 2026. Implemented and deployed to development Preview; phone acceptance pending.

Recipes now rank by weighted distinct rescue names (today 2, tomorrow 1), rescue-name count,
Pantry name coverage, fewer shopping candidates, known total time, then stable provider ID.
Ranking uses fresh household-scoped inventory after reading the provider cache. Neither ranking
nor Pantry matching is shared across accounts through that cache.

The existing Recipes screen adds Quick (total time at most 15 minutes) and Any/Vegetarian/Vegan
preferences. These compose with search, saved IDs and name-match filtering. Unknown time/diet
values do not pass restrictive filters. Provider tags are descriptive, not medical/allergen advice.
Preferences last only in the mounted screen/session. Cards display actual time when loaded.

Normal Suggest Recipes retains its existing provider cost. Explicit Load Time & Diet Filters,
or first selecting Quick/Vegetarian/Vegan, calls authenticated POST /api/v1/chef/filters with {}.
The server rechecks scoped inventory and derives at most five current shortlist IDs itself;
client IDs, preferences, identity and query overrides are rejected. It calls Spoonacular's
informationBulk endpoint with includeNutrition=false, retaining only nullable total-time and
diet flags. Existing header-only credentials, response caps, timeout, shared rate/quota protection
and five-minute cache apply. Loading metadata spends additional provider allowance (up to three
points for five recipes under the [documented bulk pricing](https://spoonacular.com/food-api/docs)). No bulk instructions are exposed.

Metadata errors preserve ordinary suggestions and shopping. The user can select All Recipes/Any
or retry Load Time & Diet Filters. A cold instance can need both search and metadata calls;
the existing provider rate gate can reject the second call temporarily. Retry rather than silently
repeating provider requests. No global-catalog filtering, persistent dietary profile, schema,
dependency, database mutation, production deployment or Phase6/8/9 work was added.

## Verification

| Check | Actual result |
|---|---|
| Mobile npx tsc --noEmit | Passed |
| Backend npx tsc --noEmit and npm run build | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 189/189 passed |
| Selected backend regression suites | 100/100 passed |
| Backend npm test -- --runInBand | Health 1/1 passed |
| Expo export web, iOS, Android | All passed, 35 routes |
| Generic live tomato/rice search and metadata probe | Five summaries and five metadata rows, all with known time/diet fields |
| Expo Doctor | 20/21; six existing Expo patch mismatches |
| Mobile npm run lint | Unavailable: no lint script |
| Backend npm run lint | Unavailable: eslint executable missing |
| Development Preview | Ready; health200, unauthenticated filters/suggestions/expiring401 |

New tests cover deterministic ranking/ties, strict nullable metadata, bounded server-selected IDs,
cache cloning/header credentials, normal-search cost separation, empty/quota paths, HTTP input/auth
guards, filter composition, unknown exclusion, session retry, duplicate loading and stale responses.
Existing account-isolation/matching regression tests remain green. No live database fixtures needed.

The initial broad tests/*.test.cjs command also selected five opt-in database integration suites;
their guards correctly refused execution without development consent. Reran the intended selected
regression suites successfully. An initial localhost test needed sandbox escalation; rerun passed.
An initial root npm run build was invalid because that script exists only in backend; corrected.

Selected backend command:

```sh
node --test tests/recipe-ranking.test.cjs tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs
```

Development Preview: https://freshtrack-82lmszfd3-dragon-2818.vercel.app
Deployment: dpl_67s12vyZDFLnRmTRdnebieijgk6N. Ignored mobile public API URL updated; auth settings preserved.

Next: numbered iPhone verification of metadata loading, Quick/diet composition, clear/recovery and
existing details/shopping behavior, then final Phase7 acceptance review. Native Android/signed-build
and wider failure-path checks remain unverified; exports do not establish native runtime acceptance.
