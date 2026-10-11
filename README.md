# FreshTrack

> **Smart pantry manager — stop wasting food, start saving money.**

FreshTrack is a cross-platform mobile app (iOS + Android) that tracks grocery expiry dates, scans receipts with OCR, recommends recipes for near-expiry ingredients, and shows the financial cost of food waste.

---

## Architecture

```
React Native / Expo app (mobile)
    └── HTTPS API calls only
            ↓
Node.js + Express API (backend/)
    ├── Prisma ORM
    └── Neon PostgreSQL

Third-party APIs (server-side only):
    ├── Google Cloud Vision  — receipt OCR
    └── Spoonacular          — recipe suggestions
```

**Key rule:** The mobile app never connects to the database directly and never holds Google/Spoonacular API keys.

---

## Repository Layout

```
FreshTrack/
├── app/                    # Expo Router file-based routes
│   ├── (tabs)/             # Design dock (Home, Pantry, Scanner, Recipes, Insights)
│   └── _layout.tsx
├── assets/                 # Fonts, icons, splash screen
├── components/             # Reusable UI components (Phase 1+)
├── context/                # React Context providers (Phase 2+)
├── features/               # Feature modules (Phase 1+)
├── lib/                    # Shared utilities: API client, date helpers (Phase 1+)
├── types/                  # Shared TypeScript types (Phase 1+)
├── design-reference/       # All supplied screen designs — read before implementing UI
├── docs/                   # Product specification and implementation plan
├── backend/                # Express TypeScript API
│   ├── src/
│   │   ├── app.ts          # Express app factory
│   │   ├── server.ts       # HTTP server entry-point
│   │   └── routes/health.ts
│   ├── prisma/
│   │   └── schema.prisma   # Placeholder; full schema in Phase 3
│   ├── tests/
│   ├── .env.example        # Required variables with dummy values — copy to .env
│   ├── package.json
│   └── tsconfig.json
├── AGENTS.md               # Agent instructions — READ BEFORE EDITING
├── README.md               # This file
└── .gitignore
```

---

## Prerequisites

| Tool | Required version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Expo CLI | installed globally or use `npx expo` |

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd FreshTrack
```

### 2. Install mobile dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure backend environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your values:
#   DATABASE_URL, DIRECT_URL, NEON_AUTH_URL, GOOGLE_CLOUD_PROJECT_ID,
#   GOOGLE_APPLICATION_CREDENTIALS, SPOONACULAR_API_KEY
```

> ⚠️ **Never commit `backend/.env`** — it is excluded by `.gitignore`.

---

## Running Locally

### Mobile (Expo)

```bash
npm start           # Start Expo dev server (Metro)
npm run ios         # Open iOS Simulator
npm run android     # Open Android Emulator
```

> Requires a connected device or simulator. After adding native modules, run `npx expo run:ios` or `npx expo run:android` for a development build.

### Backend API

```bash
cd backend
npm run dev         # Start API server with ts-node-dev (hot reload)
# Server starts on http://localhost:3001
# Health check: http://localhost:3001/api/v1/health
```

---

## Scripts

### Root (mobile)

| Script | Command | Description |
|---|---|---|
| `npm start` | `expo start` | Start Expo dev server |
| `npm run ios` | `expo start --ios` | iOS simulator |
| `npm run android` | `expo start --android` | Android emulator |
| `npm run web` | `expo start --web` | Web |
| `npx tsc --noEmit` | — | TypeScript type check |
| `npx expo-doctor` | — | Diagnose dependency issues |
| `npx expo install --fix` | — | Fix incompatible package versions |

