# FreshTrack — Full Implementation Plan

**Purpose:** Build the existing FreshTrack designs into a reliable iOS/Android app using React Native + Expo, TypeScript, Expo Router, Vercel-hosted Node.js/Express, Prisma, Neon PostgreSQL, Neon Auth, Google Cloud Vision OCR, and Spoonacular.

**Project status assumed:** Screen designs already exist; app code has not been started.

**Recommended execution model:** Use Antigravity for implementation in small phases. Use Git checkpoints throughout. When its usage limit is reached, open the same repository in Codex and continue from `AGENTS.md`, `README.md`, tests, and the latest commit. Never let both agents change the same working tree concurrently.

---

## 1. Product goals and MVP boundary

FreshTrack helps a household record groceries, estimate/use actual expiry dates, receive local reminders, use near-expiry ingredients in recipes, and understand the financial cost of food waste.

### MVP features

1. Email sign-up/sign-in with six-digit email OTP verification.
2. Four primary tabs: Pantry, Scanner, AI Chef, Analytics.
3. Manual grocery creation and editing as a dependable fallback.
4. Receipt capture, OCR, parsing, review, and user-confirmed pantry import.
5. Barcode scanning with a product lookup or manual fallback.
6. Expiry presets that users can override; printed package dates take precedence over estimates.
7. Local notifications at three days before expiry, one day before expiry, and on expiry day.
8. Consumed/Wasted logging, including actions from supported notification controls where feasible.
9. Spoonacular recipe suggestions using only items expiring soon, with missing-ingredient lists.
10. Monthly waste-cost analytics and a reconciliation prompt for expired items with unknown outcomes.
11. Settings for notification timing, currency/date display, sign-out, and account deletion.

### Not in the first MVP

- Shared pantry collaboration across accounts/devices. Keep schema relations ready for a household and household members, but don't implement invitations/realtime synchronization until the single-user workflow is stable.
- A custom machine-learning receipt parser. Start with OCR plus deterministic parsing rules and a review screen.
- An LLM recipe-generation layer. Spoonacular supplies recipes; the app filters and presents them.
- Guaranteed background work at an exact midnight timestamp. Mobile OS background execution is opportunistic; reconcile expired records when the app opens/resumes and whenever the backend is called.

---

## 2. Architecture

```text
React Native / Expo app
  ├── Expo Router screens and tab navigation
  ├── React Context (session + current pantry/cache state)
  ├── expo-camera (receipt photos + barcode detection)
  ├── expo-notifications (local schedule + notification action handling)
  ├── expo-secure-store (secure session/token storage as supported by auth SDK)
  └── HTTPS API client
          │
          ▼
Vercel deployment: Node.js + Express API
  ├── authentication/session verification
  ├── input validation, authorization, rate limiting
  ├── pantry lifecycle and expiry calculations
  ├── receipt OCR + deterministic line-item parsing
  ├── Spoonacular adapter + result caching
  ├── analytics queries and reconciliation
  └── Prisma Client
          │
          ▼
Neon PostgreSQL
  ├── application tables (households, pantry items, events, receipt scans, preferences)
  └── neon_auth schema managed by Neon Auth (do not recreate its internal tables)

Third-party services, called only from the backend:
  ├── Google Cloud Vision API
  └── Spoonacular API
```

### Important boundary

The mobile app must not connect directly to PostgreSQL and must never contain the database URL, Google Vision credential, or Spoonacular API key. All application data operations go through authenticated HTTPS endpoints. Only public client configuration (such as the API base URL) may be included in the app bundle.

### Repository layout

Use one Git repository initially, with mobile app at the root and backend in a separate directory. This avoids extra workspace tooling while retaining one handoff point for Antigravity and Codex.

```text
FreshTrack/
├── app/                         # Expo Router routes (or src/app if template uses src)
│   ├── (auth)/                  # sign-up, verify OTP, sign-in/session recovery
│   ├── (tabs)/                  # Pantry, Scanner, AI Chef, Analytics
│   ├── settings/                # profile, notifications, privacy/account deletion
│   └── _layout.tsx
├── assets/                      # fonts, local illustrations, app icon
├── design-reference/            # screenshots/Figma exports for supplied designs
├── components/                  # reusable UI components
├── features/                    # pantry, scanner, chef, analytics, auth modules
├── context/                     # session and app state providers
├── lib/                         # API client, date/currency helpers, validation
├── types/                       # frontend types
├── backend/
│   ├── src/
│   │   ├── app.ts               # Express app and middleware
│   │   ├── routes/              # route registration
│   │   ├── controllers/         # HTTP boundary only
│   │   ├── services/            # business rules and integrations
│   │   ├── middleware/          # auth, validation, errors, rate limits
│   │   ├── integrations/        # Vision and Spoonacular clients
│   │   └── lib/                 # Prisma, logger, configuration
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── tests/                       # mobile/shared end-to-end or integration tests if needed
├── AGENTS.md                    # agent instructions and current project state
├── README.md
├── .gitignore
└── package.json                 # Expo app scripts/dependencies
```

If the chosen Expo template creates `src/app`, preserve that convention rather than moving route files unnecessarily.

---

## 3. Phase-by-phase implementation roadmap

## Phase 0 — Prepare the workspace and references

**Goal:** Establish a repeatable build environment before changing UI or adding services.

### Tasks

1. Create the Expo TypeScript app with Expo Router. Keep the Expo SDK and dependency versions compatible; use `npx expo install` for Expo-managed native modules.
2. Place supplied screenshots/exports in `design-reference/`, clearly naming every screen and important state (empty pantry, item details, review sheet, errors, etc.).
3. Create the `backend/` Express TypeScript project with its own `package.json`.
4. Initialize Git, verify `.gitignore` excludes all `.env*` files except `.env.example`, credentials, generated build folders, and local logs.
5. Create `AGENTS.md` and `README.md` before feature work begins.
6. Add scripts for mobile start, backend development, type checks, linting, and tests. Only add tools the project actually uses.
7. Establish baseline commits before agent edits.

### Acceptance criteria

- Expo starter runs on at least one actual device or simulator.
- Backend health endpoint returns a simple JSON response locally.
- Git status is clean after the baseline commit.
- Design references and exact screen list are documented.
- No secret credentials are committed.

**Checkpoint:** `chore: scaffold FreshTrack mobile and API projects`

## Phase 1 — Implement the supplied designs and navigation

**Goal:** Recreate the existing designs, not invent a different visual design.

### Screens

- Sign-up and six-digit OTP verification.
- Pantry list, pantry item details/editing, empty state, and consume/waste confirmation if present in the references.
- Scanner mode selection, camera permission state, camera preview, and review sheet.
- AI Chef near-expiry section, recipe cards/details, loading/error/empty states, and missing-items shopping list.
- Sustainability Insights (additional supplied Stitch reference): rescued value, efficiency chart, Kitchen Hero progress, saved categories and habit recommendations.
- Financial Analytics metric cards, monthly graph, comparison view, and reconciliation banner as `/analytics/financial` from Insights.
- Recipe details, missing ingredients and shared shopping-list interactions are required supporting routes.
- Settings/preferences if represented in the designs.

### Tasks

1. Define theme tokens from the reference designs: colors, typography, spacing, borders, elevation, icons, and shared card/button styles.
2. Implement reusable components (item card, expiry badge, primary button, form field, sheet/modal, chart container, loading/empty/error views).
3. Create Expo Router layouts for public/auth routes and the authenticated app. The supplied docks explicitly show Home, Pantry, Scanner, Recipes and Insights; preserve that design exception. AI Chef lives in Recipes, Analytics in Insights, with financial Analytics nested outside the dock.
4. Use central mock fixtures with typed data; don't create mock records in every screen independently.
5. Add realistic interactions: tab navigation, details, form validation, mock add/edit, mock consumed/wasted, chart date selector if designed.
6. Ensure layouts respect safe areas, keyboards, dynamic text, and small phone widths.
7. Compare each screen side-by-side with its supplied design reference.

### Acceptance criteria

- All supplied designs have corresponding screens/states or documented exclusions.
- Navigation is correct; back behavior and tab state work.
- No dead primary buttons; mock interactions show a result.
- TypeScript check passes; app launches on iOS and Android development environments where available.
- Design differences and missing references are documented.

### Current Phase 1 checkpoint — 10 October 2026

Phase 1 remains **in progress**. See [complete design/state inventory](Phase_1_Screen_Inventory.md)
for all 11 image-to-route mappings, implementation status and visual gaps. No supplied screen is omitted.

Implemented: existing welcome/auth/OTP/Home/Pantry/scanner prototype; preserved Pantry detail/edit
and status confirmations; new Recipes/search/filter/save/details/missing ingredient/shopping/cook
flows; sustainability Insights/period/chart/category/habit flows; nested financial comparison,
report preview and reconciliation; supporting mock preferences. Data is typed and in memory.

