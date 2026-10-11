# Phase 1 screen and state inventory

Audit date: 10 October 2026. All 11 supplied PNGs and their HTML/design-system sources were inspected.
The Recipe images in the original and Stitch folders represent the same screen. The two Analytics
images represent distinct financial and sustainability views; both are included.

## Design-to-route mapping

Paths below are relative to `design-reference/`. Route groups are shown explicitly for navigation.

| Supplied design directory | Existing/planned route | Status |
|---|---|---|
| `freshtrack_welcome_get_started_centered_hero` | `/(auth)` | Existing welcome UI; final native QA pending |
| `freshtrack_account_sign_up_login` | `/(auth)/sign-up` | Validated form/mock OTP navigation/error/retry; native QA pending |
| `freshtrack_account_log_in` | `/(auth)/sign-in` | Validated mock login/error/retry; recovery preview/provider fallback feedback; native QA pending |
| `freshtrack_dynamic_hub` | `/(tabs)` | Existing Home; Recipe/details/Cook links; Recent Additions Used/Wasted swipes, button fallbacks and empty Add entry implemented; native QA pending |
| `kitchen_inventory_swipe_actions` | `/(tabs)/pantry`, `/pantry/[id]` | Existing list and validated detail/edit; manual add, categories, Used/Wasted gestures and Batch Select implemented; native gesture/visual QA pending |
| `packaged_item_expiry_verification` | `/(tabs)/scanner` barcode mode | Implemented typed lookup, stamp/manual/estimate queue, duplicate choices and confirmed shared insertion; native/visual QA pending |
| `receipt_ocr_scanner` | `/(tabs)/scanner` receipt mode | Implemented typed scan/review/edit/Add Missing/duplicate choices/confirmed shared insertion; native/visual QA pending |
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
| Auth field validation/loading | Existing auth forms | Validated inline errors; cancellable timed loading/simulated failure/retry; native lifecycle QA pending |
| OTP incomplete/invalid/expired/network/resend | `/verify-otp` | Implemented incomplete/invalid/expired/simulated failure/retry/resend cooldown and full-code paste; native autofill/lifecycle QA pending |
| Pantry details/edit/missing item | `/pantry/[id]` | Implemented with date/quantity/name/unit validation |
| Pantry add/manual fallback | `/pantry/add` | Implemented: validated category/quantity/unit/date/optional value, shared insertion and cancellation |
| Pantry batch selection | Pantry | Whole-entry checkbox/visible selection, count/value, cancellable shared confirmation and atomic outcomes; filter changes clear selection/sort preserves it; native QA pending |
| Pantry consume/waste confirmation | Home, Pantry and item detail | Shared cancellable sheet from Home/Pantry swipes/buttons and detail buttons; removes active inventory only on confirmation |
| Pantry search/filter/no matches | Pantry | Search/freshness/typed category filters compose with sorting; active category counts, no-match/reset and add-return reset implemented; native loading/error/offline QA pending |
| Scanner permission request/denial/recovery | Scanner, shared receipt/barcode gate | Implemented demo request/deny/retry, blocked settings save/cancel and manual fallback; no real permission requests; native QA pending |
| Receipt review/empty/error/edit | Scanner receipt mode | Implemented scan/loading/edit/selection/Add Missing/confirmation/shared insertion; mock error/empty/retry; native QA pending |
| Barcode lookup failure/manual entry | Scanner barcode mode → `/pantry/add` | Implemented lookup loading/failure/retry/unknown code, manual form fallback; cancel preserves queue |
| Duplicate detection | Scanner review | Receipt: normalized-name hints; barcode: name/code identity and queue hints; explicit Skip/Add separately; never auto-merge/consume |
| Recipe loading/retry/error | Recipes | Timed prototype loading; `?preview=error` exposes failure and retry |
| Recipe no results/no near-expiry/saved-empty | Recipes | Search/filter/saved empty views; no urgent-item text; `?preview=empty` exposes initial no-results sample |
| Recipe details/invalid ID/missing ingredients | `/recipe/[id]` | Implemented; stable pantry IDs preserve availability through edits and outcomes |
| Recipe saved/shopping/cook | Recipe routes | Save toggle, deduplicated shopping list, purchased checkboxes/clear; Cook requires full-entry confirmation and changes shared pantry once |
| Insights period/weekly selection/category detail | Insights | This Month/Weekly/All Time summaries, selectable chart values and category sheet |
| Insights loading/error/empty | Insights | Same preview mechanism as Recipes; retry restores sample data |
| Financial month/chart/report | Financial Analytics | Month monetary comparison, tappable weekly chart, report preview/export |
| Reconciliation | Financial Analytics | Active expired items from shared pantry; edit an item expiry to a past date to exercise; cancellable Used/Wasted sheet |
| Settings/reminder window | `/settings` | Supporting prototype preferences (digest/time) persist in memory; no separate supplied Settings image |
| Profile/privacy/demo exit | `/settings/profile`, `/settings/privacy`, `/settings` | Validated save/cancel, demo information, remember-device and exit confirmation implemented; no real session/policies |
| Recovery/provider fallback | `/(auth)/recover`, auth forms | Email preview validation/failure/retry; Google/Apple/biometric controls explain email fallback |
| Account deletion/currency | Settings | Fixed USD explanation implemented; deletion UI scope pending without reference; production operations deferred |

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

