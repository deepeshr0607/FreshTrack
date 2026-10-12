# Phase 4 — persisted read-only Pantry copy

Implemented on 12 October 2026 after user approval. Requested iPhone storage checks passed by user report.
The previous session-cache diagnostic passed by user report; that does not verify this storage slice.

## Behavior and limits

- Existing Expo SecureStore stores only whitelisted grocery DTO fields, owner/Neon-branch scope
  and last-updated time. No tokens, cookies, OTPs or passwords enter the Pantry namespace.
  Native storage uses WHEN_UNLOCKED_THIS_DEVICE_ONLY. Web retains session-only caching.
- The copy contains up to 20 previously loaded active entries ordered by expiry and expires after
  24 hours. It can be an incomplete subset. Memory caching still caps at 200 entries.
  Quantity strings, INR paise, expiry provenance and timestamps survive serialization;
  Kolkata countdown/freshness values are recomputed when displayed.
- Unicode-safe chunks are bounded to 1,600 UTF-8 bytes. Serialized double-buffer commits preserve
  the last valid copy if a scratch write fails. Invalid, expired, missing or wrong-owner copies are
  discarded. A revision guard cancels pending saves on successful sign-out/account changes.
- Session verification is required before restoration. The existing fail-closed auth gate is
  unchanged: an offline cold start cannot expose private Pantry data until authentication recovers.
  Failed network session verification retains the encrypted copy for subsequent verified recovery;
  successful sign-out removes it. Storage failures cannot turn acknowledged online writes into failures.
- Availability failures can show cached list/details with local filters and a last-update label.
  All writes/swipes remain disabled. End Test & Refresh queries the API and restores live mode only
  after success. There is no offline mutation queue or new backend/auth/schema/dependency change.
- Development Settings → Test Saved Pantry Restore discards memory and restores from storage
  without calling Pantry endpoints. Use it before opening Pantry after restart, so a live refresh
  does not overwrite the copy being tested. Authentication still uses real internet services.
  This diagnostic does not prove actual native network interruption or offline cold-start access.

Storage APIs and platform limitations were checked against the current
[Expo SecureStore documentation](https://docs.expo.dev/versions/latest/sdk/securestore/), which
lists the installed SDK 57 package version ~57.0.4. Unit tests use injectable in-memory storage;
they verify serialization/races and do not independently prove platform encryption.

## Verification

| Command | Actual result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` and `npm run build` | Passed; backend unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 102/102 passed |
| Backend `node --test tests/auth.test.mjs tests/foundation.test.cjs tests/households.test.mjs tests/pantry.test.cjs tests/deployment.test.cjs tests/database-guard.test.cjs` | 48/48 passed; sandbox listeners failed initially, permitted rerun passed |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx expo-doctor` | 21/21 passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-pantry-disk-final` | Final all-platform exports and 34 routes passed |
| `git diff --check` / source review | Passed; no new secrets/debug logs |
| Root `npm run lint` | Existing missing-script failure, exit 1 |
| Backend `npm run lint` | Existing ESLint absent failure, exit 127 |

Eight new tests cover exact bounded snapshots/Unicode/extra-field stripping, interrupted commits,
corruption and owner isolation, TTL/input rejection, sign-out during a save, authoritative empty
copies, auth cleanup subscription and offline-auth failure/recovery. No live DB writes/tests or
deployment were needed; no fixture cleanup is pending. Existing development API/Auth config preserved.

## iPhone acceptance and next step

User answered “yes working” to the requested checks at exp://192.168.1.248:8085:

- Remember-device restart, followed by Settings → Test Saved Pantry Restore before opening Pantry,
  restored saved groceries with their quantities, values and expiry dates.
- The restored Pantry blocked add/edit/Used/Wasted and swipe actions.
- End Test & Refresh restored live data and normal controls.
- Successful sign-out and relogin removed the old copy; the diagnostic showed no saved copy before
  live refresh repopulated it.

These are user-reported native storage diagnostic results with internet available for authentication,
not proof of actual offline cold-start access or native transport-failure behavior. No source changes
or repeated automated tests were needed to record this acceptance; the command results above are
from implementation checkpoint 01fa3b0. Documentation diff checks pass.

Exact next step: Phase 4 final review against acceptance criteria and recorded evidence. Actual native
transport/conflict/retry checks, full pagination/batch caps, Android and deferred visual/release QA
remain unverified. Phase 5 has not started.