Browser checks cover Recipe details, shopping deduplication/purchased clearing, save, cook cancellation
and confirmation/shared inventory, Insights monetary session delta/Weekly chart, category sheet,
report preview, May financial comparison, preferences validation/save and Recipe error/retry/no-results
and mock AI Chef matching. Expired-item reconciliation confirmation cleared its queue and updated
wasted value from $12.40 to $16.69. Recipe/Insights top sections inspected at 375 × 812. Native interaction,
complete design comparison and native sharing remain unverified. Web report download contents matched
the selected Weekly summary ($32.98, 5.8 kg).

Validation: mobile/backend TypeScript pass; 12/12 pantry/recipe/analytics tests and 1/1 health test
pass; Expo Doctor 21/21 pass; Expo install check exit 0 (offline dependency-map warning); web/iOS/Android
exports pass; diff whitespace check passes. Existing backend lint fails because ESLint is absent;
mobile has no lint configuration. See README for exact commands and verification limits.

Remaining after the 11 October slices: Scanner native/visual QA; native auth autofill/keyboard/timer lifecycle QA;
account-deletion UI scope; final native and design QA. Some supplied decorative counts,
audit snapshots and source weekly totals disagree; their treatment is documented in the inventory.

### End-to-end verification slice — 11 October 2026

User requested remaining-work item 4 only, deferring visual/general native/auth QA items 1–3.
Added connected regression for Scanner import/duplicates, shopping, cooking, reconciliation and
analytics/report with replay/immutable-fixture assertions. 31/31 tests and both TypeScript checks pass.
No application/dependency changes. Browser flows directly verified; download-event confirmation timed
out and is not claimed passed in this run. iPhone Expo Go launch and recipe/shopping/preferences/share
sheet confirmed by the user; Scanner/duplicate/reconciliation checks subsequently reported passing.
Android/emulator unavailable. iPhone item 4 complete by user report, not direct agent observation.
See [test sequence and platform evidence](Phase_1_End_to_End_Checks.md) and README for commands.
Next: Android item-4 checks when a device/emulator is available. Items 1–3 remain deferred.
Phase 1 remains in progress; Phase 2 requires review and explicit approval.

### Pantry top-section visual slice — 11 October 2026

Reference PNG/HTML comparison identified unsupported large title/add block and banner-first hierarchy.
Pantry route now starts with white pill search/functional barcode entry, followed by existing filters
and light freshness banner with shield, Active label and separate expiry-source explanations. Manual
add is a compact accessible button beside Batch Select; existing empty entry remains. Demo wording
does not imply real AI/package verification. All existing reducers, swipe cards and fixtures preserved.
Browser inspected 320/375/430 px: wrapping/no clipping; search empty/reset, add/cancel, scan navigation
and batch $4.29 review/cancellation/exit preserving eight items verified. TypeScript (mobile/backend),
30 tests, health test and all-platform/32-route exports pass; existing lint gaps remain. README has
commands/results. Full visual parity and native testing are still pending.
Next: Pantry card expiry-source pills/row spacing while preserving swipe/batch actions.
Phase 1 remains in progress; Phase 2 requires review and explicit approval.

### Currency consistency slice — 11 October 2026

Fixed typed USD ($) mock metadata supplies Pantry/receipt/barcode input labels and a read-only
Settings explanation. Incorrect INR mock comment corrected; whole-entry dollar prices and financial
chart/month/category cents explicitly documented. Preserved reference values and formatting; no
exchange rates or configurable currency. Later production currency/schema decisions remain unchanged.
Browser verified at 375 × 812: Settings layout, two-bag/$4.50 whole-entry detail, June financial
$64.80/$12.40, weekly $18/$9/$4/$2 and category $6.20/$3.80/$2.40. Root/backend TypeScript,
30 tests, backend health test (after sandbox-port retry), and web/iOS/Android exports pass.
Pre-existing lint gaps remain; exact commands in README. Native QA remains pending.
Next: phone-width Pantry comparison with the supplied design and its first documented visual mismatch.
Phase 1 remains in progress; Phase 2 requires review and explicit approval.

### Pantry Batch Select slice — 11 October 2026

Reference Batch Select pill implemented with whole-entry checkboxes, select/deselect-visible,
disabled empty actions, selected count/value and exit/cancel. Filter/search changes clear selection;
sorting preserves it. Shared confirmation lists every entry/quantity/value and total before action.
Cancel preserves selection/inventory. Confirm uses one atomic in-memory transition; missing/stale/
duplicate/empty selections reject entirely, and replay cannot change resolved entries. No integrations.
Batch cards use regular press targets outside the swipe wrapper; normal cards preserve their gestures.
Browser verified at 375 × 812: keyboard/tap, disabled actions, cancel, filter/sort selection behavior,
visible-only toggle, Used 2/$8.28 and Wasted 3/$16.27 outcomes, Home 8 → 3, Insights $92.78/session
2 used/3 wasted, both single-item swipe confirmations/cancellation and exit-selection preservation.
Root/backend TypeScript, 30 tests, backend health test, all-platform exports and diff check pass;
existing lint gaps remain. Exact commands in README. Native gesture/accessibility/dynamic-text,
large selection sheets and complete side-by-side visual review remain pending.
Next: currency-label/fixture consistency audit against supplied dollar references.
Phase 1 remains in progress; Phase 2 requires review and explicit approval.

### Pantry category filter slice — 11 October 2026

Typed existing categories now filter active inventory alongside search/freshness and sorting.
Active category counts are inventory-wide; visible count/value/at-risk total follow combined filters.
Search trims whitespace. Clear Filters/empty Show All resets the three filters while retaining sort;
manual add returns with filters cleared, cancellation preserves them. No fixtures/dependencies added.
The second category carousel reuses reference pills while preserving the existing freshness row;
this is a documented extension to the supplied mixed carousel. Checked states/touch targets included.
Browser at 375 × 812 verified Dairy/combined search/freshness values, no-match/reset, keyboard
selection/name sort, Used outcome/count updates, zero-count category, successful add revealing an
otherwise excluded item and add cancellation. Native accessibility/dynamic text/design QA pending.
Root/backend TypeScript, 28 tests, backend health test, three-platform exports and diff check pass;
existing lint gaps remain. Exact commands and verification limits in README.
Next: reference Pantry Batch Select with explicit selection/cancellable Used/Wasted/shared updates.
Phase 1 remains in progress; Phase 2 still requires review and explicit approval.

### Auth and Settings prototype slice — 11 October 2026

Supplied forms preserved; validated inline errors, loading/retry and cancellable local delays added.
Typed demo profile/OTP configuration and pure validation in `lib/auth.ts`; public code `123456`,
two-minute expiry, full-code paste, invalid/expired/simulated failure/retry and 30-second resend
cooldown. Timers clean up on unmount. Added mock email recovery and provider fallback feedback;
no email, credential storage, external auth, session infrastructure or password changes.
Settings profile save/cancel, demo privacy information, shared remember-device and cancellable demo
exit added using existing tokens/wrapper (no additional design supplied). Digest choices/profile share
in-memory preferences. Terms/Privacy links open prototype information; production policies are pending.
Browser verification covers sign-up/login failures and retry, OTP validation/paste/expiry/resend and
failure recovery, recovery preview, provider feedback, profile/preferences/privacy and exit flows at
375 × 812. Native autofill/keyboard/screen-reader/timer lifecycle and final visual comparison pending.
Root/backend TypeScript, 28/28 unit tests, health test, web/iOS/Android exports and diff check pass.
Existing lint gaps remain; exact commands and limits in README. No SDK/dependency changes.
Next: Pantry category filtering composed with search/freshness and no-match/reset states.
Phase 1 remains in progress; Phase 2 requires explicit approval after review.

### Home Recent Additions swipe slice — 11 October 2026

Existing compact Home cards extracted into a typed reusable component. Right/left swipes request
Used/Wasted via the shared cancellable sheet; confirmation updates shared inventory, cancellation
preserves it. Added accessible 44-point fallback buttons and an empty Add entry to the existing form.
No new dependency, fixture or real integration. Supporting buttons extend the reference compact card.
Browser checks at 375 × 812: short-swipe/details recovery, both directions/cancel/repeat, confirmed
outcomes/Home-to-Pantry propagation (8 → 6), vertical drag without navigation, keyboard Wasted,
Used button, all-resolved empty state and Add navigation. Native gestures/accessibility/design QA pending.
Root/backend TypeScript, 25/25 unit tests, 1/1 backend health test and web/iOS/Android exports pass;
diff whitespace check passes. Existing mobile/backend lint gaps remain; exact commands in README.
Next: Pantry category filtering composed with search/freshness, including no-match/reset behavior.
Phase 1 remains in progress and requires review; Phase 2 requires explicit approval.

### Scanner permission slice — 11 October 2026

