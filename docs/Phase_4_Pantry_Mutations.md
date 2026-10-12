# Phase 4 — persisted editing and confirmed outcomes

12 October 2026. Implemented and deployed to development. iPhone edit/restart and Used/Wasted
cancellation/confirmation/restart checks pass by user report. Phase 4
continues; no Phase 5, schema migration, dependency upgrade or production change in this slice.

## Behavior

- `PATCH /api/v1/pantry/:itemId` accepts validated name/category/exact quantity/unit/expiry/whole-entry
  paise plus `expectedUpdatedAt`. All fields are required for this edit contract; this is not an
  arbitrary partial model update. Request identity, household, status and other fields are rejected.
- `POST /api/v1/pantry/:itemId/consume` and `/waste` require `confirmed: true`, `expectedUpdatedAt`
  and a valid `Idempotency-Key`. Middleware verifies the provider JWT, and membership scopes every
  item lookup/update. Foreign and unknown items return the same 404.
- Serializable transactions pair edits with an EDITED event, and outcomes with a STATUS_CHANGED
  event and consistent status timestamps. Historical event snapshots are never rewritten.
- Edits and first-time outcomes compare the loaded version; stale requests return 409. Confirmed
  items cannot be edited or changed to the opposite outcome in this slice. Same-key replays return
  the current item without another write/event; differing payloads with that key return 409.
  Repeating the same confirmed outcome with another key is also a no-op.
- Editing an unrelated field preserves expiry/cost provenance. Explicit expiry changes become
  USER_ENTERED and clear the estimate preset. Changing quantity or cost clears a stale per-unit cost;
  whole-entry value remains authoritative. Unknown/free prices remain distinct.
- The existing detail form now edits real fields, reports errors, supports Reload Item, and blocks
  outcome confirmation while unsaved edits exist. Save/outcome waits for a server response. Cancelling
  a confirmation sends no mutation. Busy confirmations cannot be dismissed or submitted twice.
- Real Pantry cards use existing right-Used/left-Wasted swipes and accessible buttons, with ₹ values.
  After server success, shared state updates and refreshes. In-flight older list responses are ignored.
  The confirmation remains open on failure with retry feedback. Demo/default confirmation behavior
  is preserved through optional busy/error props.

## Deployment and verification

Preview: https://freshtrack-1qkkbjgzu-dragon-2818.vercel.app
Deployment: `dpl_HDWv7kgTdJrDM7bBDyJcDUboLmNL`, READY. Existing dedicated Vercel API project,
Preview-only pinned Neon development environment and approved hosting access policy preserved.
Build generates installed Prisma 5.22 and compiles; no seed/migration runs. Ignored mobile public
API URL updated; Neon Auth URL/origin preserved. Expo runs on port 8085; current Mac LAN address
is 172.20.10.2 (`exp://172.20.10.2:8085`). No hosting bypass or database credential is in mobile.

| Command / check | Actual result |
|---|---|
| Mobile/backend `npx tsc --noEmit`, backend `npm run build` | Passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 77/77 passed; existing module-type warnings |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/deployment.test.cjs tests/pantry.test.cjs` | 35/35 passed |
| Backend `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/pantry.integration.test.cjs` | Final rerun 7/7 passed; synthetic households cleaned up and cleanup asserted |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-phase4-mutations-export` | Web/iOS/Android passed; 34 static routes |
| Backend `npx --yes vercel@latest deploy --yes --target preview --logs` | Preview build/deploy passed |
| Public fetch checks on new Preview | Health200; tokenless PATCH/consume/waste401 |
| Backend `npm run lint` | Existing exit127: ESLint absent; mobile has no lint script |

Live tests cover persisted edits, original versus edited snapshots, stale-version and foreign-account
rejection, retry/hash conflicts, expiry/cost provenance, concurrent same-key outcomes, repeated/opposite
outcomes, active-list exclusion, timestamps, and rollback when an event write fails. Driver errors are
sanitized; no account/session/receipt payload is printed. Network/localhost checks ran with approved
escalation. Existing full cloud dependency audit findings remain unchanged; no audit fix was attempted.

## Next step and limits

User reports all requested iPhone checks pass: edit the Phase 4 Milk sample and restart to confirm
name/quantity/expiry/₹72.00 persistence; cancel and confirm right-Used on Milk and left-Wasted on
Apples; restart to verify both stay absent from active Pantry. Native offline/conflict/retry failure
paths and Android are not verified by this successful-path check.

Retry keys and unsaved fields remain process/form scoped, not persisted across termination. Offline
mutation queues, disk-backed reads, history UI, batch actions/undo, presets/expiry precedence and
server-wide filters/duplicate handling remain outside this slice. Other tabs/preferences remain mock.
Android, general Phase 1 visual/accessibility QA and production/signing checks remain deferred.

Next: the next small Phase 4 slice from the remaining inventory work,
starting with supported batch actions/undo or server-wide filters as agreed. Phase 4 final review
still follows; do not start notifications or provider integrations yet.
