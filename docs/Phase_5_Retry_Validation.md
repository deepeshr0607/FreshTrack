# Phase 5 item 6 — notification retry/event-history verification

Development database checks completed on 14 October 2026 after user authorization. The user answered “All checks passed” to the boxed
iPhone checklist on 14 October. This is user-reported Expo Go diagnostic evidence. Phase 5 remains incomplete.

## What changed

Added a guarded notification-retries.integration.test.cjs suite and the backend script
test:notification-retries:integration. The suite runs the existing mobile outbox against the real
backend Pantry service and Neon development database, then queries persisted event counts. It
retains the original item version and retry key through an injected lost response and recreates
the outbox from saved data to model a process restart. No runtime mobile/backend code, API contract,
Prisma schema/migration, Expo dependency/config, provider account or deployment was changed.

Both Used and Wasted committed-response-loss cases produce exactly one STATUS_CHANGED event after
restart/replay and further simultaneous retries. Reusing the key with a changed action or version
fails with IDEMPOTENCY_CONFLICT. Simultaneous first confirmations also produce exactly one event;
another same-outcome key is a no-op rather than another event.

An old queued Used action replayed after Undo and Wasted returns the current state and becomes
Needs review without changing the newer outcome or its timestamp. An edited item with a stale
queued version receives no outcome event. A foreign-household replay cannot change either item.
An injected event-insertion failure rolls back item status; the saved original-key retry later
succeeds with exactly one outcome event. The suite counts authoritative database history, rather
than inferring event uniqueness from the number of visible Pantry cards.

These are service/database integration tests with reserved synthetic identities, not real Neon
email sessions or a hosted HTTP end-to-end test. Existing authenticated HTTP boundary/JWT tests
remain separate. Response loss, process storage and insertion failure are injected; actual native
network/SecureStore/OS delivery failures remain outside this evidence.

## Fixture boundaries and cleanup

The suite requires requireDevelopmentDatabase(), pinned development endpoint/auth/pooler pairing,
development environment and ALLOW_DEVELOPMENT_DATABASE_TESTS=true before any database work. Exact
freshtrack-dev-test:notification-retry UUID subjects own all temporary households/items/events.
Cleanup deletes only households with at least one of those subjects and no other member, including
a bootstrap whose response could have been lost. Real accounts, seeded records, shared households,
production and Neon Auth tables are excluded. Final cleanup passed with zero memberships remaining
for this run's subjects. No cleanup is pending.

## Actual commands and results

| Command/check | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` / `npm run build` | Passed |
| `node --experimental-strip-types --test tests/*.test.mjs` | 157/157 passed |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs` | 48/48 passed with localhost-listener permission |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| Backend `env ALLOW_DEVELOPMENT_DATABASE_TESTS=true npm run test:notification-retries:integration` | Final 7/7 passed, including concurrent-first-confirmation test; fixture cleanup passed |
| Initial direct live suite command | Initial 6/6 passed and cleanup passed before adding the concurrent-first case and changed-version-key assertions |
| `npx expo-doctor` | 20/21; existing expo57.0.27/router57.0.25/splash57.0.9 versus recommended 57.0.28/57.0.26/57.0.10. No dependency changes. |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing ESLint missing, exit 127 |
| `git diff --check` / focused source review | Passed |
| Expo exports | Not rerun: no mobile/config/dependency changes. Prior final web/iOS/Android/34-route export passed for 37d70e5. |
| Existing Expo tunnel `/status` | packager-status:running; verified before requesting phone checks |

The reusable live script does not set its own mutation opt-in. Running it without the explicit
environment opt-in refuses before connecting. Builds never migrate or seed. Tests keep driver errors
redacted and do not log credentials/session material. No automatic commit push or deployment.

## Phone checklist requested in a question box

Keep mobile data and Metro running. Open exp://bm4ingq-deepesh_r-8086.exp.direct in Expo Go.

1. Reload and sign into the real development account with Remember this device checked.
2. Pantry → Notification actions: expect 0 pending. If unrelated actions remain, report them before
   starting this test.
3. Add Retry Proof Item: Other, quantity 1, unit piece, blank purchase value, Manual expiry tomorrow
   according to the iPhone calendar; leave package/estimate blank.
4. Pause Notification Sync (Test), or keep its existing paused state. In item details, Test
   Notification Used → Cancel: expect zero pending. Repeat → Confirm Used; try a quick repeated tap
   if possible. Expect one pending Used action and the duplicate-test buttons disabled for this item.
5. Retry Notification Sync twice while paused: expect one pending and the item still active. Fully
   close/reopen Expo Go: expect the same pending entry and paused state.
6. Review Item from the queued entry. In details, End Notification Test & Sync and wait. Expect
   zero pending and Used status. Retry twice: it should stay Used.
7. Undo Outcome → Cancel: it should remain Used. Repeat → Confirm Restore: expect ACTIVE. Retry
   twice, close/reopen and open this item from Pantry: expect ACTIVE and zero pending.
8. Pause again in details. Test Notification Wasted → Confirm Waste: expect one pending Wasted
   entry. Retry twice while paused: expect no extra entry.
9. End Notification Test & Sync: expect Wasted and zero pending. Retry twice, close/reopen and
   Refresh Pantry: the item remains absent from active Pantry and pending stays zero.

Phone checks verify presentation, submit guards and persistence. Database event counts were checked
by the automated suite above. The user answered “All checks passed”, recorded for the single-entry confirmation guard, repeated
retry, remembered restart, Undo cancellation/restoration and Wasted retry/restart. No additional
per-step counts or native event-table observation were supplied; database counts come from the
automated suite. No direct agent native observation is claimed. Actual transport loss, different-account native recovery, standalone/Android and OS action
delivery checks remain pending. Items 7–8 need the overdue/assumed-consumed product decision and real
reconciliation UI/service implementation; no Phase 6 work. Next: item 7 overdue handling and the assumed-consumed product decision when authorized.
This acceptance update changes documentation only; root TypeScript and diff checks passed again.
Prior runtime/database test results above were not rerun for the documentation update.
