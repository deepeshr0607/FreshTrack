# Phase 9 — Release notification acceptance

21 October 2026. Readiness checks complete; all12 Release iPhone checks passed by user report. Uses the installed Personal Team Release artifact recorded in [personal-use build](Phase_9_Personal_Use_Build.md), with Metro stopped. No diagnostic controls, Expo Go, paid push service, native rebuild or app-store distribution.

## Source review and automated checks

The existing native scheduler registers `FreshTrackExpiryActionsV1`, with foreground/unlock-required **Consumed** and **Wasted** actions. Date triggers include scoped/versioned item metadata; notification text stays generic. The response bridge reads live and cold-start responses, deduplicates them, waits for verified navigation/session state and opens the current item. Confirmations, rather than the notification tap itself, save version-checked outcomes to the durable queue. Normal-app mode ignores persisted diagnostic pause state. Server acknowledgement triggers Pantry refresh and reminder reconciliation. Already-resolved items never silently change status.

No source, dependency, config, environment, provider, schema, deployment or grocery was changed in this readiness pass. The installed Release build remains unchanged; its provisioning expiry remains23October2026 at10:08:49AM IST. No Metro listeners were found on8081–8087 (`lsof` exit1 means no matches).

| Command | Actual result |
|---|---|
| Root `npx tsc --noEmit`, `npm run lint` | Both pass; zero lint warnings |
| Root `node --experimental-strip-types --test tests/expiry-reminders.test.mjs tests/reminder-preferences.test.mjs tests/automatic-reminders.test.mjs tests/notification-intents.test.mjs tests/notification-outbox.test.mjs` |55/55 pass|
| Backend `npx tsc --noEmit`, `npm run lint`, `npm test` |Pass; build and163/163 tests including health|
| `git diff --check` |Pass|

These tests cover scheduler planning/reconciliation, preference/permission state, response parsing/cold-start deduplication, session/branch isolation and durable retry behavior. They do not prove iOS delivery, system button rendering, physical lock/unlock or current hosted authenticated outcomes. No live database fixtures or existing household actions were executed by the agent in this slice.

## Numbered iPhone checklist

Keep internet on and Metro stopped. Start sufficiently before midnight for both scheduling rounds to stay within one iPhone calendar day. Only the two named development samples below may receive outcomes; unrelated notifications must be cancelled after checking their item name. This checklist creates two real sample purchases in the development household.

1. Open **FreshTrack Dev** from its icon, with USB disconnected. Sign into the real account with Remember this device checked. Do not use Expo Go or a development URL.
2. Settings → Expiry Reminders: note the original saved time and On/Off preference, then Enable Reminders. Allow notifications if prompted. If blocked, use Open Device Settings to allow notifications for **FreshTrack Dev**, return and enable again. Expect permission Allowed and preference On. For the test, ensure Focus/Scheduled Summary is not delaying this app's notifications; report any settings blocker.
3. Pantry → Clear Filters → Add: create **Release Reminder Used**, then **Release Reminder Waste**. Both: Other, quantity1, unit piece, purchase value blank, Manual expiry tomorrow according to the iPhone calendar. Leave package date and shelf-life estimate blank. Confirm both are active in Pantry.
4. Settings → Expiry Reminders: save an HH:MM time at least four minutes ahead of the current iPhone time. Wait for automatic scheduling. Expect scheduled alerts and Next at that time. Use Sync Expiry Reminders once only if it reports a retry is needed. If scheduling fails or reports deferred-capacity alerts, report it before proceeding; the samples may not be scheduled.
5. Fully close FreshTrack and lock the phone. Wait until the saved time. Expect new **FreshTrack expiry reminder** notifications. Expand a group if needed, then touch and hold an individual notification. Expect **Consumed** and **Wasted**. Report absent buttons rather than substituting ordinary Pantry controls.
6. Tap **Consumed**, unlock if requested, and check the item name in FreshTrack. If it is **Release Reminder Used**, tap **Cancel**. If it is another grocery, Cancel and try a different new notification. Search Pantry afterward: Release Reminder Used must still be active.
7. On another delivered notification, tap **Wasted**. For **Release Reminder Waste**, tap **Cancel**; for an unrelated grocery, Cancel and try another notification. Verify both named samples remain active. Do not repeatedly reuse the same action on the same notification: delivered responses are deduplicated.
8. Return to Settings and save a NEW time at least four minutes ahead. Wait for automatic scheduling, then fully close FreshTrack and lock the phone. Wait for fresh notifications at the new time. This new delivery is necessary after the earlier cancellations.
9. On a fresh notification tap **Consumed**. Only when the details name is **Release Reminder Used**, tap **Confirm Used**. Cancel on every unrelated item. Wait for server acknowledgement; search active Pantry and confirm the Used sample is absent. Its future alerts should be cancelled automatically.
10. On another fresh notification tap **Wasted**. Only for **Release Reminder Waste**, tap **Confirm Waste**. Wait for acknowledgement; it should disappear from active Pantry. If the required notification was dismissed, schedule another time four minutes ahead for the remaining active sample and wait again; do not substitute an unrelated item.
11. Fully close/reopen FreshTrack and refresh Pantry. Both named samples must remain absent, with no unresolved notification actions. A queue panel may disappear when empty; if visible it should show0 pending. Report any retained pending/error state rather than forgetting the retry.
12. Settings → Disable Reminders: expect0 scheduled FreshTrack alerts. Close/reopen and confirm Off/0 persists. Then restore the original reminder time and On/Off preference from step2. If originally On, normal alerts may return after restoring it; that does not invalidate the preceding Off/0 check.

Report delivery, action-button visibility, both Cancel cases, both confirmed outcomes, closed-app navigation, restart persistence and disable cleanup. Share failing step/error labels or capacity warnings, never passwords, codes, tokens or receipt contents. The phone check observes controls and persistence, not authoritative database event counts.

## Limits and next step

The user answered “All checks passed” to the12 numbered in-chat checks on21October. Recorded as user-reported passes for actual closed-app delivery with Metro stopped, Consumed/Wasted visibility, both Cancel cases with groceries remaining active, confirmed Used/Wasted on only the two named samples, restart persistence/no unresolved queue, disable Off/zero after restart and restoration of the original reminder preferences. This is not direct agent observation, authoritative event-count verification, independent confirmation of every queue count or a new full-database reliability result.

This acceptance update changes documentation only; no code, native build, deployment, settings or groceries were changed by the agent. Prior automated results at checkpoint05a14b0 were not rerun. `git diff --check` passed. Android, clean-device install, poor-network/offline Release recovery, cross-account notification taps and other remaining Phase9 security/reliability limits are not accepted by this checklist. Next: Release failure-recovery testing using the installed app, beginning with offline session blocking and online recovery without changing groceries. No store publishing.

## References

- [Expo SDK57 notification categories, responses and date triggers](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/)
- [Apple: touch and hold notifications for quick actions](https://support.apple.com/en-nz/guide/iphone/iph6534c01bc/ios)
