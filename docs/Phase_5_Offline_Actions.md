# Phase 5 item 5 — durable notification outcome retries

Implemented on 14 October 2026 after user authorization. Phone acceptance is pending.
No Phase 6, schema, backend service, dependency, deployment or environment change was made.

## Behavior and boundaries

Consumed/Wasted notification actions retain the existing confirmation step. Confirm first writes
a small account/Neon-branch-scoped outbox to native SecureStore, then attempts the authenticated
Pantry outcome endpoint. Each entry contains only the item ID, action, original expectedUpdatedAt,
retry key and review flag. Passwords, OTPs, cookies, API tokens, grocery names and prices are not
stored in this queue. Separate collision-free keys isolate accounts/branches; responses still derive
household membership exclusively from verified backend identity.

The original body/key survive transport failure, lost responses, restart and session interruptions.
Verified startup/resume, Pantry refresh and Retry Notification Sync request another serialized pass.
There is no background task or continuous network watcher. Restoring internet while staying in the
foreground requires Retry, Refresh or switching away/back. Server acknowledgement removes the retry,
refreshes Pantry/details and triggers existing reminder cleanup. A failed acknowledgement-storage
write retains the original key for replay; subsequent list-refresh failure does not resend an
already-removed action. Existing server transaction/idempotency/version rules are unchanged.

UI shows a pending count and each intended Used/Wasted outcome separately from acknowledged server
status. Pending items remain in the authoritative ACTIVE list until synced; competing local edits,
outcomes and undo are blocked. Read-only cached forms stay uneditable. A notification-specific
confirmation may save its selected outcome using the cached item's version while authentication
remains verified; it does not mutate that cached snapshot or announce success online. The server
checks the original version when connectivity returns. Ordinary cached Pantry buttons remain blocked.

400/404/409 and superseded-status responses are retained as Needs review and excluded from automatic
retry. Review Item and an explicitly confirmed Forget This Retry let the user inspect current state
and stop retrying. Forgetting does not undo a request that may already have committed. Other failures,
including rejected authentication, remain pending for later verified recovery. Corrupt/unreadable
storage is preserved and fails closed; it is not erased or replaced with an empty queue silently.
Confirmed actions do not expire automatically.

The existing authentication gate is preserved: no private screen or new confirmation is allowed
without a verified account. Already-saved actions survive failed session verification and sign-out,
but cannot send or appear for another account/Demo. Signing back into the same account can resume
them. The pending panel explains this retention. Cold offline startup still shows the authentication
recovery screen, not an unlocked kitchen. Unconfirmed notification taps are navigation intents only;
their existing ten-minute in-memory limit is unchanged.

