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
- Third-party APIs (server-side only): Spoonacular (recipes); Cloud Vision is unconfigured.
- On-device receipt OCR proof: Apple Vision/iOS, ML Kit/Android (user-selected free direction).

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
│   │   └── health.test.cjs      # health endpoint test (Node runner, passing)
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

**Fresh/package scan queue and Add correction implemented (21 October); updated iPhone acceptance pending.** User reported Watermelon being forced into expiry scanning and a disabled Add action. Product type is now separate from estimate availability; fresh cards have no scan control, only packaged items enter a directly selectable queue, and Add gives actionable validation for incomplete products. Whole Watermelon is a targeted21st storage-rule entry, preserving the original20. Mobile408/408, backend166/166, both lint/TypeScript and all-platform41-route exports pass, including actual-TSX conditional-control checks. Signed Release build/signature/embedded corrections pass; first device installation timed out and is awaiting a reconnected/unlocked iPhone. See [receipt workflow follow-up](docs/Phase_9_Receipt_Workflow.md). No backend/schema/dependency/provider or agent household-data change; Phase9 remains open and decoder work stays paused.

**Receipt workflow passed all eight iPhone checks by user report (21 October).** User reported automatic camera/upload recognition, separate editable product cards, supported fresh estimates, packaged-label date confirmation, reviewed duplicate/import cancellation and confirmation, and Pantry restart persistence passed on the updated Release app. This is user-reported functional acceptance, not agent observation, broad receipt-accuracy measurement or Android acceptance. Prior automated/build results at `1ac276e` are unchanged and were not rerun for this documentation-only update. See [workflow report](docs/Phase_9_Receipt_Workflow.md). The20-food cap, barcode deferral and remaining Phase9 limits remain; paused decoder work stays paused. No runtime/build/deployment or agent-initiated household changes.

**Receipt workflow correction installed (21 October); iPhone functional acceptance pending.** User redirected work from the paused decoder slice to receipt scanning. Normal capture/upload auto-runs OCR, shows independent product cards with optional edits, prefills supported fresh-food estimates and offers packaged expiry-label OCR/explicit confirmation/manual fallback. Existing import/duplicates/retry contracts and diagnostic/manual review remain. Focused10/10, mobile401/401, backend166/166, both lint/TypeScript, Doctor21/21, all-platform41-route exports and signed Release build/install/launch pass. No uninstall/Metro/backend deployment or existing-household write. Phone acceptance remains pending. See [workflow report](docs/Phase_9_Receipt_Workflow.md). Keep20-food scope/barcode deferral and all unrelated working-tree changes. Phase9 remains open; no store publishing.

**Phase 9 final personal-use checkpoint reviewed (21 October); full Phase9 remains open.** Consolidated agent-run checks and user-reported standalone/notification/offline-recovery passes, feature limits and original acceptance gates in the [final personal-use review](docs/Phase_9_Final_Personal_Use_Review.md). Fresh read-only audits: root21 affected packages (18high/3moderate/0critical), backend0; no dependencies changed. Prior mobile386/full,57/focused and backend166 results are retained, not rerun for this documentation-only review. iPhone personal-use flows are supported by the recorded evidence; Android, clean-install/fresh-checkout signing/version migration, physical API-only failures and earlier unattributed read-only failure remain unverified/open. Receipt recognition requires review, food estimates remain capped at20, shopping state is session-only and password-recovery/profile-editing gaps are explicit. No production/security waiver, release-candidate tag or store publishing. Installed profile expires23October10:08AM IST. Next engineering slice: SDK57-compatible URI-decoder proof/remediation; operationally renew local signing before expiry. No new phone checklist or runtime/data/config/build changes.

**Phase 9 API recovery/install coverage reviewed (21 October).** Added three local loopback checks using the actual mobile Pantry client and Express:503→explicit recovery,401 excluded from cached fallback, unchanged write fields/keys and lost-success-response uncertainty. New3/3, relevant mobile57/57, backend166/166 including build/health, both lint/TypeScript and diff checks pass. Service spies do not prove database exactly-once writes or native rendering; no live fixture test or phone outage was induced. Reviewed existing Debug→Release update/user-reported data preservation; clean-device/fresh-checkout signing and Release-version migration remain unverified. See [API recovery/install matrix](docs/Phase_9_API_Recovery_Install_Review.md). No runtime/native/dependency/provider/deployment/environment/grocery changes; no rebuild or new phone checklist. Next: final personal-use acceptance summary with explicit remaining security/platform/reliability limits. Phase9 remains incomplete; no store publishing.

