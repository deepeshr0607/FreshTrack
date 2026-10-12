# Phase 5 item 1 — contextual permission and device reminder preference

User authorized this slice on 12 October 2026. Implemented; required iPhone checks passed by user report.
Scheduling, notification actions/offline queue and overdue reconciliation are not started.

## Changes

Signed-in native Settings adds an Expiry Reminders card using existing shared card, font, button
and keyboard-aware form styles. No separate Settings reference is supplied; design tokens and
navigation are preserved. Demo/web retain the original mock digest/preferences and never request
notification permission. The signed-in daily digest also remains explicitly a prototype.

Opening the card only reads permission and the saved choice. Enable Reminders explains the purpose
before requesting OS permission. Already-allowed permissions skip the prompt; denied requests stay
Off and explain retry or device Settings recovery. Android creates a private expiry-reminders channel
before requesting permission. iOS provisional permission is displayed as Allowed quietly.
No push/device token is requested or stored, and no notification is scheduled.

Enable/Disable and validated HH:MM time persist via existing SecureStore in a separate namespace,
with account/Neon-branch scope and device-only unlocked accessibility. Default is Off/17:00. Only
one account's latest device choice is retained; another account/branch or corrupt value defaults Off.
The backend UserPreference model/endpoints are unchanged: this preference is device-local, not
account-wide server synchronization. Sign-out retains the scoped non-secret preference, while the
auth gate continues blocking private screens. Later scheduling must cancel account alerts on exit.

OS permission and app opt-in are distinct: disabling the preference does not revoke OS permission.
Revocation detected on return to Settings displays Off even if the saved choice remains On, with
an explicit Turn Saved Preference Off action. Time can be saved while reminders are Off. Busy guards
prevent duplicate prompts/writes; failures retain last acknowledged choices and offer status refresh.
Auth/identity is checked around asynchronous permission work to prevent stale-account opt-in.
An OS-dialog/resume-triggered auth check can abort an in-flight enable safely; after verification,
the user can tap Enable again. No auth policy is weakened for permission recovery.

Installed `expo-notifications ~57.0.22` using `npx expo install expo-notifications`, added its config
plugin, and retained Expo SDK 57 and all existing release identifiers/configuration. Transitive
expo-application/badgin were added by the SDK-managed install. Install reports the existing 29 audit
findings; no broad audit fix or unrelated dependency upgrade was performed. Backend/database and
hosted Preview are unchanged; no deployment or database writes/fixture cleanup are needed.

## SDK evidence and limits

The implementation follows the current [Expo Notifications reference](https://docs.expo.dev/versions/latest/sdk/notifications/),
which lists recommended version ~57.0.22, read-only getPermissionsAsync, requestPermissionsAsync,
iOS provisional status interpretation and Android channel-before-request guidance. Local notification
support is documented for Expo Go; remote push is not part of this slice. Permission in Expo Go is
shared by its hosted projects. Standalone per-app permission/config and later notification actions
require real development/release-build verification; exports do not verify OS prompts or delivery.

## Actual checks

| Command/check | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` | Passed; source unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 111/111 passed |
| New reminder preference tests | 9/9 passed within the full suite |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx expo-doctor` | 21/21 passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-phase5-permission-export-final` | All platforms/34 routes passed |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing ESLint absent, exit 127 |
| `git diff --check` and focused source review | Passed; no debug logs, secrets, scheduling or push-token calls introduced |

Tests use injected permission/storage implementations, covering read-only startup, explicit opt-in,
restart persistence, allowed/quiet permission, denied/blocked recovery, account/corruption isolation,
invalid time/storage failure, session changes during a prompt, repeated submit, revocation/disable
and initial-read retry. These are not evidence of actual native permission prompts or Settings UI.

## iPhone acceptance and next step

User answered “yes working” to the requested checks at exp://192.168.1.248:8085. Recorded as
user-reported passes for read-only permission status on opening Settings, explicit Enable/opt-in,
invalid-time rejection, saving 18:30 and restoring the On/time preference after restart, and
Disable/Off persistence after restart. These are native user reports, not automated UI evidence.
The blocked-permission/device-settings recovery step was optional and was not specifically
confirmed, so it remains unverified on device. Android and standalone-build checks also remain open.

This acceptance update changes documentation only. Automated results above were run at implementation
checkpoint 0579aab; they were not repeated for this update. Documentation diff checks pass.
Exact next implementation slice: Phase 5 item 2, when authorized — actual local expiry scheduling
at T−3/T−1/expiry, skipping past targets. No notifications are scheduled yet. Items 2–8 and final
Phase 5 acceptance remain incomplete; no Phase 6 work.