Shared typed mock gate added for Receipt and Barcode. Initial explanation/Allow/Deny, retryable denial,
blocked-access local Demo Camera Settings, save/cancel and manual fallback are implemented with
existing safe-area/keyboard-aware Scanner wrapper and shared theme controls. Review components only
mount after demo grant; permission state carries across modes and resets on reload. No camera module,
permission request, OS settings link, backend or new dependency. No dedicated permission reference exists.
Browser verified denied controls hidden/manual cancel/retry/allow/receipt scan, shared barcode access,
blocked controls hidden/settings checkbox/cancel/save-off/save-on and barcode scan. Blocked/settings
cards visually checked at 375 × 812. Device/accessibility QA remains pending. Preview on fresh load:
`/scanner?permission=denied|blocked|granted`; failure previews require demo grant or `&permission=granted`.
Root/backend TypeScript, 25/25 unit tests, 1/1 health test and web/iOS/Android export pass. Existing
mobile/backend lint gaps remain; exact commands in README. Next: Home Recent Additions gestures with
shared Used/Wasted confirmation and accessible fallbacks. Phase 1 remains in progress, pending native
and full design review; Phase 2 requires explicit approval.

### Barcode/package queue slice — 11 October 2026

Implemented in the existing Scanner mode: typed synthetic catalog for the three reference packages,
lookup/loading/error/not-found/retry/manual fallback; queue progress and remaining-item controls;
validated date/quantity/value, simulated stamp, manual date and preset options; Confirm Date & Next
and pending-only bulk estimates; revisit/removal, duplicate Skip/Add separately, final confirmation
and atomic shared insertion. Barcode identity persists through edits for duplicate detection.
No API, OCR, camera, dependency, config or later-phase work. Mode-change/unmount cleans scan timers.
Manual fallback uses the existing form; cancelling returns to the unchanged pending queue.
Browser verified invalid dates, manual fractional entry/value, confirmed dates retained across bulk
estimates, three products, duplicate gate, confirmation back, 8 → 11 shared Pantry items/$51.01,
lookup error/retry/unknown/malformed code/manual cancel, removal and mode reset. Phone form reviewed
at 375 × 812. Native touch/keyboard/accessibility and full reference visual match remain pending.
Root/backend TypeScript, 25/25 unit tests and 1/1 backend health test pass; three-platform final
export and diff check pass. Lint remains unavailable; exact commands in README. Synthetic stamp
provenance is explicitly labeled; no real package was verified. Reference photo/overlay/auto-saved
produce/confidence decorations remain documented approximations. Next: mock Scanner permission
recovery UI. Phase 1 remains in progress; Phase 2 requires review and explicit approval.

### Receipt review slice — 11 October 2026

Implemented within the existing Scanner route: typed reference fixtures, scan/loading, editable
selection/name/category/quantity/unit/value/date review, Add Missing pending candidates, normalized-name
possible duplicates with explicit Skip/Add separately, final confirmation/back and atomic shared import.
Estimated/user-entered dates and receipt origin are preserved; existing purchases remain untouched.
Resubmission/replayed batches are blocked; timers clean up on mode-change/unmount. Error/empty/retry
previews use `/scanner?preview=error` or `empty`. No native camera, OCR, backend or persistence added.
The four shown groceries total $16.16; reference eight-item/$28.16 decorations are inconsistent and
are replaced with derived review totals. Emoji/viewfinder/overlay differences and native QA remain pending.
Browser verifies edits/cancel/validation/duplicate gate/skip/exclusion/confirmation back, 8 → 10 shared
Pantry entries with preserved edited data, separate purchase success, error/empty/retry and Add Missing.
Root/backend TypeScript pass; 20/20 unit tests and 1/1 backend health test pass (approved rerun after
sandbox EPERM). Root/backend lint unavailable as before; all three exports and diff check pass.
Exact commands/limits in README. Next: barcode/package-date queue, failed lookup, duplicate review
and confirmed mock insertion. Phase 1 remains in progress; Phase 2 requires review and approval.

### Pantry swipe slice — 11 October 2026

Implemented right-Used/left-Wasted panels on Pantry cards using existing ReanimatedSwipeable,
with GestureHandlerRootView at the root. Existing confirmation sheets and in-memory reducer
remain the mutation boundary; accessible buttons remain. Drag suppression resets on each new
press, preserving taps after a cancelled short swipe. No new dependencies or integrations.
Browser QA at 375 × 812: both directions/cancel, confirmed removal (8 → 7 → 6), short swipe,
subsequent detail tap, button fallback and vertical mouse drag without navigation/status action.
Native touch/scroll/diagonal/accessibility QA remains pending; Home card swipes remain separate.
Mobile/backend TypeScript and 16 tests passed; final web/iOS/Android export and diff check passed.
Existing lint limitations remain. See README for exact commands and remaining Phase 1 work.
API references consulted: [Gesture Handler 2.x Swipeable](https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/components/reanimated_swipeable/)
and [root installation](https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/installation/).

### Pantry manual-entry slice — 11 October 2026

`/pantry/add` is implemented: shared typed insertion, name/category/quantity/unit/calendar-date/
optional purchase-value validation, past-date reconciliation eligibility, user-entered expiry and
manual origin. Unknown price is documented as $0 with a detail note for this prototype. It uses
existing safe-area/keyboard-aware components, theme tokens and seven centralized category options.
No separate add-screen reference exists. No new dependency, persistence or API was added.

Pantry list and empty/search-empty states expose manual add; Scanner exposes the same fallback.
Successful save offers Pantry/details navigation, resets restrictive Pantry filters and blocks repeated
submission. Cancellation preserves inventory and source navigation. Home reflects the shared item
and labels manual origin/date; Pantry card currency symbol matches the dollar reference.

Verification: mobile/backend TypeScript pass; all 16 unit tests pass (four new tests cover insertion,
invalid fields, decimal/unknown-value handling and expired-item status transitions); all three platform
exports pass. Browser verified invalid-name/quantity/date/price rejection, fractional insertion,
category/unknown-value detail, cancel/source return, real empty Pantry entry, Scanner fallback and
Home propagation; 375 × 812 form layout checked. Device/keyboard/dynamic-text QA remains pending.
Existing lint limitations are unchanged; lint/Expo Doctor not rerun because dependencies are unchanged.
See README for actual commands.

**Exact next slice:** centralize Scanner receipt fixtures, editable candidate review and confirmed
shared mock inventory insertion, including explicit duplicate handling. Scanner lookup failures,
permission/error UI, remaining Pantry controls, auth states and final native/design QA still remain.
**Phase 2 is not authorized** and requires explicit approval after Phase 1 review.

**Checkpoint:** `feat: implement FreshTrack screen designs and navigation`

## Phase 2 — Confirm authentication and backend contract

**Current final-review status — 11 October 2026:** Phase 2 development acceptance is complete,
with Android/live signing/production checks deferred by the user. ADR 001 and Phase_2_Final_Review.md
record the user-accepted 15-minute JWT policy for the MVP. Immediate server revocation is not an MVP
requirement. Checkpoint: `feat: validate native authentication and protected route flow` (see Git log).
70 root tests, nine backend auth/boundary tests, health 1/1, both TypeScript checks and Doctor 21/21
pass. Review fixed pre-existing raw error logging and missing request IDs without database/data-API
work. Phase 3 has not started and requires explicit authorization.

**Earlier proof-of-concept checkpoint — 11 October 2026:** User authorized Phase 2 and explicitly selected the lower-level Neon
API proof of concept because the published SDK has no Expo adapter. An isolated native OTP/session/
sign-out screen is implemented; the existing UI prototype is preserved. TypeScript, 39 unit tests,
backend health and three-platform exports pass. Real-device proof-of-concept checks pass by user report. See `Phase_2_Auth_Proof_of_Concept.md` for the API contract, SDK findings, checks and next slice.
User confirmed email delivery and OTP acceptance on iPhone; initial bearer restoration failed.
Provider-signed session-cookie transport now passes native sign-in/session verification;
restart persistence and sign-out/restart now pass user testing on iPhone. Sign-out required the
explicit app Origin/Referer and user-approved development server origin in the trusted domains.
Protected navigation, backend verification, deliberate OTP failure-policy tests and Android
checks remain incomplete; the proof-of-concept slice does not complete Phase 2.
Phase 1 remaining QA stays deferred; Phase 3 is not authorized.

### Existing authentication forms slice — 11 October 2026

User authorized remaining item 1. Native sign-up/password sign-in/OTP verification/resend now call
Neon's inspected APIs using the verified signed-cookie transport. Supplied UI styles and existing
routes are preserved. Sign-up waits for the automatically emailed verification code; resend uses
`email-verification`. Passwords/OTPs never enter route parameters or persistent storage. Unverified
responses cannot become local sessions. Verification without auto-sign-in returns to password login.
Remember unchecked uses process memory and removes older disk cookies; renewed cookies preserve
that choice. Web/native explicit Preview Demo preserve the labeled mock flow. Real identities remain
separate from mock kitchen profiles. Success ends at the provider session-check screen, with sign-out
and Continue to Demo Kitchen, pending shared auth state/protected routing in item 2.