**Phase 9 Release offline/recovery checks passed by user report (21 October).** User answered “All checks passed” to nine steps covering offline resume/retry blocking, genuine offline cold start with Metro stopped, online restoration without new credentials, same-account/unchanged-Pantry review and final online restart. This is reported functional evidence, not agent observation, storage forensics or full offline functionality. Prior36/36 focused auth/session tests, mobile lint and both TypeScript results at `aebeb75` were not rerun for this documentation-only update. See [Release recovery report](docs/Phase_9_Release_Session_Recovery.md). Next: review API-failure and installation/update coverage while preserving existing app data. Upstream advisories, Android/clean-device/other failure paths and earlier unattributed read-only database failure remain open; Phase9 is incomplete. Profile expires23October10:08AM IST; no store publishing.

**Phase 9 Release session-recovery readiness checked (21 October); iPhone result pending.** Reviewed startup/resume interaction blocking, protected-route removal on verification failure, safe Retry Session Check and temporary-failure retention of valid remembered credentials. Focused auth/session tests36/36, mobile lint and both TypeScript checks pass; Metro remains stopped. No code/native/dependency/provider/deployment/environment/data changes or rebuild. See [Release recovery checklist](docs/Phase_9_Release_Session_Recovery.md). Next: offline resume/retry, genuine offline cold start, online restoration without new credentials and final restart; no groceries need changing. This is online-auth protection, not offline Kitchen access. Earlier Release notification checks remain passed by user report. Profile expires23October10:08AM IST; Phase9/advisory/Android/installation/network/database limits remain open. No store publishing.

**Phase 9 Release notification checks passed by user report (21 October).** User answered “All checks passed” to the12-step standalone iPhone check: closed-app delivery with Metro stopped, Consumed/Wasted buttons, both Cancel cases, confirmed Used/Wasted for the named samples, restart/no unresolved queue, disable Off/zero and original-preference restoration. This is reported functional evidence, not direct observation or authoritative event-count/Android/offline acceptance. Prior55/55 notification tests, backend163/163 and both TypeScript/lint results at `05a14b0` were not rerun for this documentation-only update. See [Release notification report](docs/Phase_9_Release_Notifications.md). Next: Release offline-session blocking and online recovery without grocery changes, then remaining failure/installation/security review. Current profile expires23October10:08AM IST. Phase9 remains incomplete with advisory/Android/clean-device/network/database limits; no store publishing.

**Phase 9 Release notification readiness checked (21 October); iPhone result pending.** Reviewed the existing native category/trigger, response/confirmation and normal-mode outbox paths. Mobile notification/reminder suites55/55, backend163/163 including build/health, both TypeScript and lint checks pass; Metro remains stopped. No code/native/dependency/environment/deployment/data changes or rebuild. See [Release notification checklist](docs/Phase_9_Release_Notifications.md). Next: actual closed-app iPhone delivery, Consumed/Wasted Cancel/Confirm, restart and disable cleanup using only two named development samples. Phone delivery/button rendering is not claimed from unit tests. Earlier standalone smoke checks remain passed by user report; profile expires23October10:08AM IST. Phase9 remains incomplete with advisory/Android/clean-device/network/database limits; no store publishing.

**Phase 9 standalone iPhone smoke checks passed by user report (21 October).** User reported all eight checks passed with Metro stopped: direct-icon startup after USB disconnection, preserved Pantry/search/details, normal Settings, receipt OCR/Clear without import, Recipes/Insights, sign-out/blocked Back and remembered-session restart. This is reported functional acceptance, not agent observation, notification delivery/actions, clean-device installation or Android acceptance. Build/signature/install and10/10 focused checks remain recorded at checkpoint `e4044a1` in the [personal-use build report](docs/Phase_9_Personal_Use_Build.md); they were not rerun for this documentation-only update. Current profile expires23October10:08AM IST. Next: Release notification delivery/actions, then remaining personal-use acceptance review. Upstream advisories, native/network gaps and earlier unattributed read-only database failure remain open; Phase9 is incomplete. No store publishing.

