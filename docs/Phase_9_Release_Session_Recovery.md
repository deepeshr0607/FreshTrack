# Phase 9 — Release offline session recovery

21 October 2026. Readiness checks pass; the numbered Release iPhone result is pending. Uses the existing installed Release app with Metro stopped. No data changes are needed for this check.

## Reviewed behavior

`AuthProvider` refreshes on startup and return to active state. Root navigation overlays the current screen with a session-checking view, blocks pointer interaction and hides underlying accessibility elements while checking. On a verification failure, session state becomes error with no user and protected routes become inaccessible. Welcome exposes **Retry Session Check**.

The Neon client preserves saved provider session material on temporary transport/timeout failures. Explicit unauthorized, unverified or unavailable-account results clear it; recovery without logging in is therefore expected only for a still-valid remembered session. The network timeout is15seconds. Persistent storage survives app restart only when Remember this device was selected. No local session is manufactured to bypass verification.

This is the existing online-authentication policy. A saved Pantry copy is not authorization for offline cold-start access. The check does not promise full offline app functionality or exercise offline mutation queues.

## Actual automated checks

| Command | Result |
|---|---|
| Root `npx tsc --noEmit`, `npm run lint` |Both pass, zero lint warnings|
| `node --experimental-strip-types --test tests/auth-session.test.mjs tests/neon-auth.test.mjs tests/native-session-storage.test.mjs tests/auth.test.mjs` |36/36 pass|
| Backend `npx tsc --noEmit` |Pass; backend unchanged|
| `lsof -nP -iTCP:8081-8087 -sTCP:LISTEN` |No listeners; exit1 means no matches|
| `git diff --check` |Pass|

The suites cover network-failure credential retention, safe error state and retry, startup/expiry/sign-out protection, late-response guards and remembered versus memory-only storage. They do not exercise iPhone radios, native AppState transitions or actual hosted recovery. No source, package, native build, provider, API deployment, environment or grocery changes were made. Backend full suites were not repeated for this unchanged-client review;163/163 remains the preceding notification-readiness result. No live database test or account action was performed by the agent.

## Numbered iPhone checklist

Do not add/edit/import groceries, confirm outcomes, sign out or clear app storage during this check. Do not start Metro. Use **FreshTrack Dev** directly, not Expo Go. Existing signing profile expires23October2026 at10:08AM IST.

1. Keep internet on and USB disconnected. Open FreshTrack Dev. If necessary, log in with **Remember this device** checked. Expect Home.
2. Open Pantry, clear filters and refresh. Note one existing grocery's name, quantity and expiry privately. Return Home so no edit form is open.
3. In iPhone Settings, turn **Airplane Mode On**, then explicitly turn **Wi-Fi Off**. Airplane Mode alone may leave Wi-Fi enabled. Both cellular data and Wi-Fi must be unavailable for this test.
4. Return to FreshTrack and wait up to20seconds. Expect session checking followed by Welcome and **Unable to verify your session. Check your connection and retry.** Scroll down if needed. Back/swipe-back must not reveal a usable Pantry.
5. While still offline, tap **Retry Session Check** once. After up to20seconds, expect an error again with protected screens still blocked, rather than a crash or permanent spinner.
6. Keep the phone offline. Fully close FreshTrack from the app switcher, then reopen its icon. Expect the actual FreshTrack UI to load without Metro/Expo launcher. After up to20seconds, expect Welcome/session error and no usable Pantry. This tests a genuine offline cold start, unlike the earlier Expo Go checks.
7. Turn Airplane Mode Off and restore working Wi-Fi or mobile data. Return to FreshTrack. If it recovers automatically on resume, continue; otherwise wait for the current check to finish and tap **Retry Session Check**. Expect Home without another password or OTP for the still-valid saved session.
8. Settings must show the same account email. Return to Pantry, clear filters/refresh and verify the grocery's quantity/expiry are unchanged. Do not share its contents or the email; just report pass/fail.
9. With internet still on, fully close/reopen FreshTrack once more. Expect Home and normal Pantry access with the same account. Leave connectivity restored.

Report offline resume blocking, offline Retry, offline cold-start blocking, online recovery and final restart. Give a failing step/error text, never passwords, codes, tokens or grocery contents. An ordinary expired/revoked session requiring login is different from retaining a valid remembered session through a short transport outage; report that case explicitly instead of treating it as proof of recovery.

## Remaining acceptance

The phone result is pending. This does not accept API-only failures, slow/intermittent networks, offline outcome delivery, cross-account notification taps, clean-device installation, Android runtime or open upstream advisories. The earlier unattributed read-only database failure remains open. Next: record this result or fix an evidenced failure, then remaining Release failure/installation review. Phase9 remains incomplete; no store publishing.
