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
│   │   └── schema.prisma        # Phase 3 model + initial development migration
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

**Phase 5 item 1 implemented (12 October), iPhone acceptance pending:** signed-in native Settings has contextual notification permission, blocked/retry recovery and device/account-scoped reminder On/Off and HH:MM persistence. Demo/digest preserved; no alerts scheduled yet. SDK-compatible expo-notifications ~57.0.22 installed. Both TypeScript checks, root111/111, health1/1, Doctor21/21 and all-platform exports pass; existing lint gaps remain. See [permission/preferences report](docs/Phase_5_Permission_Preferences.md). Next: iPhone permission/restart checks, then item 2 scheduling when authorized. Items 2–8 remain incomplete.

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

### Current phase: Phase 5 — item 1 implemented, native acceptance pending

See docs/Phase_5_Permission_Preferences.md for evidence and limits. Items 2–8 remain incomplete. Phase 4 core development acceptance is recorded in docs/Phase_4_Final_Review.md.

### Phase 4 previous slice — duplicate review verified on iPhone

- Manual duplicate slice is deployed and user-reported iPhone checks pass as recorded above;
  evidence and limits are in docs/Phase_4_Pantry_Duplicates.md. Offline support/final review remain. No Phase5.

### Phase 4 previous slice — BATCH/UNDO VERIFIED ON IPHONE

- User explicitly resumed on 12 October. Existing batch/undo code verified and deployed without a
  new schema/dependency change. Atomic batches cap20, scoped confirmed single/batch undo appends
  reversal history, version/retry guards prevent stale or superseded success. Demo/designs preserved.
- Recovery removed14 reserved synthetic households. One cleanup overlapped a live run; that10/11
  run was discarded. Final sequential Pantry11/11 and cleanup pass; separate reserved membership
  count0 confirmed. Real accounts/seed excluded. Connection cause not established; no settings bypass.
- Both TypeScript/build, root79/79, backend37/37, health1/1, Doctor21/21 and all-platform exports pass.
  Existing lint gaps remain. See docs/Phase_4_Batch_Undo.md; paused handoff retained as historical.
- New Preview dpl_5okbejrBGF9gDoqP5hHWW8262EDu READY after explicit DRAGON scope retry; public
  health200 and tokenless batch/undo401 pass. Ignored mobile API URL updated, Auth settings preserved.
- User reports iPhone batch Used cancel/confirm, undo cancel/restore/restart, batch Waste/restore
  and detail undo checks pass at exp://172.20.10.2:8085. Native failure paths/full cap20 remain unverified.
  Expiry presets/precedence are now verified as recorded above. Next: server filters/duplicates/offline/final
  review and deferred Android/release QA remain. No Phase 5 or production writes.

### Phase 4 previous slice — EDIT/LIFECYCLE VERIFIED ON IPHONE

- User approved persisted editing and confirmed Used/Wasted continuation. Existing form/cards/swipe
  sheets now call validated scoped PATCH/consume/waste endpoints. Version checks reject stale writes;
  retry hash/key and repeated-outcome no-ops prevent duplicate events. Item/event updates are atomic.
- Edits preserve unchanged expiry/cost provenance; outcomes record consistent timestamps and snapshots.
  Busy/error/retry/Reload Item feedback added, real ₹ swipe values retained, demo behavior preserved.
  No dependency/schema/migration/production change. See docs/Phase_4_Pantry_Mutations.md.
- Root77/77, backend35/35, live Pantry7/7 with cleanup, health1/1, both TypeScript/build, Doctor21/21,
  all-platform exports pass. New Preview dpl_HDWv7kgTdJrDM7bBDyJcDUboLmNL READY; public health200 and
  tokenless edit/outcome401 pass. Ignored mobile API URL updated; Auth settings preserved.
- User reports iPhone edit/restart and cancel/confirm Used/Wasted/restart checks pass at
  exp://172.20.10.2:8085. Native offline/conflict/retry failure paths remain unverified.
  Next: remaining inventory slices. Batch/undo, presets, server-wide filters, duplicates/offline persistence
  and final review remain. Android/native failure QA and release work remain unverified. No Phase 5.

- User approved Phase 4 on 12 October. Signed-in native Pantry now sets up/restores its household,
  lists active persisted items and manually adds groceries with INR/Asia/Kolkata/read-only details.
  Demo remains mock; other tabs/preferences remain prototypes, not real Pantry data.
- Backend pantry list/create/detail derives household from verified membership; validated exact
  quantity/paise/calendar input, scoped queries, transactionally paired CREATED event, retry key/hash
  replay/conflict handling and bounded transaction retries. No schema/migration/dependency change.