User reports new-account email/OTP, wrong-password rejection, password login and remembered versus
unremembered restart behavior pass on iPhone. Verification resend delivered a new code and
completed verification by user report; its API contract also has fixture coverage. 48/48 tests, mobile/backend TypeScript, backend health 1/1, Expo Doctor 21/21 and web/iOS/Android
exports (34 routes) pass. Existing lint gaps remain. Exact commands/results in README. No new dependency
or backend/data-model change in this slice. OAuth/biometrics/password recovery remain disconnected and
show explicit feedback. Next: remaining item 2 (shared
verified auth state, startup restoration, protected Expo Router redirects). Phase 2 is not complete;
Phase 3 is not authorized.

### Protected navigation slice — 11 October 2026

User authorized remaining item 2. Shared AuthContext/provider-verified state now controls SDK 57
Stack.Protected gates for all kitchen routes, including Pantry add/details, Recipe/shopping,
financial Analytics and Settings/profile; Privacy remains public. Startup waits for restoration;
resume checks cover the preserved route with loading and revoke client access on failed/null checks.
Provider actions are serialized and superseded results cannot resurrect a signed-out session.
Real authentication now lands at Home directly. Settings shows actual identity, read-only account
information and provider Sign Out. Explicit demo access is process-only, separate from actual
identity, unavailable in production native. Mock Pantry/recipe state resets across identity changes;
local form preferences remain separate. No backend/data-model work was added.

iPhone user reports startup/restart, Home/Settings identity, item/back, sign-out/back/deep-link blocking,
and demo/exit pass. Browser private Pantry/profile/shopping links, demo/exit and public Privacy checks
pass. 55/55 tests, both TypeScript checks, health 1/1, Expo Doctor 21/21 and three-platform/34-route exports
pass. Existing lint gaps remain. Exact commands and limitations in README. Offline/expiry/race scenarios
have injected-client coverage; deliberate provider/device failure-policy and Android checks remain open.
Next: remaining item 3—backend server-side identity verification. Phase 2 remains incomplete; no Phase 3.

**11 October 2026 — remaining item 3 backend identity checkpoint:** User authorized and implemented
`GET /api/v1/auth/me` with reusable Bearer JWT middleware. Mobile obtains the provider's signed
JWT via authenticated `/token`; backend jose verifies branch JWKS/EdDSA signature, origin issuer
and audience, subject/expiry/issued-at, 15-minute maximum age and verified/non-banned identity.
Client userId is ignored; unauthorized requests fail 401, verification outages fail closed 503.
Health stays public. JWTs are not persisted by mobile. Provider sign-out does not immediately revoke
already-issued JWTs; up to 15-minute validity and production revocation policy are documented.
No schema/migration/database/Pantry API work was performed.

User reports Settings → Check Backend Identity passes on iPhone. Actual development JWKS/health
return 200; unauthenticated identity returns 401. 60/60 mobile/shared tests, seven backend auth tests,
health 1/1, both TypeScript checks, Doctor 21/21 and web/iOS/Android exports pass. Existing lint gaps
remain. Exact commands and dependency audit result are in README. Next: deliberate provider
failure/offline checks, revocation decision and remaining Phase 2 acceptance/production review.
Android remains pending. Phase 2 is incomplete; Phase 3 has not started.

### Failure/offline checks slice — 11 October 2026

User authorized remaining item 4. Offline iPhone resume blocks kitchen access; reconnect/retry
restores the same account without OTP, by user report. Transport now handles non-JSON 401/429
without hiding status, retains cookies on temporary/malformed provider failures, exposes only safe
allowlisted labels and requires verified/non-banned identity for passwordless sign-in/restoration.
The existing development check can enter a previously received code without replacing it, for
provider reuse/expiry checks. No provider policy, dependency, schema or API contract was changed.

65/65 mobile/shared tests, backend auth 7/7, health 1/1, both TypeScript checks, Doctor 21/21 and
all-platform exports pass. Wrong OTP rejection, valid retry and reused-code rejection also pass by
iPhone user report. User confirmed actual Too many attempts and fresh-code recovery. Email states
a 10-minute lifetime; user reports expiry rejection and fresh-code recovery after the requested
11-minute wait. Item 4 is complete for iPhone development checks; fixtures alone prove client
handling only. See Phase_2_Failure_Checks.md and README for results.
Next: final Phase 2 acceptance/revocation/production review, Android verification when available,
then checkpoint commit before starting another phase.
Phase 2 remains incomplete; Phase 3 is not authorized.

### Release preparation slice — 11 October 2026

User approved shared/iOS release configuration and Android settings; Android device QA is deferred.
User has no paid Apple Developer membership. Local EAS preview/production profiles, dynamic config
preserving app.json, explicit native IDs/EAS project/public HTTPS inputs, validation and a release
template are prepared. Actual owner IDs/project/production services and signing remain unset; no
account/linking/build/signing/deployment/store upload ran. No repository dependency or dev env change.

Both TypeScript checks, 70 root tests, focused config 5/5, official EAS schema, backend auth 7/7,
health 1/1, Doctor 21/21 and all-platform exports pass. Actual Expo CLI resolves synthetic release
configs and rejects LAN API input; this is not real release/native QA. See README and
Phase_2_Release_Configuration.md. Next: final acceptance/architecture/revocation review, document
release/Android deferrals, then checkpoint before Phase 3. Phase 2 remains open; no Phase 3 work.

**Goal:** Validate the selected Neon Auth approach before the rest of the app depends on it.

### Authentication proof-of-concept tasks

1. Create Neon development and production branches/projects as appropriate; enable the current Managed Better Auth/Neon Auth integration on the development branch.
2. Confirm the required flow really supports the product's intended six-digit email OTP—not merely email verification after password sign-up. Confirm resend, expiry, one-time use, rate limiting, and session creation.
3. Confirm the currently supported SDK can be used from the chosen Expo React Native SDK. Neon Auth uses Managed Better Auth and its own SDK/API; do not assume a web-only component or self-hosted Better Auth recipe is interchangeable.
4. If supported, build a minimal real sign-up → receive OTP → verify → persistent session → sign-out proof of concept using the existing auth design.
5. Store session material using the supported secure native storage mechanism; don't invent a token scheme. Configure development and production app origins/callbacks according to the chosen auth flow.
6. Establish the backend's server-side session verification method. Every protected API endpoint must derive the user identity from a verified session/token, never trust a client-supplied `userId`.
7. Write an architecture decision record in `README.md` or `docs/decisions/` describing the validated integration and versions.

### Auth decision gate

**Do not continue with production data endpoints until the exact Expo + Neon Auth OTP flow is verified.** If the managed Neon SDK cannot support the required native flow, decide explicitly whether to use its documented lower-level API path or another Expo-compatible auth provider; don't silently build a custom authentication system.

### Acceptance criteria

- A new account can complete the intended six-digit OTP flow on a real or development device.
- Incorrect, expired, reused, and resent codes are handled safely.
- Session survives app restart and logout clears it.
- Public routes and protected tabs redirect correctly.
- Backend can reject unauthenticated requests and derive the authenticated subject reliably.

**Checkpoint:** `feat: validate native authentication and protected route flow`

## Phase 3 — Data model, Prisma migrations, and API foundation

**Goal:** Establish a stable database contract before connecting screens.

### Current status — Phase 3 development acceptance complete (12 October 2026)

User authorized item 6 final review. All five acceptance criteria have recorded development evidence:
initial migration onto an empty application schema, guarded seed, public health/authenticated reads,
JWT and household isolation, and server-only credentials. User verified hosted identity and scoped
database read on iPhone. See [final acceptance report](Phase_3_Final_Review.md) for evidence limits.

Final checks pass: both TypeScript checks/build, root73/73, backend29/29, health1/1, guards4/4,
live database14/14, live household5/5 with cleanup, seed replay1/1, migration status/readiness,
Prisma validation, Doctor21/21 and public health200/auth401/CORS403. Existing lint gap remains;
prior all-platform export passed. Only review/status documents changed in this final slice.

Android/earlier Phase 1 QA and production/release checks remain deferred; hosted household writes
and hosted two-account isolation are not claimed. The mobile kitchen remains mock. Phase 4 is not
authorized or started. Exact next step after approval: household setup and persisted Pantry
list/manual-add with a transactional CREATED event, client service and account-isolation tests.

### Earlier slice — items 1–5 verified (11 October 2026)

User authorized deployment preparation and completed Vercel login. Dedicated freshtrack-api Preview
is READY using reviewed Neon development credentials. Exported Express entry, Node24, generate/tsc
build, strict Preview environment/pool guard and upload exclusions added. Canonical declarations moved
inside backend with mobile type-only re-export; isolated upload compiles. No dependency/schema/UI change.
CLI health200 and tokenless household401 pass. User approved disabling Vercel Authentication for this
dedicated development API; project ssoProtection is null. Public health200, tokenless identity/household401
and invalid-token401 pass. Ignored mobile API URL points to HTTPS Preview; both TypeScript checks pass
again. User confirmed hosted Settings → Check Backend Identity passes on iPhone. Hosted Prisma/Neon
database read also passes on iPhone by user report with the expected no-household result.
Git integration failed; CLI deployment passed.
Initial production-labelled attempt failed safely, Preview retry needed NODE_ENV; no production DB writes.