**Phase 9 local personal-use Release build installed (21 October); iPhone acceptance pending.** Existing Xcode project/Personal Team produced a signed Release app with embedded Hermes JavaScript, verified API URL/signature and the same development identifier. Updated the paired iPhone without uninstalling, stopped Metro (no8081–8087 listeners), and direct process launch passed; visible UI/data/session acceptance is not yet claimed. Mobile lint, both TypeScript checks and focused config/diagnostic tests10/10 pass. Full386/163/live43 suites remain the preceding source-checkpoint results, not rerun here. No code/dependency/schema/provider/backend deployment/environment-value changes; generated native/signing files remain untracked/ignored. Existing profile expires23October10:08AM IST; it requires Xcode renewal, not store publishing or paid EAS. See [personal-use build report](docs/Phase_9_Personal_Use_Build.md). Next: numbered standalone iPhone checks, then Release notification/remaining acceptance review. Upstream advisories, clean-device/Android/network gaps and earlier unattributed read-only failure remain open; Phase9 is incomplete.

**Phase 9 receipt transaction reliability checkpoint complete (21 October); broader reliability remains open.** Reproduced the 50-item separate-import failure: Prisma P2028 after10,044ms/137 model calls under the existing10-second transaction budget. Batched item/history writes and skipped unused import preview reads; successful50-item imports now use6 model calls while preserving scoped serializable transactions, exact provenance, idempotency and duplicate confirmation. Added shuffled-return/provenance guards and real second/last-event FK rollback checks. Mobile386/386, backend163/163, both lint/TypeScript/build and live combined43/43 pass with fixture cleanup; isolated receipts10/10 pass. Development Preview deployed, health200/anonymous401/oversized413 and served iOS bundle200 verified; only ignored public API URL/Metro changed. No schema/provider/native/production/existing-household changes. See [receipt reliability report](docs/Phase_9_Database_Reliability.md). Earlier read-only failure remains unattributed; upstream advisories and broader native/network/build acceptance stay open. Next: personal-use build readiness review; no new phone checklist or store publishing. Phase9 remains incomplete.

**Phase 9 mobile advisory review checkpoint complete with open risks (21 October).** Scoped `xcode@3.0.1` to patched UUID11.1.1 after checking its v4/CommonJS call site and adding buffer-bound/project-round-trip regressions. Clean install, mobile lint/TypeScript/tests386/386, backend lint/TypeScript/build/tests160/160, Doctor21/21 and all-platform41-route source-map exports pass. Mobile audit29→21 (18high/3moderate); backend audit0. Client maps include Router URI decoding, but not the inspected braces/Forge/Xcode/UUID build tools. Decoder0.5 ESM substitution breaks query-string7 in isolation; it was not applied. Braces/Forge have no published patch; these and client decoder risk remain open, not accepted or hidden. See [advisory review](docs/Phase_9_Mobile_Advisory_Review.md). No SDK/native-module/UI/schema/environment/deployment/household changes; no new phone test needed. Next: investigate intermittent development database failures while tracking upstream advisory work. Phase9/security acceptance remains incomplete; no store publishing.

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

### Current phase: Phase 6 — receipt expiry slice accepted by user report

See docs/Phase_6_Receipt_Expiry_Review.md. Both TypeScript/build, root231/231, live client3/3
with cleanup and exports37 pass. Doctor20/21 retains five patches. Current launcher172.20.10.3:8087.
Estimate and package/manual checklists passed by user report. Next: barcode scanning/catalog
choice and remaining native/failure QA. No backend/native/
dependency/environment/deployment change. Phase9 has not started.

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
| Expired-grocery outcomes | User chose ACTIVE awaiting confirmed Used/Wasted on 14 October; no automatic assumed-consumed or SYSTEM outcome writes |
| Auto-consuming item on rescan | **Deferred** — require user confirmation in MVP |
| Notification lock-screen actions differ by OS | **Known** — use supported categories/actions and test on real builds |
| Background cleanup not guaranteed at exact time | **Known** — reconcile on app open/resume instead |
| Spoonacular quota and cost | **Not budgeted** — check before launch |
