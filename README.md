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
Latest inspected checkpoint: `62ddb1d` (`wip: FreshTrack Phase 1 progress`).

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
  Existing scanner fixtures still need centralization.

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

### Remaining Phase 1 work

- Home Recent Additions swipe gestures, Pantry batch/category
  controls, currency normalization and final phone/dynamic-text design review.
- Scanner permission/error/empty states, editable receipt review, packaged-date queue, barcode
  lookup failure states, duplicate confirmation and actual receipt/barcode insertion into shared mock inventory.
  The standalone manual-entry fallback is now available.
- Auth invalid/expired OTP, paste/autofill, timer cleanup and placeholder recovery/social/biometric
  interactions. Profile/privacy and further Settings states need UI scope/design review.
- Final native verification of new Recipe/Insights/detail/shopping/preferences/reconciliation flows,
  native sharing checks and complete side-by-side visual review. Gradients/glass blur remain surface
  approximations; pantry thumbnails still use emoji; See All's stir-fry reuses supplied pasta artwork.
- Reference audit totals disagree; preserved snapshots and session-only value deltas are documented
  in the inventory. Food mass/carbon values remain illustrative rather than production calculations.

**Exact next step:** Centralize Scanner receipt fixtures, implement editable receipt candidate review,
then add the confirmed haul to shared mock inventory with explicit duplicate handling. Complete
Scanner permission/lookup/error states afterward. Phase 1 remains in progress and must be reviewed
before Phase 2; authentication proof-of-concept requires explicit user approval.

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
