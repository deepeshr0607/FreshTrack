# Phase 6 — receipt expiry choices and provenance

19 October 2026. Estimate iPhone checklist passed by user report; package/manual checklist pending.

## Scope

Real receipt review now reuses PantryExpiryFields for a user-confirmed package date, manual date or
explicit shelf-life estimate. The supplied receipt PNG was reinspected; existing theme/form controls,
review cards and safe-area/keyboard shell are reused. No new visual system or SDK dependency.
OCR still infers no package expiry, purchase/base date or estimate. New candidates start with empty
date choices. The user must enter a date or explicitly tap the estimate control. Existing curated
whole-word/category presets are unchanged; durations are editable1–365 calendar days and starting
dates use the existing Asia/Kolkata form default. These remain tracking assumptions, not food-safety
claims. Copy distinguishes a printed package use-by/best-before date from a receipt transaction date.

The shared resolver validates all entered choices and applies package > manual > estimate. Invalid
lower-priority fields still fail validation, as in Pantry. Saving a grocery review retains only the
winning choice; re-editing cannot resurrect unused manual dates or estimates. Changing text/category
does not silently replace an already chosen estimate. Cancel keeps the original reviewed row.

Estimated, Package date and User set labels now appear in review rows, haul preview, import confirmation
and saved retry. The confirmed fields include the existing optional expirySelection contract. The
client whitelist validates the choice and rejects a date inconsistent with its source. No raw OCR,
images, ownership overrides or extra fields are admitted. Version1 storage/namespace remains unchanged;
legacy date-only manual requests keep their canonical payload and remain restorable. Confirmed
estimate retries retain their original base date/duration, rather than recalculating from today.

The existing deployed backend already validates and stores this contract. No backend source/schema,
migration, deployment, native build, dependency or environment change was needed. Existing Pantry
refresh/notification/overdue behavior after receipt import is preserved. Demo receipt flow is unchanged.

## Changed files

- `lib/receiptCandidates.ts`: optional explicit selection, edit/save helpers, chosen-source validation
  and labels; selected haul validation catches date/source mismatches.
- `lib/receiptImport.ts`: reviewed-field handoff/storage whitelist preserve validated optional choices.
- `features/scanner/LocalReceiptReview.tsx`: shared expiry form, accurate review labels and re-edit state.
- `features/scanner/ReceiptImportView.tsx`: confirmation/retry source labels.
- `tests/receipt-expiry.test.mjs`:4 new domain/storage/retry cases.
- `backend/tests/receipt-client-retries.integration.test.cjs`: third authoritative live case.

## Actual verification

| Check | Result |
|---|---|
| Root and backend `npx tsc --noEmit` | Passed |
| Backend `npm run build` | Passed; runtime source unchanged |
| Full root strip-types suite | 231/231 passed |
| New focused expiry tests | 4/4 passed |
| Guarded live client/Prisma suite | 3/3 passed, fixture cleanup passed |
| Web/iOS/Android export | Passed;37 routes |
| Expo Doctor | 20/21, exit1: same five existing patch recommendations |
| Actual iOS manifest/bundle at172.20.10.3:8087 | HTTP200, FreshTrack Dev and new expiry form copy |
| `git diff --check` and secret/logging review | Passed |
| iPhone estimate acceptance | User reported “All checks passed” to the 13-step checklist; not directly observed |
| iPhone package-priority/manual-override acceptance | Pending |

New tests verify explicit-only estimates and labels; priority and chosen-only rehydration; invalid
calendar/duration/lower-priority choices; date/source mismatch rejection; valid legacy payload
compatibility; and frozen estimate fields/key through paused restart and retry. Existing227 tests
also pass. Only the final test title was corrected after the full run; no assertions/behavior changed.

The guarded live suite runs the actual mobile controller/storage abstraction against existing Prisma
services on the pinned development database. The new case imports estimated Milk, package Bread and
manual Rice from a restored paused intent. It verifies expirySource, exact expiry date, starting date,
preset days, one receipt/three items/three CREATED snapshots, unchanged replay and changed-duration
idempotency rejection. Prior response-loss and duplicate-choice cases also pass in this run. All
synthetic `freshtrack-dev-test:receipt-client:*` households were cleaned up. No user groceries changed
by the agent. This is local service/SQL evidence, not authenticated hosted/native acceptance.

Existing Doctor patches are expo/linking/notifications/router/splash-screen. Existing lint gaps
remain (no root script/backend ESLint absent); no lint pass claimed. No broad audit/dependency fix.
Android native, visual/accessibility, retailer accuracy and real transport-loss UI remain unverified.
Node's existing typeless-package warnings persist. No new permission/SDK API integration in this slice.

Commands:

```sh
# Root
npx tsc --noEmit
node --experimental-strip-types --test tests/receipt-expiry.test.mjs
node --experimental-strip-types --test tests/*.test.mjs
npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-expiry-export
PATH=/opt/homebrew/bin:$PATH npx expo-doctor
# backend/
npx tsc --noEmit
npm run build
ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --experimental-strip-types --test tests/receipt-client-retries.integration.test.cjs
```

Logs: `/private/tmp/freshtrack-receipt-expiry-{root,live,export,doctor}.log`.
Existing Metro8087 remains running; current launcher http://172.20.10.3:8087.
Existing development API remains https://freshtrack-6d1mt9hlm-dragon-2818.vercel.app.

## Next step

The estimate checklist passed by user report. Next: package-priority/manual-override checklist,
including discarded lower choices on re-edit. Barcode
camera/catalog decision and broader Phase6 native/failure QA remain. Phase6 is incomplete; no Phase9.

## Estimate iPhone acceptance — 19 October 2026

User answered “All checks passed” to the 13-step estimate checklist: explicit7-day estimate from
2026-10-19, zero-duration rejection, custom9 days producing2026-10-28, Cancel retaining that choice,
Estimated labels in review/confirmation, one imported grocery with unknown value, and exact source,
base date and duration after restart. This is user-reported evidence without direct observation or
per-step screenshots. Package-priority/manual-override acceptance remains pending. Documentation
only; no source/runtime/environment/data change by the agent. Prior automated checks were not
rerun; git diff --check passed.
