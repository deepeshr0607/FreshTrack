# AGENTS.md — FreshTrack Agent Instructions

> **Read this file before editing any code.**
> Read `README.md` and `docs/FreshTrack_Implementation_Plan.md` for additional context.
> Run `git log --oneline -10` and `git status` to find the current state.

---

## 1. Project Overview

FreshTrack is a cross-platform mobile application that reduces household food waste. It lets users track groceries, monitor freshness and expiry dates, receive local notifications, discover recipes from near-expiry ingredients, and review the financial cost of wasted food.

**Stack:**
- Mobile: React Native + Expo (managed workflow) + TypeScript + Expo Router
- Backend: Node.js + Express + TypeScript, deployed to Vercel
- Database: Neon PostgreSQL via Prisma ORM
- Auth: Neon Auth (Managed Better Auth) — must be verified for Expo/React Native OTP flow before using
- Third-party APIs (server-side only): Google Cloud Vision (OCR), Spoonacular (recipes)

---

## 2. Repository Layout

```
FreshTrack/
├── app/                         # Expo Router routes
│   ├── (auth)/                  # sign-up, OTP verify, sign-in (Phase 2)
│   ├── (tabs)/                  # Pantry, Scanner, AI Chef, Analytics (Phases 1–8)
│   ├── settings/                # profile, notifications, privacy (Phase 9)
│   └── _layout.tsx              # root navigator
├── assets/                      # fonts, icons, splash
├── components/                  # reusable UI components (Phase 1+)
├── context/                     # React Context providers (Phase 2+)
├── features/                    # feature modules: pantry, scanner, chef, analytics, auth
├── lib/                         # API client, date/currency helpers, validation
├── types/                       # shared TypeScript types
├── design-reference/            # supplied screen designs (READ BEFORE IMPLEMENTING UI)
├── docs/                        # product spec and implementation plan
├── backend/
│   ├── src/
│   │   ├── app.ts               # Express application factory
│   │   ├── server.ts            # HTTP server entry-point
│   │   ├── routes/              # route registration
│   │   ├── controllers/         # HTTP boundary only (Phase 3+)
│   │   ├── services/            # business rules and integrations (Phase 3+)
│   │   ├── middleware/          # auth, validation, errors, rate limits (Phase 3+)
│   │   ├── integrations/        # Vision and Spoonacular clients (Phases 6–7)
│   │   └── lib/                 # Prisma singleton, logger, config (Phase 3+)
│   ├── prisma/
│   │   └── schema.prisma        # placeholder; full schema in Phase 3
│   ├── tests/
│   │   └── health.test.ts       # health endpoint test (passing)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example             # required env vars with dummy values — NO real secrets
├── tests/                       # mobile/shared integration tests (Phase 1+)
├── AGENTS.md                    # THIS FILE
├── README.md
├── .gitignore
└── package.json                 # Expo app scripts and dependencies
```

---

## 3. Architectural Boundaries

These boundaries are **non-negotiable**:

1. **No secrets in mobile code.** Database URL, Google Cloud credentials, and Spoonacular API key must only appear in Vercel environment config and `backend/.env`. Never in `EXPO_PUBLIC_*` variables, mobile source, or the repository.

2. **No direct database access from mobile.** All data flows through authenticated HTTPS endpoints in `backend/`.

3. **Third-party APIs are server-side only.** Google Cloud Vision and Spoonacular must only be called from the backend.

4. **Authentication must be verified before production data endpoints.** Do not build full auth/session infrastructure until the Expo + Neon Auth OTP flow is confirmed to work (Phase 2 gate).

5. **Expo Router is the navigation layer.** All routes live in `app/`. Do not use `react-navigation` directly.

6. **Use `npx expo install` for Expo-managed native modules** — not `npm install` — to get SDK-compatible versions.

---

## 4. Security Rules

- Never log OTPs, tokens, secrets, raw session material, or receipt image content.
- Validate every request body, route param, and query param on the server.
- Every user-owned API endpoint must derive identity from a verified server-side session — never trust a client-supplied `userId`.
- Every pantry query must be scoped to the authenticated user's household.
- Make status-changing endpoints idempotent (use idempotency keys for notification actions).
- Use database transactions for status changes that must also append a `PantryItemEvent`.
- Keep test data strictly separate from production data.

