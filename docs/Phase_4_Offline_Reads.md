# Phase 4 — session-only cached Pantry reads

User resumed on 12 October 2026. This is the first small offline slice, not complete offline support.
Existing auth, backend/schema/dependencies/environment and demo mode are preserved. No Phase5.

## Behavior

A bounded in-memory cache retains up to200 previously loaded active entries, scoped to the native
verified identity and Neon branch. It clears when that provider is torn down, including sign-out,
account changes or failed session restoration. It stores no session material and writes nothing to disk.

Only network or500/502/503/504 availability failures permit fallback, and only while the same user
still has a verified non-checking session. Auth/validation/conflict/rate-limit errors do not permit
fallback; rejected list reads clear cached rows. The existing Phase2 gate still blocks private screens
if session verification fails. Cold offline restart cannot use this cache or bypass that gate.

Cached list/details are labeled read-only with last-update time and a potentially incomplete-subset
notice. Search, category/freshness and order work locally over previously loaded entries. Counts and
known value describe the cached subset, not the full server household. Kolkata date countdowns are
recomputed when cached data is read. Unknown cached IDs offer Back to Pantry. Add/edit/Used/Wasted,
batches, undo and duplicate-check calls are blocked in Context; corresponding controls/swipes are
disabled. Existing already-sent requests may finish; their acknowledged mutations update/remove
cache entries before another read. No offline mutation queue or optimistic success was introduced.

Explicit Refresh retries the API with current criteria; successful server list data restores live
mode and server counts. Criteria changes invalidate older requests, including changes during recovery.
Authoritative unfiltered complete/empty reads replace old memory records. Newer versions survive
older acknowledgments. Detail reads also populate the active-item cache.

Development-only Test Cached Pantry View pauses Pantry requests and runs the same cache fallback
while authentication remains real. End Test & Refresh removes that diagnostic pause and queries the
actual API. This permits native read-only/recovery checks without weakening the auth gate; a simulated
failure is not evidence of actual airplane-mode behavior or offline restart.

## Verification

| Command/check | Actual result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` | Passed; backend source unchanged |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 94/94 passed |
| Backend combined auth/household/foundation/deployment/Pantry suite | 44/44 passed |
| Backend `npm test -- --runInBand` | Health1/1 passed |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-offline-export` | Final web/iOS/Android gesture-fix exports passed,34 routes |
| Backend `npm run lint` | Existing exit127: ESLint absent |
| Mobile lint | No lint script |
| `git diff --check` / source review | Passed; no new secrets/debug logs |

Six new cache tests cover owner isolation/clear, caller mutation isolation, exact quantity/cost,
Kolkata rollover, composed cached-subset filters/counts/order, outcome invalidation, authoritative
empty replacement, stale versions,200-entry eviction and availability/error classification.
Context/gesture/native race behavior still requires iPhone checks. No live DB fixture tests were
repeated because this slice changes no backend services or persistence. No DB cleanup is pending.

## Delivery and next step

No backend deployment required. Existing duplicate Preview dpl_D3RUMLGCC1HLFSbr1EgZrwoeaRnN and
ignored API/Auth configuration remain unchanged. Expo is on exp://192.168.1.248:8085 (address changed).
User reports the requested iPhone development diagnostic checks passing on 12 October 2026:
labeled cached reads/filter/details, blocked editing/actions/swipes, cached no-match recovery,
End Test & Refresh restoring live mode, and sign-out/back blocking/relogin without old test state.
This is user-reported acceptance of simulated Pantry request loss with internet/authentication active;
it does not verify actual native network interruption, cold restart or disk persistence.
Exact next slice: secure persisted Pantry cache with owner/branch isolation and safe restart recovery,
while preserving the existing fail-closed authentication gate.

After this first slice, secure disk persistence and restart/recovery design remain Phase4 work.
Actual native transport failure paths, Android and deferred native/design/release QA remain unverified.
Final Phase4 review follows remaining offline work; Phase5 has not started.
