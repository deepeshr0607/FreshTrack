# Phase 2 release configuration preparation

11 October 2026. This is local configuration preparation, not a build, deployment or store upload.
Android device testing is deferred by the user. The user does not have a paid Apple Developer
membership; continue development on iPhone with Expo Go. No membership purchase is needed now.

## Files and behavior

- `app.json` remains the source of existing SDK/plugins/assets/orientation/tablet settings.
- `app.config.js` applies `scripts/release-config.cjs`. Without APP_VARIANT, Expo Go uses the
  existing configuration. Preview/production require explicit build identity and public endpoints.
- `eas.json` has preview (internal iOS device build / Android APK) and production (store iOS build /
  Android AAB) profiles. Each selects its own EAS environment. Production uses remote build-number
  management and auto-increment. No submit or automatic upload configuration was added.
- Preview app name, identifier suffix `.preview`, and scheme `freshtrack-preview` distinguish it
  from production `freshtrack`. The production reverse-domain identity is supplied by the owner;
  no permanent identifier was invented or registered.
- `.env.release.example` contains placeholders only. Missing IDs, placeholder inputs, credential-
  bearing URLs and non-public/insecure URLs stop release configuration resolution. Existing local
  development URLs remain untouched. Actual root `.env.*` files are ignored; templates are allowed.

## What can wait

You can keep developing in Expo Go without paid Apple membership. EAS iPhone device builds later
need authorized Apple signing credentials; TestFlight/App Store distribution requires the Apple
Developer Program. Simulator builds are a separate option, but this Mac currently has no available
simulator tooling and no simulator build was configured or tested. Android settings do not prove
Android native behavior; test on an emulator, borrowed device or tester before Android publication.

## Inputs required before a standalone build

| Setting | Where / purpose |
|---|---|
| APP_NATIVE_IDENTIFIER | Chosen permanent reverse-domain identifier for iOS and Android; preview appends `.preview` |
| APP_EAS_PROJECT_ID | Actual project UUID from the owner's Expo/EAS project; public configuration |
| EXPO_PUBLIC_NEON_AUTH_URL | Correct preview/development or production Neon Auth branch, matching backend NEON_AUTH_URL |
| EXPO_PUBLIC_NEON_AUTH_ORIGIN | Controlled public HTTPS origin approved on that branch's Auth allowlist |
| EXPO_PUBLIC_API_URL | Actual deployed HTTPS API origin, without `/api/v1` or another path suffix |
| Apple signing credentials | Managed by EAS/Apple, never public mobile env variables or Git |

APP_VARIANT is set by each build profile. Set these non-secret values as plain-text variables in
EAS preview and production environments; config evaluation needs to read them. Never place
DATABASE_URL, DIRECT_URL, OTP/session material, signing passwords, Google credentials or
Spoonacular keys in mobile configuration. Database/integration secrets stay backend-only.

The development LAN origin is not production configuration. Do not copy it into production.
`freshtrack://` is the app navigation scheme, not an accepted Neon HTTP/HTTPS Auth origin. Neon
rejected that custom scheme during the proof of concept. Register a controlled HTTPS origin for
standalone preview/production and verify real sign-up, verification, restoration and sign-out there.
No production allowlist, Neon branch, SMTP settings or other account setting was changed in this slice.

## Later setup order (not performed now)

1. Create/use the owner's Expo account and project. Choose final app identifiers before registration.
   Use `npx eas-cli@latest login` and `npx eas-cli@latest project:init` when ready. The dynamic config
   cannot be automatically edited by EAS; copy the assigned UUID into APP_EAS_PROJECT_ID in ignored
   local config and the matching EAS environments. Keep APP_VARIANT unset for initial linking so the
   existing Expo Go config resolves before release inputs exist.
2. Prepare actual HTTPS preview/production backend services and matching Neon Auth configuration,
   with development test accounts separate from production. Configure production email delivery.
   Backend NEON_AUTH_URL must match mobile's branch; NODE_ENV/APP_ENV should be production for the
   production deployment and ALLOWED_ORIGINS should list the chosen HTTPS app/web origins. No LAN
   origin or real secret belongs in tracked examples. Backend deployment is not included here.
3. Populate EAS environment inputs from the table. `.env.release.example` is a template, not a live
   env file. Confirm resolved public config contains only public data with `npx expo config --type
   public`. Set APP_VARIANT explicitly when validating a local release config; use EAS environments
   for a cloud build. The validator checks syntax/transport, not DNS ownership, service reachability,
   branch identity or store identifier availability.
4. Obtain Apple membership/signing credentials when a standalone iPhone build is needed. Build with
   `npx eas-cli@latest build --platform ios --profile preview` after setup and authorization. This
   creates a device build, not an App Store submission. Repeat the native auth/failure checks on it.
   Later use production profile for TestFlight/store preparation. Do not auto-submit.
5. Android preview/production builds and native tests remain deferred. There is no requirement to
   buy an Android device now. No certificate, provisioning profile or keystore was generated.

## Verification and limits

- Root/backend `npx tsc --noEmit`: exit 0.
- Root `node --experimental-strip-types --test tests/*.test.mjs`: 70/70 passed (65 prior + five
  release configuration tests). Focused release tests also pass after the placeholder guard update.
- `npx expo config --type public --json`: existing development configuration resolves successfully.
- Actual Expo CLI preview/production resolution using **synthetic** public fixture env values:
  succeeds, preserves plugins/assets, returns distinct IDs/name/scheme; production LAN API input is
  rejected. These are local resolution checks, not real production service verification.
- Official `@expo/eas-json` 24.9.0 schema: eas.json passes. Validator downloaded into
  `/private/tmp/freshtrack-eas-schema`; no repository dependency was added or updated.
- Backend `npm run test:auth`: build succeeds, 7/7 passed. `npm test -- --runInBand`: health 1/1 passed,
  using local socket permission.
- `npx expo-doctor`: 21/21 passed.
- `npx expo export --platform web --platform ios --platform android --output-dir
  /private/tmp/freshtrack-release-preparation`: exit 0, all bundles/34 static routes exported under
  current development config. An Expo export is not a signed native build or Android device test.
- Existing lint gaps remain: backend ESLint absent, mobile no lint script. No native build/signing,
  EAS project linking, environment creation, production login, API deployment or store upload ran.

Local preparation is complete. Live release configuration/signing verification remains deferred until
actual account/project IDs, public services and signing credentials are available. Phase 2 still needs
final acceptance/architecture review, JWT revocation policy and checkpoint commit; Phase 3 has not started.

Sources: [Expo config](https://docs.expo.dev/workflow/configuration/),
[EAS profiles](https://docs.expo.dev/build/eas-json/),
[EAS environments](https://docs.expo.dev/eas/environment-variables/),
[Build versions](https://docs.expo.dev/build-reference/app-versions/),
[Apple signing](https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions/).
