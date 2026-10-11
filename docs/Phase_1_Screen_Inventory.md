# Phase 1 screen and state inventory

Audit date: 10 October 2026. All 11 supplied PNGs and their HTML/design-system sources were inspected.
The Recipe images in the original and Stitch folders represent the same screen. The two Analytics
images represent distinct financial and sustainability views; both are included.

## Design-to-route mapping

Paths below are relative to `design-reference/`. Route groups are shown explicitly for navigation.

| Supplied design directory | Existing/planned route | Status |
|---|---|---|
| `freshtrack_welcome_get_started_centered_hero` | `/(auth)` | Existing welcome UI; final native QA pending |
| `freshtrack_account_sign_up_login` | `/(auth)/sign-up` | Existing form/mock OTP navigation; error coverage incomplete |
| `freshtrack_account_log_in` | `/(auth)/sign-in` | Existing mock login; recovery/social/biometric placeholders |
| `freshtrack_dynamic_hub` | `/(tabs)` | Existing Home; Recipe/details links now resolve; Cook opens confirmation flow in details |
| `kitchen_inventory_swipe_actions` | `/(tabs)/pantry`, `/pantry/[id]` | Existing list and validated detail/edit; manual add and Used/Wasted gestures implemented; batch/native gesture QA pending |
| `packaged_item_expiry_verification` | `/(tabs)/scanner` barcode mode | Existing simulated result/date override; full packaged queue pending |
| `receipt_ocr_scanner` | `/(tabs)/scanner` receipt mode | Existing simulated preview/selection; editable review and insertion pending |
| `recipe` | `/(tabs)/recipes`, `/recipe/[id]`, `/recipe/shopping-list` | Implemented prototype; final native QA pending |
| `financial_eco_analytics` | `/analytics/financial` from Insights | Implemented nested financial sample view and reconciliation |
| `stitch_freshtrack_smart_kitchen_inventory/freshtrack_smart_recipes_meal_inspiration` | Same Recipes routes above | Duplicate reference mapped to the same implementation, not excluded |
| `stitch_freshtrack_smart_kitchen_inventory/freshtrack_insights_sustainability_analytics` | `/(tabs)/insights` | Implemented sustainability view, period selection, charts, category detail, report and habit actions |

Both `freshtrack_design_system/DESIGN.md` files and `recipe/DESIGN.md` define supporting style tokens,
not additional routes. No supplied screen is excluded. The existing starter `/two` remains hidden
in the dock and its file is preserved; `/modal` is preserved but is not a supplied design.

## Navigation decision

All supplied docks explicitly show Home, Pantry, central Scanner, Recipes and Insights. Preserve
that five-destination dock under the user's design exception. Recipes implements AI Chef; Insights
is the Analytics destination, with `/analytics/financial` as a nested financial audit. This adds no
second dashboard. Recipe details/shopping list and Settings live outside the tab dock as supporting
stack routes. The original four product functions remain available.

## State and interaction audit