---

## 5. Coding Conventions

### General
- TypeScript strict mode is enabled in both mobile and backend.
- Run `npx tsc --noEmit` before declaring any change done.
- Do not leave `console.log` debug statements in committed code.
- Preserve all existing comments and docstrings unless you have a documented reason to remove them.

### Mobile (Expo / React Native)
- File-based routing with Expo Router. Route files live in `app/`. Non-route code lives in `components/`, `features/`, `lib/`, `context/`, `types/`.
- Import `Link`, `router`, `useLocalSearchParams` from `expo-router`.
- Import UI primitives from `react-native`, not from `@react-native-community/...` packages unless Expo recommends them.
- Check `docs/FreshTrack_Implementation_Plan.md § 11` for official documentation URLs before implementing any Expo SDK integration.
- Never add `ios/` or `android/` directories manually — Expo manages them.

### Backend (Express / TypeScript)
- The Express app is in `backend/src/app.ts` (factory function, no `listen` call).
- The server entry-point is `backend/src/server.ts` (imports factory, calls `listen`).
- Keep controllers thin (HTTP boundary only). Business logic goes in `services/`.
- Use `prisma` singleton from `backend/src/lib/` (to be created in Phase 3).
- Use structured logging; do not use `console.log` in production paths.
- Return a consistent response shape: `{ data: ... }` for success, `{ error: { code, message, requestId } }` for failures.

### Design
- Reproduce the supplied designs in `design-reference/` — do not invent a different visual direction.
- Use the design tokens from `design-reference/freshtrack_design_system/DESIGN.md`.
- Primary font: **Plus Jakarta Sans**.
- Primary palette: Emerald green (`#006948` / `#059669`), Amber (`#F59E0B`), Rose (`#F43F5E`), Azure (`#0EA5E9`), Neutral surface (`#FAF8FF`).

---

## 6. Phase-by-Phase Workflow

### Before each phase
1. Read this file, `README.md`, the current phase in `docs/FreshTrack_Implementation_Plan.md`, `git status`, and recent commits.
2. Inspect the current implementation and tests before editing files.
3. Work on only one phase at a time — never implement two phases in one pass.
4. Use the official versioned docs (links in `docs/FreshTrack_Implementation_Plan.md § 11`) for any Expo/SDK API.

### After each phase
1. Run `npx tsc --noEmit` (mobile), `cd backend && npx tsc --noEmit` (backend), and all applicable tests.
2. Fix all errors introduced by the changes.
3. Report changed files, commands run, results, and remaining work honestly.
4. Update the **Project Status** section in `README.md` and this file.
5. Review `git diff` — remove debug logs and check for secrets.
6. Commit the checkpoint before starting the next phase.

### Handoff prompt for Codex
> Continue the existing FreshTrack repository; do not recreate it. Read `AGENTS.md`, `README.md`, and `docs/FreshTrack_Implementation_Plan.md`, inspect `git status` and recent commits, and determine the first incomplete acceptance criterion in the current phase. Implement only that phase's next small vertical slice. Preserve the existing Expo SDK, designs, API contracts, and Prisma schema unless a documented issue requires a change. Use current official docs for SDK-sensitive integration. Run the applicable tests and checks; report actual results and remaining gaps. Do not start another phase until asked.

---

## 7. Design Reference Index

All screen designs are in `design-reference/`. Inspect every image before implementing any UI.

