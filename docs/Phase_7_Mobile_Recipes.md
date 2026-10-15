# Phase 7 — mobile Recipes, details and shopping connection

Implemented/deployed to the dedicated development API on 15 October 2026. The user reported all numbered iPhone checks passed on 15 October. Phase 6 remains deferred. No real cooking outcome, schema/migration or dependency change.

## Screens and references

Revisited both supplied Recipe PNGs (recipe and stitch_freshtrack_smart_kitchen_inventory recipe
reference), their design tokens and existing route/card implementations. The existing featured and
compact card styles are shared with LiveRecipeCard, using provider photos or an explicit photo
unavailable placeholder rather than unrelated mock images. Existing emerald/surface tokens, Plus
Jakarta text, rescue chips, search/filter row, recipe hero/list and green Fridge Chef section remain.
Details and shopping reuse the established safe-area, keyboard-aware, max-600-width screen/card/
button system. Routes/tabs are unchanged. Demo branches preserve the previous prototype behavior.

Real accounts now call only the authenticated FreshTrack backend. The first Recipes load reads
rescue ingredients without spending provider search quota. Suggest Recipes explicitly searches;
refresh clears stale results. Search filters current returned titles/ingredients; All/80%+ Name
Match/Saved filters operate on those results. Saved means current suggestions whose IDs were saved
in this signed-in session, not a persistent provider-content library. Quick/prep/diet filters remain
pending because summary responses lack that metadata. No fake timings/calories/difficulty/financial
rescue values or Gemini generation are displayed. Fridge Chef filters Pantry suggestions and labels
its behavior honestly, rather than sending arbitrary freeform Pantry data to the provider.

Real detail routes show actual times/servings/ingredients, shared match/amount labels, check-first
staples, structured instructions or actual provider text, explicit unavailable-instruction state,
credits/license/source links and Spoonacular backlink. Only reviewed shopping candidates are added;
staples start unchecked. Repeated additions preserve one normalized name and keep existing checked
state. Purchased rows can be checked and cleared. No quantities are invented. Review Pantry links
open existing scoped item details; at most three purchase links per recipe ingredient are shown.
Review Pantry After Cooking opens Pantry for explicit review; it never marks whole purchases used.

## State/authentication/API boundary

A keyed RealChefProvider sits within the existing account-scoped root providers. API token retrieval
rechecks the same verified subject before and after provider token access. Native requests carry
only transient bearer JWTs to the configured HTTPS backend (local HTTP allowed only for dev tests),
no provider key/cookies, and no client ingredient/household overrides. Client guards verify response
shapes, matching enums, detail IDs and external HTTP(S) links; server errors are mapped to fixed safe
messages. Invalid/missing credentials, quota/rate limit, household setup, unavailable recipe and
transport errors have useful Retry/Open Pantry feedback. No mock recipes are fallback real results.

The pure session coordinator serializes repeated suggestion taps, guards stale async results,
tracks latest detail requests and invalidates provider content during auth checking/teardown.
Focused-route effects prevent hidden list screens from clearing detail loads during verified resume.
Current provider content expires after at most five minutes from its earliest retained response;
refresh/reload is explicit after expiry. No provider-content persistence is introduced. Saved IDs
(cap100) and user-selected shopping names (cap200) stay in process memory for the current account,
remain across a same-account verification pause, and disappear on app restart/sign-out/account
provider replacement. Demo uses its separate reducer. These are prototype local shopping/save
interactions, not database persistence. Pending requests cannot populate another account's store.

## Checks performed