Both TypeScript/build/local preview build pass; backend29/29, deployment rerun4/4, root70/70,
health1/1 and guards4/4 pass. Runtime audit0; full cloud audit36 dev-tool findings; lint gaps remain.
See [deployment evidence and next steps](Phase_3_Deployment.md). Final Phase 3 review is now complete;
Phase 4 has not started.

Read-only native database probe is now implemented under development Settings. It verifies matching
identity then calls household GET with the same transient JWT, accepts the specific no-household
response, and rejects service/auth/invalid-response failures. No records are created and Pantry stays
mock. Both TypeScript checks, root73/73 and backend health1/1 pass; existing lint gaps remain.
User confirmed “Backend database verified” with “No household is set up for this account yet” on
iPhone. The authenticated scoped database query passes; no records created. Hosted household
creation/populated reads are not verified by this check.
Web/iOS/Android exports pass; no backend redeployment, dependency or schema change.

### Earlier checkpoint — items 1–4 complete (11 October 2026)

User authorized item 4. Added shared type-only wire contracts, centralized safe success/failure
responses, bounded pagination, exact paise and decimal quantity serialization, strict calendar/UTC
helpers, household-timezone expiry and pure status-transition policy. Existing endpoint envelopes
are preserved. Mobile identity checking consumes the shared response type; no runtime/UI/native,
Pantry persistence, schema/migration/dependency changes. See [API foundation](Phase_3_API_Foundation.md).

Both TypeScript checks/build pass. Foundation 10/10, auth 9/9, household 6/6, health 1/1, root 70/70,
guards 4/4 and live development household 5/5 pass with temporary-record cleanup. Initial sandbox
HTTP failures passed after approved escalation; lint gaps/Node warnings remain. Expo/device checks
not repeated. Pagination/status helpers do not themselves implement list endpoints or transactional writes.
Next: item 5 Vercel/environment configuration, then final Phase 3 acceptance. Phase 4 is not started.

### Earlier checkpoint — items 1–3 complete (11 October 2026)

User authorized item 3. Explicit authenticated household setup creates household/member/preferences
atomically, with serializable transaction retries for concurrent startup. Repeated setup preserves
choices. Current/by-ID reads filter membership using verified JWT subject; foreign/unknown IDs both
return 404. Request identity/settings/query fields are rejected. No mobile bootstrap integration,
Pantry API, schema/migration/dependency or production change.

Household HTTP/service tests 6/6 and guarded live development tests 5/5 pass (race, rollback,
preferences, isolation and cleanup). Root 70/70, backend auth 9/9, health 1/1, guards 4/4, both
TypeScript checks and backend build pass. Initial health eager-JWT-import failure fixed; reruns pass.
Existing lint gaps remain; Expo/device checks not repeated. See [household access](Phase_3_Household_Access.md).
Next: item 4, shared protected API foundation/contracts, pagination, date/money serialization and
expiry/status helper tests. Deployment and final acceptance follow; Phase 4 is not authorized.

### Earlier checkpoint — items 1–2 complete (11 October 2026)

User approved item 2. Console-verified development endpoint/branch matches the ignored environment.
Initial transactional migration is applied to the previously empty public application schema;
SQL checks/compound references/indexes are installed, managed auth structure unchanged. Prisma 5.22
client/singleton, readiness CLI and pinned-development/consent guards are implemented. Two reserved
synthetic fixture households seed idempotently; they are not linked to real accounts or mobile mocks.

Live migration/status/direct-and-pooled readiness pass. Tests: guards 4/4, rollback-only database
14/14, seed replay 1/1, root 70/70, backend auth 9/9 and health 1/1; both TypeScript checks and
Prisma generate/validate pass. Lint gaps remain; mobile/Expo/device tests not repeated with no mobile
changes. No production migration, kitchen API or mobile persistence. See [database setup](Phase_3_Database_Setup.md).
Next: item 3, household bootstrap from verified identity and isolation/race tests. Phase 3 remains
incomplete; protected data API/contracts/deployment foundation still follow.

### Earlier checkpoint — item 1 complete locally (11 October 2026)

User authorized Phase 3 model definition, selected INR (integer paise) and Asia/Kolkata.
`backend/prisma/schema.prisma` now defines six application models, enums, household-scoped compound
references, event cost/quantity/category/expiry/timezone snapshots and nullable price provenance.
See [model decisions](Phase_3_Data_Model.md) for whole-entry outcomes, archive/correction handling,
MVP one-household membership, preference ownership and planned receipt retention.

Prisma 5.22 format/validate and offline SQL generation pass; nine generated-SQL inspections pass.
Both TypeScript checks, root tests 70/70, backend auth 9/9 and health 1/1 pass. Lint setup gaps remain.
No mobile/UI/config change, database connection test, migration application, seed or generated client.
Phase 3 acceptance criteria are not yet complete. Next: item 2, initial development migration with
SQL checks, target verification/live connectivity, Prisma singleton and guarded seed.

### Database modeling principles

- Use PostgreSQL UUID IDs (or another consistent generated ID type).
- Store timestamps in UTC (`timestamptz` in PostgreSQL); interpret expiry calendar dates using the household/device's configured timezone.
- Store money in integer minor units (paise for INR) or Prisma `Decimal`, never floating-point arithmetic. Choose one representation and use it consistently.
- Keep auth-managed tables in `neon_auth` under the auth provider's ownership; application tables reference a stable auth subject string rather than trying to recreate auth tables.
- Every user-owned query must be scoped through the authenticated identity and household membership.
- Use Prisma migrations and a seed script; don't rely on `db push` as the permanent production migration strategy.

### Proposed application tables

**Household**
- `id`, `name`, `currencyCode` (default `INR`), `timezone`, `createdAt`, `updatedAt`.
- Represents the boundary for inventory; future shared pantry support can add members without redesigning every item.

**HouseholdMember**
- `id`, `householdId`, `authSubject`, `role` (MVP: `MANAGER`), `createdAt`.
- Unique constraint on `(householdId, authSubject)` and indexes for household/user lookups.

**PantryItem**
- `id`, `householdId`, `name`, `normalizedName`, `category`, `quantity`, `unit`, `purchaseDate`, `expiresOn` (date), `expirySource` (`PACKAGE_DATE`, `PRESET_ESTIMATE`, `USER_ENTERED`), `freshnessPresetDays`, `unitCostMinor`, `totalCostMinor`, `currencyCode`, `status`, `source` (`MANUAL`, `BARCODE`, `RECEIPT`), `barcode`, optional notes, created/updated timestamps, and status timestamps.
- Status enum: `ACTIVE`, `CONSUMED`, `WASTED`, `ASSUMED_CONSUMED`.
- Index by `(householdId, status, expiresOn)` and appropriate normalized-name/barcode lookup indexes.

**PantryItemEvent**
- `id`, `householdId`, `pantryItemId`, `eventType`, `previousStatus`, `newStatus`, `quantity`, `occurredAt`, `source` (`APP`, `NOTIFICATION`, `RECONCILIATION`, `SYSTEM`), optional idempotency key and metadata.
- Append-only record for analytics/history; this prevents edits to a current item from silently rewriting all historical metrics.

**ReceiptScan**
- `id`, `householdId`, `createdByAuthSubject`, `status` (`UPLOADED`, `PROCESSING`, `REVIEW_REQUIRED`, `IMPORTED`, `FAILED`), OCR text or safe temporary reference as appropriate, detected items JSON, error code, created/updated timestamps.
- Do not retain receipt images indefinitely by default. Define retention/deletion behavior; prefer processing then deleting the original unless the product explicitly needs history.

**UserPreference**
- `id`, unique member `authSubject`, `notificationEnabled`, local HH:mm preferred notification time,
  date format and created/updated timestamps. Timezone/currency are owned by Household, avoiding
  conflicting duplicate preferences. See model decisions for defaults and validation.

**RecipeCache** (optional after first integration)
- `id`, normalized ingredient-set key, provider recipe IDs/results, fetchedAt, expiresAt.
- Avoid storing unnecessary complete provider payloads or personal data.

### Backend foundation tasks

1. Create Express app with `/api/v1/health`, JSON parsing, request ID, structured logger, CORS appropriate to the environment, centralized error handler, request validation, and rate limiting.
2. Add Prisma Client singleton/service, Prisma schema, migrations, seed, and database readiness check.
3. Use separate environment settings for local, preview/staging, and production.
4. Define shared API response/error shape, pagination format, and date/money serialization.
5. Add unit tests for expiry calculations, status transitions, and access scoping.
6. Configure Vercel to deploy the Express app as its supported Node.js function. Keep the API project root/deployment settings explicit. Do not rely on `express.static()` to serve the mobile app.

### Acceptance criteria

- Fresh database can be created by applying migrations in documented order.
- Seed data can be installed only in development.
- Health endpoint and a read-only authenticated test endpoint work.
- API refuses requests without a valid session and refuses cross-household access.
- No secret or database connection string appears in mobile config, logs, or repository.

**Checkpoint:** `feat: add Prisma schema migrations and protected API foundation`