The bounded queue allows five entries, also enforcing a 2,000-byte ASCII-escaped envelope before
writing. It refuses further confirmations rather than evicting an existing action. This reuses the
installed SecureStore version and WHEN_UNLOCKED_THIS_DEVICE_ONLY. The current
[Expo SecureStore reference](https://docs.expo.dev/versions/latest/sdk/securestore/) was checked:
large native values can be rejected, and app uninstall/keychain/backup behavior is not a guarantee
of permanent storage. This queue supports ordinary restarts, not recovery after uninstall or device loss.

The panel uses existing theme tokens/card/buttons. Two development-only helpers were added:
Pause Notification Sync (Test), persisted for that account, and Test Notification Used/Wasted in
details. They exercise the same confirmation/outbox path without simulating OS notification delivery.
The diagnostic pause is ignored in release builds. End Notification Test & Sync releases it. API
authentication and normal Pantry reads remain live throughout this test; it is not Airplane Mode.

## Actual checks

| Command | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` / `npm run build` | Passed; backend unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 157/157 passed, including 18 new outbox tests |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs` | 40/40 passed after allowing test localhost listeners; initial sandbox run failed EPERM |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx expo-doctor` | 20/21; existing installed expo57.0.27/router57.0.25/splash57.0.9 versus recommended 57.0.28/57.0.26/57.0.10. No dependency update. Initial sandbox DNS failure resolved with network-enabled retry. |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-notification-outbox-final-export` | All platforms and 34 routes passed |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing ESLint missing, exit 127 |
| `git diff --check` | Passed |

Tests cover persistence-before-send, transport/restart recovery, uncertain acknowledgement cleanup,
storage failures, conflicts/missing/superseded items, auth loss/recovery, diagnostic restart/release,
one action per item, capacity/encoded size, corruption, scope isolation, field whitelisting, in-flight
forget guards and concurrent confirmations. An injected transport uses the real API adapter to
assert identical HTTP key/body after a simulated lost response; its simulated event count is not
evidence of a live database transaction. Existing backend and prior integration evidence remain
separate. No new live database fixtures were created, and no cleanup is pending.

## Complete iPhone diagnostic checklist

Open `exp://192.168.1.248:8085` in Expo Go on the Mac's Wi-Fi. Keep internet and Metro running.

1. Reload FreshTrack. Sign in to the real development account with Remember this device checked.
2. Add Retry Test Used and Retry Test Waste: Other, quantity 1, unit piece, blank purchase value,
   Manual expiry tomorrow per the iPhone calendar. Leave package/estimate fields blank; save both.
3. Return to Pantry, find Notification actions and tap Pause Notification Sync (Test). Expect the
   paused message. This pauses only outcome retries; authentication and other Pantry APIs stay live.
4. Open Retry Test Used details → Test Notification Used → Cancel. Pantry must still show both
   samples and Notification actions must show zero pending. Repeat → Confirm Used. Expect one
   pending Used action; the item remains active, with editing/ordinary outcome controls unavailable.
5. Open Retry Test Waste → Test Notification Wasted → Confirm Waste. Expect two pending actions,
   one Used and one Wasted, with both samples still active and their swipes unavailable.
6. Fully close/reopen Expo Go. Open Pantry. Expect two pending actions and the persisted paused
   message. Both sample items must still be active. Do not tap End Notification Test & Sync yet.
7. Settings → Sign Out, then Log In to the same account. Open Pantry: expect the same two pending
   actions and pause still active. Sign-out/private-route protection must remain unchanged. This
   deliberately retains confirmed retries; it does not claim an offline cold start bypass.
8. Tap End Notification Test & Sync and wait until syncing finishes. Expect zero pending, a synced
   message and both samples absent from active Pantry. Retry Notification Sync twice; neither sample
   should return and no new pending entry should appear.
9. Fully close/reopen Expo Go and Refresh Pantry. Both samples must remain absent and pending must
   stay zero. Record pass/fail for Cancel, queueing, blocked competing controls, restart, same-account
   sign-out/login retention and final Used/Wasted sync. Include only errors; never credentials.

On 14 October the user reported that the Retry Test Waste diagnostic buttons were greyed out.
Added inline disabled-reason feedback for unsaved edits, an in-progress item request and an existing
pending outcome. Existing guards were preserved. Both TypeScript checks, root157/157 and final
web/iOS/Android exports (34 routes) passed again using /private/tmp/freshtrack-button-feedback-export.
No new lint/Doctor/backend runtime suite was rerun for this text-only UI change. The exact phone
blocker is awaiting clarification; no successful recovery or completed checklist is recorded yet.

If the new explanation reports unsaved edits, Save Changes or use Reload Item to discard them
before testing. If it reports an existing outcome, review the queue: this particular item already
has a confirmed retry and must not be queued twice. A busy request should finish before testing.
Keep the pause active during these checks.

No complete user pass is recorded yet. This diagnostic verifies native storage/UI and authenticated live
recovery while the network stays on. Actual transport loss, session-error recovery, foreign-account
isolation, conflicts, storage exhaustion, cold start from an actual notification, Android and real
development-build checks remain pending. Item 4 OS action verification in Expo Go was already
reported separately before this change; its changed confirmation path needs another native check.

## Remaining work

Item 6 still needs final live retry/event-history verification for the durable notification path;
existing server idempotency and this queue's same-key behavior are partial evidence. Items 7–8,
the assumed-consumed product decision, real-build/Android/failure-path QA and final Phase 5 review
remain incomplete. Next: run the iPhone diagnostic, then item 6 validation when authorized.