- New Preview dpl_5Kq7Vy9mmjXV72xCwXHSZnYW7J4U READY; ignored mobile API URL updated, Auth preserved.
  Public health200/tokenless pantry401 pass. Root76/76, backend33/33, live Pantry3/3 with cleanup,
  health1/1, both TypeScript/build, Doctor21/21 and all-platform exports pass. Existing lint gaps remain.
- User reports iPhone add/details/restart/refresh/expiry sorting and unknown-price checks pass;
  see docs/Phase_4_Pantry_First_Slice.md. Editing/Used/Wasted are now implemented in the next slice;
  batch, presets, server-wide filters, duplicates/offline persistence and final review remain.
  Android/native failure-path checks remain
  unverified. No Phase 5.

### Phase 3 — DEVELOPMENT ACCEPTANCE COMPLETE

- User authorized item 6 final review. All five development acceptance criteria are supported by
  recorded evidence; see docs/Phase_3_Final_Review.md for commands and limits (12 October 2026).
- Final checks: both TypeScript checks/build, root73/73, backend29/29, health1/1, guards4/4,
  live database14/14, live household5/5 with cleanup, seed replay1/1, migration status/readiness,
  Prisma validation and Expo Doctor21/21 pass. Public health200/auth401/CORS403 pass.
  Existing lint setup gap remains. No code/schema/dependency/deploy change in final review.
- Phase 4 household setup and persisted Pantry list/manual-add slice is now authorized and implemented.
  Android/Phase 1 QA and production/release checks remain deferred. Kitchen remains mock.

- User authorized Phase 3 items 1–5 and selected INR (integer paise), Asia/Kolkata.
- Initial transactional application migration applied only to Console-verified development branch
  br-long-glade-b3ovlfn0 / endpoint ep-dry-paper-b3ftfkqd. Auth structure unchanged before/after.
- Household membership, compound item/event/receipt references, immutable event snapshots,
  nullable cost provenance and exact decimal quantity/date/timestamp types are documented in
  docs/Phase_3_Data_Model.md. SQL domain checks now installed; service guarantees/cleanup remain open.
- Prisma 5.22 client/singleton and CLI readiness are ready. Direct/pooled checks/status pass.
  Guarded/idempotent seed stores two synthetic fixture households, never real Neon accounts.
  Mutation tools require development environment, pinned endpoint and explicit consent. Node 24.x (now pinned for backend/Vercel).
- Both TypeScript checks, root 70/70, backend auth 9/9, health 1/1, guards 4/4, live database tests
  14/14 and seed replay 1/1 pass. Existing lint gaps remain. No mobile source/config/dependency change;
  Expo Doctor/exports not repeated. See docs/Phase_3_Database_Setup.md for commands and limits.
- Item 3 adds explicit authenticated household bootstrap and membership-scoped current/by-ID reads.
  Serializable transactions/retries preserve one household and preferences; foreign/unknown IDs both
  return 404. No client-supplied identity/settings accepted. Mobile remains mock, setup not wired yet.
- Household HTTP/service 6/6 and live development 5/5 pass, including concurrent setup, rollback,
  cross-account isolation and temporary-record cleanup. Auth 9/9, health 1/1, root 70/70, guards 4/4
  and both TypeScript checks pass. Eager JWT loading health regression fixed with lazy import.
  No schema/migration/dependency change; existing lint gaps remain. See docs/Phase_3_Household_Access.md.
- Item 4 adds types/api.d.ts shared wire types, centralized safe responses, bounded raw-query
  pagination, exact INR paise/decimal quantity serialization, timezone/calendar expiry and pure status
  rules. Existing routes use shared helpers; mobile identity checker has a type-only import change.
  No Pantry endpoint/status write, schema/migration/native/dependency change.
- Item 4 checks: foundation 10/10, auth 9/9, household 6/6, health 1/1, root 70/70, guards 4/4,
  live development household 5/5 with cleanup, both TypeScript checks/build pass. Existing lint gaps
  remain; Expo/device checks not repeated. See docs/Phase_3_API_Foundation.md for limits and commands.
- Item 5 Preview configuration/deployment ready: dedicated dragon-2818/freshtrack-api, exported
  index.cjs wrapper, Node24, generate/tsc-only build, Preview-only development credentials, upload
  exclusions and strict target/env/pool guard. Canonical type declarations moved into backend with
  root mobile re-export; isolated backend compiles. No dependency/schema/migration/UI change.