| Command/check | Actual result |
|---|---|
| Root npx tsc --noEmit | Passed after correcting initial response-guard narrowing/timer typing errors |
| Root node --experimental-strip-types --test tests/*.test.mjs | Final 185/185 passed, including 13 new API/session/presentation tests |
| Backend npm run build / npx tsc --noEmit | Passed |
| Backend node --test tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs | 94/94 passed |
| Backend npm test -- --runInBand | Health 1/1 passed |
| npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-phase7-ui-final-export | Passed all platforms, 35 routes after focused-route correction |
| Final export after the ignored public API URL update: /private/tmp/freshtrack-phase7-ui-hosted-export | Passed web/iOS/Android and 35 routes |
| npx expo-doctor | 20/21; same six patch recommendations (expo57.0.29/constants57.0.22/linking57.0.13/notifications57.0.23/router57.0.27/splash57.0.10) versus installed versions |
| Root npm run lint | Existing missing script, exit1 |
| Backend npm run lint | Existing ESLint missing, exit127 |
| git diff --check / tracked and new source check against the actual private key | Passed; key absent from source/docs/mobile |
| New Preview health / tokenless ingredients / tokenless suggestions / tokenless details | HTTP200 / 401 / 401 / 401 |

The first focused client suite passed12/13: a filter fixture gave both recipes identical searchable
ingredients, making its expected one result invalid. Corrected the second fixture to another
ingredient; final13/13 and full185/185 pass. No production assertion was weakened. Tests cover
minimal authenticated API traffic, URL/ID/input/response guards, redacted errors, explicit requests,
coalescing/stale-result/auth loss, current detail selection, shopping dedup/checked state/atomic
capacity, isolated stores, save/dispose and honest filter/match labels. They do not render native
components or prove actual household/provider HTTP integration. Browser-control tools/Playwright
were unavailable; no automated visual/browser/native observation is claimed.

## Development deployment and connection

Added the existing local SPOONACULAR_API_KEY to Vercel Preview as a sensitive secret via stdin,
with fixed project/org and development-target checks; value never printed, no production secret
change. Deployed existing dragon-2818/freshtrack-api with explicit --target preview. Build's pinned
Neon development environment guard passed; no migrations/seeds/data writes ran. Preview is Ready:
https://freshtrack-qonr6b7fc-dragon-2818.vercel.app
ID dpl_JyXmrG8EU9EFJoyqH5HYVARcYWBc. CLI inspect confirms target preview. Cloud install retains the
existing36 audit findings (5moderate/31high); no package updates. No extra hosting-login settings or
Neon Auth origins changed. Updated only the ignored EXPO_PUBLIC_API_URL to this Preview.

Two ngrok tunnel attempts timed out. A temporary tunnel helper was installed outside the repository,
without system/project dependency changes. User reports both devices on working home Wi-Fi, so
Expo LAN runs on exp://192.168.1.7:8086. The initial sandbox IP lookup failed; network-enabled read
returned the address. Native auth base/origin settings were preserved. Transport failures do not
mean the app checks or deployment failed. Keep laptop/Metro awake during phone tests. Direct LAN /status returned packager-status:running.

## Numbered iPhone checklist (reported passed)

1. Open exp://192.168.1.7:8086 in Expo Go on the same Wi-Fi and reload. Sign into the real account,
   not Preview Demo. Keep credentials private.
2. Pantry: add two development samples named Tomato (Produce,2pieces, manual expiry tomorrow in
   Asia/Kolkata, blank value) and Rice (Other,1kg, manual expiry2026-11-15, blank value). Leave package
   dates/estimates blank. If duplicates are found, choose Add Separately to preserve old purchases.
3. Recipes: Tomato should appear among rescue chips. Tap Suggest Recipes once; expect real cards
   or report the exact error. Rice should not become a rescue chip solely from its later expiry.
4. Search a word from a returned title, clear search, save the featured recipe and check Saved.
   Return All Recipes and open that same recipe. Expect real ingredients, servings/time when
   available, source links and actual instructions or an explicit unavailable state.
5. Review match labels. If Rice is listed by the recipe, it should match the Pantry name; quantity
   may still require review when units differ. Staples absent from Pantry must say check your kitchen.
6. Choose at least one shopping candidate. Check a staple only if you want to add it. Add Selected
   twice; View Shopping List must show each name once. Check one item and Clear Purchased Items;
   only checked names disappear. If a recipe has no candidates, return and choose another.
7. Return to details. Open an original source or Spoonacular link, then return to FreshTrack. Verify
   session checking/reload leaves the app usable. A rate-limit message is expected after rapid
   repeated requests; wait60seconds and Retry. Do not repeatedly tap provider requests.
8. Review Pantry After Cooking: both samples remain active. Do not confirm any Pantry outcome for
   this test. Opening recipes/shopping/source links must not consume groceries.
9. Sign Out and sign in again. Shopping should start empty and saved IDs should be reset; Back
   must not expose the old account. Preview Demo must still show its separate sample recipes.

These named samples persist only in the development household. On 15 October the user answered
“All checks passed” after receiving the eleven numbered chat steps (the nine grouped steps above).
Recorded as user-reported success for real suggestions/details, search/save filtering, ingredient
and staple labels, repeated shopping additions/check/clear, source return, unchanged Pantry outcomes,
sign-out/session reset and Demo separation. No per-step counts, provider recipe IDs, screenshots or
direct agent observation were supplied. Automated test evidence above remains separate.

This acceptance update changes documentation only. Root TypeScript and git diff --check passed again;
runtime/provider/deployment/exports were not rerun for the documentation change.
Actual blocked-provider/native network failure, cross-account device checks, large-text/320-width
visual QA, Android/development builds and persistent shopping/save features remain unverified or
outside this slice. Next: finish ranking/prep/preference filters and Phase7 final review. No Phase6/8/9 work.

Official focused-route reference checked: https://docs.expo.dev/versions/latest/sdk/router/#usefocuseffecteffect-do_not_pass_a_second_prop