| Directory | Screen / State |
|---|---|
| `freshtrack_welcome_get_started_centered_hero/` | Welcome / landing screen with "Get Started" CTA |
| `freshtrack_account_sign_up_login/` | Sign-up form (name, email, password, digest opt-in) |
| `freshtrack_account_log_in/` | Log-in form (email, password, remember device, social auth) |
| `freshtrack_dynamic_hub/` | Home/Dashboard tab — kitchen digest, rescue value, expiring items carousel, actionable recipes, recent additions with swipe actions |
| `kitchen_inventory_swipe_actions/` | Pantry/Inventory tab — search, filter chips, dual-tier freshness engine banner, item cards with swipe-right (used) / swipe-left (wasted) |
| `packaged_item_expiry_verification/` | Scanner — packaged item expiry verification modal with camera, date OCR, barcode, item queue |
| `receipt_ocr_scanner/` | Scanner — receipt OCR modal showing detected haul, parsed groceries, and "Add Haul to Kitchen Inventory" action |
| `recipe/` | AI Chef / Recipes tab — rescue-first ingredients, filter chips, featured recipe card, "Cook With What You Have" list, AI Fridge Chef input |
| `financial_eco_analytics/` | Analytics / Insights tab — waste prevention score, money saved, food wasted, CO₂ prevented, monthly waste trend chart, category breakdown, hero rescues |
| `freshtrack_design_system/` | Design system tokens (DESIGN.md): colors, typography, spacing, elevation, components |

---

## 8. Current Phase and Status

### Phase 0 — COMPLETE ✓

**Completed tasks:**
- [x] Audited existing Expo SDK 57 + Expo Router + TypeScript project
- [x] Preserved existing Expo Router and TypeScript configuration
- [x] Created project structure: `components/`, `features/`, `context/`, `lib/`, `types/`
- [x] Created `backend/` Express TypeScript project with health endpoint
- [x] Backend TypeScript check passes (`npx tsc --noEmit` → 0 errors)
- [x] Mobile TypeScript check passes (`npx tsc --noEmit` → 0 errors)
- [x] Health endpoint test passes (`GET /api/v1/health` → 200 `{ data: { status: "ok" } }`)
- [x] Backend: `backend/.env.example` created with all required variable names
- [x] `.gitignore` updated to exclude all `.env` variants and `backend/dist/`
- [x] `AGENTS.md` created (this file)
- [x] `README.md` created with setup instructions and current status

**Pre-existing issue fixed:**
- `components/ExternalLink.tsx` had a type error in the Expo SDK 57 template (`href` prop). Fixed by casting to the correct Expo Router `Href` type.

**Not yet done (later phases):**
- [ ] Expo starter tested on a real device or simulator (requires running `expo start` in a terminal with a device connected — cannot be automated)
- [ ] Authentication (Phase 2)
- [ ] Database schema and Prisma migrations (Phase 3)
- [ ] Pantry CRUD API and screens (Phases 1 + 4)
- [ ] Notifications (Phase 5)
- [ ] Scanner / OCR / barcode (Phase 6)
- [ ] AI Chef / Spoonacular (Phase 7)
- [ ] Analytics (Phase 8)
- [ ] Settings, privacy, release (Phase 9)

### Current phase: Phase 2 — FINAL ACCEPTANCE REVIEW PENDING

- User approved Phase 2 continuation and the lower-level Neon API native proof of concept.
- Development credentials are in ignored `backend/.env`; only public Auth URL is in ignored
  `.env.local`. The tracked environment example contains placeholders.
- Added development-only Welcome entry to `/(auth)/native-check`: real email OTP transport,
  branch-scoped Expo SecureStore, server-checked session restoration and provider sign-out.
- Published Neon Auth 0.5.0-beta has no Expo entry point; Expo adapter PR #213 remains draft.
  User confirmed real email delivery, OTP acceptance and verified signed-in session on iPhone.
  Initial bearer restoration failed; signed provider-cookie correction passed native sign-in.
  Restart persistence and sign-out/restart also pass user testing. Sign-out needed Origin/Referer;
  user approved http://192.168.1.21:8085 in development's trusted domains. Custom freshtrack://
  scheme was rejected by Neon. Production has not been changed.
- Mobile/backend TypeScript, 39 unit tests, backend health test and three-platform exports pass.
  Backend lint still lacks eslint. See `docs/Phase_2_Auth_Proof_of_Concept.md` for limits and checks.
- Remaining item 1 implemented: existing native sign-up/password login/OTP/resend call Neon;
  web and explicit native Preview Demo remain prototypes. Verified login finishes at native-check
  with provider sign-out and Continue to Demo Kitchen; protected routing is the next slice.
