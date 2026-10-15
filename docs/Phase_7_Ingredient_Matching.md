# Phase 7 — full-Pantry ingredient matching

Implemented on 15 October 2026 as the next authorized Phase 7 backend slice. Mobile recipe screens
remain prototypes and no new backend code has been deployed. Phase 6 remains deferred.

## Current inventory and provider boundary

ChefService.inventory reads one RepeatableRead snapshot of the verified subject's household,
including only ACTIVE/unarchived groceries whose expiry date is today or later in the household
timezone. Already-expired active groceries are excluded from recipe availability even though they
remain in Pantry awaiting explicit outcomes. The query repeats membership scoping on the item
relation and selects only IDs/names/quantities/units/expiry. No filters/pagination from the screen
are reused. More than 1,000 eligible rows fails CHEF_INVENTORY_LIMIT; more than 200 rescue-window
rows fails CHEF_INGREDIENT_LIMIT. Limits fail closed rather than claiming complete matching from
a truncated list. The original /chef/expiring response remains unchanged and bounded to 200.

A single snapshot now supplies both the today/tomorrow rescue subset and full non-expired matching
inventory. Only rescue names are sent to Spoonacular search. Later-expiry groceries reduce the
local missing-item list without influencing provider discovery. Full Pantry, prices and account
identity never leave the backend for provider matching. The response does not expose the complete
pantryIngredients field; it includes only existing rescue data and IDs relevant to matches.

Matching is computed after the provider cache on every request, separately per verified account.
Account-specific matches never enter the shared provider cache. Details still require inclusion in
the current rescue shortlist, then compare actual full recipe ingredients to the same inventory
snapshot. No Pantry quantity/status write, recipe cooking outcome or history event is introduced.

## Conservative matching rules

One pure matcher supplies summary and detail results. Name matching uses NFC, trimmed/collapsed
whitespace, lowercase and a small explicit alias dictionary (e.g. tomatoes/tomato, eggs/egg,
brinjal/aubergine/eggplant). No substring, singularization heuristic, brand stripping or automatic
variant substitution is used. Low-fat milk is not silently substituted for milk, nor brown rice
for rice or red onion for onion. Ambiguous/unrecognized names show NO_MATCH, meaning no known
exact/curated-alias match, not proof that the household has no suitable substitute.

Seven common staples (water, salt, black pepper, olive oil, vegetable oil, sugar, all-purpose flour)
are hints only. A staple absent from inventory is CHECK_STAPLE, contributes no available-name
percentage, and produces a check-first shopping candidate. If present it is PANTRY as normal.
There is no silent assumption of staples or household preference write.

Quantities use exact BigInt decimal arithmetic (up to six decimal places), compatible g/kg, ml/l
and explicit pieces/units aliases. Multiple purchases of the same canonical ingredient can supply
a recipe. Repeated recipe components aggregate demand before checking supply, so the same purchase
is not counted twice. SUFFICIENT means known compatible supply covers total known demand;
INSUFFICIENT requires all matching supply to use the required dimension. Unknown bags/cups/spoons,
implicit count units, unavailable amounts, incompatible dimensions and unsupported precision are
CHECK_AMOUNT. No mass-volume conversion, density, package-size guess or serving scaling occurs.
Recipe values refer to provider servings; stored Pantry decimal strings stay unchanged.

Summary results contain only provider used/missed names, not the full recipe or amount fields.
They are explicitly basis SUMMARY and cannot claim quantity sufficiency; detail results are basis
FULL_RECIPE. pantryNameMatchPercent is a name-coverage statistic for the represented rows, not
proof that all amounts are present. Summary coverage may differ when full instructions/ingredients
are fetched because ignorePantry can omit ingredients from the search response. Next UI must retain
these labels and review states instead of showing an unconditional "ready to cook" percentage.

shoppingItems deduplicates canonical names across repeated rows, with NO_MATCH, CHECK_STAPLE or
INSUFFICIENT reasons. It contains names only; quantities/shortfalls are not invented. Staple hints
are marked checkFirst. These are candidates for the next user-reviewed shopping UI, not an actual
shopping-list write. Unknown-amount Pantry matches stay flagged for review and are not silently
added as missing purchases. Existing mock shopping reducer/recipes are preserved.

## Verification

| Check | Actual result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npm run build and npx tsc --noEmit | Passed |
| Root node --experimental-strip-types --test tests/*.test.mjs | 172/172 passed |
| Backend node --test tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs | 94/94 passed, including fourteen new matching/scope/service tests |
| Backend npm test -- --runInBand | Health 1/1 passed |
| git diff --check / changed-file credential and source review | Passed |

New tests cover alias/variant boundaries, check-first staples, exact metric aggregation, shortfalls,
unknown units/precision, repeated component demand, consistent summary/detail rules, name-only
shopping deduplication, prototype-like dictionary keys, scoped full inventory query, limits/missing
membership, future-Pantry matching without provider disclosure, recomputation and account isolation.
Existing service fixtures were updated to the new complete inventory interface and actual parsed
recipe shapes; prior provider/HTTP tests still pass. Queries use injected adapters, not a live
household database run. These tests do not prove native display or physical ingredient suitability.

No live provider calls were needed for this deterministic matching slice; prior real search/detail
checks remain recorded separately in Phase_7_Recipe_Details.md. No live database writes/fixtures or
cleanup obligations. No schema/migration/package/Expo-config/environment/deployment changes.
Exports/Doctor/lint were not repeated because mobile runtime/config/dependencies did not change.
Earlier 15 October all-platform exports passed; Doctor20/21 patch recommendations and existing lint
setup gaps remain. No phone checklist for this undeployed backend-only slice.

## Next step

Connect the supplied Recipes/details/shopping UI to real APIs with account-isolated client state,
loading/empty/error/quota/retry states, ingredient review and name-deduplicated shopping additions.
Inspect original references before UI changes. Keep Demo separate and do not let prototype cooking
mutate real Pantry implicitly. Hosted development credentials/deployment, live household/provider
validation, phone tests, final ranking/filter work and final Phase 7 review remain pending.