Receipt checkpoint (11 October): four visible reference rows total $16.16; decorative 8-item/$28.16
summary is inconsistent, so UI uses derived totals. Existing Scanner wrapper is retained; photographic
viewfinder/overlay/thumbnails and final native visual QA remain pending. Added and edited dates retain
estimated/user-entered provenance, never imply package verification. Add Missing joins the pending haul.

Barcode checkpoint (11 October): three visible reference packaged products use synthetic catalog codes
and relative sample stamps; no real package verification. Package/manual/estimate date sources retained
through final shared insertion. Queue/progress/remaining controls implemented. Auto-saved produce,
photography, OCR overlays and confidence are not claimed as real actions; native/visual QA remains pending.

Permission checkpoint (11 October): no separate supplied permission image exists. Supporting prompt,
denial and blocked-recovery cards use existing theme tokens and controls. Typed copy lives in
`lib/scannerPermission.ts`; fresh `?permission=denied|blocked|granted` previews are local mock state.
Recovery never opens OS settings or requests real camera access; browser flows verified, native QA pending.

Home checkpoint (11 October): compact Recent Additions cards retain the existing layout and source
metadata; named 44-point Used/Wasted fallback buttons extend the reference. Browser verified both
swipes/cancel/repeat, short-swipe/details recovery, vertical drag without navigation, keyboard/button
fallbacks, shared Pantry outcomes and all-resolved empty/Add navigation at 375 × 812. TypeScript,
25/25 unit tests, health test and all-platform exports pass; lint gaps remain. Native gesture, screen
reader, dynamic-text and final visual review remain pending. Next: Pantry category filtering.

Auth/Settings checkpoint (11 October): supplied forms preserved; supporting OTP/recovery/profile/
privacy pages use existing tokens (no separate designs). Public demo OTP code `123456`; no real
auth/session, email, provider sign-in or password changes. Browser validation/error/retry/paste/
expiry/resend/profile/preferences/privacy/exit flows verified at 375 × 812; 28 tests, TypeScript,
health test and three-platform exports pass. Native autofill/keyboard/accessibility/timer lifecycle
and full visual QA remain pending. Production policies/deletion and currency UI remain deferred.

Category checkpoint (11 October): existing typed categories/counts in a second reference-style pill
carousel; search/freshness/category compose with sorting. Visible tracked/at-risk values follow the
filtered list; banner/category counts remain inventory-wide. Clear/Show All resets, keyboard selection,
Used/count update, zero-category/add-return/cancel and Fresh composition browser verified at 375 × 812.
TypeScript, 28 tests, health test and all-platform exports pass. Native and full visual QA pending.
Next: reference Batch Select with cancellable Used/Wasted confirmation.

Batch checkpoint (11 October): reference pill, whole-entry checkboxes, select/deselect-visible,
count/value and cancellable Used/Wasted review implemented. Atomic transition rejects stale/missing/
duplicate/empty selections and replay. Browser keyboard/tap/filter/sort/cancel/outcomes, Home/Insights
propagation and normal swipe regression verified at 375 × 812; 30 tests and all-platform checks pass.
No separate expanded batch design supplied; controls reuse tokens. Native and large-batch sheet QA
remain pending. Next: prototype currency consistency against supplied dollar references.

Currency checkpoint (11 October): supplied dollar values retained. Fixed typed USD metadata supplies
Pantry/receipt/barcode input labels and a read-only Settings note (no separate currency design).
Pantry, hero and sustainability values are whole-entry dollars; historic financial month/chart/category
costs are cents divided by 100 before display. No conversion or production currency decision.
Browser verified Settings at 375 × 812, two-bag/$4.50 detail, financial $64.80/$12.40 and reference
weekly/category dollar values. TypeScript, 30 tests, health test and three-platform exports pass;
lint gaps and native/final visual QA remain. Next: phone-width Pantry design comparison.

Pantry visual checkpoint (11 October): reference search-first top hierarchy restored; functional
barcode search entry, Inventory subtitle, light shield/Active/expiry-explanation banner after filters.
Unsupported large title/full-width add block replaced with compact manual entry beside Batch Select;
empty-state entry retained. Demo wording avoids claiming AI/package verification. Browser widths
320/375/430 inspected; search/reset, add/cancel, scanner and batch cancel/exit verified. TypeScript,
30 tests, health and three-platform exports pass; lint gaps remain. Remaining differences include
two filter rows/sort-chip placement, emoji thumbnails/card badges and gradients; full native/dynamic-text
review pending. Next: Pantry card expiry-source pills and row spacing.

End-to-end checkpoint (11 October): user selected remaining item 4; visual/general native/auth QA
deferred. Connected domain regression passes (31 total tests) and browser recipe/shopping/cooking/
preferences/receipt/barcode/reconciliation/report-preview checks pass. User reports iPhone Expo Go
launch, recipe/shopping/preferences/share-sheet cancellation and Scanner/duplicate/reconciliation
checks passing. Android unavailable. [Platform evidence and repeatable sequence](Phase_1_End_to_End_Checks.md)
separates browser observations, user-reported iOS and unverified Android. Phase 1 remains in progress.
