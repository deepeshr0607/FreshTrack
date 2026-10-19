# Phase 6 — reviewed barcode entry

19 October 2026. Implemented and deployed to the development Preview; core iPhone acceptance passed by user report.

## Behavior and scope

Real-account Scanner → Barcode Scan opens protected `/scanner/barcode`. The existing camera proof is reused for a rear-camera, single-code scan with explicit permission, torch, cancel and background/blur/session stop. The diagnostic `/scanner/barcode-check` remains read-only. Normal entry also accepts a typed retail number and offers Resume Barcode Save. Demo keeps its sample barcode flow.

Review Barcode Product opens the existing Pantry add route with only the barcode identifier. An account-checked gate restores any saved confirmation before doing a new lookup. Otherwise it requests the authenticated backend catalog endpoint. Found, not-found and incomplete states retain explicit source/environment, ODbL attribution, unverified community confidence and safe source link. Failed lookup permits retry or plain manual entry. No grocery is added by scanning or lookup.

Review These Details reuses the existing form, expiry controls, validation, duplicate Cancel/Add Separately, and saved-item navigation. Only a known catalog name prefills; brand/size/category labels are context, not guessed purchase fields. Barcode Pantry category starts unconfirmed and must be selected. Unit and expiry remain blank; quantity defaults to one for review, price stays unknown until supplied. Package/manual/explicit estimate precedence is unchanged. Names over the Pantry limit require user correction rather than silent truncation. Plain manual fallback records MANUAL; an explicitly reviewed identifier records BARCODE even if its product details are user-supplied.

Backend create adds an optional, validated barcode field, normalized to GTIN-14. It derives BARCODE source itself and forbids client source/ownership overrides. Edit cannot change barcode identity, receipt rows reject it, and DTO/detail/saved read-only copy retain the identifier. Duplicate review matches an active barcode across changed names/categories/dates, or the existing name/category/date rule. Existing purchases are not merged or overwritten. Household membership scoping and Serializable creation/event transactions are preserved. The existing `manual:` idempotency-key namespace is retained for compatibility; fingerprints include the barcode and reject changed-payload replay. New barcode CREATED metadata records identifier and entry source. No schema migration.

## Restart and failure handling

Before sending a confirmed barcode save, protected storage records its reviewed fields and immutable request key in an account/Auth-branch namespace. It reuses the grocery-field whitelist without storing receipt text/images, provider response bodies, tokens or credentials. At most eight chunks of 300 Unicode code points each (at most 1,200 UTF-8 bytes per chunk) are written before publishing a manifest. Partial/corrupt records cannot be sent as complete confirmations; existing intent cannot be overwritten.

The form freezes once confirmation is stored. An uncertain result can only retry that exact key/payload. Opening another barcode resumes the existing purchase first; success clears its record. A definitive server duplicate rejection clears the unsent/rejected intent and returns to duplicate review. Cleanup failure after server success preserves retryability through the same backend key. There is no automatic background or startup submission.

AuthProvider synchronously invalidates pending storage writes and requests old-account cleanup on sign-out/account switch, using the existing session cleanup contract. Revalidation alone does not discard the saved purchase. Namespace isolation prevents another account from restoring it. OS storage/cleanup failure or abrupt process death can leave protected orphan chunks; sign-out cleanup is best-effort, and phone sign-out verification is still pending.

A development-only Pause Barcode Save (Test) control stores the next confirmation without sending it. The frozen Retry Saved Barcode Purchase control explicitly submits it after restart. This diagnostic is absent outside development.

## Files and SDK references

- `app/scanner/barcode.tsx`, existing camera and Scanner/root routes: normal entry and preserved Demo/diagnostic behavior.
- `app/pantry/add.tsx`, `features/scanner/BarcodeEntryGate.tsx`: lookup gate and reuse of the existing add/duplicate form.
- `lib/barcodeLookup.ts`, `lib/barcodeEntry.ts`, `features/scanner/nativeBarcodeRetry.ts`: response validation and protected retry storage.
- `lib/pantryApi.ts`, RealPantry/Auth providers: existing token/client lifecycle and cleanup.
- Pantry service/contracts/detail/disk cache: barcode purchase identity, source, duplicate matching and preserved read-only identifier.
- New shared/client and live database tests; existing Pantry validation tests extended.