- Remember-device choice controls SecureStore versus process memory, including cookie rotation.
  New-account email/OTP, wrong-password failure, password login and both remember-device
  restart cases pass user testing on iPhone. Email-verification resend/newest-code verification also
  passes by user report; 48 unit tests pass.
- Both TypeScript checks, backend health 1/1, Expo Doctor 21/21 and all-platform exports pass.
  Existing backend ESLint absence/mobile no lint script remain. This slice adds no dependencies.
- Password recovery/OAuth/biometrics are not connected. Real identity is not a mock kitchen profile.
- Remaining item 2 implemented: shared AuthContext, serialized provider checks, startup/resume loading,
  SDK 57 Stack.Protected for all kitchen routes, public Privacy, direct Home after auth/restoration,
  provider identity/read-only details/real Sign Out in Settings, explicit process-only demo mode.
- iPhone user reports startup/restart/Home/Settings identity, item/back, sign-out/private-history/deep-link
  blocking and demo/exit pass. Browser private deep links/demo/exit/public Privacy checks pass.
- 55/55 tests, both TypeScript checks, backend health 1/1, Expo Doctor 21/21 and all-platform exports pass.
  Lint setup gaps remain. Demo is disabled in production native; mock Pantry/recipe state is scoped by
  session identity. No real data API, backend authentication or additional dependency in this slice.
- Remaining item 3 implemented: provider JWT from authenticated /token, backend jose/JWKS EdDSA
  signature/issuer/audience/expiry/subject/verified-email checks, GET /api/v1/auth/me and reusable
  authentication middleware. No client-supplied userId is trusted. No database/data API changes.
- User reports Settings → Check Backend Identity passes on iPhone. Live development JWKS returns
  200, health returns 200 and unauthenticated identity returns 401. 60 mobile/shared tests and seven
  backend auth tests pass, health 1/1, both TypeScript checks, Doctor 21/21 and all-platform exports pass.
- JWTs are not persisted by mobile and may remain valid for up to their 15-minute lifetime after
  provider sign-out. Production revocation policy remains an explicit acceptance decision.
- Next: deliberate provider failure-policy/offline checks and remaining Phase 2 acceptance review.
  Android and release checks remain incomplete. Phase 2 changes are uncommitted;
  no Phase 3 work is authorized.
- Remaining item 4 complete for iPhone development checks: non-JSON HTTP auth failures preserve status, rate-limit labels are
  safe/allowlisted, verified/non-banned restoration required, and existing-code diagnostic avoids
  replacing OTPs during reuse/expiry checks. No additional dependency or database change.
- iPhone offline resume/private blocking and reconnect/retry pass by user report. Wrong OTP, valid
  retry and reused-code rejection also pass. User confirmed Too many attempts and fresh-code recovery.
  Email states a 10-minute lifetime; user reports expired-code rejection and fresh-code recovery
  after the requested 11-minute wait. Final acceptance/production/revocation review remains open.
  Fixtures alone are not proof of provider policy.
- 65/65 root tests, backend auth 7/7, health 1/1, both TypeScript checks, Doctor 21/21 and all-platform
  exports pass. See docs/Phase_2_Failure_Checks.md. Android/revocation/release decisions remain open.
- Item 5 local release preparation complete: EAS preview/production profiles, dynamic config that
  preserves app.json, explicit owner-supplied IDs/project/public HTTPS inputs, input validation and
  release template. Expo Go config/dev env untouched; no repository dependency added.
- Root tests 70/70, focused config 5/5, official EAS schema, both TypeScript checks, auth 7/7,
  health 1/1, Doctor 21/21 and all-platform exports pass. Synthetic release resolution is not a build.
- User has no paid Apple membership; no EAS linking/account/env/signing/build/deploy/upload ran.
  Android device testing and live production/signing checks are deferred. See release configuration doc.
- Next: final Phase 2 acceptance/architecture/JWT revocation review and checkpoint before Phase 3.
- Do not start Phase 3 or production data endpoints until the Phase 2 native auth gate passes.

### Phase 1 — remaining QA deferred by user

- Existing welcome/auth/OTP/Home/Pantry/scanner prototype preserved; shared Pantry detail/edit,
  missing-item state and Used/Wasted sheets remain implemented.