- Vercel Preview dpl_FuadUxp8mfkBc2N3EbK1qdmNHj2V is READY. CLI health200 and tokenless household401
  pass. User approved removal of Vercel Authentication on this dedicated development API project;
  confirmed ssoProtection null, public health200, tokenless identity/household401 and invalid-token401.
  Ignored mobile API URL points to HTTPS Preview. User confirmed hosted Backend Identity passes on
  iPhone; provider-issued JWT identity is verified. User also confirmed hosted database probe passes
  with the expected no-household result. No application records created; hosted creation unverified.
  First production-labelled attempt failed safely; no working production or production DB/auth changes.
  Git auto-link failed; CLI deploy succeeded. See docs/Phase_3_Deployment.md.
- Both TypeScript/build/local preview build, backend29/29, final deployment4/4, root70/70, health1/1,
  guards4/4 pass. Runtime audit0; full cloud audit36 dev-tool findings. Existing lint gaps remain.
- Both TypeScript checks pass again after environment update. Expo runs at exp://192.168.1.248:8085;
  existing trusted Neon Auth origin preserved. No hosting bypass token in mobile.
- Development-only Settings → Check Backend Database added: matched identity then same transient JWT
  for read-only scoped household GET; specific HOUSEHOLD_NOT_FOUND accepted as successful DB query,
  unrelated errors rejected. No bootstrap/writes/token persistence/real Pantry connection.
  Both TypeScript checks, root73/73 and health1/1 pass; initial health sandbox EPERM resolved with
  allowed localhost listener. Existing lint gaps remain. iPhone hosted DB no-household result passes
  by user report; this confirms the scoped Prisma query through Vercel, not populated-household CRUD.
  Web/iOS/Android exports pass; no backend deploy/schema/dependency change in this probe slice.
- Item 6 final review is complete; Phase 4 is now authorized. Production writes remain outside scope.

### Phase 2 — DEVELOPMENT ACCEPTANCE COMPLETE

- User approved the lower-level documented Neon API flow; native SDK adapter is not installed.
- Real account signup/email OTP/resend, password login, remember-device restart, provider sign-out,
  protected Expo Router navigation and backend matching identity pass by iPhone user report.
- Incorrect/reused/expired sign-in OTP, provider attempt limit/new-code recovery and offline
  resume/private blocking/retry pass by iPhone user report. Fixtures are not proof of provider policy.
- Session cookies are branch-scoped SecureStore or process memory; no OTP/password/JWT persistence.
  API identity uses provider-issued EdDSA JWT and server-configured JWKS/issuer/audience/age/subject.
  No client userId is trusted. Real kitchen data is still mocked; no schema/data endpoint exists.
- Final review fixed pre-existing raw parser/error logging and missing IDs at the HTTP boundary;
  structured redacted records and consistent safe parser/CORS/404/429 errors are regression-tested.
- Final checks: 70/70 root tests, backend auth 9/9, health 1/1, both TypeScript checks and Doctor 21/21.
  Prior all-platform export passed; no mobile changes or repeated export in the final review.
  Existing lint gaps remain (backend ESLint absent; mobile no lint script).
- ADR 001 and docs/Phase_2_Final_Review.md record exact installed versions and acceptance evidence.
- Current provider/native sign-out removes kitchen access. An already-issued API JWT can remain
  valid about 15 minutes plus five-second verifier clock tolerance. MVP acceptance versus immediate
  server revocation: user accepted the current bounded JWT policy for the MVP. Immediate server
  revocation is not an MVP requirement and is not implemented.
- User deferred Android native QA and live release/signing setup. No paid Apple membership;
  local preview/production profiles are prepared, but real IDs/EAS linking/HTTPS services/SMTP,
  origins/signing/standalone builds/production tests remain pending before release.
- Prior work is committed at 2b04009; final review checkpoint is
  `feat: validate native authentication and protected route flow` (see Git log).
- Phase 3 items 1–2 are now authorized; production data endpoints remain outside this slice.

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
| Neon Auth OTP + Expo native SDK compatibility | Lower-level native API sign-up/OTP/password/session flow passes iPhone user checks; published Expo adapter, Android and production release verification remain open |
| Barcode catalog provider | **Not selected** — decide in Phase 6 |
| Receipt OCR accuracy | **Known limitation** — return editable candidates only; never auto-import |
| Auto-consuming item on rescan | **Deferred** — require user confirmation in MVP |
| Notification lock-screen actions differ by OS | **Known** — use supported categories/actions and test on real builds |
| Background cleanup not guaranteed at exact time | **Known** — reconcile on app open/resume instead |
| Spoonacular quota and cost | **Not budgeted** — check before launch |
