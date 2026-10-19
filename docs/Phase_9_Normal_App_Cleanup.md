# Phase 9 — normal app cleanup

19 October 2026. First small Phase9 slice, authorized after the receipt-focused Phase6 review. All seven requested iPhone checks passed by user report. This does not deliver a standalone app, account deletion or completed Phase9. App Store submission/publishing stays excluded.

## Changes

- Centralized `DIAGNOSTICS_ENABLED` requires both a development bundle and the exact public flag `EXPO_PUBLIC_ENABLE_DIAGNOSTICS=true`. The default is off; release bundles ignore the flag. This controls UI capabilities, not server authorization.
- Welcome no longer offers Demo Kitchen or the auth probe by default. Auth forms ignore forced `mode=demo` unless diagnostic mode is enabled; no default web Demo bypass remains. Connected authentication remains native-only.
- Expo Router guards the auth probe, demo recovery and three scanner check routes. Normal receipt/barcode/manual entry routes retain their existing signed-in protection. Diagnostic files remain in the repository/export; hiding them is not a claim of bundle removal.
- Pantry/cache/overdue/notification test controls are hidden. A real pending notification retry remains visible and recoverable. Existing confirmed notification outcomes paused by a diagnostic resume when diagnostics are disabled, using their original idempotency keys.
- Confirmed paused receipt/barcode purchases retain their normal explicit continue/retry controls; hiding diagnostics never automatically imports a receipt or creates a purchase.
- Real Settings retains actual reminder preferences, account details, sign-out and Privacy & Data. The in-memory daily digest/time controls appear only in Demo. Error/status notices remain visible outside the Demo card.
- Unconnected social/biometric sign-in controls are hidden outside diagnostic mode; the unimplemented daily-digest opt-in is hidden for real sign-up. Existing supported email/password/OTP forms retain their visual styling and navigation. Password recovery remains explicitly unavailable rather than using the demo recovery screen.
- Privacy & Data now describes current Neon auth/household storage, device receipt OCR, best-effort image cleanup, account-scoped cached/retry data, Spoonacular ingredient requests/five-minute backend cache, local reminders and unavailable account deletion. Welcome and both account forms link to it without claiming published Terms exist.

No backend, schema, native module, dependency, real environment file, deployment or saved household data changed. Existing supplied design styling/components are preserved; unsupported preview controls are gated rather than redesigned. The receipt twenty-food scope and deferred barcode follow-up are unchanged.

## Development opt-in

Normal `npx expo start` needs no extra setting. `.env.example` documents the non-secret flag defaulting to false. To troubleshoot intentionally:

```sh
EXPO_PUBLIC_ENABLE_DIAGNOSTICS=true npx expo start --dev-client --port 8087
```

Restart Metro after changing the flag. A release bundle always disables diagnostics even if this flag is true. Do not use this flag for secrets. This slice leaves `__DEV__` network URL validation unchanged.

## Verification

- `node --experimental-strip-types --test tests/*.test.mjs`: 364/364 passed. New behavior tests cover opt-in/release Demo access and restoring a diagnostic-paused confirmed notification with exactly one send after diagnostics turn off.
- `npx tsc --noEmit`: passed.
- Backend `npx tsc --noEmit` and `npm run build`: passed.
- Backend non-integration Node tests: 144/144 passed, including local HTTP boundaries; no live database/provider calls.
- Backend `npm test -- --runInBand`: health test 1/1 passed.
- `npx expo export --platform all`: web/iOS/Android export passed, 40 routes. This verifies compilation, not native runtime or deep-link acceptance.
- `npx --yes expo-doctor`: 20/21; existing patch gaps for expo, linking, notifications, router and splash-screen. No package upgrades in this slice.
- Backend `npm run lint`: exit127, ESLint not installed (pre-existing). Root has no lint script.
- `git diff --check`: passed.
- Updated iOS manifest and bundle served successfully by Metro on port8087. No native rebuild/install or standalone launch performed.

## Phone acceptance recorded

The user answered “All checks passed” to the seven-step normal-mode FreshTrack Dev check:

1. Open/reload the existing development build using Metro.
2. Actual account/reminder settings visible; backend test controls and Demo digest form absent.
3. Pantry/item details accessible without diagnostic/cache/notification-test buttons, without changing groceries.
4. Normal Scanner/Receipt OCR controls and photo-picker cancellation/navigation work without scanner-test buttons.
5. Privacy & Data opens and Done returns.
6. Sign-out returns to clean Welcome/account forms without Demo/test links, social buttons or real-sign-up digest opt-in.
7. Existing-account login with Remember checked restores after closing/reopening.

This is user-reported acceptance, not agent observation, native deep-link redirection testing, a new import/delivery test or standalone-build verification. No remaining phone checklist for this slice. This acceptance update changes documentation only: no runtime/data changes or fresh automated reruns; verification results above belong to implementation checkpoint `c939669`.

## Next steps and limits

1. Normal-flow iPhone acceptance is recorded complete for this slice; remaining Phase9 implementation starts with account/data deletion.
2. Implement authenticated account/data deletion with provider constraints and household ownership rules. It is not available yet.
3. Complete retention/abrupt-termination image cleanup and security/authorization review against remaining Phase9 criteria.
4. Resolve existing lint/SDK patch issues deliberately, with relevant native regression checks.
5. Prepare and verify a personal-use standalone iPhone build, icons/permissions, clean install/update/session/network behavior. The current FreshTrack Dev build still requires Metro; free Apple signing has renewal limits.
6. Android runtime, full accessibility/native profiling, production environment separation and a clean-checkout build remain unverified. No store publishing.
