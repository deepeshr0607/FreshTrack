# Phase 5 item 2 — explicit local expiry scheduling

Implemented on 12 October 2026 after user authorization. Requested iPhone checks passed by user
report during this slice, including actual local notification arrival. Item 3 remains partially
implemented; notification actions/offline status queue and reconciliation are not started.

## Behavior

Settings → Sync Expiry Reminders reads the saved device/account-scoped choice and current OS
permission, ensures the current household through the existing idempotent bootstrap, then reads
live unfiltered ACTIVE Pantry pages. Cached/demo rows are never used. Enabled sync is blocked in
read-only Pantry mode. Off sync needs no Pantry read and removes FreshTrack alerts.

The planner computes T−3, T−1 and expiry-day reminders at the saved HH:MM, using the device timezone
at sync. Calendar offsets precede local-time construction, preserving DST calendar semantics.
Nonexistent DST hours normalize forward through JavaScript Date; ambiguous fall-back hours use
its first occurrence. Targets at or before now are skipped. Changing device timezone requires Sync
again in this slice. Household expiry dates/countdowns remain Asia/Kolkata; this is device-local
reminder timing as selected in item 1, not a change to household dates/timezone.

The nearest 60 future alerts are selected chronologically with stable identifiers. Other queued
projects reduce available capacity; they are never cancelled. A visible deferred count tells users
to Sync as dates advance. Live reads cap at 1,000 items; an oversized or detectably changing inventory
fails before replacing the existing schedule. This is bounded explicit scheduling, not unlimited
automatic scheduling or a transactionally frozen snapshot across paginated reads.

Native scheduled requests form the durable identifier ledger, tagged with scope, item ID, milestone
and timestamp. Matching requests survive repeated sync/restart; obsolete requests are cancelled,
then missing ones scheduled and checked against the resulting OS queue. Partial native failures
show uncertainty and support retry without duplicating matching alerts. Schedule preparation carries
a generation guard so preference/identity/acknowledged Pantry changes cannot apply a stale plan.
No push token, server credential, OTP, cookie or grocery name/cost enters notification content.
Alerts use generic text; only metadata contains the scoped IDs/calendar target.

Necessary cancellation safeguards overlap item 3: saving a preference/time invalidates and cancels
old alerts; acknowledged edit/consume/waste/undo/batch changes cancel the affected item IDs;
successful sign-out/anonymous startup cancels FreshTrack requests, and verified identity changes
remove foreign-scope requests. Cancellation errors are surfaced in schedule status and retried on
subsequent cleanup/sync, rather than turning an acknowledged Pantry mutation into a failed save.
Already queued generic alerts survive transient offline auth failure; private routes still fail closed.
Foreground presentation requires a matching verified account; background local delivery is OS-owned.
Presented notifications are not a pending-queue ledger and are not cleared by cancellation.

Full automatic add/edit/consume/waste/undo and startup/resume rescheduling is **not** implemented.
Users must Sync after adding groceries, editing/restoring them, changing time, or as deferred dates
advance. This limitation is shown in Settings. No notification action buttons, action sync queue,
assumed-consumed writes, reconciliation or new backend API/schema/dependency change was introduced.

## SDK and delivery limits

Existing `expo-notifications 57.0.22` APIs were checked against the current
[Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/): DATE
triggers, optional identifiers, queue inspection/cancellation, next-trigger calculation and foreground
handler shape. Android channels use private lock-screen visibility. Exact-alarm privileges were not
added; the installed Android scheduler falls back to inexact scheduling when exact alarms are not
allowed. Delivery can be affected by OS settings/Focus and is not promised to the exact minute.
Android and standalone development/release behavior remain unverified. Expo Go has a shared host
permission/queue, so ownership filtering and capacity accounting preserve unrelated projects.

## Actual verification

| Command/check | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` and `npm run build` | Passed; source unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 124/124 passed |
| New scheduling tests | 12 planner/coordinator/auth-cleanup tests plus 1 live-pagination client test passed in the full suite |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx expo-doctor` | 21/21 passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-phase5-scheduler-accepted` | Final all-platform exports/34 routes passed |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing ESLint absent, exit 127 |
| `git diff --check` and focused source review | Passed; no new secrets/debug logs or push-token calls |

Tests cover calendar boundaries, past/equal-time skip, inactive items, invalid inputs, nearest-alert
cap, DST gap, ledger recovery/idempotence, replacement/Off cancellation, pending schedule/sign-out,
stale preparation, partial scheduling retry, foreign-scope/item cleanup, shared capacity, offline
auth retention/logout cleanup, unfiltered pagination and changed/oversized inventory rejection.
Native OS delivery is supported by the user report below, not by injectable tests or exports.
Backend live fixture tests were not repeated: no backend service/schema changed, and no fixture
cleanup is pending. No deployment/environment/production database changes were made by the agent.
Explicit app Sync can bootstrap the development household if it is absent; user-added test groceries
remain in that household until the user resolves them.

## iPhone acceptance and next step

User answered “yes working” to all requested steps at exp://192.168.1.248:8085:

- Tomorrow, plus-three-day and past-dated development samples; live Sync produced future alerts,
  skipped past targets, and repeated Sync did not increase the queue.
- Native pending queue survived a remembered-session Expo Go restart before the target time.
- An actual FreshTrack expiry reminder arrived after backgrounding/locking the phone.
- Disable removed FreshTrack pending alerts; Off/zero remained after restart.

No deferred-capacity notice or failure was reported. Full 60-alert capacity, Android, standalone
builds, exact timing, native failure paths and timezone/DST travel remain unverified. Notification
action and reconciliation acceptance criteria remain incomplete.

Exact next authorized implementation slice: Phase 5 item 3 — automatic lifecycle/startup/resume
schedule reconciliation, using the native identifier mapping and cancellation safeguards above.
Items 4–8 remain unstarted. No Phase 6 work.