Used the previously verified SDK57 Camera interface and installed SecureStore declarations/patterns (WHEN_UNLOCKED_THIS_DEVICE_ONLY). The [versioned SecureStore reference](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/) was inaccessible through the documentation tool; existing project storage patterns were inspected and retained. No dependency/native module/configuration change or iOS rebuild was required. Relevant design: packaged expiry verification image and design-system tokens, existing reusable form/header/buttons. Live entry handles one reviewed package at a time; the multi-item queue remains the Demo flow.

## Actual verification

- Mobile/backend `npx tsc --noEmit` and backend `npm run build`: pass. New Router types were generated by starting the existing Expo project; the initial stale-type error was resolved without casts.
- `node --experimental-strip-types --test tests/*.test.mjs`: **242/242 pass**, including saved-confirmation restart/isolation/immutability, partial writes, sign-out racing storage, client response validation, authenticated API shape and saved-copy barcode retention. Node retains its existing module-type warning.
- Selected backend non-integration Node suite: **143/143 pass**, including existing receipt/auth/Pantry/recipe/analytics regressions and barcode lookup cases. The root-cache negative test initially expected an async rejection from a synchronous validator; corrected the assertion, with no application workaround.
- Guarded live `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/barcode-save.integration.test.cjs`: **3/3 pass**, cleanup assertions pass. Separate synthetic development households only. Concurrent save/replay creates one item and one event; changed payload conflicts; barcode duplicates survive changed name/category/date; separate purchase retains exact known/unknown prices; household isolation and existing manual-name matches pass. No existing user grocery changed.
- Backend `npm test -- --runInBand`: health **1/1 pass**.
- Final `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-barcode-entry-final-export`: pass, **39 routes**.
- `npx expo-doctor`: **20/21**, exit 1; same five Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint`: exit 127, `eslint: command not found`; root has no lint script.
- `git diff --check`: pass. No new debug logging or provider secret in mobile code.

## Development deployment and delivery

Only OPEN_FOOD_FACTS_USER_AGENT and staging OPEN_FOOD_FACTS_ENV were added to the existing project's **Preview** environment. No production, database/Auth allowlist or migration change. Development Preview deployment `dpl_EjGDdFo6Q6gg2y2W9wp9RLPBgfNa` is Ready:

`https://freshtrack-dh65mrywd-dragon-2818.vercel.app`

Public health returns200; tokenless barcode lookup and duplicate-check return401. Hosted authenticated barcode acceptance subsequently passed by user report below. Existing local provider staging probes are recorded in the preceding lookup report, not claimed as hosted tests.

Ignored mobile API URL points to this Preview; Auth settings preserved. Restarted only this task's Metro on8087. Actual iOS manifest and launch bundle return200; name FreshTrack Dev, new Preview URL and barcode retry control are present. Device tool currently lists the iPhone unavailable, so no automatic launch or direct screen inspection is claimed. User can open installed FreshTrack Dev with the current LAN URL supplied in chat.

## Core iPhone acceptance — user report

The user answered “All checks passed” to the 14-step checklist: normal camera entry/cancel, typed known-barcode lookup and attribution, category validation, reviewed sample A with 0.5 bag/₹60.50/manual expiry 2026-11-30, deliberately paused local confirmation with no Pantry addition, restart/Resume Barcode Save and explicit retry, BARCODE source and exact fields after saving, and one purchase after another restart. The checklist also covered changed-name/date sample B (2 bags/₹80.00/manual expiry 2026-12-05) triggering barcode duplicate review, Cancel preserving the original, explicit Add Separately preserving both purchases after restart, and unknown-barcode/manual fallback cancellation without adding anything.

This is user-reported checklist evidence, not direct agent observation or independently captured per-step results. Sign-out with a still-pending barcode confirmation, provider-failure UI, Android/native edge cases and broader Phase6 review remain unverified. No application/runtime/environment/deployment change or agent data write in this acceptance update. Implementation-checkpoint automated results above were not rerun for documentation-only changes.

## Remaining / next step

Next: barcode sign-out cleanup and error/native QA. Staging catalog coverage differs from production; a shared deployment-wide provider quota guard remains a public-rollout prerequisite. Android hardware tests, automatic package-stamp OCR, live multi-item barcode queue and broader Phase6 review remain. Separate purchase-date tracking was not added: current purchaseDate continues to hold an explicit estimate's start date; package/manual items retain the existing added timestamp. Resolve any further purchase-date UX requirement before claiming all barcode criteria complete. No Phase9 work.
