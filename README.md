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
│   │   └── schema.prisma   # Initial migration applied to development
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
| Node.js | 24.x (backend and Vercel runtime) |
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
| `npm run db:migrate` | Guarded Prisma deploy | Apply reviewed development migrations; requires explicit opt-in |
| `npm run db:migrate:deploy` | `prisma migrate deploy` | Apply migrations (prod) |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run db:seed` | Guarded Node seed | Synthetic development fixtures; requires explicit opt-in |
| `npm run db:status` | Guarded Prisma status | Check development migration history |
| `npm run db:check` | Build + readiness CLI | Verify direct/pooled database readiness |
| `npm run test:database` | Node tests | Development target/seed guards |

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
| 2 | Validate Neon Auth + Expo OTP flow | ✅ Development gate complete; Android/live release verification deferred |
| 3 | Prisma schema, migrations, API foundation | ✅ Development acceptance complete; production checks deferred |
| 4 | Pantry CRUD end-to-end | 🟡 Batch/undo work paused; prior add/edit/Used/Wasted verified |
| 5 | Local expiry notifications + reconciliation | ⬜ Not started |
| 6 | Barcode scan + receipt OCR | ⬜ Not started |
| 7 | AI Chef (Spoonacular integration) | ⬜ Not started |
| 8 | Waste analytics and data integrity | ⬜ Not started |
| 9 | Settings, privacy, release preparation | ⬜ Not started |

---

## Project Status

**Work is paused at the user's request to shut down the Mac (12 October 2026).** Batch/undo changes
are saved but not deployed. Local checks pass; live Neon verification and synthetic-test cleanup are
pending after a connection failure. Read the [paused handoff](docs/Phase_4_Batch_Undo_Paused.md)
before resuming. Existing deployed editing/Used/Wasted functionality remains unchanged.

**Phase 4 is in progress: persisted Pantry add/list/edit and confirmed Used/Wasted are deployed to development.**
Demo mode is preserved. User reports iPhone add/details/restart/refresh/sorting checks pass;
user also reports edit/restart and Used/Wasted cancellation/confirmation/restart pass.
Remaining Pantry work follows.
See [first-slice implementation, checks and limits](docs/Phase_4_Pantry_First_Slice.md).

Phase 3 development acceptance is complete: data model, migrations, household access, API foundation and hosted Preview.
Phase 2 development acceptance is complete. The user selected INR (integer paise) and Asia/Kolkata.
The initial migration is applied to verified Neon development. Explicit authenticated setup now
atomically creates one household/membership/preferences; reads are scoped to verified membership.
The signed-in Pantry now calls household setup; other kitchen tabs/preferences still use mock data. Shared response types,
bounded pagination and exact money/quantity/date/expiry/status helpers are ready. Item 5’s
Preview is deployed to Vercel and publicly reachable after the user-approved hosting change.
Neon authentication still protects account/household routes. Hosted signed identity passes the
user's iPhone check. The authenticated hosted database read also passes with the expected
no-household result. Phase 3 final review is complete; Phase 4's first slice now uses persisted Pantry data.
Remaining Phase 1 QA, Android native tests and live production/signing checks are deferred by the user.
Previous checkpoint: `2b04009` contains the earlier Phase 2 work. The final review is saved under
`feat: validate native authentication and protected route flow`; see Git log for the checkpoint hash.

The implementation plan is currently stored at
[`docs/FreshTrack_Implementation_Plan (1).md`](<docs/FreshTrack_Implementation_Plan (1).md>).

### Phase 4 editing and outcomes (12 October 2026)

Connected real detail editing and right-Used/left-Wasted swipes plus confirmation buttons. Version
checks protect newer data; edits/outcomes and their history events commit together. Cancel sends no
request, repeated outcomes add no duplicate event, and failures show retry feedback. Demo is preserved.
Root77/77, backend35/35, live Pantry7/7 with cleanup, health1/1, both TypeScript/build, Doctor21/21 and
all-platform exports pass. New development Preview is READY; health200/tokenless mutations401 pass.
Existing lint gap remains. No schema/migration/dependency change. User reports iPhone edit/restart
and Used/Wasted cancellation/confirmation/restart pass. Native failure paths/Android remain unverified.
See [commands, evidence and limits](docs/Phase_4_Pantry_Mutations.md). Next: remaining Phase 4 inventory
slices (batch/undo, presets, server-wide filters, duplicates/offline work), then final review. No Phase 5.

### Phase 4 first slice (12 October 2026)

Preserved the existing Pantry designs and demo interactions. Signed-in native Pantry uses real
household list/create/detail endpoints, refresh/loading/error/empty/load-more states, exact INR cost
and Kolkata expiry. Item creation and its event commit together; unchanged form retries reuse the
same server key to prevent duplicate saves. Real editing and Used/Wasted are not connected yet.
Search/filter/alternate sort apply to loaded pages; the banner labels this limitation.

Both TypeScript/build checks, root76/76, backend33/33, live Pantry3/3 with fixture cleanup, health1/1,
Doctor21/21 and web/iOS/Android exports pass. The new Vercel Preview is READY; public health200 and
tokenless Pantry401 pass. Existing lint gaps remain. User reports iPhone write/details/restart/refresh,
expiry sorting and unknown-price checks pass. Android/native failure-path tests remain unverified.
Editing and confirmed lifecycle actions are now implemented in the next slice above.
No new dependency/schema/migration or Phase 5 work. Exact commands/limits are in the first-slice report.

### Phase 3 final review (12 October 2026)

Development acceptance criteria pass. Both TypeScript checks/build, root tests 73/73, backend tests
29/29, health 1/1, guards 4/4, live database 14/14, live household 5/5 with cleanup, seed replay 1/1,
migration status/readiness, Prisma validation and Expo Doctor 21/21 pass. Public Preview health returns
200; tokenless/invalid-token requests return 401 and untrusted browser origins return 403.
User verified hosted identity and read-only database access on iPhone. Prior all-platform export passes.

Only review/status documents changed in the final slice. Backend lint retains its existing exit 127
(ESLint absent); mobile has no lint script. Hosted household writes/two-account tests, Android,
production/signing checks and the earlier Phase 1 QA remain unverified/deferred. The kitchen remains
mock; no Pantry persistence or later integration is implemented. See the
[final acceptance report](docs/Phase_3_Final_Review.md) for exact commands, evidence and limits.

Next, after user approval: Phase 4 household setup and real Pantry list/manual-add, with transactional
CREATED events, persisted INR/Asia/Kolkata values and account-isolation checks.

### Phase 3 item 5 — Preview deployment (11 October 2026)

Linked `dragon-2818/freshtrack-api` after user-approved Vercel login, securely configured Preview-only
Neon development variables, and deployed the existing backend. Added an exported Express entry,
Node 24.x/build settings, source-only upload exclusions and strict Preview environment guard.
Moved canonical shared declarations inside backend with a mobile type-only re-export, so backend
uploads compile independently. No dependency version, Prisma schema/migration or mobile UI change.

[Preview build](https://vercel.com/dragon-2818/freshtrack-api/FuadUxp8mfkBc2N3EbK1qdmNHj2V)
is READY. Through authenticated Vercel CLI, health returns 200 and household access without a Neon
token returns 401. After user-approved removal of Vercel Authentication, public health returns 200;
tokenless identity/household and invalid-token identity requests return 401. Ignored mobile `.env.local`
points to the HTTPS Preview; both TypeScript checks pass again. User confirmed Settings → Check
Backend Identity passes on iPhone against the hosted API. The read-only database probe also passes
by user report with “No household is set up for this account yet”; no application records were created.
GitHub auto-link failed;
CLI deployment works. The first production-labelled attempt failed safely; no working production
API or production DB/auth change. A Preview retry needed explicit NODE_ENV before the final success.

Both TypeScript checks/build and local preview build pass; backend 29/29, final deployment 4/4,
root 70/70, health 1/1 and guards 4/4 pass. Existing ESLint gap remains. Runtime audit reports zero;
cloud full audit reports 36 development-tool findings. See [configuration, commands and limits](docs/Phase_3_Deployment.md).
Development-only Settings → Check Backend Database is now ready: it verifies backend identity and
reads the authenticated household endpoint without creating records. A specific no-household result
also confirms a successful database query. The user confirmed this no-household result on iPhone.
Hosted household creation/populated reads are not verified by this probe.
Both TypeScript checks and root tests 73/73 pass; backend health 1/1 passes after the sandbox listener
restriction was lifted. Backend lint remains unavailable (ESLint absent); mobile has no lint script.
Expo all-platform export passes for web, iOS and Android; this is not native database verification.
Item 6 final acceptance review is now complete; see the report above. Phase 4 has not started.

### Phase 3 item 4 — API contracts and helpers (11 October 2026)

Added shared type-only wire contracts used by backend and mobile identity checking; centralized
success/error responses preserve existing endpoint behavior. Added strict bounded pagination,
INR rupee/paise conversion, nullable cost provenance, exact decimal quantity strings, calendar/UTC
serialization, household-timezone expiry and pure status-transition rules. No Pantry endpoint,
status write, mobile persistence, schema/migration or dependency change.

Both `npx tsc --noEmit` checks and backend build pass. Foundation tests 10/10, auth 9/9,
household 6/6, health 1/1, live development household 5/5 (temporary records cleaned), guards 4/4
and root tests 70/70 pass. Sandbox-blocked localhost tests passed with approved escalation.
Backend lint still exits 127 (ESLint absent); mobile has no lint script. Existing Node warnings remain;
Expo/device checks were not repeated with only a type import changed in mobile. `git diff --check` passes.
See [contracts, exact commands and limits](docs/Phase_3_API_Foundation.md).
Next: item 5 Vercel/environment configuration, then final Phase 3 review. Phase 4 has not started.

### Phase 3 item 3 — authenticated household access (11 October 2026)

Added explicit `POST /api/v1/households/current` setup and membership-scoped current/by-ID reads.
Serializable transactions, unique-subject conflict retries and rollback prevent duplicate/orphan
households. Repeated setup preserves preferences; foreign and unknown IDs both return 404.
Identity comes only from verified JWTs; request identity/settings fields are rejected. No schema,
migration, mobile, dependency or production changes. No real account was enrolled by these tests.

Checks: mobile/backend `npx tsc --noEmit` and backend build pass; root tests 70/70, household
HTTP/service tests 6/6, live development household tests 5/5, backend auth 9/9, health 1/1 and
existing database guards 4/4 pass. Temporary live records were removed and cleanup asserted.
An initial health regression from eager JWT-library loading was fixed with lazy loading; the
health and auth reruns pass. Backend lint remains exit 127 (ESLint absent); mobile has no lint script.
Expo/device checks were not repeated for this backend-only change. `git diff --check` passes.
See [API contract, commands and verification limits](docs/Phase_3_Household_Access.md).
Next: Phase 3 item 4 API foundation; Pantry CRUD/mobile persistence remains Phase 4.

### Phase 3 item 2 — development database setup (11 October 2026)

Verified the development branch/endpoint in Neon Console, then applied the initial transactional
migration to its empty public application schema. Neon-managed Auth structure is unchanged.
Added the backend Prisma singleton, readiness CLI, environment/endpoint/consent guards and an
idempotent seed for two synthetic households. No mobile UI/config/dependency changes.

Live migration/status/readiness and seeding passed; guard tests 4/4, database constraint/rollback
tests 14/14, seed replay 1/1, root tests 70/70, backend auth 9/9 and health 1/1 pass. Both TypeScript
checks and Prisma generate/validate pass. Existing backend lint failure remains (exit 127, no ESLint);
mobile has no lint script. Expo/device checks were not repeated for this backend-only slice.
See [setup commands, evidence and limits](docs/Phase_3_Database_Setup.md). Next: household bootstrap
from verified identity and authorization tests; no Phase 4 or production migration was started.

### Phase 3 item 1 — database model (11 October 2026)

- Replaced the Prisma placeholder with six application models and matching enums: Household,
  HouseholdMember, PantryItem, PantryItemEvent, ReceiptScan and UserPreference.
- Preserved provider-managed auth tables, mobile fixtures/designs and installed Prisma 5.22.
  Added household-scoped composite foreign keys, event snapshots, nullable price provenance,
  exact decimal quantities, date-only expiry and timezone-aware timestamps.
- [Model decisions and remaining enforcement](docs/Phase_3_Data_Model.md) distinguish schema
  constraints from future service authorization, SQL checks, status transactions and cleanup.
  RecipeCache/provider integrations remain deferred.
- Existing ignored backend environment was inspected without exposing credentials: pooled/direct
  URLs are configured for the same endpoint/database/role, use required TLS and match Auth's
  endpoint; `.env` permissions are 0600. Live connectivity/branch identity is not yet verified.
- Checks: `cd backend && ./node_modules/.bin/prisma format --schema prisma/schema.prisma` and
  `prisma validate` passed. Offline `prisma migrate diff --from-empty --to-schema-datamodel
  prisma/schema.prisma --script --output /private/tmp/freshtrack-phase3-model.sql` passed; nine
  inspections of generated SQL passed (six tables, no managed-auth DDL, compound references,
  exact quantity/date/timestamp types and household idempotency uniqueness).
- Both `npx tsc --noEmit` checks passed; root strip-types tests 70/70, backend `npm run test:auth`
  9/9 and health `npm test -- --runInBand` 1/1 passed. Existing module-type warnings remain.
  Backend `npm run lint` retains its pre-existing exit 127 (`eslint` absent); mobile has no lint script.
  `git diff --check` and modified-file credential/debug scan passed. Expo checks/exports were not
  repeated because no mobile/config source changed. No database write or migration applied.

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

### Pantry category filter slice — 11 October 2026

- Reused `PANTRY_CATEGORIES` for category pills with active-inventory counts, composing with existing
  freshness/search/sort controls. Category counts describe all active entries in that category;
  the title count, tracked value and at-risk value describe the visible filtered entries.
  The freshness-engine critical banner still describes the whole active inventory.
- Added Clear Filters and Show All Items in filtered empty states; both clear category/freshness/
  search and preserve sorting. Search now trims whitespace and remains case insensitive. Successful
  manual-add return clears category along with the existing search/freshness reset; cancellation
  preserves filters. No data/dependency/backend changes.
- Category pills reuse the reference inventory carousel styling in a second row to preserve the
  working freshness controls. This is a documented layout extension to the reference's single
  mixed carousel. Filter pills/reset have 44-point touch targets and checked-state accessibility
  props, including explicit web ARIA state. Final native and full visual comparison remain pending.
- Browser verified at 375 × 812: Dairy gives 3 entries/$16.27; Dairy+Caution+`  MILK  ` gives
  1/$4.49; Critical combination gives a filtered empty state; Show All/Clear resets restore results;
  keyboard Dairy selection and alphabetical ordering; confirmed milk Used changes Dairy 3 → 2 and
  active inventory 8 → 7; Meat(0) empty/add; a new Produce item returns with All Categories selected
  and visible, restoring 8 entries; add/cancel preserves Meat; Produce+Fresh shows the new $2.50 item.
- Root/backend `npx tsc --noEmit` pass. `node --experimental-strip-types --test tests/*.test.mjs`
  passes 28/28 (existing module-type warnings); backend `npm test` passes 1/1.
  `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-pantry-category`
  passes all platforms and 32 static routes; `git diff --check` passes.
  Root `npm run lint` fails (missing script), backend `npm run lint` fails (ESLint absent), pre-existing.
  Expo Doctor not rerun because SDK/dependencies are unchanged. Native gestures/dynamic text and
  screen-reader testing remain unverified; bundle exports only establish build compatibility.

### Pantry Batch Select slice — 11 October 2026

- Added the reference Batch Select pill, explicit whole-entry checkboxes, select/deselect-visible,
  selected count/value, disabled empty actions and Cancel Selection. Filter/search changes clear
  selection; sorting preserves it. Normal details/swipes/buttons return when selection mode ends.
- Extended the shared confirmation sheet for batches: every selected name/quantity/value, total
  value and whole-entry explanation appear before Used/Wasted confirmation. Cancel preserves the
  selection and inventory; confirmed actions exit selection mode and keep the active filters/sort.
  Batch selection uses normal press targets outside the swipe wrapper so taps/keyboard work;
  normal cards retain the existing gesture-handler press target and swipe behavior.
- Added one atomic in-memory reducer action. Empty, repeated, missing or already-resolved IDs reject
  the entire batch; replay cannot count an outcome twice. Existing comments/data/config preserved;
  no dependencies, APIs or persistence added. Supporting selection/confirmation controls use existing
  tokens; no separate supplied expanded-selection or batch-confirmation design exists.
- Browser verified at 375 × 812: disabled empty actions, checkbox keyboard/tap selection, review of
  two entries/$8.28, Cancel retaining selection, filters clearing it, sorting preserving it,
  select/deselect-visible, two confirmed Used entries and three filtered Dairy Wasted entries/$16.27,
  cancellation of Waste, Home active inventory 8 → 3, and Insights showing $92.78 rescued plus
  session 2 used/3 wasted ($16.27). Both normal swipe directions still open single-item confirmations;
  cancelling them and exiting selection preserve all three remaining entries. Native touch/scroll,
  screen-reader, dynamic-text and larger-batch sheet QA remain pending.
- Root/backend `npx tsc --noEmit` pass; `node --experimental-strip-types --test tests/*.test.mjs`
  passes 30/30, including two new atomic/replay/stale-selection tests (existing module-type warnings).
  Backend `npm test` passes 1/1. `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-pantry-batch`
  passes all platforms and 32 static routes; `git diff --check` passes.
  Root `npm run lint` fails (missing script); backend `npm run lint` fails (ESLint absent), pre-existing.
  Expo Doctor not rerun; SDK/dependencies unchanged. Exports establish bundling, not native interactions.

### Currency consistency checkpoint — 11 October 2026

- Audited existing dollar labels against Pantry and financial design PNGs. Displayed values already
  matched the reference currency; preserved their formatting and numbers. Centralized fixed typed
  `MOCK_CURRENCY` metadata feeds Pantry/receipt/barcode value-input labels and a read-only USD ($)
  Settings explanation. Corrected the incorrect INR fixture comment and documented whole-entry
  dollar values versus historical financial cents. No conversion, configurable currency or dependencies.
- Browser verified at 375 × 812: Settings note wraps correctly; manual entry of two bags with $4.50
  retains $4.50 in details; June financial $64.80/$12.40, weekly $18/$9/$4/$2 and category
  $6.20/$3.80/$2.40 remain correct. Native interactions remain unverified.
- Root/backend `npx tsc --noEmit` pass. `node --experimental-strip-types --test tests/*.test.mjs`
  passes 30/30 (existing module-type warnings). Backend `npm test` first failed on sandbox local-port
  `EPERM`, then passed 1/1 outside the sandbox. `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-currency-audit`
  passes all platforms and 32 static routes. Root `npm run lint` fails (missing script); backend
  `npm run lint` fails (ESLint absent), both pre-existing. `EXPO_OFFLINE=1 npx expo install --check`
  exits 0 (dependencies up to date; offline validation warning). `git diff --check` passes.
  No SDK/dependency changes. Expo Doctor was not rerun for this slice.

### Remaining Phase 1 work

- Pantry cards/imagery, filter/sort layout and dynamic-text design review; top-section phone layout updated.
- Scanner final native/visual review. Mock permission request/denial/retry/blocked recovery and receipt/barcode
  review/queue/duplicate choices/confirmed insertion/error/fallback are implemented.
  The standalone manual-entry fallback is now available.
- Native auth OTP autofill/backspace/keyboard/accessibility and timer lifecycle checks; final auth
  visual review. Profile/privacy prototype UI exists; account-deletion UI scope remains
  unresolved without separate designs. Production legal policies/account operations are deferred.
- Final native verification of new Recipe/Insights/detail/shopping/preferences/reconciliation flows,
  native sharing checks and complete side-by-side visual review. Gradients/glass blur remain surface
  approximations; pantry thumbnails still use emoji; See All's stir-fry reuses supplied pasta artwork.
- Reference audit totals disagree; preserved snapshots and session-only value deltas are documented
  in the inventory. Food mass/carbon values remain illustrative rather than production calculations.

**Exact next step:** Run the item-4 end-to-end sequence on Android when a device/emulator is
available. Visual matching, general native QA and auth/OTP QA (items 1–3) remain deferred at the user’s request.
Phase 1 remains in progress and must be reviewed before Phase 2; real integrations require approval.

### End-to-end verification slice — 11 October 2026

- User selected remaining-work item 4 and deferred items 1–3 (visual matching, general native QA,
  auth/OTP QA). No UI redesign or integration changes. Added
  [repeatable checks and evidence](docs/Phase_1_End_to_End_Checks.md) and
  `tests/prototype-flow.test.mjs`, covering Scanner purchases/duplicates → shopping → cooking →
  reconciliation → analytics/report, including immutable fixtures and replay prevention.
- Browser directly verified recipe save/details/missing ingredients, shopping deduplication/clearing,
  cooking cancel/confirm/repeat prevention and $92.98 Insights/report preview; invalid preferences and
  18:30 persistence through normal navigation; receipt duplicate rejection/skip/edit/confirmed insertion;
  barcode separate purchase retaining both chips ($7.98); reconciliation cancellation/confirmation,
  clearing the queue and $16.69 wasted value. Browser download-event confirmation timed out; no new
  successful download is claimed for this slice.
- The user confirmed iPhone Expo Go launch, then reported shopping/cooking/Insights, preferences and
  native report share-sheet/cancel working, followed by receipt/barcode-duplicate/reconciliation checks passing.
  These are user-reported native results, separate from directly observed browser evidence.
  Android device/emulator and iOS simulator are unavailable on this Mac. Full native QA is not complete.
- `node --experimental-strip-types --test tests/prototype-flow.test.mjs`: 1/1 passed;
  `node --experimental-strip-types --test tests/*.test.mjs`: 31/31 passed (existing module-type warnings).
  Root/backend `npx tsc --noEmit` and `git diff --check` pass. Local iOS manifest returns HTTP 200.
  Lint, backend health, Doctor/dependency checks and bundle exports were not rerun for this test/docs-only
  slice; previous results above remain unchanged. No dependencies or application code changed.
- Item 4 is user-verified on iPhone; Android remains pending until a device/emulator is available. Deferred items 1–3 remain open; Phase 2 is not authorized.

### Pantry top-section visual checkpoint — 11 October 2026

- Compared the live Pantry at phone widths with `kitchen_inventory_swipe_actions/screen.png` and
  its HTML/design tokens. Existing search/filter/add/batch/swipe logic preserved. Updated only
  `app/(tabs)/pantry.tsx`: reference Inventory subtitle, search-first hierarchy, white pill search
  with functional 44-point barcode entry, and light freshness banner after filters with shield icon,
  headline/Active label and separate Confirmed/Estimated explanations. Demo wording avoids implying
  actual AI/package verification. Removed the unsupported large title/full-width Add block; manual
  entry remains a compact accessible button beside Batch Select and in the empty state.
- Browser screenshots inspected at 320, 375 and 430 px widths; banner wraps at 320 without clipping.
  Verified no-results/reset, manual-add navigation/cancel, scan-button navigation, one-entry batch
  review ($4.29)/cancel and exit preserving all eight active items. Full card/imagery/filter/sort and
  native dynamic-text/gesture review remain pending; this is a focused improvement, not full visual parity.
- Root/backend `npx tsc --noEmit` pass; `node --experimental-strip-types --test tests/*.test.mjs`
  passes 30/30 with existing module-type warnings; backend `npm test` passes 1/1 outside the sandbox.
  `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-pantry-visual`
  passes all platforms/32 static routes. Root/backend `npm run lint` still fail respectively for missing
  script/ESLint (pre-existing). `git diff --check` passes. Doctor/dependency checks were not rerun;
  SDK/dependencies unchanged. Exports verify bundling, not native interactions.

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

## Phase 2 development authentication check — 11 October 2026

User authorized a limited Neon API proof of concept while the remaining Phase 1 QA stays deferred.
Welcome → **Test Real Email Sign-In** (development builds) opens `/(auth)/native-check` on Expo Go.
It sends real email OTPs to the development branch, persists provider session material with
Expo SecureStore and checks restoration/sign-out against Neon. Existing kitchen/auth prototypes
remain mock flows. Native delivery, authenticated bearer transport and restart/logout acceptance
have now **passed user testing on iPhone/Expo Go**; Phase 2 is not complete and Phase 3 has not started.
The user confirmed email delivery, OTP acceptance and a verified signed-in session on iPhone.
Initial bearer restoration failed; the signed provider-cookie correction passed native sign-in.
Restart persistence and sign-out followed by restart now pass user testing. Sign-out needed the
actual Expo development origin registered in the development branch's trusted domains.

Only public `EXPO_PUBLIC_NEON_AUTH_URL` and `EXPO_PUBLIC_NEON_AUTH_ORIGIN` belong in root `.env.local`;
database credentials stay in `backend/.env`. Both files are ignored. Register the actual development
app origin in the development Auth domains and restart Expo after changing configuration. Web shows a
native-device instruction instead of storing authentication material in browser storage.

Checks: mobile/backend TypeScript passed; 39/39 unit tests and 1/1 backend health test passed;
web/iOS/Android exports passed; Expo Doctor passed 21/21. Backend lint still fails because eslint
is absent; mobile has no lint script. Install reported 29 audit findings requiring a separate
dependency review. Details and the next auth acceptance steps are in
[Phase 2 Auth Proof of Concept](docs/Phase_2_Auth_Proof_of_Concept.md).

## Security Notes

- No API keys, database URLs, or credentials belong in mobile source code or `EXPO_PUBLIC_*` variables.
- Store all secrets in Vercel environment config (production) or `backend/.env` (local dev).
- `backend/.env` is excluded by `.gitignore` — confirm with `git status` before every commit.
- If a secret is accidentally committed, rotate it immediately.

---

## License

[See LICENSE](LICENSE)


## Phase 2 existing account forms — 11 October 2026

User authorized remaining item 1: connect the supplied sign-up, sign-in, six-digit verification and
resend screens to real Neon. Existing colors, typography, form layout and Expo Router routes are
preserved. Native Get Started/Log In now use the configured development Auth service. Missing native
configuration reports an error rather than succeeding as a demo. Web stays explicitly labeled demo;
Welcome → Preview Demo Kitchen preserves the local prototype on native devices too.

- Sign-up calls `/sign-up/email` with name/email/password. Neon automatically sends the verification
  code; the app does not immediately send another code. Unverified responses are never saved as sessions.
- Existing OTP inputs verify through `/email-otp/verify-email`; resend uses `email-verification`, not
  passwordless sign-in. A 30-second UI cooldown prevents immediate repeated resend taps; Neon controls
  actual expiry and rate limits. Accepted verification can retry session restoration without reusing OTP.
- If verification has no auto-sign-in cookie, the app returns to the password login form. Password
  login uses `/sign-in/email`; safe errors cover wrong password, unverified email, duplicates and limits.
  Login includes a verification-code entry for an unfinished registration.
- Remember checked stores the provider cookie in SecureStore; unchecked clears any older disk cookie
  and uses memory for this app process. Cookie rotation preserves that choice. Passwords/OTPs are never
  stored or put in route parameters. Real identities are not copied into mock kitchen profiles.
- Success currently shows the existing provider session-check screen with sign-out and an explicit
  Continue to Demo Kitchen action. This preserves a reviewable verified session until protected
  navigation is implemented. Digest/remember UI preferences remain local, not backend preferences.
- OAuth, biometrics and real password recovery are not connected; buttons explain that limitation.

User confirmed new-account email delivery/OTP verification, wrong-password failure, correct password
login, no restored session with Remember unchecked, and restored identity with Remember checked on
iPhone/Expo Go. These are user-reported device results. The user also confirmed verification resend delivered a new
code and completed verification. Automated fixtures cover the distinct email-verification transport.

Checks for this slice:

| Command | Actual result |
| --- | --- |
| `npx tsc --noEmit` (mobile and backend) | Both passed |
| `node --experimental-strip-types --test tests/*.test.mjs` | 48/48 passed; existing module-type warnings |
| `npm test -- --runInBand` (backend) | 1/1 passed outside sandbox; initial sandbox attempt failed with loopback EPERM |
| `npx expo-doctor` | 21/21 passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-auth-forms-final` | All three platforms/34 routes passed |
| `npm run lint` (backend) | Existing failure: ESLint absent (exit 127) |
| Mobile lint | No lint script configured |
| `git diff --check` | Passed |

No dependency was added in this forms slice. Candidate source/docs secret/debug scan passed.

Next: implement remaining item 2—shared
verified auth state, startup restoration and protected Expo Router navigation. Backend identity
verification, provider failure-policy/device checks, Android, production config and final checkpoint
remain Phase 2 work. Phase 3 has not started.


## Phase 2 protected navigation — 11 October 2026

User authorized remaining item 2. `context/AuthContext.tsx` now owns shared verified identity and
explicit demo state. `lib/authSession.ts` serializes provider checks/authentication/sign-out and
ignores superseded results. The navigator waits for initial restoration; foreground checks show
an opaque loading overlay while preserving the current route. Background controls are disabled and
hidden from screen readers during verification. A null/expired session removes access.
A failed check blocks kitchen access and offers Retry Session Check on Welcome; provider cookie
material is retained by the existing transport for retry. Sign-out failure keeps the prior verified
state with a retry error; successful provider sign-out clears state and private navigation history.

`app/_layout.tsx` uses SDK 57-compatible `Stack.Protected` for tabs, Pantry add/details, Recipe
details/shopping, financial Analytics, Settings/profile and the legacy modal. Welcome/auth routes
are available only outside kitchen access. Privacy and not-found remain public. No SDK 58-only
`redirectTo` prop or direct React Navigation API is used. This is client navigation protection;
server-side API authorization remains the next Phase 2 slice.

Verified login/OTP now enter Home directly; a remembered session restores Home on cold startup.
Settings displays the provider identity, read-only account details and real Sign Out. Mock profile
editing stays available only for demo. Public prototype information now accurately distinguishes
real development authentication from mock groceries and simulated camera/notifications.

Preview Demo Kitchen is explicit and process-only. It is allowed in development native and web
prototype builds, disabled in production native, and never supplies a real authenticated identity.
Demo cannot activate while a session operation is running. Pantry/recipe mock state resets when
switching between anonymous/demo/authenticated subjects to avoid carrying another session's prototype
edits across identities. Local form/preferences state remains separate so mock profile and signup
digest choices continue working. No real database persistence or protected data endpoint was added.

Verification:

- User-reported iPhone passes: direct Home after login/startup, correct account email in Settings,
  remembered restart, Pantry details/back, Sign Out → Welcome, blocked back/swipe and signed-out
  Pantry-add deep link, explicit demo entry, demo labeling and confirmed exit.
- Browser directly verified: signed-out Pantry add, account details and shopping-list URLs redirect
  to Welcome; Preview Demo → Home → Settings → exit works; browser Back does not reopen the kitchen;
  Privacy remains public and Done returns to Welcome.
- Mobile/backend `npx tsc --noEmit`: passed.
- `node --experimental-strip-types --test tests/*.test.mjs`: **55/55 passed**, including startup,
  provider identity mismatch, no-auto-sign-in verification, failed/expired resume, retry, late
  restoration versus sign-out, revocation failure/retry and explicit demo eligibility.
- Backend `npm test -- --runInBand`: **1/1 passed** with loopback access.
- `npx expo-doctor`: **21/21 passed**.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-protected-navigation-final`:
  all platforms/34 routes passed. Exports are not device interaction tests.
- `git diff --check` and candidate source/docs secret/debug scan: passed.
- Backend `npm run lint`: unchanged failure (`eslint: command not found`, exit 127); mobile has no
  lint script. Existing Node module-type warnings remain. No dependency added in this slice.

Remaining Phase 2: backend identity verification and unauthenticated rejection, deliberate provider
expiry/reused-code/rate-limit/offline checks, Android, production HTTPS origin/release configuration,
final review/docs/checkpoint commit. Offline/expiry/race paths above have injected-client coverage;
those cases have not been deliberately exercised against Neon on the device in this slice.
Next: remaining item 3—establish backend server-side identity verification. Phase 3 has not started.


## Phase 2 backend identity verification — 11 October 2026

User authorized remaining item 3. The API now exposes `GET /api/v1/auth/me` behind reusable
`requireIdentity` middleware. Mobile obtains a short-lived signed JWT from Neon's documented
`GET /token` using its existing provider cookie, sends only the JWT as a Bearer credential to the
API, and does not persist the JWT or place it in React state. The opaque session token is not used
as an API JWT. Demo sessions cannot perform this check.

The server uses `jose` and branch-specific public JWKS, verifies EdDSA signature, issuer and audience
against the configured Auth URL's origin, requires subject/expiry/issued-at, enforces a 15-minute
maximum age, and rejects unverified email, banned accounts and inconsistent subject/id claims.
Client `userId`, cookie-only requests and identity headers cannot select the account. Invalid
credentials return safe 401 errors; missing configuration/key-service failure returns safe 503.
Responses include request IDs and `Cache-Control: no-store`; health remains public. No database
connection, migration, Pantry endpoint or Phase 3 work was added.

Neon JWTs can remain valid until their 15-minute expiry after provider sign-out. The app does not
cache them, but immediate revocation of an already-issued JWT is not implemented. The production
revocation policy must be agreed during Phase 2 acceptance. Provider docs:
[Neon JWT plugin](https://neon.com/docs/auth/guides/plugins/jwt),
[jose verification](https://github.com/panva/jose).

Local setup: set `backend/.env`'s `NEON_AUTH_URL` to the same development branch used by mobile;
no signing secret is required. Set ignored mobile `.env.local`'s `EXPO_PUBLIC_API_URL` to
`http://YOUR_PRIVATE_LAN_IP:3001`. This is public endpoint configuration, never a database URL.
Private-LAN HTTP is accepted only by the development check; production requires HTTPS.
Run `npm run build` in `backend/`, then `node --env-file=.env dist/server.js` there (Node 20+).
Restart Expo after changing public env variables. Development Settings → Check Backend Identity
compares the API's verified subject/email with the current account. This button is absent in
production and the demo. Backend CommonJS output is preserved; Node16 module resolution/native
ESM import supports jose 6, and isolated compilation keeps the existing Jest health test compatible.

Verification results for this slice:

- Root `npx tsc --noEmit`: exit 0. Backend `npx tsc --noEmit`: exit 0.
- `node --experimental-strip-types --test tests/*.test.mjs`: **60/60 passed**.
- Backend `npm run test:auth`: build succeeds, **7/7 passed**, using real generated Ed25519
  signatures and local test JWKS. Covers forgery/algorithm, expiry/future/stale claims,
  wrong branch/audience, unknown keys, invalid/unverified/banned claims, identity spoofing,
  missing credentials/configuration and provider outage. No real credentials are in these tests.
- Backend `npm test -- --runInBand`: health **1/1 passed** with local socket permission.
  A restricted rerun failed with sandbox `listen EPERM`; rerunning with permission passed.
- Actual development JWKS: **200**, public keys present. Running API: health **200**,
  unauthenticated `/api/v1/auth/me` **401 / UNAUTHORIZED**.
- User reports the Settings backend identity check passes on **iPhone/Expo Go**. This is a
  user-observed result; automated native UI and Android checks have not been performed.
- `npx expo-doctor`: **21/21 passed**.
- `npx expo export --platform web --platform ios --platform android --output-dir
  /private/tmp/freshtrack-backend-identity`: exit 0, all three bundles and 34 static routes exported.
- Backend `npm run lint`: existing failure, exit 127 (`eslint` absent). Mobile has no lint script.
- Dependency install added only backend `jose`; npm reported 36 audit findings (5 moderate,
  31 high). No broad dependency upgrade/audit fix was applied.
- `git diff --check`: passed. Credential/debug scan of changed source and documentation passed.

Next: deliberate provider expired/reused/rate-limit and offline/retry checks, decide revocation
policy, document/review the remaining Phase 2 acceptance and production configuration. Android
verification remains pending device availability. Phase 2 is not complete; Phase 3 has not started.


## Phase 2 failure/offline checks — 11 October 2026

User authorized remaining item 4. Actual offline background/resume on iPhone blocks the kitchen and
shows the session-verification error; reconnect/Retry Session Check restores the same account without
another OTP, by user report. Wrong-code rejection, subsequent valid-code login, and rejection of a
previously successful code without replacement also pass by user report. User specifically confirmed
Too many attempts appeared and a fresh code then worked. The email states a 10-minute lifetime;
user reports unused-code rejection after the requested 11-minute wait and successful resend/new-code
recovery. Item 4 is complete for the iPhone development flow. [Failure-check matrix](docs/Phase_2_Failure_Checks.md) separates fixtures from real-device
results and gives bounded development-only test steps.

Focused changes: auth transport preserves non-JSON HTTP failures (401 session invalidation and 429
rate-limit feedback), reports malformed successful responses safely, and permits cookie-preserving
retry after gateway/transport failures. Only allowlisted provider error labels are exposed. Native
passwordless sign-in and restoration now require verified, non-banned provider identity; rejected
restorations clear local session material. The existing development diagnostic adds Use a Code
Already Received, which opens the OTP form without sending/replacing a code. It still calls Neon
verification, never bypasses it, and does not store codes persistently. No new dependency or backend/
database change was added for item 4.

Checks: root and backend `npx tsc --noEmit` exit 0; root
`node --experimental-strip-types --test tests/*.test.mjs` **65/65 pass**; backend
`npm run test:auth` **7/7 pass** after build; backend `npm test -- --runInBand` health **1/1 pass**
with local socket permission. `npx expo-doctor` **21/21 pass**. Three-platform export
`npx expo export --platform web --platform ios --platform android --output-dir
/private/tmp/freshtrack-auth-failure-checks` exits 0 (34 static routes). Existing module-type/color
warnings remain. Lint setup gaps remain unchanged (backend ESLint absent, mobile no lint script).
`git diff --check` passes. Phase 2 remains open; Phase 3 has not started.


Final item-4 result: user confirmed expired-code rejection/private-route blocking and fresh-code
recovery on iPhone after the requested wait. This is user-reported native evidence, not an automated
observation. Only documentation changed when recording this result; the previous 65/65 root tests,
7/7 backend auth tests, health 1/1, TypeScript, Doctor and export results were not rerun.
Next: final Phase 2 acceptance/architecture review, production configuration and JWT revocation
policy decision, Android verification when available, then checkpoint commit before any Phase 3 work.


## Phase 2 release configuration preparation — 11 October 2026

User approved shared/iOS release preparation with Android settings and deferred Android device QA.
The user has no paid Apple Developer membership. Nothing was uploaded or deployed, no account was
created, and no signing credentials or native build were generated. Expo Go development can continue.

Added `eas.json` preview/production profiles, `app.config.js` preserving `app.json`, release-input
validation, `.env.release.example`, and five configuration tests. Preview has separate name/scheme/IDs;
production uses EAS-managed build numbering. Chosen app identifier, EAS project UUID and actual
HTTPS Auth/origin/API settings must be supplied later. Release validation rejects missing/placeholder
settings and LAN/insecure transport, preventing accidental use of local development URLs. No repository
dependency or current development env change. Actual root env files remain ignored.

Checks: both TypeScript commands exit 0; root tests 70/70; focused release tests 5/5; backend auth 7/7,
health 1/1; Doctor 21/21; all-platform export/34 routes pass. Development public Expo config resolves;
synthetic preview/production configs resolve through actual Expo CLI and production LAN API settings
are rejected. Official @expo/eas-json 24.9.0 schema passes. Expo exports do not verify signed release
builds. Existing lint gaps remain. Detailed setup, commands and verification limits:
[Release configuration preparation](docs/Phase_2_Release_Configuration.md).

Next: final Phase 2 acceptance/architecture and JWT revocation review; explicitly record Android and
live signing/production verification as deferred. Checkpoint commit is required before Phase 3, which
has not started. Apple membership can wait until a standalone iPhone build/distribution is needed.


## Phase 2 final review — 11 October 2026

The implementation-plan device/auth/navigation/backend criteria pass for iPhone development,
with Android and live production/signing checks explicitly deferred. The final review adds
[ADR 001](docs/decisions/001-native-neon-auth.md) and an
[acceptance report](docs/Phase_2_Final_Review.md), including installed versions and evidence limits.
The user accepted the existing bounded API JWT validity for the MVP; immediate server revocation
is not an MVP requirement.
Current provider/native sign-out is immediate; an already-issued API JWT can remain valid for about
15 minutes, with five seconds of clock tolerance. This trade-off is recorded in ADR 001; no provider token lifetime setting was changed.

Review fixed pre-existing raw parser/error logging and incomplete error request IDs in the backend.
Structured redacted logging now applies in development and production; IDs are assigned before
parsing/CORS and included in parser/CORS/404/429 errors. CORS rejection returns safe 403 without
reflecting the supplied origin. Two meaningful regression tests prove body/origin/ID redaction and
consistent failure envelopes. Legacy server console.log statements were replaced with structured
records. No mobile/UI/config/dependency or database/data-API changes in this review.

Actual final checks: mobile/backend TypeScript exit 0; 70/70 root tests; backend auth 9/9 after build;
health 1/1; Doctor 21/21. Backend lint still fails exit 127 because ESLint is absent; mobile has no lint
script. The preceding all-platform export passed and was not repeated for these backend-only fixes.
No production deployment, EAS build or store upload ran. The Phase 2 development gate is complete
and the review is saved in its checkpoint. Next, when explicitly authorized: Phase 3 schema/API
foundation, preserving the verified subject boundary and household scoping. Android/live release
checks remain required before publication; they are not claimed complete.
