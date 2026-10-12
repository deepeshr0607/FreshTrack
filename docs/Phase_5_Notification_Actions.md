# Phase 5 item 4 — notification actions

Implemented on 13 October 2026 after user authorization. Native acceptance is pending.
Items 5–8 and final Phase 5 review remain incomplete; no Phase 6 work.

## Behavior

Owned local expiry notifications register the FreshTrackExpiryActionsV1 category with Consumed
and Wasted buttons. Both open the app; iOS requires device authentication and marks Wasted as
destructive. A body tap opens details without a confirmation sheet. No background status mutation
or automatic assumption about consumption is performed.

The response bridge handles live responses and the native last response at startup. It validates
the identifier, UUID, milestone, branch/account scope, timestamp and action before constructing a
Pantry route. A bounded in-memory inbox deduplicates listener/startup delivery, waits for verified
authentication, drops foreign-account/Demo intents and expires waiting intents after ten minutes.
This is a navigation intent, not the durable offline mutation queue planned in item 5. Clearing
the OS last-response slot is best effort; a host failure may show the confirmation again after a
later restart, but cannot automatically write an outcome.

The existing detail screen loads the current scoped item and preselects its existing confirmation
sheet only for a live ACTIVE item. Cached read-only details, missing items and already-resolved
items do not apply an action. Cancel leaves the item unchanged and clears the route action.
Confirm uses existing authenticated, version-checked, idempotent outcome requests; successful
outcomes trigger the existing automatic schedule cleanup. Failures retain error/retry feedback
and the same request key while this screen remains mounted. Durable retry across restart and
offline optimistic updates are not implemented by this slice.

Scheduled metadata now includes actionVersion 1. Reconciliation replaces legacy future alerts
without this category/version under their stable identifiers. Repeated reconciliation does not
increase the queue. Already-delivered old alerts are not rewritten. Other projects' notifications
are not altered. Lock-screen text remains generic; always review the actual item before confirming.

No backend, schema, dependency, environment, deployment or production-data changes were made.
The current [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
was checked for category options and synchronous last-response APIs in the installed SDK.
Action presentation varies by OS: expanded banners/Notification Center or Android notification
expansion may be needed. Ordinary Pantry Used/Wasted controls remain available as a fallback.
Web does not register or process native actions. Expo Go checks are prototype evidence; the plan
requires actual development-build validation on iOS and Android before final acceptance.

## Actual verification

| Command | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` and `npm run build` | Passed; backend unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 139/139 passed |
| Backend `npm test -- --runInBand` | Health 1/1 passed after localhost-listener permission; first sandbox attempt failed EPERM |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-notification-actions-export` | All three platforms and 34 routes passed |
| `npx expo-doctor` | 20/21; recommends expo ~57.0.28, expo-router ~57.0.26, expo-splash-screen ~57.0.10 instead of installed 57.0.27/57.0.25/57.0.9. Dependencies unchanged. First sandbox attempt could not resolve npm; network-enabled retry completed. |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing missing ESLint, exit 127 |
| `git diff --check` | Passed |

Six new pure intent tests cover action/body parsing, malformed/unknown/foreign notifications,
duplicate delivery, authentication waiting, account/branch/Demo isolation, expiry and latest-tap
replacement. One scheduler regression covers legacy category upgrades and repeated-sync stability.
These tests do not exercise native category rendering, UIKit navigation or actual delivery.
No live database fixture test or native observation was performed in this slice.

## Complete iPhone prototype checklist

Use the Mac's current Wi-Fi and `exp://192.168.1.21:8085` while Metro is running. Keep internet on.
If this is close to midnight, start after midnight so all test reminder times stay within one day.

1. Reload FreshTrack in Expo Go. Sign in to the real development account with Remember this device
   checked. Open Settings → Expiry Reminders, enable reminders and allow notifications if requested.
2. In Pantry add **Action Test Used** and **Action Test Waste**. For each choose Other, quantity 1,
   unit piece, blank purchase value, and Manual expiry tomorrow according to the iPhone calendar.
   Leave package date and estimate blank. These are the only items to change during this test.
3. Return to Settings. Save a reminder time at least three minutes ahead of the iPhone's current
   time in HH:MM format. Wait for automatic scheduling to finish. Check Next uses that time. If a
   capacity/deferred warning appears, report it; test samples may not be in the nearest-alert queue.
4. Background Expo Go and wait until that time. Expand a new FreshTrack notification using your
   OS's available notification controls. Look for **Consumed** and **Wasted**. If buttons are absent,
   report that rather than treating ordinary Pantry buttons as a notification-action pass.
5. Tap Consumed. Unlock if requested. Expect FreshTrack to verify the session, load current details
   and show the Used confirmation sheet. Check the item name. If it is not one of the two Action
   Test samples, Cancel and try another notification; do not change unrelated groceries.
   For either named sample, Cancel; it must remain ACTIVE in Pantry.
6. For the other named sample, use a new notification's Wasted button. Check the name and Cancel;
   both samples must still be ACTIVE. If needed, save a new time three minutes ahead and wait again
   to obtain fresh notifications; cancelled delivered notifications are not replayed automatically.
7. Save another reminder time three minutes ahead and wait for automatic scheduling. Fully close
   Expo Go, keep the Mac/Metro running, then wait for the notifications. Tap Consumed on a new
   notification. When Action Test Used opens, Confirm Used. If another item opens, Cancel. Expect
   the named sample to disappear from active Pantry and its future reminders to be removed.
8. Tap Wasted on the notification for Action Test Waste, verify its name, and Confirm Waste. Expect
   it to disappear from active Pantry and its future reminders to be removed. If notifications are
   grouped or one was dismissed, change time three minutes ahead to obtain a fresh alert for the
   remaining ACTIVE sample, then repeat. Do not confirm on any unrelated item.
9. Fully close/reopen Expo Go and check both samples remain absent. Open their outcome details if
   available: there should be one confirmed outcome each, with the existing Undo control available.
   Do not undo unless you want to restore these test entries.
10. Optional body-tap check: create Action Test View with the same fields and expiry tomorrow.
    Save a time three minutes ahead, background/wait, then tap the notification body. When that
    named sample opens, expect details with no automatic confirmation or status change.
11. Settings → Disable Reminders. Expect zero scheduled FreshTrack alerts. Report separately:
    button visibility, Cancel, Confirm Used/Wasted, cold-start navigation and restart persistence,
    plus body-tap behavior if tested. Include error labels and capacity warnings, never credentials.

## Remaining acceptance

No user result for this checklist is recorded yet. Real development-build iOS action rendering,
Android action rendering/timing, device-lock/cold-start behavior, foreign-account taps, offline
failure/retry and already-resolved notification paths require native validation. Android tools and
an iOS development build are not presently available. Offline queued writes remain item 5.
Next: execute the native checklist; then item 5 durable offline action syncing when authorized.