## Phase 4 — Pantry inventory end-to-end

**Goal:** Make the core app useful before adding OCR/AI.

### Current status — batch/undo verified on iPhone (12 October 2026)

User explicitly resumed. Scoped recovery cleared synthetic fixtures; final sequential live suite11/11
passes and reserved membership count0 is verified. Local TypeScript/build, root79/79, backend37/37,
health1/1, Doctor21/21 and all-platform exports pass. Existing lint gaps remain.
Atomic batches and confirmed single/batch undo preserve history, version/retry protection and existing
design/demo behavior. New development Preview is READY; public health200/tokenless batch/undo401 pass.
See [current report](Phase_4_Batch_Undo.md); prior pause/failures remain in the historical handoff.
User reports iPhone batch Used cancel/confirm, undo cancel/restore/restart, batch Waste/restore and
detail undo checks pass. Native failure paths/full-cap/Android remain unverified. Next: Phase 4 expiry
presets/precedence, then server filters/duplicates/offline/final review. No schema/dependency/production
or Phase 5 work.

### Current slice — persisted editing and outcomes verified on iPhone (12 October 2026)

User approved this continuation. Validated membership-scoped PATCH and confirmed consume/waste
endpoints use loaded-version checks, household retry keys/hashes, serializable item/event transactions
and consistent status timestamps. Historical snapshots stay unchanged; replay adds no event. Real
detail form, card swipes/accessibility buttons and busy/error/cancel/retry sheets are connected; demo
is preserved. No schema/migration/dependency change. New development Preview is READY.

Root77/77, backend35/35, live Pantry7/7 with cleanup, health1/1, both TypeScript/build, Doctor21/21,
all-platform exports and public health200/tokenless mutations401 pass. Existing lint gaps remain.
User reports iPhone edit/restart and cancel/confirm Used/Wasted/restart checks pass.
See [mutation report](Phase_4_Pantry_Mutations.md). Native failure paths remain unverified.
Next: remaining Phase 4 batch/undo, presets, server-wide filters,
duplicates/offline persistence and final review. Android/release QA remains deferred; no Phase 5.

### Earlier slice — household/list/manual add verified (12 October 2026)

User approved Phase 4. Signed-in native Pantry sets up/restores household then reads active items;
manual add persists validated exact quantities/INR paise/Kolkata dates with a CREATED event in one
serializable transaction. Retry-key/hash handling protects unchanged retries. Read-only scoped detail
route is connected; explicit demo retains working prototype interactions. Other tabs remain mock.
No schema/migration/dependency/design/navigation change; new development Preview is READY.

Both TypeScript/build, root76/76, backend33/33, live Pantry3/3 with cleanup, health1/1, Doctor21/21
and all-platform exports pass. Public health200/tokenless Pantry401 pass; existing lint gaps remain.
iPhone add/details/restart/refresh/sorting and unknown-price checks pass by user report.
See [first-slice report](Phase_4_Pantry_First_Slice.md). Android/native failure paths remain unverified.
Filters/alternate sort apply to loaded pages. Editing/Used/Wasted are implemented in the next slice;
presets/duplicates/offline persistence and final review remain incomplete.
Phase 5 has not started.

### Endpoints (suggested contract)

- `GET /api/v1/pantry?status=ACTIVE&sort=expiresOn&page=...`
- `POST /api/v1/pantry`
- `GET /api/v1/pantry/:itemId`
- `PATCH /api/v1/pantry/:itemId`
- `POST /api/v1/pantry/:itemId/consume`
- `POST /api/v1/pantry/:itemId/waste`
- `POST /api/v1/pantry/:itemId/undo-status` (only if product UX supports undo)
- `POST /api/v1/pantry/bulk-import` (internal/reviewed import contract)


### Tasks

1. Implement validated create/edit forms and a reliable manual-add flow first.
2. Build a single server-side expiry calculator. Expiry precedence: package-printed date > user-entered date > estimated preset. Always display estimates as estimates and allow edits.
3. Implement deterministic default presets by normalized product name/category (e.g. milk, spinach, bread), but treat their durations as configurable product assumptions—not food-safety guarantees.
4. On consume/waste, perform a transaction that updates status and appends a `PantryItemEvent`.
5. Add client repository/service functions to call the API and refresh Context state. Keep network access out of presentational components.
6. Implement optimistic UI only if rollback on failure is handled; otherwise wait for the server response.
7. Add duplicate scan matching by normalized name/category/date/household. Do not silently consume an existing item on a weak fuzzy match. Present a clear replacement/duplicate confirmation during MVP; later, highly confident matching rules can be automated with an undo path.
8. Add loading, empty, stale-network, retry, and offline-readable states.

### Acceptance criteria

- Add, view, edit, consume, and waste work against real data.
- Fresh login sees only its household items.
- The closest expirations sort first and countdown colors consistently match the specification.
- Printed expiry dates override preset estimates.
- Cost and event history survive app restarts.
- Duplicate behavior never silently discards an item due to an ambiguous match.

**Checkpoint:** `feat: connect Pantry CRUD and lifecycle events to PostgreSQL`

## Phase 5 — Local expiry notifications and reconciliation

**Goal:** Make expiry reminders reliable without requiring a cloud push for every reminder.

### Tasks

1. Request notification permission contextually, explain what it does, and allow the user to disable reminders.
2. Schedule local notifications at T−3 days, T−1 day, and on expiry day at the configured local time. Skip any alert whose target is already in the past.
3. Keep a mapping of `pantryItemId + milestone` to local notification identifier so edits can cancel and reschedule; consuming/wasting an item cancels its remaining alerts.
4. Use notification categories/actions where supported to offer Consumed and Wasted. Do not rely solely on the user long-pressing the lock screen: OS UI and action availability vary by platform/version. Test on actual iOS and Android builds.
5. When an action is tapped, update local UI and queue an idempotent status request. If network is unavailable, retain the pending action and retry on next app resume; don't lose the action silently.
6. Ensure notification action retries cannot create duplicate events. Use a generated idempotency key for status actions.
7. On app start/resume, reconcile active items whose `expiresOn` has passed. Mark them `ASSUMED_CONSUMED` only if that is the confirmed product rule, and record a `SYSTEM` event. Never count assumed-consumed items as definitely eaten or definitely wasted.
8. Show a reconciliation banner: “X items expired recently. Were they consumed or wasted?” Allow the user to bulk-confirm and update the historical event.

### Acceptance criteria

- Create/edit/consume/waste reliably updates local schedules.
- Notifications are based on device-local scheduling and do not require continuous cloud push delivery.
- Notification actions are tested on real development builds; any platform restrictions are documented.
- Offline actions eventually sync without duplicate event history.
- Assumed-consumed records remain distinct from confirmed consumed/wasted records in analytics.

**Checkpoint:** `feat: schedule local expiry alerts and reconcile overdue items`

## Phase 6 — Scanner: barcode and receipt OCR

**Goal:** Accelerate entry while retaining an accurate review step.

### A. Barcode scanning

1. Use `expo-camera` barcode scanning and handle camera permissions, denied permission, low light, and repeated scan events.
2. Debounce scans and lock onto one result at a time.
3. A barcode is an identifier, not the grocery name or expiration date. Select and document a product catalog provider or implement a local known-barcode lookup. If a lookup returns nothing, provide manual item entry.
4. Populate name/category/brand/size only from a catalog result with a confidence/source field. Users must enter/confirm quantity, purchase date, cost, and expiry date or preset.
5. Barcode scan must navigate to the same review form used by manual and receipt entry.

### B. Receipt image capture and OCR

1. Implement receipt camera capture, retake, cropping/rotation if practical, compression, preview, and upload progress.
2. Send image bytes through authenticated HTTPS to the backend. Avoid unnecessarily embedding large base64 payloads in JSON; compress and enforce upload size/type limits. If receipts outgrow function payload limits, use temporary object storage with short-lived upload URLs.
3. Call Google Cloud Vision from the backend using server-side credentials. Start with the suitable text/document detection mode and handle provider errors/timeouts.
4. Parse OCR output using a deterministic pipeline:
   - Normalize whitespace, punctuation, encoding, and common retailer abbreviations.
   - Remove headers, payment lines, totals, tax lines, and likely non-item text.
   - Identify possible item/price/quantity lines using patterns and scoring.
   - Normalize known aliases (`MKL LOPFT 1L` → candidate `Low-Fat Milk`) using a maintained dictionary.
   - Keep original OCR text and confidence/context for debugging, with a retention policy.
   - Do not guess missing values silently; flag uncertainty for the review screen.
5. Return a draft only; don't write pantry inventory before user confirmation.
6. The review sheet should allow editing/deleting detected lines, quantity, cost, category, and expiration date/preset.
7. Apply preset expiry estimates only when no trustworthy package date is available. A receipt usually gives purchase date/line item, not the package's use-by date.
8. Commit all confirmed items in one validated bulk-import operation; record the receipt scan status and item events consistently.
9. Provide manual fallback if OCR fails, the receipt is blurry, or the retailer format is unknown.