| Screen/state | Route or proposed location | Status / next work |
|---|---|---|
| Auth field validation/loading | Existing auth forms | Basic validation and timed loading exist; stronger validation and timer cleanup pending |
| OTP incomplete/invalid/expired/network/resend | `/verify-otp` | Incomplete check/resend cooldown exist; invalid/expired/network states, paste/autofill and cleanup pending |
| Pantry details/edit/missing item | `/pantry/[id]` | Implemented with date/quantity/name/unit validation |
| Pantry add/manual fallback | `/pantry/add` | Implemented: validated category/quantity/unit/date/optional value, shared insertion and cancellation |
| Pantry consume/waste confirmation | Pantry and item detail | Shared cancellable sheet from Pantry swipe/buttons and detail buttons; removes active inventory on confirmation |
| Pantry search/filter/no matches | Pantry | Existing; manual-add entry implemented; full native loading/error/offline states pending |
| Scanner permission denial | Scanner | Missing mock permission UI; no camera permissions requested in Phase 1 |
| Receipt review/empty/error/edit | Scanner receipt mode | Simulated scan/selection exists; editable candidates, failure states and actual mock insertion missing |
| Barcode lookup failure/manual entry | Scanner barcode mode → `/pantry/add` | Standalone manual-entry fallback implemented; lookup failure UI pending |
| Duplicate detection | Scanner review | Missing; must ask before any merge/consumption |
| Recipe loading/retry/error | Recipes | Timed prototype loading; `?preview=error` exposes failure and retry |
| Recipe no results/no near-expiry/saved-empty | Recipes | Search/filter/saved empty views; no urgent-item text; `?preview=empty` exposes initial no-results sample |
| Recipe details/invalid ID/missing ingredients | `/recipe/[id]` | Implemented; stable pantry IDs preserve availability through edits and outcomes |
| Recipe saved/shopping/cook | Recipe routes | Save toggle, deduplicated shopping list, purchased checkboxes/clear; Cook requires full-entry confirmation and changes shared pantry once |
| Insights period/weekly selection/category detail | Insights | This Month/Weekly/All Time summaries, selectable chart values and category sheet |
| Insights loading/error/empty | Insights | Same preview mechanism as Recipes; retry restores sample data |
| Financial month/chart/report | Financial Analytics | Month monetary comparison, tappable weekly chart, report preview/export |
| Reconciliation | Financial Analytics | Active expired items from shared pantry; edit an item expiry to a past date to exercise; cancellable Used/Wasted sheet |
| Settings/reminder window | `/settings` | Supporting prototype preferences (digest/time) persist in memory; no separate supplied Settings image |
| Profile/privacy/account deletion/currency | Settings (later UI slice) | Not implemented; production operations deferred |

## Prototype data and documented differences

- Typed recipes/insight snapshots reside in `lib/mock.ts`; recipes, shopping list and preferences
  have shared in-memory contexts. `lib/recipes.ts` and `lib/analytics.ts` contain pure transitions and
  selectors. Manual form/category validation is centralized in `lib/pantry.ts`; no extra item
  fixtures were invented. Scanner still has pre-existing local mock fixtures; centralizing them is pending.
- Original food imagery, logo and avatar are packaged in `assets/design/` from the supplied Recipe
  HTML links. MaterialCommunityIcons from the existing Expo icons dependency replace dock emoji.
- Source samples disagree: financial saved value is $64.80; sustainability saved value is $84.50.
  Preserve both supplied reference snapshots and identify them as sample audits. Confirmed demo
  inventory actions add monetary session deltas; kilograms/carbon remain illustrative, not inferred.
- The sustainability HTML's per-week waste values sum to 2.4 kg, while its displayed total is
  1.6 kg. Prototype weekly fixtures sum to the displayed 1.6 kg. Weekly/All Time comparisons are
  explicit mock summaries; All Time bar heights scale the monthly sample to its aggregate totals.
- Financial month selection changes monetary totals; weekly chart/category/carbon/achievement
  panels retain their explicitly labeled June reference samples. They are not computed production analytics.
- Recipe counts and missing items reflect actual mock fixtures, rather than the reference's
  inconsistent decorative counts. Additional mock stir-fry has no dedicated photo in the supplied
  Recipe assets; its reused pasta illustration remains a visual gap.
- Additional shopping-list control, refresh/retry, report preview and supporting Settings/detail
  routes enable prototype actions. No separate add/detail, shopping-list, OTP, or Settings image exists.
- Narrow-screen forms stack where needed; native charts use accessible React Native bars to avoid
  adding chart dependencies in Phase 1. Gradients/glass blur are approximated with existing surfaces.
- Report export downloads text on web and opens the native text-share sheet on iOS/Android.
  No report is sent to anyone automatically. Web download text contents were verified; native
  sharing remains pending. This is not a PDF statement.
- No Gemini, Spoonacular, auth, database, camera/OCR, notification or backend integration was added.

## Verification and phase gate

11 October checkpoint: `/pantry/add` and the Scanner manual fallback are implemented. All 16 unit
tests, mobile/backend TypeScript and web/iOS/Android exports pass; browser add/validation/cancel/empty
entry/Home propagation checks passed at 375-pixel width. Automated checks and browser results are
recorded in README Project Status. Native exports confirm
bundling only. Device/simulator checks, dynamic text and final side-by-side design review remain
required. Phase 1 remains in progress; Phase 2 authentication proof-of-concept may start only after
Phase 1 is reviewed and the user explicitly approves it.
