# Phase 5 item 3 — automatic reminder reconciliation

Implemented on 12 October 2026 after user authorization. Requested iPhone lifecycle checks passed by user report on 13 October 2026.
Notification actions/offline action queue and overdue reconciliation are not started.

## Changes and behavior

The signed-in native Pantry provider now owns one coalescing reminder coordinator. It requests a
fresh schedule after acknowledged add/edit/Used/Wasted/undo/batch changes, explicit Pantry refresh,
saved reminder preferences/time, initial verified startup and subsequent verified session recovery.
The existing AuthProvider refreshes the session on app resume. A direct session subscription observes
every checking/verified publication, including checks that React batches into one render. Settings
permission/queue inspection also follows verified session publications.

Requests share a single work loop. New changes invalidate an older read/commit and coalesce into a
latest follow-up. Acknowledged mutations invalidate in-flight scheduling immediately; affected item
alerts are cancelled through the existing native ledger, then the authoritative ACTIVE list is
reconciled. Pantry saves/outcomes do not wait for the subsequent automatic full schedule refresh.
Successful preference saves notify the coordinator after native cancellation. Time changes therefore
replace targets automatically; Off cancels alerts without a Pantry API read.

Only fresh authenticated unfiltered server pages may supply reminder items. Ordinary cached Pantry
display can remain read-only while an automatic recovery attempt fetches independent live data;
cached rows are never scheduled or made writable. The development cache diagnostic explicitly pauses
these automatic Pantry reads and invalidates pending work. After ending the diagnostic, live refresh
can reconcile again. Account/branch scope, permission opt-in, anonymous/sign-out cleanup and stale
native-generation guards remain intact. The saved preference is rechecked after loading items.

Offline/read failures preserve the already-queued schedule and show a safe retry message. They do
not announce an acknowledged Pantry mutation as failed, queue a server mutation, expose raw errors
or fabricate a fresh snapshot. Later verified startup/resume, successful live refresh or the existing
Sync Expiry Reminders button retries. Sync uses the same coordinator as automatic work, avoiding a
second competing scheduling pipeline. No automatic permission prompt or background polling was added.

The existing durable OS identifier mapping, three milestones, past-target skip, device-local calendar
time, nearest-60/shared-capacity bound and 1,000-item live-read limit remain. Queue limits can defer
later alerts; opening/resuming/reconciling selects the next eligible ones. Changes on another client
become visible on the next live reconciliation, not continuously while this app is closed. Local
delivery remains OS-owned; app-killed state does not run JavaScript/API reconciliation. Android timing,
Focus/permission restrictions, standalone builds and exact delivery remain subject to prior limits.

Settings retains existing theme/card/form/navigation styles; its text now explains automatic refresh
and Sync as retry. Demo/digest preferences are unchanged. No backend service/schema/dependency,
Expo config, environment, deployment, assumed-consumed rule or production data change was introduced.
Existing household bootstrap may run idempotently when an opted-in account needs a live inventory;
no Pantry event/status writes are performed by the coordinator itself.

## Actual checks

| Command/check | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` and `npm run build` | Passed; source unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 132/132 passed |
| New coordinator/session tests | 8/8 passed within the full suite |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx expo-doctor` | 21/21 passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-auto-reminders-export` | All platforms/34 routes passed |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing ESLint absent, exit 127 |
| `git diff --check` / focused source review | Passed; no new secrets/debug logs/push-token calls |

New tests use the real pure scheduler with injected native/API boundaries. They cover burst
coalescing, stale read supersession, Off without network, preference changes during fetch, auth loss/
teardown, read failure and retry without duplicates, add/edit/outcome/restore/time reconciliation,
rapid session publications, foreign identity and diagnostic eligibility. Prior planner/cancellation/
provider tests remain passing. These do not prove actual UIKit lifecycle or Android behavior.

The current [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
was checked for the installed 57.0.22 API. This slice reuses existing native scheduling/cancellation
APIs; no new SDK module/version or native directories were added. No live database fixture suite was
rerun because backend services are unchanged; no fixture cleanup is pending.

## iPhone acceptance and limits

After receiving the complete step-by-step checklist, the user answered “yes working” on 13 October
2026. Recorded as user-reported passes for automatic add, expired/future expiry edits, Used
cancellation/confirmation and undo, Wasted/undo, saved-time rescheduling to 19:45, remembered
restart and repeated resume without duplicate growth, without manual Sync. The checklist used
the named development sample Auto Reminder Test at exp://192.168.1.248:8085. No actual A/B counts
or capacity notice were supplied; numeric totals are not independently recorded or inferred.

The agent did not directly observe the phone. No Xcode simulator runtime or Android tooling was
available; attempting existing iPhone Mirroring failed because the native automation pipe closed.
The user subsequently chose to perform the checks. Injectable tests and exports remain separate
from these native user reports. On 13 October, both TypeScript checks and the complete 132-test
suite were rerun successfully before checkpointing; prior build/Doctor/export/health evidence is
recorded above. No guarded live database integration test was added or run during the re-audit.

Exact next implementation slice, when authorized, is Phase 5 item 4: supported notification
categories/actions for Consumed/Wasted, with real development-build validation and documented OS
restrictions. Android/standalone/failure-path/full-cap QA remains unverified. Items 4–8 and final
Phase 5 acceptance remain incomplete. No Phase 6 work.
