# Phase 4 — editable expiry presets and date precedence

Resumed with user authorization on 12 October 2026. This is a development-only Pantry slice;
Phase 5, production writes, OCR and notifications remain outside scope.

## Behavior

Real-household Add and Edit share the existing themed form controls. The user can enter a package
date, a manual date, or an editable shelf-life estimate with a starting calendar date. The displayed
and server-calculated precedence is package > manual > estimate. Invalid lower-priority choices
are rejected rather than silently accepted. Only the winning expiry/source and applicable estimate
metadata are persisted; unused form choices do not survive reopening the item.

The central normalized whole-word dictionary offers milk 7, spinach 5 and bread 5 days. Produce 5,
Dairy 7 and Bakery 5 are category fallbacks. Other categories have a custom-entry option. Durations
are editable per entry (1–365 whole days), explicitly described as tracking assumptions rather than
food-safety guarantees. The button applies a suggestion; changing the name/category does not silently
replace a duration the user already chose. Printed dates are manually supplied, so the real card
says “Package date” rather than claiming OCR/provider verification.

The same pure calculator is bundled for form previews and invoked on the server. Calendar addition
uses UTC date fields, not elapsed local hours; today's starting date is Asia/Kolkata. Explicit
`expirySelection` is an optional additive wire field. Legacy six-field create/edit requests retain
their previous behavior, including preserving unchanged provenance. The HTTP boundary validates
all choices and rejects a supplied `expiresOn` that differs from the calculated result. The service
also uses the calculated date when writing the item.

Existing `expirySource`, `freshnessPresetDays` and `purchaseDate` columns hold the winning estimate.
An explicit estimate sets its starting date in `purchaseDate`; a manual/package override clears
preset days while preserving the prior purchase date as historical entry metadata. The editor only
rehydrates estimate inputs when the source is estimated. CREATED and individual mutation events
retain source/duration/purchase-date metadata alongside their immutable date snapshots. Existing
batch events retain their prior snapshot contract. Retry/version checks, household scope and
transactional event writes are preserved. No dependency or schema migration was needed.

## Checks

| Command/check | Actual result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` and `npm run build` | Passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 84/84 passed |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/deployment.test.cjs tests/pantry.test.cjs` | 38/38 passed; initial pre-pause sandbox attempt failed on localhost EPERM, allowed rerun passed |
| Backend `npm test -- --runInBand` | Health 1/1 passed before pause; health code unchanged |
| Backend guarded development Pantry suite | Final resumed 12/12 passed, including fixture cleanup assertions |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-expiry-export` | Web/iOS/Android passed, 34 static routes |
| Backend `npm run lint` | Existing failure: exit 127, ESLint absent |
| Mobile lint | No lint script exists |
| `git diff --check` / source review | Passed; no added secrets or debug logging |

Tests cover leap/year boundaries, Kolkata midnight, whole-word matching, category fallback,
precedence, malformed dates/durations, forged metadata, source rehydration, estimate editing,
retry replay, cross-household rejection and unchanged historical event dates.

## Deployment and acceptance

Development Preview `dpl_8G5WNc8yX6jYXTg8x6PdeRhY2iuz` is READY:
https://freshtrack-5t24mq459-dragon-2818.vercel.app. Deployment used explicit Preview target and
DRAGON scope; production URL is null. Public health200 and tokenless create/edit401 passed.
Ignored mobile API URL updated; Neon Auth origin/configuration unchanged. The deployment still
reports the existing 36 dependency audit findings; dependencies were not changed in this slice.
iPhone acceptance is pending.
Existing demo UI is preserved. Exports verify bundling, not native interaction/layout or Android QA.

## Remaining Phase 4 / exact next step

Verify estimate add/edit/restart, manual/package priority and invalid input on the iPhone using
exp://192.168.1.21:8085 on the same Wi-Fi.
After acceptance, continue server-wide filters, duplicate/offline handling and final Phase 4 review.
Full-cap/native failure paths, Android and release QA remain unverified. Other tabs remain prototypes.