### Backend (`cd backend` first)

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `ts-node-dev` | Start with hot reload |
| `npm run build` | `tsc` | Compile to `dist/` |
| `npm start` | `node dist/server.js` | Run compiled build |
| `npm run typecheck` | `tsc --noEmit` | TypeScript type check |
| `npm test` | `jest` | Run all tests |
| `npm run db:migrate` | `prisma migrate dev` | Apply migrations (dev) |
| `npm run db:migrate:deploy` | `prisma migrate deploy` | Apply migrations (prod) |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run db:seed` | `ts-node prisma/seed.ts` | Seed development data |

---

## Environment Variables

All secrets live in `backend/.env`. See [`backend/.env.example`](backend/.env.example) for the full list.

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Neon pooled connection (Prisma runtime) |
| `DIRECT_URL` | backend | Neon direct connection (Prisma migrations) |
| `NEON_AUTH_URL` | backend | Neon Auth base URL |
| `GOOGLE_CLOUD_PROJECT_ID` | backend | GCP project for Vision API |
| `GOOGLE_APPLICATION_CREDENTIALS` | backend | Path to service-account JSON (local dev only) |
| `SPOONACULAR_API_KEY` | backend | Spoonacular recipe API |
| `PORT` | backend | API listen port (default: 3001) |
| `NODE_ENV` | backend | `development` / `production` |
| `ALLOWED_ORIGINS` | backend | Comma-separated CORS origins |

**Mobile:** Only `EXPO_PUBLIC_API_BASE_URL` (the backend URL) is needed in the app. No secrets.

---

## Development Phases

| Phase | Goal | Status |
|---|---|---|
| **0** | Scaffold, configure, health endpoint | ✅ **Complete** |
| 1 | Implement supplied designs and navigation | 🟡 In progress — Pantry add/detail/edit, Recipes and Insights prototypes implemented |
| 2 | Validate Neon Auth + Expo OTP flow | ⬜ Not started |
| 3 | Prisma schema, migrations, API foundation | ⬜ Not started |
| 4 | Pantry CRUD end-to-end | ⬜ Not started |
| 5 | Local expiry notifications + reconciliation | ⬜ Not started |
| 6 | Barcode scan + receipt OCR | ⬜ Not started |
| 7 | AI Chef (Spoonacular integration) | ⬜ Not started |
| 8 | Waste analytics and data integrity | ⬜ Not started |
| 9 | Settings, privacy, release preparation | ⬜ Not started |

---

## Project Status

**Current phase: Phase 1 — IN PROGRESS**
Latest inspected checkpoint: `d349d24` (`wip: save FreshTrack progress`); working tree was clean before this receipt slice.

The implementation plan is currently stored at
[`docs/FreshTrack_Implementation_Plan (1).md`](<docs/FreshTrack_Implementation_Plan (1).md>).

### Phase 1 audit and current slice (10 October 2026)

All **11 supplied screen images** and their HTML/design tokens were inspected. The complete
[screen and state inventory](docs/Phase_1_Screen_Inventory.md) maps every supplied design to a route
and documents missing states and visual differences. The Recipe references are duplicates; the
financial and sustainability Analytics references are distinct and both are included.

Already implemented at the inspected `62ddb1d` checkpoint: design tokens, Plus Jakarta Sans,
reusable controls, welcome/sign-up/login, six-digit mock OTP, Home, searchable/filterable/sortable
Pantry and simulated receipt/barcode previews. The existing uncommitted Pantry detail/edit work
was preserved: validated `/pantry/[id]`, shared in-memory inventory, missing-item state and
cancellable Used/Wasted confirmations. Auth and Scanner remain partial prototypes.

Completed in this continuation:

- `/(tabs)/recipes`: supplied Recipe layout and local reference artwork, urgent-ingredient chips,
  search, Quick/High Match/Saved filters, save toggle, featured and compact cards, See All, and
  sample ingredient matching in AI Fridge Chef. Loading, retry/error and no-results states exist.
- `/recipe/[id]`: available/missing ingredients from stable pantry IDs, instructions, save,
  missing-ID state and explicit full-entry cooking confirmation. Confirming changes shared
  pantry status once; cancellation preserves inventory.
- `/recipe/shopping-list`: deduplicated missing ingredients, purchased checkboxes, clear purchased
  and an empty state. Recipe/shopping state persists across navigation and resets on reload.
- `/(tabs)/insights`: supplied sustainability view, This Month/Weekly/All Time mock summaries,
  selectable efficiency chart, Kitchen Hero progress, saved categories/detail sheet and habit actions.
- `/analytics/financial`: nested financial design with monetary month comparison, weekly chart,
  category breakdown, hero rescues, report preview and expired-item reconciliation. June chart,
  achievement/carbon/category figures are explicitly labeled sample snapshots.
- `/settings`: theme-consistent supporting digest/reminder-window preferences with inline time
  validation and in-memory save. No separate Settings design was supplied.
- Home Recipe/Cook links and profile/preferences links resolve. All supplied docks explicitly show
  Home, Pantry, Scanner, Recipes and Insights, so the existing Home is preserved under the user's
  navigation exception. Recipes contains AI Chef; Insights contains Analytics. No duplicate dashboard.
- New typed fixtures live in `lib/mock.ts`; shared recipe/preferences contexts and pure
  `lib/recipes.ts`/`lib/analytics.ts` selectors avoid independent screen mock records.
  Receipt fixtures are centralized in `lib/receipt.ts`; packaged barcode fixtures now live in `lib/barcode.ts`.

Browser checks verified Recipe navigation, save, deduplicated shopping additions, purchased clearing,
cook cancellation/confirmation, two-item shared Pantry removal and Insights session value ($92.98),
Weekly summary/chart selection, category sheet, report preview, financial May comparison ($56/$4),
preferences invalid-time rejection and valid session save, recipe error/retry/no-results and mock
AI Chef matching. Editing a strawberry expiry into the past exposed financial reconciliation;
confirming Waste cleared its queue and changed wasted value from $12.40 to $16.69. Recipe and Insights top sections were visually checked at 375 × 812 web viewport.
Report download was verified from the saved text file: Weekly, $32.98 rescued value and 5.8 kg
matched the selected period. The browser event waiter timed out; filesystem verification succeeded.
Native sharing remains pending. Preview states can be
opened with `/recipes?preview=error`, `/recipes?preview=empty` and corresponding `/insights` URLs.
These are mock state controls, not network requests.

### Checks run on 10 October 2026

| Command | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed, 0 errors |
| Backend `npx tsc --noEmit` | Passed, 0 errors |
| `node --experimental-strip-types --test tests/*.test.mjs` | Passed, 12/12 tests; benign Node module-type warning |
| Backend `npm test -- --runInBand` | Passed, 1/1 health test; localhost permission required |
| `npx expo install --check` | Exit 0, dependencies up to date using offline SDK map; offline reliability warning |
| `npx --yes expo-doctor` | Passed, 21/21 checks; temporary CLI download, no project dependency changes |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-phase1-final` | Passed for all three platforms; native device behavior is not verified by exports |
| Backend `npm run lint` | Pre-existing failure: exit 127, `eslint: command not found` |
| Mobile lint | No lint script/configuration or ESLint dependency is present |
| `git diff --check` | Passed |

`npx --no-install expo-doctor` initially failed due to sandbox DNS, then reported the tool absent
when retried with network access. The temporary `npx --yes` invocation above completed successfully.
Node >=22.6 is required for the test command's TypeScript stripping. No Expo SDK/configuration,
backend integration or dependency was changed. Native simulator/device and dynamic-text checks
remain pending. The edits are uncommitted while Phase 1 remains incomplete.

### Pantry add checkpoint — 11 October 2026

- Added `/pantry/add` with name, category, quantity/unit, expiry date and optional whole-entry
  purchase value. It reuses keyboard-aware/safe-area forms and existing theme tokens; no separate
  add-screen image was supplied. Category options are centralized in `lib/pantry.ts`.
- Shared inventory insertion validates fields before mutation, generates distinct session IDs and
  ignores repeated IDs. A successful form cannot submit twice. Manual dates retain `USER_ENTERED`
  provenance and manual records have `source: MANUAL`. Past dates remain usable for reconciliation.
- Unknown purchase values count as $0 with an explicit note in details. This is a Phase 1 convention,
  not a production price estimate. Pantry cards now use the reference's dollar symbol consistently
  with the add form and Home, without converting or changing existing values.
- Added entry points from Pantry, its actual-empty/search-empty states and Scanner. Save shows a
  confirmation with View Pantry/View Item Details. Returning to Pantry after insertion clears
  restrictive search/freshness filters. Cancel returns to the source without adding anything.
  Home reflects new entries and identifies their manual origin/date.
- Browser checks passed: blank name, zero quantity, invalid calendar date and negative price rejection;
  fractional comma-decimal quantity saved as 0.5; new $4.50 item appeared in Pantry/details/Home;
  cancellation preserved inventory and search; Scanner fallback navigation/cancellation/insertion;
  adding from a genuinely empty Pantry; Frozen category and unknown-value detail note. Form visually
  checked at 375 × 812. Native keyboard/device interaction remains pending.
- Commands: root and backend `npx tsc --noEmit` passed; `node --experimental-strip-types --test tests/*.test.mjs`
  passed **16/16** (four new insertion/validation tests; benign module-type warning);
  `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-pantry-add-final`
  passed all three platforms; `git diff --check` passed. Dependency/configuration unchanged. Existing
  lint limitations from the previous checkpoint remain; lint/Expo Doctor were not rerun this slice.

### Pantry swipe checkpoint — 11 October 2026

- Pantry cards now use the installed Gesture Handler/Reanimated swipe component: right reveals
  green Used, left reveals rose Wasted. Completing a swipe closes the row and opens the existing
  cancellable confirmation; inventory changes only after confirmation. Accessible buttons remain.
- Added the native gesture root and a Pantry direction hint. Gesture-aware presses prevent a drag
  from opening item details; a new press resets drag suppression so short swipes cannot leave taps disabled.
  No dependency, backend, fixture or persistence changes were needed.
- Chrome at 375 × 812 verified both directions, cancellation, short-swipe cancellation, subsequent
  detail taps, accessible button fallback, and confirmed Used/Wasted removal (8 → 7 → 6 items).
  Vertical mouse drag did not navigate or open a status sheet after the press fix. Native touch,
  diagonal gestures, list scroll competition and screen-reader behavior still need device verification.
- Root/backend `npx tsc --noEmit` passed; `node --experimental-strip-types --test tests/*.test.mjs`
  passed 16/16 (existing module-type warnings). Web/iOS/Android Expo export passed using
  `/private/tmp/freshtrack-pantry-swipes-final`; `git diff --check` passed. Mobile has no lint script;
  backend ESLint remains absent. No SDK or dependency changes; Expo Doctor was not rerun.
- Home Recent Additions uses a different card and remains a separate gesture task. Phase 1 remains
  in progress; the next slice is Scanner editable receipt review and confirmed mock insertion.

### Receipt review checkpoint — 11 October 2026

- Preserved Scanner route/mode selection and barcode preview. Replaced receipt alert-only success
  with scan/loading → editable review → final confirmation → shared atomic insertion → View Pantry.
  Added safe-area/keyboard-aware handling and capped content width. No dependencies or integrations.
- Central typed `lib/receipt.ts` fixtures reproduce the four visible reference groceries ($16.16).
  Reference decorative eight-item/$28.16 totals disagree with those rows; displayed totals are derived.
  Review supports include/exclude, category/name/quantity/unit/whole-entry value/date edits, cancelled
  edits, Add Missing into the pending haul, explicit Skip/Add separately duplicate choices and rescan.
  Name matching is conservative (case/punctuation-normalized), not a fuzzy catalog lookup.
- Estimated dates stay estimates; changed/new dates are user entered. Receipt origin is retained,
  unknown values count as $0. Existing purchases are never merged/consumed. Import validates every row,
  blocks partial/replayed batches and disables resubmission after success. Receipt timers clean up on unmount.
- Browser verified duplicate gate, zero-quantity rejection/cancel, edited 0.5 gallon/$2.50/date,
  exclusion plus duplicate skip, confirmation back/review and two-item insertion (8 → 10 Pantry items);
  separate-purchase four-item success, mock error/empty/retry and Add Missing pending row.
  Review layout checked at 375 × 812; native keyboard/accessibility/device QA remains pending.
- `npx tsc --noEmit` root/backend passed; `node --experimental-strip-types --test tests/*.test.mjs`
  passed 20/20 (four receipt tests, existing module-type warning). Initial test runner import-resolution
  issue and float assertion were fixed. `npm test` in backend passed 1/1 after sandbox local-listen EPERM
  required an approved rerun. Root `npm run lint` fails (no script); backend lint fails (ESLint absent),
  both pre-existing. Web/iOS/Android export passed using `/private/tmp/freshtrack-receipt-review-final`;
  `git diff --check` passed. Expo Doctor was not rerun; SDK/dependencies unchanged.
- Preview failures: open `/scanner?preview=error` or `?preview=empty`, choose Receipt, then simulate.
  Retry uses the successful sample. Changing mode discards pending receipt review. No camera permission,
  OCR, receipt upload, alerts or persistence is connected. Viewfinder and emoji thumbnails remain
  approximations; the reference's overlay/photographic assets and final side-by-side native QA are pending.

### Barcode/package queue checkpoint — 11 October 2026

- Inspected `d349d24`, the existing uncommitted receipt slice and packaged-item reference; preserved
  receipt/manual/Pantry behavior. Replaced barcode alert-only success with an actual pending queue.
- Central typed `lib/barcode.ts` contains synthetic catalog codes for the three visible packaged
  products: Chobani Greek Yogurt, Kettle Sea Salt Chips and Sourdough Crackers. Review shows queue
  progress, stamp target, manual date, simulated stamp/estimate options and remaining queue controls.
  No real OCR/camera/catalog, new dependency, SDK/configuration change or backend implementation.
- Confirm Date & Next validates fields and records review without inserting. Auto-Estimate Pending
  applies only to unconfirmed rows and retains already-confirmed package/manual dates. Items can be
  revisited, removed or skipped; final confirmation atomically inserts separate purchases into shared
  inventory. Estimated/user-entered/simulated-package provenance, barcode identity, quantity and
  whole-entry purchase value are preserved. Unknown prices count as $0; past dates remain allowed.
  Home labels new receipt/barcode additions by source instead of deriving an age from expiry.
- Duplicate checks compare active names and synthetic barcode identity (including renamed Pantry
  purchases), plus earlier queue entries. Explicit Skip/Add separately is required; no merge/consume.
  Replayed batches and repeated submit are blocked. Mode change discards pending queue and cleans
  scan timers; navigating to the existing manual form and cancelling preserves pending queue.
- Browser verified missing/invalid date rejection, simulated stamp, manual date/0.5 quantity/$2 edit,
  three-item queue, duplicate gate/separate choice, pending-only estimates, confirmation back and
  insertion (8 → 11 Pantry items, $51.01 tracked). Existing chips purchase stayed intact.
  Error/retry, malformed digits, unknown lookup, manual fallback/cancel, queue removal and mode reset
  also checked. Home showed the new purchase with Added from barcode. Phone form inspected at 375 × 812; native keyboard/touch/accessibility remain unverified.
- Preview failures: `/scanner?preview=barcode-error` or `barcode-missing`, choose Barcode and simulate;
  Retry attempts the sample catalog. An unknown valid-digit code always returns Product not found.
- Root/backend `npx tsc --noEmit` passed; `node --experimental-strip-types --test tests/*.test.mjs`
  passed 25/25 (five new barcode tests, existing module-type warning); backend `npm test` passed 1/1
  with approved local test-port access. Final web/iOS/Android export passed using
  `/private/tmp/freshtrack-barcode-review-complete`; `git diff --check` passed. Root lint script is absent;
  backend lint fails because ESLint is absent. Expo Doctor not rerun; dependencies unchanged.
- Fixed an empty-string conditional detected by browser development warnings. Reference photography,
  camera overlay/glass, exact sheet layout and real device QA remain pending. Reference auto-saved
  produce/date/confidence decorations are not represented as actions that actually happened.

### Scanner permission checkpoint — 11 October 2026

- Preserved the uncommitted receipt/barcode slices, routes, review queues and configuration.
  Added shared `features/scanner/CameraPermissionGate.tsx` and typed copy/state fixtures in
  `lib/scannerPermission.ts`; only the existing Scanner screen is wired to them.
- Choosing a scan mode initially shows the demo permission explanation with Allow/Deny responses.
  Denial blocks receipt/barcode controls and offers retry or the existing manual form. Blocked access
  offers local Demo Camera Settings with a checkbox, save and cancel. Keeping access off remains
  blocked; saving demo access on returns to scanning. No OS settings, permission API or camera is used.
- Demo permission state is shared across receipt/barcode modes while Scanner is mounted; reload
  resets it. Review components mount only after demo access is allowed. Manual entry remains available.
  No separate permission design was supplied; supporting cards use the existing tokens/components.
- Browser verified initial request/deny, hidden receipt controls while denied, manual entry/cancel
  returning to denial, retry/allow and receipt scan, allowed state across barcode mode, hidden barcode
  controls while blocked, checkbox/cancel, save-off remaining blocked and save-on enabling barcode
  scan. Blocked/recovery layouts checked at 375 × 812. Native accessibility/device QA remains pending.
- Preview routes: `/scanner?permission=denied`, `blocked` or `granted` initialize the relevant mock
  state on fresh page load; unknown values use the initial prompt. Choose Receipt or Barcode afterward.
  Existing scan failure previews still work after Allow Demo Access, or append `&permission=granted`.
  No actual camera authorization is implied by the preview or demo controls.
- Root/backend `npx tsc --noEmit` passed; `node --experimental-strip-types --test tests/*.test.mjs`
  passed 25/25 (existing module-type warnings); backend `npm test` passed 1/1 with approved local port
  access. `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-scanner-permission`
  passed all three platforms; `git diff --check` passed. Root `npm run lint` fails (no script), backend
  `npm run lint` fails (ESLint absent), both pre-existing. Expo Doctor not rerun; no SDK/dependency changes.
- Phase 1 remains in progress: Home gestures, Pantry batch/category/currency, mock auth/OTP and
  further Settings/privacy coverage, complete design review and real device validation remain.

### Home Recent Additions swipe slice — 11 October 2026

- Extracted the existing compact cards into `components/RecentPantryItemCard.tsx`, preserving
  source labels, price, expiry and freshness bar. Right swipe requests Used; left swipe requests
  Wasted. Both close the row and open the existing cancellable `PantryConfirmation` sheet.
  Shared inventory changes only after confirmation. No dependencies or integrations added.
- Added named Used/Wasted fallback buttons with 44-point minimum height and an empty-state
  Add entry. These supporting controls extend the reference card; final native visual review remains.
  The former inactive Swipe link is now an explanatory label.
- Browser verified at 375 × 812: short swipe/no confirmation then details tap, right/left confirmation,
  cancellation/repeated swipe, confirmed Used/Wasted, keyboard Wasted fallback, Used button,
  vertical drag without navigation, and shared Home/Pantry inventory changing from 8 to 6 items.
  Resolving all remaining mock items showed the empty card; Add opened `/pantry/add`.
  Native touch, diagonal scrolling, screen-reader and dynamic-text checks remain pending.
- Root/backend `npx tsc --noEmit` passed; `node --experimental-strip-types --test tests/*.test.mjs`
  passed 25/25 (existing module-type warnings); backend `npm test` passed 1/1.
  `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-home-swipes`
  passed all platforms and 28 static routes. `git diff --check` passed.
  Root `npm run lint` fails (missing script); backend `npm run lint` fails (ESLint absent), both
  pre-existing. Expo Doctor was not rerun because SDK/dependencies are unchanged.
- Browser preview: attempted port 8081 was occupied; used a separate offline Expo preview on 8082.
  Existing static digest/recipe summary counts and scanned-age labels still need the documented
  data/visual review; resolving items does not make these decorative snapshots dynamic.

### Auth and Settings prototype slice — 11 October 2026

- Preserved the supplied sign-up/login forms. Added inline name/email/password validation,
  loading/duplicate-submit guards and a shared cancellable delay hook (cleared on unmount).
  Email status decoration now requires a valid address. Passwords are not stored in a context,
  route or fixture; any syntactically valid demo login opens the app, without verifying identity.
- Central typed demo profile, OTP configuration and validation live in `lib/auth.ts`.
  OTP accepts only the public sample code `123456`, expires after two minutes, supports full-code
  paste into any digit, and has incomplete/invalid/expired/simulated failure/retry states.
  Resend clears digits, renews expiry and imposes a 30-second timestamp-based cooldown.
  Its clock interval and pending local requests clean up on unmount. Native autofill hints are set;
  real OS autofill, keyboard and screen-reader behavior remain unverified.
- Added `/(auth)/recover` email-recovery preview with validation/loading/failure/retry and return
  navigation. No email or password change occurs. Google/Apple/biometric buttons now give inline
  email-fallback feedback rather than silently doing nothing; those providers remain unintegrated.
  Auth Terms/Privacy links open clearly labeled prototype information, not a published legal policy.
- Settings now includes `/settings/profile` validated save/cancel, `/settings/privacy` demo data
  information, shared remember-device preference and cancellable Sign Out of Demo/Leave action.
  Profile and sign-up digest choices share the existing in-memory preferences context. Demo exit
  returns to welcome, disables remember-device and retains kitchen data until reload; there is
  no real session, route protection or persistence. No separate Settings/recovery/OTP design exists.
- Browser verified at 375 × 812: sign-up validation/failure/retry/profile-to-OTP propagation;
  incomplete/incorrect code, paste into first/third digit, success; expired code/resend/cleared
  digits/cooldown; verification and resend failure/retry; login validation/password reveal/failure/
  retry; all three provider feedback controls; Forgot Password validation/success/back and failure/
  retry; profile save/unsaved cancel/shared Settings display, privacy/Done, preference validation/
  save, and demo-exit cancel/confirm. OTP and privacy layouts visually inspected at phone width.
- Root/backend `npx tsc --noEmit` pass; `node --experimental-strip-types --test tests/*.test.mjs`
  passes 28/28, including three new validation/OTP boundary/paste tests (existing module-type warnings).
  Backend `npm test` passes 1/1. `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-auth-settings`
  passes all three platforms and 32 static routes. `git diff --check` passes.
  Root `npm run lint` fails (missing script); backend `npm run lint` fails (ESLint absent), pre-existing.
  Expo Doctor not rerun; no SDK/dependency changes. Native runtime interaction is not implied by exports.

### Remaining Phase 1 work

- Pantry batch/category controls, currency normalization and final phone/dynamic-text design review.
- Scanner final native/visual review. Mock permission request/denial/retry/blocked recovery and receipt/barcode
  review/queue/duplicate choices/confirmed insertion/error/fallback are implemented.
  The standalone manual-entry fallback is now available.
- Native auth OTP autofill/backspace/keyboard/accessibility and timer lifecycle checks; final auth
  visual review. Profile/privacy prototype UI exists; account-deletion/currency UI scope remains
  unresolved without separate designs. Production legal policies/account operations are deferred.
- Final native verification of new Recipe/Insights/detail/shopping/preferences/reconciliation flows,
  native sharing checks and complete side-by-side visual review. Gradients/glass blur remain surface
  approximations; pantry thumbnails still use emoji; See All's stir-fry reuses supplied pasta artwork.
- Reference audit totals disagree; preserved snapshots and session-only value deltas are documented
  in the inventory. Food mass/carbon values remain illustrative rather than production calculations.

**Exact next step:** Add Pantry category filtering from the existing typed categories, composing with
search/freshness filters and preserving the supplied Pantry layout; verify no-match/reset behavior.
Phase 1 remains in progress and must be reviewed before Phase 2; real integrations require approval.

### Phase 0 results

| Check | Result |
|---|---|
| Mobile `tsc --noEmit` | ✅ 0 errors |
| Backend `tsc --noEmit` | ✅ 0 errors |
| Backend health test (`jest`) | ✅ 1/1 passed |
| `GET /api/v1/health` returns `{ data: { status: "ok" } }` | ✅ Verified by test |
| No secrets in repository | ✅ `.env` excluded by `.gitignore` |
| `.env.example` present with all variable names | ✅ |
| Mobile starter runs (simulator/device) | ⚠️ Not confirmed — requires manual `npm start` with a simulator |

### Issues fixed in Phase 0

- **Pre-existing type error** in `components/ExternalLink.tsx` (Expo SDK 57 template): `href` prop was typed as `string` but passed to `Link` which requires `Href`. Fixed by casting to `ComponentProps<typeof Link>['href']`.
- **tsconfig scope**: root `tsconfig.json` was picking up `backend/tests/*.ts`. Fixed by adding `"exclude": ["backend"]`.

### Outstanding native validation

Run `npm start` and validate the current prototype on an iOS simulator/device and Android emulator/device.
Create a reviewed Phase 1 checkpoint when its acceptance criteria are complete.

---

## Design References

Screen designs are in [`design-reference/`](design-reference/). **Read all images before implementing any UI.**

| Screen | Reference |
|---|---|
| Welcome / landing | `freshtrack_welcome_get_started_centered_hero/screen.png` |
| Sign-up | `freshtrack_account_sign_up_login/screen.png` |
| Log in | `freshtrack_account_log_in/screen.png` |
| Home dashboard | `freshtrack_dynamic_hub/screen.png` |
| Pantry / inventory | `kitchen_inventory_swipe_actions/screen.png` |
| Scanner — expiry verification | `packaged_item_expiry_verification/screen.png` |
| Scanner — receipt OCR | `receipt_ocr_scanner/screen.png` |
| AI Chef / Recipes | `recipe/screen.png` |
| Financial Analytics | `financial_eco_analytics/screen.png` |
| Recipe (additional duplicate reference) | `stitch_freshtrack_smart_kitchen_inventory/freshtrack_smart_recipes_meal_inspiration/screen.png` |
| Sustainability Insights | `stitch_freshtrack_smart_kitchen_inventory/freshtrack_insights_sustainability_analytics/screen.png` |
| Design tokens | `freshtrack_design_system/DESIGN.md` |

---

## API Contract (planned)

All endpoints are prefixed with `/api/v1`. Success: `{ data: ... }`. Error: `{ error: { code, message, requestId } }`.

### Available now

- `GET /api/v1/health` — service health check (no auth)

### Planned (Phase 3+)

- `GET/POST/PATCH /api/v1/pantry`
- `POST /api/v1/pantry/:id/consume`
- `POST /api/v1/pantry/:id/waste`
- `POST /api/v1/receipts/scan`
- `GET/POST /api/v1/chef/expiring`
- `POST /api/v1/chef/suggestions`
- `GET /api/v1/analytics/summary`

See [the implementation plan § 4](<docs/FreshTrack_Implementation_Plan (1).md>) for the full contract.

---

## Security Notes

- No API keys, database URLs, or credentials belong in mobile source code or `EXPO_PUBLIC_*` variables.
- Store all secrets in Vercel environment config (production) or `backend/.env` (local dev).
- `backend/.env` is excluded by `.gitignore` — confirm with `git status` before every commit.
- If a secret is accidentally committed, rotate it immediately.

---

## License

[See LICENSE](LICENSE)