### Acceptance criteria

- Barcode scans do not add duplicate items on repeated camera frames.
- Unknown barcodes remain usable through manual entry.
- OCR parsing returns candidate lines and confidence/context rather than pretending every line is accurate.
- User edits are respected exactly; only reviewed items are imported.
- OCR/provider failure does not lose the captured image before the user can retry, unless retention/privacy rules require disposal.
- API keys never leave the backend.

**Checkpoint:** `feat: implement barcode lookup and reviewed receipt OCR import`

## Phase 7 — AI Chef with Spoonacular

**Goal:** Recommend meals that use ingredients expiring in the next 48 hours.

### Tasks

1. Add an endpoint such as `GET /api/v1/chef/expiring` to return active household ingredients expiring within the next 48 hours.
2. On “Suggest Recipes,” send only normalized names/quantities of near-expiry ingredients to the backend integration, not the entire inventory.
3. Keep a small local matrix of common pantry staples for UI/missing-item calculations. Spoonacular already supports ingredient search and has a pantry-item exclusion option; don't append a large artificial “prompt” because this integration is a recipe API, not an LLM prompt.
4. Call Spoonacular recipe-by-ingredients search from the server and rank candidates by use of expiring ingredients, missing ingredients, dietary constraints if captured, prep time, and available-item coverage.
5. Fetch full recipe instructions/details only for shortlisted recipes, respecting provider limits and caching results where allowed.
6. Build recipe cards and a recipe-detail view with ingredients, servings, steps, times, source attribution, and a clear indication of which pantry items the recipe uses.
7. Derive missing items by comparing recipe ingredients with pantry and staple dictionaries. Allow adding missing ingredients to a simple shopping list (local initially; persist if needed).
8. Add rate limiting, API error handling, short-lived cache, empty results, and user-friendly retry. Never expose Spoonacular credentials in the app.

### Acceptance criteria

- Only items near expiry influence the default suggestion request.
- Recipes show actual provider-backed ingredient/instruction data, not fabricated instructions.
- Missing items are identified consistently and can be added to the list.
- Provider failures and exhausted quota show a fallback state.
- Secrets and provider responses are appropriately logged/redacted.

**Checkpoint:** `feat: integrate Spoonacular recipes for near-expiry ingredients`

## Phase 8 — Waste analytics and data integrity

**Goal:** Show understandable household costs without pretending estimates are exact.

### Metric definitions

- **Confirmed waste cost:** sum of recorded item cost for items confirmed `WASTED` in the selected calendar month, with quantity-adjusted value if partial quantities are supported.
- **Confirmed consumed:** items explicitly marked consumed; separate consumed-before-expiry from consumed-after-expiry if the event timeline supports that distinction.
- **Estimated waste cost:** includes records with estimated rather than purchase-confirmed prices; clearly label as estimated.
- **Assumed consumed:** never silently included as confirmed consumed or waste. Include a reconciliation count and let the user correct records.
- If actual price is missing, either prompt the user for a price or use a configurable category estimate that is clearly identified as an estimate. Never blend unknown prices into a precise-looking total without explanation.

### Tasks

1. Build `/api/v1/analytics/summary?month=YYYY-MM` and monthly series endpoints.
2. Query grouped event data from PostgreSQL instead of calculating business metrics solely from the current inventory list.
3. Use consistent timezone boundaries for month grouping and INR formatting (or household currency).
4. Render monthly waste-cost total, saved/consumed trend, waste trend, and comparison with previous month using `react-native-chart-kit` plus `react-native-svg` only after checking their compatibility with the Expo SDK in use.
5. Add touch/accessible graph labels, loading/empty states, and a no-data state.
6. Add reconciliation counts for recently expired, unresolved items and bulk confirmation actions.
7. Add tests for month boundaries, timezone changes, partial quantities (if supported), zero/missing prices, and status corrections.

### Acceptance criteria

- Chart totals reconcile exactly with underlying events for test fixtures.
- No item is double-counted after status correction or repeated API calls.
- Assumed-consumed items are transparently reported as unconfirmed.
- Unpriced items are clearly called estimates or excluded from confirmed totals.

**Checkpoint:** `feat: build waste-cost analytics and reconciliation`

## Phase 9 — Settings, privacy, reliability, and release preparation

### Tasks

1. Build user settings: notification on/off and time, household timezone, currency display if configurable, account details, sign-out, and account deletion.
2. Document data retention for receipt OCR text/images and recipe cache. Delete data according to the stated policy; avoid keeping receipt images by default.
3. Add a privacy policy that explains email/auth, grocery inventory, receipt image processing, OCR provider, recipe provider, local notifications, and data deletion.
4. Add API request validation, payload limits, rate limiting for OCR/recipes/auth-adjacent endpoints, safe structured errors, and redacted logs.
5. Verify server-side household authorization for every read/write and cross-user access test.
6. Review dependencies for Expo SDK compatibility; add a lockfile; don't upgrade major versions casually mid-project.
7. Add crash/error tracking only if desired, configured without logging receipt text, tokens, or unnecessary personal information.
8. Configure EAS development/preview/production builds; create actual development builds for notification-action tests. Test app icons, splash, permissions copy, and app configuration.
9. Test installation from a clean device, session persistence, migration from app updates, poor network, API failure, provider limits, and database availability.
10. Prepare release notes and record remaining limitations honestly.

### Acceptance criteria

- Data deletion flow is tested end-to-end and respects auth provider constraints.
- No known critical or high-severity security issue remains.
- Core workflows pass on at least one iOS and one Android device/build environment.
- Production configuration contains distinct credentials from development and staging.
- Build/install instructions work from a clean checkout.

**Checkpoint:** `release: FreshTrack MVP candidate`

---

## 4. Core API contract

Prefix all endpoints with `/api/v1`. Use authenticated sessions for user data routes. Validate route params, query params, and bodies at the API boundary. A consistent response shape is recommended, for example `{ data: ... }` for success and `{ error: { code, message, requestId } }` for failures.

### Authentication

Prefer Neon Auth's supported client/API flow for sign-up, OTP verification, session refresh, and sign-out. The Express API should verify identity for its own protected endpoints; do not proxy raw auth secrets or trust a client `userId`. Exact endpoint paths depend on the validated Neon Auth SDK, so do not hardcode an invented OTP route into the plan's implementation.

### Pantry

- `GET /api/v1/pantry`
- `POST /api/v1/pantry`
- `GET /api/v1/pantry/:itemId`
- `PATCH /api/v1/pantry/:itemId`
- `POST /api/v1/pantry/:itemId/consume`
- `POST /api/v1/pantry/:itemId/waste`
- `POST /api/v1/pantry/bulk-import`

### Receipt scanning

- `POST /api/v1/receipts/scan` → authenticate, validate image, run OCR/parser, create review draft.
- `GET /api/v1/receipts/:receiptId` → retrieve the current user's draft/status.
- `POST /api/v1/receipts/:receiptId/import` → validate the user's reviewed items and commit them.
- `DELETE /api/v1/receipts/:receiptId` → discard draft and retained data according to retention policy.

### AI Chef

- `GET /api/v1/chef/expiring`
- `POST /api/v1/chef/suggestions` → near-expiry ingredient IDs/names plus supported preferences.
- `GET /api/v1/chef/recipes/:recipeId` → retrieve/cache detail if required by provider flow.
- `POST /api/v1/shopping-list/items` and `GET /api/v1/shopping-list` if the shopping list is persisted server-side; otherwise keep it local for MVP.

### Analytics/preferences

- `GET /api/v1/analytics/summary?month=YYYY-MM`
- `GET /api/v1/analytics/monthly?months=6`
- `GET /api/v1/analytics/reconciliation`
- `POST /api/v1/analytics/reconciliation/confirm` (bulk resolution)
- `GET /api/v1/preferences`
- `PATCH /api/v1/preferences`
- `DELETE /api/v1/account` (with re-auth/confirmation and auth-provider requirements satisfied)

---

## 5. Business rules that must be documented and tested

1. **Expiry source precedence:** printed package date takes priority; otherwise use an explicit user override; otherwise apply a labeled estimate. Do not present preset durations as authoritative food-safety guidance.
2. **Local date vs timestamp:** use date-only `expiresOn` for a calendar expiry date; schedule notification timestamps according to the configured local timezone and preferred notification time.
3. **Freshness colors:** red if expiry is within 48 hours; yellow if expiry is within seven days but beyond the red threshold; green for later dates. Define expired styling separately and test the exact boundary cases.
4. **Consumed/wasted lifecycle:** every confirmed transition adds one event. Repeated taps/retries must be idempotent.
5. **Rescan matching:** a duplicate candidate is not enough to silently consume an old item. The MVP should confirm replacement/consumption or have a reliable undo flow.
6. **Assumed consumed:** a cleanup heuristic, not proof of consumption. Keep it distinct in database statuses, event history, charts, and copy.
7. **Financial calculations:** store price in a safe numeric representation and retain a price source (`USER_ENTERED`, `RECEIPT_PARSED`, `CATEGORY_ESTIMATE`). Keep estimates visibly separate from known prices.
8. **Household isolation:** every pantry item belongs to a household; every read/write checks the authenticated user is a current household member.
9. **External API boundaries:** Vision and Spoonacular are server-side only; implement timeouts, rate limits, retries only for retryable failures, and safe fallback messages.
10. **Offline state:** local notifications can fire without a network connection, but server data changes need an offline queue and later synchronization. Avoid claiming everything is “offline-first” until conflicts are handled.

