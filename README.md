# FreshTrack

> **Smart pantry manager — stop wasting food, start saving money.**

FreshTrack is a cross-platform mobile app (iOS + Android) that tracks grocery expiry dates, scans receipts with OCR, recommends recipes for near-expiry ingredients, and shows the financial cost of food waste.

---

## Architecture

```
React Native / Expo app (mobile)
    ├── On-device receipt OCR proof (Apple Vision / Android ML Kit)
    └── HTTPS API calls only
            ↓
Node.js + Express API (backend/)
    ├── Prisma ORM
    └── Neon PostgreSQL

Third-party APIs (server-side only):
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
npm ci
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
npm run dev         # Start API server with tsx watch (hot reload)
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
| `npm run lint` | ESLint + TypeScript/Hooks | Mobile source checks, zero warnings |
| `npx expo-doctor` | — | Diagnose dependency issues |
| `npx expo install --fix` | — | Fix incompatible package versions |

### Backend (`cd backend` first)

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Start with hot reload |
| `npm run build` | `tsc` | Compile to `dist/` |
| `npm start` | `node dist/server.js` | Run compiled build |
| `npm run typecheck` | `tsc --noEmit` | TypeScript type check |
| `npm test` | Build + native Node test runner | All backend non-integration tests (160); excludes guarded database suites |
| `npm run lint` | `eslint src --max-warnings 0` | TypeScript lint with zero warnings |
| `npm run test:watch` | Build + native Node watch | Watch tests/compiled imports; rerun build after TypeScript edits or use `npx tsc --watch` |
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
| 4 | Pantry CRUD end-to-end | ✅ Core development acceptance complete; remaining native/release QA recorded |
| 5 | Local expiry notifications + reconciliation | ✅ Development review complete; full native acceptance pending |
| 6 | Barcode scan + receipt OCR | 🟡 On-device OCR checked on iPhone; receipt import checked on iPhone; normal entry checked on iPhone; receipt estimates checked on iPhone; package/manual expiry checked on iPhone; barcode review/save connected; phone and broader QA remain |
| 7 | AI Chef (Spoonacular integration) | ✅ Development acceptance complete; broader native QA recorded |
| 8 | Waste analytics and data integrity | ✅ Development review complete; category/individual phone checks skipped, QA gaps recorded |
| 9 | Settings, privacy, release preparation | 🔄 In progress; cleanup/deletion/receipt retention accepted; API/tooling checked; patched iPhone accepted; advisory/reliability/build review remain |

---

## Project Status

**Phase 9 patched iPhone smoke checks passed by user report (21 October).** User reported all eight checks passed: signed-in launch, Pantry search/details/back, read-only deletion review/Refresh/Cancel, unchanged reminder status/time, camera Cancel/library OCR/Clear, zero managed receipt copies, Recipes/Insights navigation and sign-out/remembered-login restart. This is user-reported functional evidence, not direct agent observation, notification delivery/action testing, barcode or Android runtime acceptance. Implementation/checks remain recorded at `934600c` in the [mobile compatibility report](docs/Phase_9_Mobile_Compatibility.md): mobile384/384, backend160/160, both lint/TypeScript/build, Doctor21/21, all-platform41-route exports and signed iPhone build/install passed. Those automated checks were not rerun for this documentation-only update. Mobile audit29 (18high/11moderate), intermittent database failures and remaining personal-use-build/native/reliability work stay open. Next: unresolved mobile advisory review, then database reliability. Phase9 remains incomplete; no store publishing.

**Phase 9 SDK57 patch/mobile lint checkpoint implemented (21 October); patched iPhone acceptance pending.** Applied the five Expo-compatible patches within SDK57; React/React Native versions and designs preserved. Mobile lint0warnings (documented decoder/asset exceptions), clean `npm ci`, TypeScript and384/384 tests pass; backend lint/TypeScript/build/tests160/160 pass. Expo install check and Doctor21/21 plus all-platform41-route export pass. Existing iOS pods refreshed; unsigned/signed Debug builds, strict signature and iPhone app update pass. Mobile audit remains29 (18high/11moderate); incompatible downgrade/major suggestions were not applied. No backend/schema/provider/deployment/public-env/household changes. See [mobile compatibility report](docs/Phase_9_Mobile_Compatibility.md). Next: patched iPhone smoke checks, unresolved mobile advisory review, then database reliability and personal-use build. Phase9 remains incomplete; no store publishing.

**Phase 9 backend tooling checkpoint complete (20 October); mobile compatibility/reliability remain open.** Removed the vulnerable Jest/ts-node-dev development chains, preserved the health assertions in Node tests, added supported TypeScript ESLint and verified tsx/test watcher restarts. Backend clean `npm ci`, lint0warnings, TypeScript/build and unified tests160/160 pass; full backend audit0 advisories (previously36). Root TypeScript/tests384/384 pass. Runtime package versions/mobile configuration unchanged; no deployment/database/native-build/environment changes. Expo Doctor still20/21 with five existing patch mismatches; root lint and intermittent live database failures remain. See [backend tooling report](docs/Phase_9_Backend_Tooling.md). Next: Expo patch compatibility/mobile lint, then database reliability and personal-use build. No phone checklist for development tooling; no store publishing.

**Phase 9 API access review/request hardening complete for this slice (20 October); final security/reliability acceptance remains open.** Reviewed all25 protected method/path pairs and added eight signed-token/scoping regressions. Global throttling now runs before bounded128KiB parsing, compressed bodies are rejected and early errors are no-store. Root384/384, backend159/159, health1/1 and both TypeScript/build pass. Live development checks: combined42/43, isolated receipt9/10, targeted failed-review retry1/1; all cross-user cases passed and fixture cleanup completed, but intermittent database failures remain unresolved. Runtime audit0 advisories; development tree36 (31high/5moderate) requires tooling remediation. Development Preview deployed, anonymous401/oversized413 and served iOS bundle200 verified; only ignored public API URL/Metro changed, no production/schema/real-household changes. See [API review](docs/Phase_9_API_Security_Review.md). Next: development-tool advisories/lint/Expo compatibility, then database reliability and personal-use build. No new phone checklist for this server-only slice; no store publishing.

**Phase 9 receipt cleanup passed all eight iPhone checks by user report (20 October).** User reported the Privacy counter/manual cleanup, OCR preview across resume and picker Cancel, Clear Photo & Text, force-close/reopen recovery, Back cleanup, original library photo preservation and unchanged Pantry all passed. This is user-reported functional acceptance, not agent observation, filesystem forensics, Android runtime evidence or a phone test of confirmed-import cleanup. Implementation checkpoint `3065132` and prior automated results are in the [retention report](docs/Phase_9_Receipt_Retention.md): root384/384, backend151/151, health1/1, both TypeScript/build and all-platform41-route exports passed. Those checks were not rerun for this documentation-only update. SDK pre-return files, legacy untracked copies and OS backups remain outside the guarantee. Phase9 remains incomplete. Next: security/household-authorization review, then tooling/reliability/personal-use-build work; no store publishing.

**Phase 9 managed receipt-photo retention implemented (20 October); iPhone verification pending.** New owned-cache recovery clears abandoned copies on startup/resume, protects active preview/OCR/transfer files, and clears photo/raw OCR after confirmed import while preserving reviewed retry fields. Privacy & Data shows real managed-copy counts and safe manual cleanup. Root384/384, backend151/151, health1/1, both TypeScript/backend build and all-platform41-route exports pass; details are in the [retention report](docs/Phase_9_Receipt_Retention.md). Doctor20/21 and missing ESLint remain. SDK files created before returning control, legacy untracked copies and OS backups are outside the cleanup guarantee; originals are preserved. No backend/schema/dependency/native-build/deployment or household changes. Phase9 remains incomplete. Next: numbered iPhone cleanup checks, then remaining security/tooling/reliability/personal-use-build work. No store publishing.

**Phase 9 account/data deletion passed all nine disposable-account iPhone checks by user report (20 October).** User confirmed review/Cancel, final-dialog Cancel, wrong-password protection with the test grocery preserved, Neon deletion returning to Welcome, signed-out restart, rejected deleted-account login and the main account's groceries unchanged. This is user-reported end-to-end acceptance, not agent observation, a provider-console audit, native storage forensics or Android/failure-path acceptance. Implementation/checks are recorded in [deletion report](docs/Phase_9_Account_Deletion.md) and checkpoint `701a32f`: root373/373, backend151/151, health1/1, live deletion5/5, household5/5, both TypeScript/build and all-platform41-route exports passed. Those automated checks were not rerun for this documentation-only update. Shared-household/passwordless deletion remains unsupported; partial-provider recovery remains covered by injected tests, not this successful phone path. Phase9 remains incomplete. Next: receipt retention and abrupt-termination cache cleanup, then remaining security/tooling/reliability/personal-use-build work. No store publishing.

**Phase 9 account/data deletion implemented (19 October); disposable-account iPhone/Neon acceptance pending.** Added read-only deletion review and explicit password/email/DELETE/native confirmation, serializable sole-household data deletion, safe provider completion/retry and device cleanup. A minimal hashed deny marker blocks old tokens; application setup and a database membership trigger prevent recreation through current/legacy APIs. Shared households are blocked without deletion. Root373/373, backend151/151, health1/1, live deletion5/5 and existing household5/5 pass with scoped fixture cleanup; both TypeScript/build and all-platform41-route exports pass. Doctor20/21/missing ESLint remain. See [deletion report](docs/Phase_9_Account_Deletion.md). Additive development migrations applied with managed Auth unchanged; development Preview deployed, health200/tokenless deletion401, mobile public API URL/Metro updated. No existing user account/groceries or production deployment changed. Live provider deletion is not yet verified. Next: disposable-account phone check, then remaining Phase9 work; no store publishing.

**Phase 9 normal-app cleanup passed iPhone checks by user report (19 October).** Diagnostic controls and Demo Kitchen now default off, require an explicit development opt-in, and remain disabled in release bundles. Diagnostic routes are protected; normal receipt import/retry and notification recovery remain available. Real Settings hides mock preferences and explains current account/privacy behavior; unconnected social sign-in/digest controls are hidden in normal use. Root364/364, backend144/144, health1/1, both TypeScript/backend build and all-platform40-route export pass. Doctor20/21 (five pre-existing patches) and missing ESLint remain. See [cleanup report](docs/Phase_9_Normal_App_Cleanup.md). No backend/native/schema/dependency/deployment or household changes. This is the first Phase9 slice, not a standalone app or completed phase. User reported all seven checks passed: Settings/reminders without test controls, Pantry/details, Scanner/picker cancellation, Privacy & Data, sign-out/clean auth forms and remembered-session restart. This is user-reported normal-flow evidence, not direct observation, diagnostic deep-link testing or a standalone-build pass. Acceptance update changes documentation only; previous automated results are unchanged and were not rerun. Next: account/data deletion, then retention/reliability/build work. No store publishing.

**Phase 6 final development review complete (19 October); receipt-focused checkpoint ready for user review.** Requested iPhone recovery/paging and native-column checklists passed by user report; twenty-food expansion phone test was waived. Fresh root362/362, backend Node144/144, health1/1, both TypeScript/backend build, all-platform40-route exports and pinned public replay checks pass. Doctor20/21 (five existing patches) and missing ESLint remain. See [final review](docs/Phase_6_Final_Review.md). OCR accuracy remains partial: four purchase associations, three exact name+amount pairs across ten public grocery rows; manual review is necessary. Barcode follow-up, Android runtime, full accessibility/native profiling and crash-cache cleanup remain deferred/unverified. No runtime/dependency/native/environment/deployment/database/grocery changes in this review. Next: user scope/limit review; Phase9 cleanup/personal-use build only when explicitly approved. No store publishing. Historical entries below describe earlier checkpoints.

**Phase 6 receipt recovery/unassigned-review checks passed on iPhone by user report (19 October).** Unassigned OCR cards are paged ten at a time with persistent cross-page matching/source recovery. OCR settings links now apply only to permission errors; retry state preserves images and clears safe error codes. Matching buttons have source-specific accessibility labels. Root362/362, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; Doctor20/21/missing ESLint remain. Restarted existing Metro8087 at LAN192.168.1.19; served iOS manifest/bundle200 verified. See [quality checks](docs/Phase_6_Receipt_Quality_Checks.md). User answered “All checks passed” to the seven-step check covering camera-denial/settings recovery, picker/camera cancellation, empty scans, navigation clearing, 500-source paging/cross-page matching, Cancel/local preview and Reset/unchanged Pantry. This is user-reported evidence, not direct observation, disk-deletion verification, full accessibility testing or native performance profiling. Documentation-only acceptance update; no runtime/data change. Next: final Phase6 scope/acceptance review with accuracy/Android/accessibility/profiling limits stated. Twenty-food cap and barcode deferral preserved; no Phase9/store publishing.

**Phase 6 native receipt positions/review passed iPhone checks by user report (19 October).** Added a local Apple Vision Expo module and explicit paged column-match review with Cancel, pristine-name upgrades and source/edited-row/capacity guards. Android/older builds retain text-only/manual matching. Actual native core replays pinned public positions110/39/43 and proposals4/0/0; no broad accuracy claim. Root356/356, receipt HTTP5/5, both TypeScript/backend build, all-platform40-route export, pods116, signed iOS build/install/launch and served manifest/bundle200 pass. Doctor20/21/missing ESLint remain. See [native column review](docs/Phase_6_Native_Receipt_Columns.md). User answered “All checks passed” to the seven-step phone checklist covering position-aware OCR/clear, explicit layout choices, Cancel, reviewed Milk replacement without duplicates, local payload preview and Reset/unchanged Pantry. This is user-reported evidence, not direct observation, broad OCR accuracy or new persisted-import acceptance. No runtime changes in this acceptance update. Next: remaining Phase6 quality/final review. Twenty-food cap preserved; barcode deferred, no Phase9/store publishing.

**Phase 6 below-price receipt grouping evaluated locally (19 October); phone connection pending.** Added conservative code/amount/description blocks with original-source retention, ambiguous-row abstention and no quantity/expiry inference. On pinned public macOS positions, four of nine rows are associated correctly; three have exact name+amount, one needs name correction. Other grocery/control samples produce no pairs; all foreign INR values remain unknown. Root349/349, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; missing ESLint and prior Doctor20/21 remain. See [block grouping](docs/Phase_6_Receipt_Block_Grouping.md). No UI/native/backend/schema/dependency/environment/deployment or grocery changes; no new phone checklist. Next: native geometry adapter and explicit reviewed mobile connection, then remaining QA/final Phase6 review. Phase6 incomplete; twenty-food cap preserved, barcode deferred, no Phase9/store publishing.

**Phase 6 local receipt-position proof complete (19 October); automatic extraction still inadequate.** Added optional local Vision geometry output, bounded typed boxes and a conservative same-baseline matcher/evaluator, not connected to mobile. Eight new regressions pass; public samples still yield0/10 complete pairs, with every original string unchanged. Root339/339, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; Doctor20/21 and missing ESLint remain. See [position proof](docs/Phase_6_Receipt_Geometry_Proof.md). No UI/backend/schema/native/dependency/environment/deployment or grocery changes; no new phone checklist. Next: evaluate descriptions below code/price rows before native geometry integration, then remaining quality checks/final review. Phase6 incomplete; twenty-food cap preserved, barcode deferred, no Phase9/store publishing.

**Phase 6 public real-receipt accuracy rechecked (19 October); split-column automation limitation remains.** Fresh local macOS Vision assessed two food receipts (9/1 purchase rows) and one non-food control. Exact name recovery5/9 and1/1; complete automatic item/price candidates0/10, name-only suggestions2/0. Fixed modelling-clay/food-word false positives (control1→0), including same-line non-food guards. Every OCR string retained; explicit local manual recovery10/10 keeps INR values unknown, with no Pantry writes. Root331/331, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; Doctor20/21/missing ESLint remain. See [accuracy recheck](docs/Phase_6_Receipt_Accuracy_Recheck.md) and its aggregate results/reproducible local evaluator. No backend/schema/native module/dependency/environment/deployment change. This is public-image macOS evidence, not iPhone/Android accuracy or broad extraction acceptance. Next: resolve or explicitly accept the split-column automation limitation, then remaining quality checks/final Phase6 review. Twenty-food scope closed; barcode deferred, no Phase9/store publishing.

**Phase 6 unchecked package-date review passed local iPhone checks by user report (19 October).** Receipt review explicitly confirms an entered printed date; name/date changes invalidate that confirmation. Unchecked, unreadable/unavailable and loose/fresh states remain distinct from printed confirmation; manual/estimate fallback never becomes a package date. Cards/haul preview show local declarations; existing date-source provenance survives import/retry, without a new persistent package-inspection flag. Root327/327, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [package-date report](docs/Phase_6_Package_Date_Review.md). No backend/schema/native/dependency/environment/deployment or grocery changes. User answered “All checks passed” to the nine-step synthetic exercise covering confirmation/correction, Cancel, unreadable/manual fallback, unchecked estimates, loose-item validation, name-change invalidation, exact preview and Reset/unchanged Pantry. This is user-reported local UI evidence, not direct observation or new persisted-import acceptance. Next: real-receipt/failure/native QA and final review. Twenty-food scope closed; barcode deferred, no Phase9/store publishing.

**Phase 6 receipt-wide purchase date and combined estimate review passed local iPhone checks by user report (19 October).** One explicitly confirmed date prefills individual estimate forms. Paged per-grocery storage/type choices lead to exact preview and guarded local application; reviewed/excluded rows and all existing dates are preserved. Prefills never approve fields, select groceries or import them. Root319/319, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [shared-date report](docs/Phase_6_Receipt_Shared_Date.md). No backend/schema/native/dependency/environment/deployment or grocery changes. User answered “All checks passed” to the eight-step synthetic exercise covering date validation/shared prefill, Cancel/Apply, preserved package/excluded reviews, individual overrides, unchanged dates after shared-date edits, exact local preview and Reset/unchanged Pantry. This is user-reported local UI evidence, not direct observation or new persisted-import acceptance. Next: packaged/unchecked-date handling and remaining QA. The twenty-food coverage item stays closed with its phone test waived; no broader catalogue work. Phase6 incomplete; barcode deferred, no Phase9/store publishing.

**Phase 6 food coverage limited to 20 showcase foods (19 October).** Per user scope, preserve the fourteen existing food/type entries and add only apples, bananas, oranges, grapes, fresh fin fish and beef cuts; white/brown rice count separately. Centralized twenty-row local fixture, source-attributed conditions and preparation exclusions are implemented. Root310/310, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass. Doctor20/21 and missing ESLint remain. See [20-food scope/report](docs/Phase_6_Showcase_Food_Coverage.md) for the exact inventory, sources and checks. No backend/schema/native/dependency/environment/deployment or grocery changes. User explicitly waived new phone testing for this item; not claimed passed and no checklist pending. Food-coverage implementation is closed at this limited scope; further catalogue expansion is not required. Next: receipt-wide purchase-date and reviewed estimate application, then packaged-date handling and remaining QA. Phase6 incomplete; barcode deferred, no Phase9/store publishing.

**Phase 6 milk and dry-rice estimates passed local iPhone checks by user report (19 October).** Receipt review adds explicit refrigerated/pasteurized milk, dry-white-rice and dry-brown-rice choices with source links and form exclusions. Generic rice requires a type choice; cooked rice and raw/UHT/opened milk receive no automatic duration. Existing package/manual priority and durable expiry provenance are preserved. Root306/306, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [milk/rice report](docs/Phase_6_Milk_Rice_Estimates.md). No backend/schema/dependency/native/environment/deployment or grocery changes. User answered “All checks passed” to the eight-step synthetic exercise covering milk/rice type choices, Cancel, editable dates, package priority, unsupported-form fallback, exact preview, Reset and unchanged Pantry. This is user-reported local UI evidence, not real-food shelf-life accuracy or persisted import acceptance. Next: remaining food/condition and packaged-date work. Phase6 incomplete; barcode deferred, no Phase9 or store publishing.

**Phase 6 confirmed storage estimates passed local iPhone checks by user report (19 October).** Receipt review adds source-attributed food/condition rules, explicit purchase-date confirmation, editable lower-bound estimates and package/manual priority. Unsupported foods retain manual/custom review; no generic automatic receipt dates. Root300/300, receipt HTTP5/5, both TypeScript/backend build and all-platform40-route export pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. No backend/schema/native/dependency/environment/deployment or grocery changes. See [storage estimate report](docs/Phase_6_Receipt_Storage_Estimates.md). Only accepted expiry/base/days are persisted; storage confirmation remains local. User answered “All checks passed” to the eight-step synthetic exercise covering date validation, Cancel, editable estimates, package priority, unsupported-food fallback, exact preview, Reset and unchanged Pantry. This is user-reported local UI evidence, not real-food shelf-life accuracy or persisted import acceptance. Next: broader food/condition and packaged-date work. Phase6 incomplete; barcode deferred, no Phase9 or store publishing.

**Phase 6 receipt food/category suggestions passed local iPhone checks by user report (19 October).** A shared typed catalogue supplies supported food identities/category hints and name-only vocabulary. Explicit Use Suggested Category preserves manual choices; ambiguous/unknown names stay Other/Needs Review. No storage/expiry inference. Root294/294, receipt HTTP5/5, both TypeScript/build and final all-platform/40-route exports pass; iOS manifest/bundle200. Doctor20/21/missing ESLint remain. See [food/category review](docs/Phase_6_Receipt_Food_Categories.md). No backend/schema/dependency/native/environment/deployment or grocery changes. User answered “All checks passed” to the nine-step synthetic exercise covering category hints, Apply/Cancel, explicit manual override, ambiguous/unknown fallback, exact local preview, Reset and unchanged Pantry. This is user-reported local UI evidence, not real-receipt recognition accuracy or persisted import acceptance. Next: researched storage-dependent shelf-life rules and editable expiry suggestions. Barcode follow-up deferred; no Phase9. Store submission/publishing out of scope per user.

**Phase 6 longer receipts passed local iPhone checks by user report (19 October).** Shared50-item bounds cover candidates, review, API, replay and durable retry; review shows10 cards per page with global selections. Batched scoped duplicate counts fix an initial capacity timeout without raising transaction limits. Root285/285, receipt HTTP5/5, Pantry16/16, live receipt10/10 and live mobile-controller4/4 pass with fixture cleanup; both TypeScript/build/all-platform40-route exports pass. Preview Ready, health200/tokenless receipt401; ignored public API URL updated and actual iOS bundle verified. Doctor20/21/missing ESLint remain. See [long receipts](docs/Phase_6_Long_Receipts.md). Schema/Auth/provider settings unchanged; no existing user groceries changed. User answered “All checks passed” to the ten-step synthetic exercise covering five-page navigation, edits/selections across pages, exact local preview, capacity/removal/Add Missing cancellation, Reset and unchanged Pantry. This is user-reported local UI evidence, not fifty-item phone import or real-photo OCR accuracy. Next: food/category recognition, then editable expiry suggestions. Barcode follow-up deferred; no Phase9.

**Phase 6 grouped receipt prices/currency context passed local iPhone checks by user report (19 October).** Valid Western/Indian grouped decimals normalize exactly; RM/MYR and explicit foreign headers keep INR values blank, including explicit separate-line matching. Financial adjustments remain unassigned; no conversion or discount allocation. Root281/281, receipt backend4/4, both TypeScript/build and all-platform/40-route exports pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [receipt prices](docs/Phase_6_Receipt_Prices.md). No backend/schema/dependency/native/environment/deployment or grocery changes. User answered “All checks passed” to the ten-step synthetic exercise covering grouped values, Cancel, free/unknown values, foreign-header matching, local previews, Reset and unchanged Pantry. This is user-reported UI evidence, not real-receipt OCR accuracy. Next: longer receipts and remaining receipt/expiry work. Barcode follow-up deferred; no Phase9.

**Phase 6 reviewed receipt abbreviation suggestions passed local iPhone checks by user report (19 October).** Exact supported abbreviations offer explicit Use Suggested Name, preserve original OCR/quantity wrappers/package sizes and leave unknown names unchanged. Supported name-only abbreviations become unreviewed candidates with unknown prices. Root273/273, receipt backend4/4, both TypeScript/build and all-platform/40-route exports pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [abbreviation review](docs/Phase_6_Receipt_Abbreviations.md). No backend/schema/dependency/native/environment/deployment or grocery changes. User answered “All checks passed” to the nine-step synthetic exercise covering Apply/Cancel, original OCR, quantity/package-size preservation, manual corrections, unknown-name handling, local preview, Reset and unchanged Pantry. This is user-reported local UI evidence, not real-receipt OCR accuracy. Next: remaining receipt detection/expiry work. Barcode follow-up deferred; no Phase9.

**Phase 6 explicit receipt quantity suggestions passed local iPhone checks by user report (19 October).** Review offers user-triggered application for leading metric quantities/counts and trailing Qty labels; product-size suffixes do not become purchased quantities. Unknown units stay manual and whole-entry values are unchanged. Root266/266, receipt backend4/4, both TypeScript/build and all-platform/40-route exports pass; iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [quantity review](docs/Phase_6_Receipt_Quantity_Review.md). No backend/schema/dependency/native/environment/deployment or grocery changes. User answered “All checks passed” to the nine-step synthetic exercise covering Apply, Cancel, manual correction, unknown-unit/package-size handling, unchanged values, local preview, Reset and unchanged Pantry. This is user-reported UI evidence, not real-receipt OCR accuracy. Next: remaining receipt detection/expiry work. Barcode follow-up deferred; no Phase9.

**Phase 6 name-only grocery suggestions passed local iPhone checks by user report (19 October).** Receipt review proposes supported common food names without same-line prices; values remain unknown and every row requires explicit review. Original lines return to matching when suggestions are removed. Root258/258, receipt backend4/4, both TypeScript/build and all-platform/40-route export pass; development iOS manifest/bundle200. Existing lint/Doctor gaps remain. Public OCR replay improves one sample from0 to1 suggestion; the other remains0, so broad accuracy is not claimed. See [name-only report](docs/Phase_6_Receipt_Name_Only.md). No backend/schema/native/dependency/deployment or grocery changes. User answered “All checks passed” to the nine-step synthetic exercise covering six suggestions, cancellation, unknown-value preview, removal/matching, Reset and unchanged Pantry. This is user-reported local UI evidence, not real-receipt recognition accuracy. Next: remaining receipt detection and expiry-engine work. Barcode follow-up deferred; no Phase9.

**Phase 6 two public receipt samples evaluated locally (19 October).** At user request, macOS Vision and the unchanged parser processed two public food-purchase receipts:9/1 purchase rows,110/39 recognized strings,0 automatic candidates and all strings retained unassigned. Separate columns and recognition errors prevent automatic item coverage; foreign RM header context remains unsupported. Local manual recovery/payload assertions, root251/251 and both TypeScript checks pass. No Pantry writes or runtime/deployment changes. See [public receipt results](docs/Phase_6_Real_Receipt_QA.md). This is not iPhone camera/OCR acceptance. Next: bounded parser/currency gaps and failure/native QA. Barcode follow-up deferred; no Phase9.

**Phase 6 real-receipt QA prepared (19 October); phone results pending.** Prepared a two-receipt, no-import comparison that distinguishes raw recognition from parser candidates and checks manual correction, cancellation and local cleanup. Fresh mobile/backend TypeScript and root251/251 pass; running iOS manifest200. No runtime/deployment/native/environment or grocery changes. See [real receipt QA](docs/Phase_6_Real_Receipt_QA.md). Barcode follow-up stays deferred; Phase6 remains incomplete, no Phase9.

**Phase 6 receipt split-line matching passed local iPhone checks by user report (19 October).** Separate name/amount lines can be explicitly matched in receipt review with both originals, Cancel, source reuse protection and removal recovery. No order-based joins; standalone Rs/INR/foreign prices are no longer treated as grocery names. Same-line review/import preserved. Added a development-only synthetic local exercise with no Pantry saving. Both TypeScript/build, root251/251, receipt backend4/4 and all-platform/40-route exports pass; actual iOS manifest/bundle200. Doctor20/21 and missing ESLint remain. See [split-line report](docs/Phase_6_Receipt_Split_Lines.md). No backend/deployment/native/environment or agent grocery changes. User answered “All checks passed” to the 13-step synthetic exercise covering explicit matches, both cancellation paths, source recovery on removal, reviewed field preview, foreign-price handling and no Pantry additions. This is user-reported UI evidence, not real-receipt recognition accuracy. Next: real receipt/parser/failure QA. Barcode follow-up deferred by user; no Phase9.

**Phase 6 real barcode review/save passed iPhone checks by user report (19 October).** Normal Scanner opens a single-code camera/typed entry, verified catalog review and the existing Pantry form. Explicit category/purchase/expiry review, household barcode duplicates, BARCODE source and protected frozen confirmation/retry across restart are connected; Demo preserved. Both TypeScript/build, root242/242, backend143/143, live database3/3 with fixture cleanup, health1/1 and all-platform/39-route exports pass. Preview Ready, health200/tokenless lookup and duplicate-check401; actual iOS manifest/bundle200. Doctor20/21 and missing backend ESLint remain. See [mobile barcode report](docs/Phase_6_Mobile_Barcode_Entry.md). User answered “All checks passed” to the 14-step checklist covering catalog review, validation, paused confirmation/restart, explicit retry, exact saved fields/source, duplicate Cancel/Add Separately, restart and unknown/manual fallback. This is user-reported evidence, not direct observation. Next: barcode sign-out cleanup and error/native QA, then remaining Phase6 review; no Phase9.

**Phase 6 barcode lookup verified against live staging (19 October).** Added protected bounded Open Food Facts v3 product reads, shared GTIN validation, explicit unknown/incomplete/error results and community-source attribution. No purchase/expiry inference, database writes, mobile connection or deployment. Prior implementation checks passed: both TypeScript/build, root234/234, backend142/142, health1/1 and all-platform/38-route exports; Doctor20/21 and missing backend ESLint remain. Public developer contact is configured only in ignored backend environment. See [lookup backend report](docs/Phase_6_Barcode_Lookup_Backend.md). User reported the provider usage form submitted. Two live read-only staging probes passed: known product FOUND with name/brand and unknown package size, and reserved zero code NOT_FOUND without a product. No household data was sent. Next: editable camera-to-catalog review and barcode import; hosted deployment/phone lookup remain pending. Phase6 remains incomplete; no Phase9.

**Phase 6 barcode camera proof passed iPhone checks by user report (19 October).** Added a development-only protected camera check using SDK-compatible expo-camera, explicit permissions, torch, checksum validation, a synchronous one-scan latch and manual fallback. No catalog lookup or barcode save yet; normal barcode Demo preview stays unchanged. Both TypeScript checks/backend build, root234/234 and all-platform/38-route exports pass; Doctor20/21 retains five existing patches. CocoaPods115, native build/signature and direct device install pass; manifest/bundle200. Expo installer stalled after compilation and was replaced by devicectl installation. See [barcode camera report](docs/Phase_6_Barcode_Camera_Proof.md). User answered “All checks passed” to the ten-step camera checklist covering capture, one-result behavior, explicit rescan, torch/cancel, background recovery, manual form and unchanged Pantry. This is user-reported evidence, not direct observation. Next: select catalog and implement server lookup, then reviewed barcode import. Phase6 remains incomplete; no Phase9.

**Phase 6 receipt expiry slice passed both iPhone checklists by user report (19 October).** Receipt grocery review reuses Pantry package/manual/explicit shelf-life fields and saves only the winning choice. Estimate/package/manual labels and validated expirySelection survive confirmation and durable retries; legacy date-only retries remain compatible. Both TypeScript/build, root231/231, live client3/3 with fixture cleanup and all-platform/37-route exports pass; Doctor20/21 retains five patches. Actual iOS manifest/bundle200 includes the form. No backend/native/dependency/environment/deployment change or user-data writes by the agent. See [receipt expiry report](docs/Phase_6_Receipt_Expiry_Review.md). User answered “All checks passed” to the 13-step estimate checklist: explicit/custom estimate, invalid duration, Cancel, source labels, import and exact date/base/duration after restart. This is user report, not direct observation. User also answered “All checks passed” to the 14-step package/manual checklist covering priority, discarded lower choices, Cancel, import/restart and explicit manual override. Next: barcode scanning/catalog choice and remaining native/failure QA; no Phase9.

**Phase 6 normal Scanner receipt entry passed iPhone checks by user report (19 October).** Real accounts open protected /scanner/receipt from Receipt OCR; Demo retains the sample flow. The normal and diagnostic pages share the verified OCR/review/import/retry implementation; test-only confirmation controls stay diagnostic, with normal recovery for an existing paused retry. Both TypeScript checks, root227/227 and all-platform/37-route exports pass; Doctor20/21 retains five patches. Fixed an older date-sensitive prototype test fixture without changing assertions. Actual iOS manifest/bundle and existing API health200 pass. No backend/native/dependency/environment/deployment change. See [normal-entry report](docs/Phase_6_Normal_Receipt_Entry.md). User answered “All checks passed” to the 13-step normal-entry checklist covering capture/cancel, text visibility, reviewed import/restart, hidden test controls, manual fallback and Demo separation. This is user-reported evidence, not direct observation. Next: receipt expiry presets/package-date review, then barcode/native work; no Phase9.

**Phase 6 receipt-import slice passed all three iPhone checklists by user report (16 October).** Real-account development OCR review now reaches household duplicate Skip/Add Separately choices and explicit atomic import. Confirmed fields/key are saved in account/branch-scoped SecureStore before sending; restart restores an immutable explicit retry, with sign-out cleanup and no saved photos/raw OCR. Both TypeScript/build, root227/227, live mobile-controller2/2 with fixture cleanup and all-platform/36-route exports pass; Doctor20/21 retains five patches. Preview Ready, health200/tokenless receipt endpoints401; ignored API URL updated with Auth preserved. See [mobile receipt report](docs/Phase_6_Mobile_Receipt_Import.md). User answered “All checks passed” to the 15-step core checklist: Cancel, persisted paused retry/restart, explicit import, exact known/unknown values and single purchases after restart. This is user-reported evidence, not direct observation. User also answered “All checks passed” to the 12-step duplicate checklist: Cancel, Skip Bread, Add Milk Separately, preserved original values and exactly three purchases after restart. User also reported the 12-step sign-out cleanup checklist passed: paused retry removed after sign-out/relogin, unimported sample absent and prior purchases preserved. Next: normal Scanner receipt entry integration, followed by remaining expiry/barcode/native work. Barcode/normal scanner integration and wider native QA remain; no Phase9.

**Phase 6 atomic receipt-import backend verified locally (16 October); mobile connection pending.** Added protected bounded receipt duplicate-review/import endpoints using the existing schema. One Serializable transaction records receipt/items/CREATED snapshots; unchanged retries and concurrent confirmations create no duplicates, changed payloads conflict, and failures roll back the haul. Both TypeScript/build, root215/215, backend125+1 regression tests, health1/1 and live8+1 capacity cases with fixture cleanup pass. Existing backend lint is unavailable; no mobile/runtime environment, deployment or user-grocery change. See [import backend report](docs/Phase_6_Receipt_Import_Backend.md). Next: phone confirmation/duplicate UI with a durable frozen retry record, then development deployment and iPhone checks. Receipt Save is not connected yet; barcode/native QA remain, no Phase9.

**Phase 6 local receipt candidate review passed iPhone checks by user report (16 October).** Same-line item/amount heuristics preserve original OCR and unassigned lines; quantities, units and expiry require explicit review. Editable candidates, Add Missing/remove/include, validation and haul preview are local only; no Pantry import or backend changes. Both TypeScript checks, root215/215 and all-platform/36-route exports pass. Existing Expo server manifest returns200; no native rebuild required. See [candidate review report](docs/Phase_6_Receipt_Candidate_Review.md). User answered “All passed” to the clarified 19-step review checklist; this is user-reported evidence, not direct observation. Next: authenticated atomic/idempotent import and household duplicate handling. Barcode and broader native QA remain; no Phase9.

**Phase 6 on-device OCR proof passed iPhone checks by user report (16 October).** Development-only Scanner check captures/selects a bounded local image, previews it and explicitly reads raw text with Apple Vision/iOS or ML Kit/Android through expo-text-extractor2.0.0. No upload, parsing or Pantry import. Generation/account guards, retry/cancel/empty states and best-effort cache cleanup are implemented. Both TypeScript checks, root212/212 and all-platform/36-route export pass; Doctor20/21 retains five patch recommendations. Native pods113, iOS build/sign/install/launch and manifest200 pass. User answered “All checks passed” to the numbered capture/library, cancellation, recognition/re-read, no-text, clear/navigation and unchanged-Pantry checklist. This is user-reported evidence, not direct observation or a receipt-accuracy benchmark. See [OCR proof report](docs/Phase_6_On_Device_OCR_Proof.md). Next: deterministic receipt candidates, editable review and confirmed import. Barcode and broader native QA remain; no Phase9.

**Phase 6 local development app baseline passed by user report (16 October).** User answered “Loads and all checks pass” after the restarted launcher checklist covering app loading, existing-account sign-in, Pantry and Settings/email. This is user-reported evidence, not direct screen observation. Prior native build/signature/install, manifest/bundle200 and209 tests remain recorded evidence. No code/runtime/environment change in this acceptance update. See [local build report](docs/Phase_6_Local_Development_Build.md). Next: select and verify SDK57-compatible on-device OCR, then implement capture/parser/review/import within Phase6. OCR and barcode integration are not complete; Phase9 not started.

**Phase 6 development launcher recovered (16 October).** User reported a loading error; Metro had cached the old renamed plugin path. Restarted only port8087 with current configuration. The iOS manifest now returns200 with FreshTrack Dev and a launch asset; devicectl successfully launched the installed app using its8087 URL. Visible UI/sign-in/Pantry/Settings still require user confirmation. No source/dependency/native rebuild or account change. See [local build report](docs/Phase_6_Local_Development_Build.md). Previous209 tests/exports remain prior evidence. Next: phone baseline confirmation, then OCR compatibility/integration; no Phase9.

**Phase 6 local iPhone build compiled/signed/installed (16 October); phone launch pending.** Repaired the missing Apple WWDR G3 intermediate without trust overrides/private-key export. Local-only config removes unsupported APNs entitlement and quotes the generated bundle script; SDK-recommended Constants57.0.22 fixes its path quoting. Fresh Expo regeneration verifies both fixes. Xcode reports Build Succeeded/0errors/2warnings; codesign verification passes and the device lists FreshTrack Dev installed. Expo CLI exits1 at launch because iOS rejects the profile until user trust/security verification; successful app opening is not claimed. Both TypeScript checks, root209/209 and all-platform/35-route export pass; Metro iOS bundle200. Doctor20/21 has five existing patch recommendations. See [local build report](docs/Phase_6_Local_Development_Build.md). Next: trust the developer profile on iPhone, open the local app on port8087 and verify baseline sign-in/navigation before OCR. ML Kit is not installed; Phase9 not started.

**Phase 6 local native dependencies installed (16 October); signing setup pending.** Homebrew7.0.9/CocoaPods1.17.0 verified; pod install passed with110 pods. Both TypeScript checks and root207/207 pass. Doctor20/21 leaves only existing six Expo patch mismatches. The local iPhone build command stops before compilation because no code-signing certificate is available. No app installed or OCR tested. See [local build report](docs/Phase_6_Local_Development_Build.md). Next: create an Apple Development certificate in Xcode using the user's Personal Team, then retry the baseline build. No paid cloud build or Google billing setup; Phase9 not started.

**Phase 6 resumed — local development-build preparation (16 October).** User selected the free on-device OCR direction; ML Kit remains proposed/unverified and no cloud OCR is configured. Xcode26.6 is selected; prior iPhone diagnostics report iOS26.6.1, Developer Mode and development services available. Installed expo-dev-client~57.0.20 and added an optional local-only native identity; Expo generated ignored iOS files. Both TypeScript checks, root207/207 and all-platform/35-route exports pass. Doctor19/21: CocoaPods absent plus existing six patch mismatches. Native dependency installation, signed device build and OCR remain incomplete. See [local build report](docs/Phase_6_Local_Development_Build.md). Next: resolve CocoaPods, then verify a baseline device build before OCR integration. Phase8 development review is closed; Phase9 not started.

**Phase 8 final development review complete (16 October).** Fresh checks pass: mobile/backend TypeScript and backend build, root206/206, backend122/122, health1/1, read-only HTTPS SQL11/11 and all-platform/35-route exports. Hosted health200/tokenless analytics401 pass. User explicitly skipped category and individual-entry phone checks; they remain unverified, not passed. Earlier core monthly iPhone checks passed by user report. Existing Doctor20/21, lint/local Prisma and broader native/accessibility/performance gaps remain. Native bar charts are a documented alternative to the plan's chart libraries; unsupported impact metrics remain unavailable. See [final review](docs/Phase_8_Final_Review.md). Phase8 development checkpoint is closed with these limitations. Next: Phase9 prerequisites/first incomplete slice only when authorized; Phase6 deferred. No next-phase work started.

**Phase 8 individual confirmed-use entries connected/deployed (16 October); phone verification pending.** Financial Analytics now lists the latest20 confirmed uses on/before expiry, with current Pantry names, immutable outcome category/value/expiry, explicit unknown/estimated/zero prices and protected detail links. Aggregate and list reads share a scoped RepeatableRead snapshot; Undo and capped coverage are validated. Both TypeScript/build, root206/206, backend122/122, health1/1, HTTPS SQL11/11 and all-platform/35-route exports pass. Development Preview Ready, health200/tokenless analytics401; ignored API URL updated, Auth preserved. See [individual-entry report](docs/Phase_8_Individual_Entries.md). Category and individual phone acceptance remain pending, followed by failure/native/accessibility QA and final Phase8 review. Existing local Prisma/Doctor/lint gaps remain; Phase6 deferred, no Phase9.

**Phase 8 category breakdown connected/deployed (16 October); iPhone verification pending.** Series now includes seven selected-month outcome-time category partitions from the same scoped snapshot as totals. Insights shows consumed categories/View All; Financial shows confirmed waste/segmented shares. Estimates, unknowns, zero and unconfirmed outcomes remain separate; exact category sums are validated against headers. Both TypeScript/build, root202/202, backend118/118, health1/1, HTTPS SQL8/8 and final all-platform/35-route exports pass. Preview Ready, health200/tokenless analytics401; ignored public API URL updated, Auth preserved. Doctor20/21/lint/native/local Prisma gaps remain. See [category report](docs/Phase_8_Category_Breakdown.md). Next: numbered category phone checks, then individual rescue data and final review. Phase6 deferred; no Phase9.

**Phase 8 monthly Analytics/Insights passed iPhone checks by user report (16 October).** User answered “All checks passed” to the 13-step checklist covering active-item exclusion, exact consumed/waste/unknown-price changes, chart values, Undo cancel/restore/reconfirmation without duplicate cost, restart, previous/current/invalid/future months, report/share cancellation and sign-out/Demo separation. Recorded as user report, not direct observation or per-step numeric evidence. Prior root199/backend115/health1/HTTPS SQL6 and all-platform/35-route exports pass; both TypeScript checks pass again. See [mobile report](docs/Phase_8_Mobile_Analytics.md). Remaining: category/individual rescue data, further edge/native QA and final Phase8 review. Local Prisma/maintenance gaps remain; Phase6 deferred, no Phase9.

**Phase 8 real Insights/Financial views connected and deployed (16 October), iPhone verification pending.** Existing routes preserve Demo and use a scoped shared six-month analytics provider for real accounts. Exact INR values/coverage, month navigation, consumed/waste charts, previous-month deltas, report preview/share, retry/empty states and existing reconciliation are connected. Unsupported scores/carbon/category/individual-rescue metrics remain unavailable; no fake savings. Both TypeScript/build, root199/199, backend115/115, health1/1, HTTPS SQL6/6 and all-platform/35-route exports pass. Preview Ready, health200/tokenless analytics401; ignored API URL updated with Auth preserved. Doctor20/21 (six patch recommendations) and lint gaps remain; local Prisma unresolved. See [mobile report](docs/Phase_8_Mobile_Analytics.md). Next: numbered iPhone acceptance, then remaining design/data/QA/final review. Phase6 deferred; no Phase9.

**Phase 8 hosted Prisma diagnostic passed by user report (16 October).** User reported “Backend database verified” using the existing Settings control against the already-hosted development API. This establishes reported hosted database reachability, not new analytics endpoint acceptance. Six synthetic analytics SQL tests passed over test-only Neon HTTPS; the laptop's local Prisma failure remains unresolved. Prior root189/backend115/health1, both TypeScript/build pass. No runtime/deployment change. See [verification report](docs/Phase_8_SQL_Transport_Verification.md). Next: connect supplied Analytics/Insights screens to summary/series, deploy development Preview and verify the new authenticated analytics flow. Existing native/maintenance gaps remain; Phase6 deferred, no Phase9.

**Phase 8 live SQL verified via Neon HTTPS (16 October); local Prisma connectivity unresolved.** Six synthetic read-only PostgreSQL cases now pass, including summary/series reconciliation and Undo/timezone boundaries, using an explicit test-only HTTPS transport. The API still uses Prisma; its local integration run and longer-timeout probes fail to connect, so runtime/transaction acceptance is not claimed. Both TypeScript/build, root189/189, backend115/115 and health1/1 pass. No runtime/schema/dependency/environment/deployment or mobile changes. See [transport verification](docs/Phase_8_SQL_Transport_Verification.md). Next: existing Settings → Check Backend Database phone diagnostic for hosted Prisma, then supplied Analytics/Insights connection. Existing maintenance/native gaps remain; Phase6 deferred, no Phase9.

**Phase 8 monthly series/comparison implemented locally (16 October); live SQL verification pending.** Added protected /api/v1/analytics/series with 2–12 ascending month points, exact purchase-only signed deltas, explicit complete/month-to-date/future labels and no future-month deltas. Summary/series share scoped effective-outcome SQL and Undo rules. Both TypeScript/build, root189/189, backend114/114 and health1/1 pass. Six read-only synthetic Neon SQL tests failed before assertions because Prisma could not connect, including after user switched to hotspot; the preceding summary SQL4/4 is historical, not a current series pass. No record writes, schema/dependency/environment/deploy or mobile changes. See [series report](docs/Phase_8_Monthly_Series.md). Next: restore development database connectivity and rerun six SQL tests, then connect supplied Analytics/Insights UI. Existing Doctor/lint/native gaps remain; Phase6 deferred, no Phase9.

**Phase 8 started — first monthly summary backend slice tested locally (16 October).** Added authenticated GET /api/v1/analytics/summary with strict optional household month, grouped immutable event snapshots and latest-effective-outcome/Undo rules. Purchase/estimate/unknown values and unconfirmed outcomes remain separate; exact paise strings and snapshot expiry-day classification avoid invented savings/partial quantities. Both TypeScript/build, root189/189, backend107/107, health1/1 and read-only synthetic Neon SQL4/4 pass. No application records read/written by integration fixtures, schema/dependency/environment/deploy or mobile UI changes. Existing Doctor/lint/native QA gaps remain. See [monthly summary report](docs/Phase_8_Monthly_Summary.md). Next: monthly series/previous-month comparison, then supplied Analytics/Insights UI connection. Phase6 deferred; Phase9 unstarted.

**Phase 7 — development acceptance complete (16 October).** Final development review and core Recipes/details/shopping checks are recorded; the user now answered “All checks passed” to the latest ten-step iPhone checklist covering metadata loading, Quick/Vegetarian/Vegan composition, filter clearing, recipe details, shopping deduplication and return navigation. This is user-reported evidence, not direct agent observation. Prior final automated results: root189/189, backend100/100, health1/1, both TypeScript/build and all-platform/35-route exports pass. Broader Android/signed-build/failure-path/accessibility QA, Doctor20/21 and existing lint gaps remain. See [final review](docs/Phase_7_Final_Review.md). Phase6 remains deferred. Next proposed phase: Phase8 event-based waste analytics, only when authorized; Phase8/9 have not started.

**Phase 7 final development review complete (15 October); latest filter phone acceptance pending.** All implementation items were reviewed against the five plan criteria. Fresh reruns pass: mobile/backend TypeScript and backend build, root189/189, backend100/100, health1/1, all-platform/35-route exports, hosted health200 and all four tokenless Chef endpoints401. Core Recipes/details/shopping passed prior user-reported iPhone checks; the user explicitly confirmed the latest ten-step Quick/Vegetarian/Vegan checklist is not tested yet. Existing Doctor20/21 and lint setup gaps remain. No runtime/schema/dependency/environment/deployment changes in this review. See [final review](docs/Phase_7_Final_Review.md). Exact next step: complete and record the outstanding filter phone checklist. Phase6 deferred; Phase8/9 not started.

**Phase 7 ranking and time/diet filters implemented (15 October), iPhone verification pending.** Rescue ranking prioritizes today over tomorrow, distinct rescue names, Pantry name coverage, fewer shopping candidates, known total time and stable recipe ID. Explicit metadata loading enables 15-minute Quick and provider-tagged Vegetarian/Vegan filters on the current five-result shortlist; unknown values are excluded. Preferences are session-only. Normal suggestions make no extra metadata call; failures preserve ordinary suggestions and shopping. Both TypeScript/build, root189/189, backend100/100, health1/1 and all-platform/35-route exports pass; a generic live search/bulk metadata probe returned five validated rows. Development Preview Ready, health200/tokenless filters401; ignored public API URL updated. Doctor20/21 (six existing patch recommendations) and lint gaps remain. See [ranking/filter report](docs/Phase_7_Ranking_Filters.md). Next: iPhone checks and final Phase7 review. Phase6 deferred; no Phase8/9.

**Phase 7 mobile Recipes/details/shopping passed iPhone checks by user report (15 October).** Real accounts use authenticated Chef APIs and shared matching, actual instructions/source links, explicit error/empty/retry states and account/session-isolated save/shopping controls. Demo is preserved; cooking opens Pantry review without automatic outcomes. Both TypeScript/build, root185/185, backend94/94, health1/1 and all-platform/35-route exports pass. Doctor20/21 and lint gaps remain. Development Preview is Ready, health200/tokenless Chef401; Preview-only key configured and ignored public API URL updated. User answered “All checks passed” to the numbered iPhone checklist, covering real suggestions/details, matching/shopping, source return, unchanged Pantry outcomes, sign-out reset and Demo separation. This is user-reported evidence, not direct agent observation. Next: remaining filters/ranking and final review. See [mobile report](docs/Phase_7_Mobile_Recipes.md). Phase6 deferred; Phase5 native QA limits remain.

**Phase 7 full-Pantry matching implemented (15 October), mobile/hosted pending.** Suggestions/details now match a fresh scoped non-expired active inventory with exact names/curated aliases, check-first staples, conservative quantity checks and deduplicated name-only shopping candidates. Only rescue names go to Spoonacular; account matches never enter provider cache. Both TypeScript/build, root172/172, backend94/94 and health1/1 pass. No live provider/DB calls, mobile, deployment, schema or dependency changes in this slice. Next: supplied Recipes/details/shopping UI connection. See [matching report](docs/Phase_7_Ingredient_Matching.md). Phase 6 remains deferred; Phase 5 native QA limits remain.

**Phase 7 recipe details implemented (15 October), mobile/hosted connection pending.** Protected /api/v1/chef/recipes/:recipeId rechecks current household suggestions before fetching real provider ingredients, instructions, servings/times and attribution. Missing instructions are explicit; details/search share bounded transport, five-minute cache and rate/quota protection. Live generic search/detail passed (9 ingredients/4 structured steps); both TypeScript/build, root172/172, backend80/80 and health1/1 pass. No mobile/deployment/schema/dependency change. Next: full-Pantry ingredient/staple matching, then supplied UI connection. See [detail report](docs/Phase_7_Recipe_Details.md). Phase 6 remains deferred; Phase 5 native QA limits remain.

**Phase 7 server recipe search implemented (15 October), mobile/hosted connection pending.** The locally saved key loaded and one generic live search returned five parsed Spoonacular summaries. POST /api/v1/chef/suggestions derives only current scoped rescue names; header-only provider credentials, bounded responses, safe errors, process-local rate/coalescing and five-minute cache are implemented. Both TypeScript/build, root172/172, backend66/66 and health1/1 pass. No instructions/detail endpoint, full-household missing matching, mobile UI connection or deployment yet. Next: server recipe details then shared ingredient matching/UI. See [search report](docs/Phase_7_Recipe_Search.md). Phase 6 remains deferred; Phase 5 native QA limits remain.

**Phase 7 started (15 October); Phase 6 deferred by user.** First local backend slice adds authenticated, read-only /api/v1/chef/expiring with household-scoped ACTIVE ingredients and explicit today/tomorrow calendar semantics (not exact 48-hour precision). No provider calls or mobile UI connection yet. Both TypeScript/build, root172/172, backend54/54 and health1/1 pass. No Spoonacular key yet; next: direct Free account/key setup and server-only integration. No deployment, schema/dependency/data change. See [ingredient slice](docs/Phase_7_Expiring_Ingredients.md). Phase 5 native QA remains recorded in its final review.

**Phase 5 final development review complete (15 October); full native acceptance pending.** All eight implementation items have recorded regression evidence and iPhone user reports. Final reruns: both TypeScript checks/build, root172/172, backend48/48, health1/1, all-platform/35-route exports and hosted health200/tokenless Pantry401 pass. Doctor20/21 now recommends six patch updates; existing lint setup gaps remain. Actual iOS/Android development-build actions and broader native failure/capacity/accessibility QA remain unverified. No runtime/schema/dependency/deploy change; no Phase 6 work. See [final review](docs/Phase_5_Final_Review.md). Historical checkpoints below are superseded by this status.

**Phase 5 item 8 iPhone diagnostic passed by user report (14 October):** live overdue banners in Pantry and Financial Analytics open protected /pantry/reconcile. Search, single/bulk confirmed Used/Wasted (cap20), exact INR/unknown values, selection/pending/read-only guards, frozen-version/same-key retries and existing Undo integration are connected. Demo is preserved; real analytics metrics remain Phase 8. Both TypeScript/build, root172/172, backend48/48, health1/1, live Pantry17/17 with cleanup and final all-platform/35-route exports pass. Doctor20/21 and existing lint gaps remain. See [reconciliation UI report](docs/Phase_5_Reconciliation_UI.md). User answered “All checks passed” for banner/search, single/bulk Cancel/Confirm, Undo, restart and Financial Analytics entry. Recorded as user report, separate from database tests. Broader native checks and final Phase 5 review remain; no Phase 6 work.

**Phase 5 item 7 iPhone check reported working (14 October):** user chose to keep expired groceries ACTIVE until confirmed Used/Wasted. A coalesced, verified startup/resume and mutation-triggered live overdue check uses server household days, works with reminders Off and invalidates stale/account/cache-test reads. After receiving the numbered phone checklist and empty-Pantry date guidance, the user replied “yes working”. Recorded as a broad user report without per-step numeric counts or direct agent observation. Item 8 release reconciliation UI remains unstarted. Both TypeScript/build, root166/166, backend48/48, health1/1 and final all-platform/34-route exports pass. Doctor20/21 and existing lint gaps remain. See [overdue-policy report](docs/Phase_5_Overdue_Policy.md). No automatic assumed-consumed/SYSTEM outcome, schema/API/dependency/deploy change or Phase 6 work.

**Phase 5 item 6 development and iPhone diagnostic checks passed (14 October):** guarded live tests run the mobile outbox against the existing Pantry service/Neon development database. Lost-response/restart Used and Wasted, concurrent first confirmation, same-key payload-change rejection, superseded/stale/foreign requests and transaction rollback pass with authoritative event counts. Final live7/7 and fixture cleanup pass; both TypeScript/build, root157/157, backend48/48 and health1/1 pass. Doctor20/21 and existing lint gaps remain. See [retry validation report](docs/Phase_5_Retry_Validation.md). User answered “All checks passed” to the boxed iPhone checklist: single-entry submit guard, repeated retries, restart, Undo cancellation/restoration and Wasted persistence. Recorded as user report, separate from authoritative database counts. Items 7–8 and real-build/Android/failure-path QA remain; no Phase 6 work.

**Phase 5 item 5 iPhone diagnostic reported complete (14 October):** confirmed notification outcomes persist before sending in account/branch-scoped SecureStore, retain the original version/key across retries/restart, and resume only after matching verified authentication. Pending/review UI, competing-write guards and a persisted development sync-pause diagnostic are implemented. Both TypeScript/build, root157/157, backend40/40, health1/1 and all-platform/34-route exports pass. Doctor20/21 still recommends three existing Expo patch updates; lint setup gaps remain. See [offline action report](docs/Phase_5_Offline_Actions.md). User reported the item test complete after identifying the grey buttons as an existing pending-outcome guard; per-step counts were not supplied. Actual native transport-loss/development-build/Android checks and item 6 final live retry verification remain; items 7–8 are unstarted. No Phase 6 work.

**14 October — item 5 phone check in progress:** user reports greyed-out notification test buttons on Retry Test Waste. Added an explicit reason next to disabled controls (unsaved edits, item request busy, or an existing saved outcome), preserving duplicate-action guards. Both TypeScript checks, root157/157 and all-platform/34-route exports pass. The user subsequently confirmed the displayed blocker was an already-saved outcome; disabling repeat confirmation was expected. User later reported the item test complete; broader native failure/build QA remains pending.

**Phase 5 item 4 iPhone prototype verified (13 October), development-build acceptance pending:** local reminders offer Consumed/Wasted actions that open current item details and the existing confirmation sheet after verified authentication. Scoped/deduplicated response handling, read-only/outcome guards and legacy queue upgrades are implemented. Both TypeScript/build, root139/139, health1/1 and all-platform/34-route exports pass. Doctor20/21 recommends three newer existing Expo patch versions; lint setup gaps remain. See [notification actions report](docs/Phase_5_Notification_Actions.md). User reports notification buttons, Cancel, confirmed Used/Wasted, closed-app opening, restart persistence and disable cleanup pass in Expo Go. Native iOS/Android development-build action checks are pending; items 5–8 remain incomplete. No offline action queue or Phase 6 work.

**Phase 5 item 3 verified on iPhone (13 October):** reminders reconcile automatically after acknowledged Pantry/preference changes and verified startup/resume. Coalesced live reads, stale-generation guards, permission recheck and safe retry preserve account/read-only boundaries; explicit Sync shares the coordinator. Both TypeScript/build, root132/132, health1/1, Doctor21/21 and all-platform exports pass; existing lint gaps remain. See [automatic reconciliation report](docs/Phase_5_Automatic_Reconciliation.md). User reports automatic add/edit, Used/Wasted cancellation and undo, time change, restart and repeated-resume checks pass without manual Sync. Next: item 4 notification actions when authorized. Items 4–8 remain incomplete.

**Phase 5 item 2 verified on iPhone (12 October):** explicit live Pantry Sync schedules T−3/T−1/expiry at saved device-local time, skips past targets, preserves queue/retry identity and bounds nearest alerts to 60. User reports repeated-sync/no-duplicate, restart, actual local notification arrival and disable/zero-after-restart checks pass. Necessary preference/account/item cancellation safeguards added; automatic rescheduling is still item 3. Both TypeScript/build, root124/124, health1/1, Doctor21/21 and all-platform exports pass; existing lint gaps remain. See [local scheduling report](docs/Phase_5_Local_Scheduling.md). Next: item 3 automatic lifecycle/resume reconciliation. Items 4–8, Android/standalone/failure-path QA remain incomplete.

**Phase 5 item 1 verified on iPhone (12 October):** signed-in native Settings has contextual notification permission, blocked/retry recovery and device/account-scoped reminder On/Off and HH:MM persistence. Demo/digest preserved; this permission-only checkpoint is superseded by item 2 above. SDK-compatible expo-notifications ~57.0.22 installed. Both TypeScript checks, root111/111, health1/1, Doctor21/21 and all-platform exports pass; existing lint gaps remain. See [permission/preferences report](docs/Phase_5_Permission_Preferences.md). User reports permission/opt-in, time validation/restart and disable/restart checks pass. Optional native blocked-permission recovery remains unverified. Next: item 2 scheduling when authorized. Items 2–8 remain incomplete.

**Phase 4 — core development acceptance complete (12 October):** all six plan criteria reviewed against code, passing regression tests, recorded live database tests and user-reported iPhone checks. Final reruns: both TypeScript/build, root102/102, backend48/48, health1/1, database readiness/migration status, Doctor21/21 and all-platform exports pass; hosted health200/tokenless Pantry401 pass. Existing lint gaps and native transport/conflict/retry/full-cap/Android/release QA remain unverified. See [final review](docs/Phase_4_Final_Review.md). No Phase5; next authorized slice would be contextual notification permission/preferences.

**Persisted Pantry copy verified on iPhone (12 October):** native SecureStore holds up to 20 scoped active entries for 24 hours, restores read-only after verified authentication, and clears on successful sign-out. Auth gate and online mutations preserved; no offline write queue. Both TypeScript/build, root102/102, backend48/48, health1/1, Doctor21/21 and all-platform exports pass. Existing lint gaps remain. See [persisted-cache report](docs/Phase_4_Persisted_Cache.md). User reports saved-copy restart with values retained, blocked writes/swipes, live recovery and sign-out/relogin cleanup pass. This storage diagnostic used internet for authentication; actual native transport-failure checks remain unverified. Next: Phase4 final review. No Phase5.

**Session-cache diagnostic verified on iPhone (12 October):** session-only cached Pantry list/details and local filtering are read-only during availability failures. Auth gate preserved; Context blocks writes. Both TypeScript, root94/94, backend44/44, health1/1 and Doctor21/21 pass. Final all-platform exports pass; User reports cached reads/blocked writes/recovery/sign-out diagnostic checks pass; actual offline/restart behavior remains unverified; see [offline-read report](docs/Phase_4_Offline_Reads.md). This session-only checkpoint is superseded by the persisted-cache acceptance above. Final Phase4 review remains; no Phase5.


**Manual duplicate review verified on iPhone (12 October):** authenticated household-scoped exact
name/category/date checks, cancellable previews and explicit Add Separately are connected to Add.
Create rechecks transactionally and preserves existing purchases; exact payload/key retries avoid
duplicating an uncertain save. Both TypeScript/build, root88/88, backend44/44, live Pantry17/17 with
cleanup, health1/1, Doctor21/21 and final all-platform exports pass. Existing lint gaps remain.
Development Preview READY; public health200/tokenless duplicate-check/create401 pass. User reports duplicate review/cancel, separate-add/restart, original values and changed-date checks pass; see [duplicate report](docs/Phase_4_Pantry_Duplicates.md).
Next after acceptance: Phase4 offline support and final review. Scanner imports remain Phase6; no Phase5.


**Server-wide Pantry filters verified on iPhone (12 October):** search/category/freshness matching and
expiry/name/alphabetic-category sorting now run before API pagination. Full-household category
counts, criteria-preserving refresh/Load More, debouncing and stale-response guards are connected
to existing controls. Both TypeScript/build, root85/85, backend42/42, live Pantry14/14 with cleanup,
health1/1, Doctor21/21 and all-platform exports pass. Existing lint gaps remain. An interrupted run
required guarded synthetic recovery; the next run exposed/fixed enum category ordering. Final checks
pass. Development Preview READY; public health200/tokenless filtered Pantry401 pass. User reports search/composed filters, sorting/refresh/counts, rapid-change/no-match recovery and
selection reset pass; see
[filters report](docs/Phase_4_Pantry_Filters.md). No Phase5 or production writes.


**Expiry presets verified on iPhone (12 October):** Add/Edit now support editable estimates and package > manual > estimate precedence. Both TypeScript/build, root84/84, backend38/38, Doctor21/21 and all-platform exports pass. Live Pantry12/12 and fixture cleanup pass; development Preview is READY, public health200/tokenless mutations401 pass. User reports estimate/restart, invalid/custom duration, package priority/restart and manual override checks pass; see [expiry report](docs/Phase_4_Expiry_Presets.md).


**Batch/undo is deployed to development and its requested iPhone checks pass by user report.**
These include batch Used cancellation/confirmation, undo cancellation/restore/restart, batch Waste/restore
and single-detail undo. Native failure paths, full-cap batches and Android remain unverified.
Neon readiness and synthetic cleanup recovered. Final sequential live Pantry tests11/11 pass and
zero reserved test memberships remain. See [batch/undo report](docs/Phase_4_Batch_Undo.md).
Expiry presets are now verified as recorded above. Next: server-wide filters, duplicate/offline handling and final review.

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