- Recipes, details/missing ingredients, shared shopping list/save/cook; sustainability Insights,
  period/chart/category/habit controls; nested financial Analytics/reconciliation/report preview;
  supporting mock digest/reminder preferences are now implemented with centralized typed fixtures.
- All 11 supplied screen PNGs inspected and mapped in `docs/Phase_1_Screen_Inventory.md`.
  Docks explicitly show Home, Pantry, Scanner, Recipes and Insights, preserved under the user exception.
- Mobile/backend TypeScript, 31 unit tests, backend health test, Expo Doctor 21/21 and web/iOS/Android
  exports pass. Backend lint remains unavailable (`eslint` absent); mobile has no lint script.
  Native interaction/dynamic-text and final complete visual review remain pending.
- Pantry manual add (11 October) is implemented with shared validated insertion and Scanner fallback.
- Pantry right-Used/left-Wasted gestures implemented with cancellable sheets and accessible buttons;
  browser drag/tap checks pass, native gesture QA remains pending.
- Receipt editable review, Add Missing, duplicate choices and confirmed shared insertion implemented;
  receipt loading/error/empty/retry and browser checks pass. Native/visual QA remains pending.
- Barcode/package queue, validated stamp/manual/estimate options, duplicate choices, lookup failure/retry
  and confirmed shared insertion implemented; browser checks pass. Native/visual QA remains pending.
- Scanner shared mock permission request/denial/retry/blocked settings recovery implemented;
  browser checks pass, real camera permissions remain deferred and native QA remains pending.
- Home Recent Additions Used/Wasted swipes, shared confirmation, accessible button fallbacks and
  empty Add entry are implemented; browser checks and three-platform exports pass.
- Mock auth validation/error/retry, OTP invalid/expiry/paste/resend, recovery preview/provider
  fallback feedback, Settings profile/privacy/remember-device/demo exit are implemented.
  Browser checks pass; native autofill/keyboard/accessibility remain unverified.
- Pantry categories/search/freshness composition, active counts and filtered reset states implemented;
  browser checks pass, native accessibility/layout review remains pending.
- Pantry Batch Select/visible selection/cancellable confirmation and atomic Used/Wasted updates
  implemented; browser shared Home/Insights and normal swipe regression checks pass.
- Fixed USD mock currency documented and shared across value-input labels/Settings; existing dollar
  values preserved, whole-entry dollars versus historic cents clarified. Browser audit passes.
- Pantry top section aligned with reference search-first ordering, scan entry and freshness banner;
  manual add retained beside Batch Select. Browser 320/375/430-width/navigation/cancellation checks pass.
- Account-deletion UI scope and final native/design QA remain
  incomplete. See README for verification limits. No real auth/session infrastructure was added.
- Actual implementation-plan filename: `docs/FreshTrack_Implementation_Plan (1).md`.
- Item-4 end-to-end slice: connected Scanner/shopping/cooking/reconciliation regression added;
  browser flows pass. User reports iPhone launch/recipe/shopping/preferences/native sharing pass;
  Scanner/duplicate/reconciliation checks also reported passing. Android unavailable; see `docs/Phase_1_End_to_End_Checks.md`.
- Item 4 user-verified on iPhone; Android end-to-end checks pending device/emulator availability.
  Visual/general native/auth QA items 1–3 deferred at the user’s request.
- Phase 1 requires final review; user has authorized the Phase 2 proof of concept while QA is deferred.

---

## 9. Known Risks and Open Decisions

| Risk | Status |
|---|---|
| Neon Auth OTP + Expo native SDK compatibility | Lower-level native API sign-up/OTP/password/session flow passes iPhone user checks; published Expo adapter, Android and full Phase 2 acceptance remain open |
| Barcode catalog provider | **Not selected** — decide in Phase 6 |
| Receipt OCR accuracy | **Known limitation** — return editable candidates only; never auto-import |
| Auto-consuming item on rescan | **Deferred** — require user confirmation in MVP |
| Notification lock-screen actions differ by OS | **Known** — use supported categories/actions and test on real builds |
| Background cleanup not guaranteed at exact time | **Known** — reconcile on app open/resume instead |
| Spoonacular quota and cost | **Not budgeted** — check before launch |