---

## 6. Environment variables and secrets

Maintain a `backend/.env.example` with names and dummy values only. Exact variable names can be finalized by the implementation, but expected categories are:

- `DATABASE_URL` — Neon pooled/runtime connection as recommended for the selected Prisma adapter.
- `DIRECT_URL` — non-pooled URL for migrations if required by selected Prisma version/provider setup.
- `NEON_AUTH_URL` — branch-specific auth base URL or the provider configuration required by its official SDK.
- `GOOGLE_CLOUD_PROJECT_ID` and the chosen server-side Google credentials mechanism (prefer workload identity/managed credentials where available; never ship credentials in the app).
- `SPOONACULAR_API_KEY`.
- `API_BASE_URL` — public client value for mobile configuration, not a secret.
- `APP_ENV` / `NODE_ENV`.
- `LOG_LEVEL`.

Never commit actual environment files. Use the Vercel environment settings for deployed secrets. Keep local `.env` files out of Git; rotate any credential accidentally committed.

---

## 7. Agent workflow for Antigravity and Codex

### Before each phase

1. Read `AGENTS.md`, `README.md`, the current phase in this plan, `git status`, and recent commits.
2. Inspect the current implementation and tests before editing files.
3. Work on only one phase/vertical slice at a time.
4. Use the official current docs for external SDK integration. If the docs contradict old code patterns, stop and explain the required decision.
5. Do not install packages, refactor unrelated folders, or redesign reference screens without a reason.

### After each phase

1. Run the app and relevant type/lint/test/build checks.
2. Fix errors introduced by the changes.
3. Report changed files, exact commands/checks run, results, unverified behavior, and remaining work.
4. Update a **Project Status** section in `README.md` and the current phase/decisions in `AGENTS.md`.
5. Review `git diff`; remove debug logs and secrets.
6. Commit the checkpoint before beginning the next phase.

### Handoff prompt for Codex

> Continue the existing FreshTrack repository; do not recreate it. Read `AGENTS.md`, `README.md`, and `FreshTrack_Implementation_Plan.md`, inspect `git status` and recent commits, and determine the first incomplete acceptance criterion in the current phase. Implement only that phase's next small vertical slice. Preserve the existing Expo SDK, designs, API contracts, and Prisma schema unless a documented issue requires a change. Use current official docs for SDK-sensitive integration. Run the applicable tests and checks; report actual results and remaining gaps. Do not start another phase until asked.

### Suggested start prompt for Antigravity

> Read `FreshTrack_Implementation_Plan.md` completely and inspect all files under `design-reference/`. Build Phase 0 only: scaffold the Expo/TypeScript/Expo Router app and a separate TypeScript Express backend, initialize Git-safe configuration, create `AGENTS.md` and `README.md`, and verify that the mobile starter and API health endpoint run. Do not implement any feature phase yet. At the end, report commands and test results, then stop.

After Phase 0 is committed, use a new prompt for Phase 1. Avoid asking the agent to implement the entire plan in one operation.

---

## 8. Testing strategy

### Unit tests

- Expiry threshold calculation at exactly 48 hours, exactly seven days, already expired, leap year, and timezone/day-boundary cases.
- Pantry normalization/fuzzy match suggestions.
- Receipt line parser against saved OCR fixtures with different receipt layouts.
- Cost calculations including fractional quantities and missing/estimated cost.
- Analytics aggregation by calendar month and status history.
- Idempotent consume/waste/reconciliation transitions.

### API/integration tests

- Authenticated vs unauthenticated routes.
- Cross-user and cross-household access denied.
- Pantry create/edit/consume/waste and transactional event creation.
- Bulk receipt import accepts only reviewed records and behaves atomically.
- External provider timeout/429/error responses become safe API errors.
- Analytics totals equal seeded event sums.
- Account deletion and data retention behavior.

### Device/manual tests

- iOS and Android navigation, safe area, keyboard, camera permission, barcode scan, receipt capture, and image upload.
- Notification scheduling, editing, cancellation, action handling, app-killed state, offline action queue, and app restart.
- Poor/no network, expired session, backend cold start, duplicate taps, and API retry.
- Fresh install from a clean checkout and preview/production configuration.

### Release gate

Do not call a feature complete because it compiles. A feature is complete when its acceptance criteria pass, failure states are handled, and the README records any platform-specific limitations.

---

## 9. Known risks and decisions to resolve early

| Risk / open decision | Why it matters | Required response |
|---|---|---|
| Neon Auth OTP + Expo native SDK compatibility | Managed Neon Auth, its supported email OTP flow, and mobile cookie/session storage must work together. | Prove sign-up → six-digit OTP → session persistence in Phase 2 before API authorization depends on it. |
| Barcode catalog is not yet selected | `expo-camera` reads a barcode; it does not itself provide every product name/brand/expiry. | Select a catalog provider or ship manual fallback with a clearly scoped local catalog. |
| Receipt OCR isn't receipt understanding by itself | OCR can extract text, but line item names, prices, and quantities require parsing, and formats vary. | Return editable candidates and never auto-import unreviewed lines. |
| Auto-consuming a previous item on rescan | False fuzzy matches could corrupt inventory and waste analytics. | Confirmation or reliable undo for MVP; add confidence scoring later. |
| Exact lock-screen interaction differs by OS | User actions and long-press UI vary across Android/iOS and releases. | Use supported notification categories/actions and test real builds; provide in-app fallback. |
| Background cleanup is not guaranteed at a precise time | iOS and Android govern background execution. | Reconcile on app startup/resume and API activity; treat background tasks as optional enhancement. |
| Preset expiry durations are estimates | Food shelf life depends on storage and packaging. | Show estimate label, allow edits, prioritize printed use-by dates, and avoid food-safety guarantees. |
| Household sharing scope may expand | Shared ownership complicates authorization/conflict handling. | Model household membership now; defer live collaborative sync to a later version. |
| Third-party API cost/quota | OCR/recipes may be billed or rate-limited. | Check current provider pricing, quotas, and terms before launch; add server-side throttles and caching. |

---

## 10. MVP completion checklist

### Product
- [ ] All supplied screens are implemented faithfully.
- [ ] Four-tab navigation and auth gating work.
- [ ] Manual pantry flow is reliable.
- [ ] OCR and barcode paths end in editable review before import.
- [ ] Expiry alerts can be scheduled, edited, cancelled, and acted on.
- [ ] Consumed, wasted, and assumed-consumed states are distinguishable.
- [ ] AI Chef uses provider-backed recipes and has graceful failure handling.
- [ ] Analytics are traceable to events and label estimates honestly.

### Engineering
- [ ] TypeScript, lint, unit tests, API tests, and available build checks pass.
- [ ] Prisma migrations apply from a clean database.
- [ ] Every user-owned query enforces auth/household ownership.
- [ ] Secrets are server-side and not present in Git/mobile bundle/logs.
- [ ] Request validation, rate limiting, timeouts, safe errors, and retry logic exist.
- [ ] Privacy, retention, and account deletion behavior is documented and tested.
- [ ] Actual device tests cover camera and notification behavior.
- [ ] README and AGENTS.md accurately identify the current implementation state.

---

## 11. Official documentation to consult during implementation

External SDKs change; the coding agent should consult these current references when implementing each phase rather than rely on remembered API signatures.

- Expo Router: https://docs.expo.dev/router/introduction/
- Expo Authentication guidance: https://docs.expo.dev/develop/authentication/
- Expo Camera: https://docs.expo.dev/versions/latest/sdk/camera/
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Neon Managed Better Auth overview: https://neon.com/docs/auth/overview
- Neon Auth migration/current implementation guide: https://neon.tech/docs/guides/neon-auth
- Prisma with Neon: https://docs.prisma.io/docs/orm/v6/overview/databases/neon
- Express on Vercel: https://vercel.com/docs/frameworks/backend/express
- Google Cloud Vision OCR: https://docs.cloud.google.com/vision/docs/ocr
- Spoonacular recipe search by ingredients: https://www.postman.com/spoonacular-api/spoonacular-api/documentation/rqqne3j/spoonacular-api

**Note on the chosen stack:** Vercel supports Express as a function, and Prisma supports Neon Postgres. Treat the exact runtime adapter/pooling configuration as a setup decision for the actual Prisma version you install; use a pooled runtime connection for application requests and the appropriate direct connection for migrations where required. Neon Managed Better Auth is built on Better Auth, but its currently supported SDK/API surface is not automatically identical to a self-hosted Better Auth backend. Verify native Expo OTP as an early proof of concept.
