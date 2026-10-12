# Phase 4 — duplicate detection and explicit separate purchases

Authorized after iPhone filter acceptance on 12 October 2026. This slice connects real manual Pantry
entry; Scanner imports remain prototypes until Phase6. No schema/dependency/Auth/production change.

## Behavior and API

Real Add checks for matching ACTIVE, unarchived purchases in the verified user's household.
Name matching uses existing server NFC normalization, collapsed whitespace and lowercase;
category and final expiry date must also match. Quantity, unit and price differences still produce
an advisory match. Similar names, different dates/categories, other households and resolved items
are distinct. This is conservative exact matching, not a claim that the purchases are identical.

`POST /api/v1/pantry/duplicate-check` accepts the validated full new-entry input and returns total
matches plus at most five recent scoped item previews. It writes no groceries/events. The mobile
Context may bootstrap the household if necessary, as in the existing manual-add flow. The existing
themed keyboard-aware Add screen shows Possible Duplicate with quantities, dates and INR values.
Cancel returns to editing; Add Separately explicitly creates a new purchase. Nothing automatically
consumes, replaces, merges or deletes an existing purchase. Demo behavior is preserved.

Create rechecks matches in its existing serializable item/event transaction. An unconfirmed match
returns409 `PANTRY_DUPLICATE` using the standard safe error envelope, including a server request ID.
`duplicateConfirmation: { confirmed: true, action: "add_separately" }` is an optional validated create
field; other actions/extra fields and use on edit or duplicate-check are rejected. A changed set of
matches does not authorize changes to existing rows: confirmation authorizes only this new purchase.
Concurrent first additions cannot both silently create matching entries; the second requires review.
The client refreshes the advisory review if a duplicate appears between preflight and save.

Idempotency replay is checked before duplicate detection. Existing retry keys return the already
created entry; changed payloads conflict. The form retains the exact submitted payload/key after an
uncertain save and skips another preflight on retry, including confirmed separate purchases. Editing
fields starts a new request intentionally. Network feedback distinguishes a read-only check failure
from a write that may have completed. CREATED metadata records explicit duplicate confirmation and
whether an active match existed. Existing item quantities/costs/status/history are untouched.

Wire behavior is additive for first adds/retries; older clients attempting an unconfirmed matching
new purchase now receive409. Lifecycle fixtures were updated to explicitly represent separate
purchases where identical labels are intentional. New dedicated tests exercise the unconfirmed path.
Future real reviewed Scanner imports can reuse this policy during Phase6; they are not connected now.

## Checks

| Check/command | Actual result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit`, `npm run build` | Passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 88/88 passed |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/deployment.test.cjs tests/pantry.test.cjs` | 44/44 passed |
| Backend `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/pantry.integration.test.cjs` | 17/17 passed; fixture household/membership cleanup assertions passed |
| Backend `npm test -- --runInBand` | Health1/1 passed |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-duplicates-export` | Final web/iOS/Android exports passed;34 static routes |
| Backend `npm run lint` | Existing exit127: ESLint absent |
| Mobile lint | No lint script |
| `git diff --check` / source review | Passed; no new secrets/debug logging |

Intermediate TypeScript checks caught an incorrect broad replacement in error construction; fixed
before final checks. An accidental mobile-root `npm run build` failed because that script does not
exist; the correct backend build passed. No database recovery was needed in this slice.
Tests verify read-only preview/cancellation, exact normalization, tenant/status isolation, explicit
separate creation, unchanged originals, replay/conflicting keys, preflight races and concurrent writes.
Exports do not prove native layouts/interactions. Native uncertain-save/offline failure paths remain
unverified and are not claimed to pass.

## Deployment and next step

Development Preview `dpl_D3RUMLGCC1HLFSbr1EgZrwoeaRnN` is READY:
https://freshtrack-7xxjkjf8d-dragon-2818.vercel.app. Explicit Preview/DRAGON scope deployment
passed; production URL null. Public health200/tokenless duplicate-check and create401 passed.
Ignored public mobile API URL updated; Neon Auth settings/origin preserved. Cloud install reports
the prior36 audit findings; dependencies unchanged. iPhone acceptance pending. Next: verify duplicate cancel,
explicit separate purchase/restart, original values and changed-date non-match on the iPhone.
After acceptance, continue Phase4 offline-readable/recovery support and final review.
Real Scanner imports, Android/release QA and deferred Phase1 native/design review remain later work.
No Phase5 was started.
