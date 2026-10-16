# Phase 6 — local development build preparation

16 October 2026. User chose to investigate free on-device OCR after Google Cloud billing required
an upfront payment. This resumes Phase6 prerequisites, not Phase9 release work. Google Cloud Vision
remains unconfigured. ML Kit is the proposed replacement, not an installed or verified integration.
No Google credentials, cloud deployment, paid build service or store submission is involved.

## Verified preparation

- Xcode26.6 (17F113) is installed in /Applications and selected by xcode-select.
- Prior direct device diagnostics recognized the user's connected iPhone with iOS26.6.1,
  Developer Mode enabled and developer disk-image services available. That is not proof the app builds.
- Installed SDK-compatible expo-dev-client~57.0.20 using npx expo install, with the lockfile updated.
- Optional APP_LOCAL_NATIVE_IDENTIFIER applies only to the development variant, gives the app a
  distinct name FreshTrack Dev and scheme freshtrack-dev, and requires no EAS project registration.
  Preview/production retain their existing validation; default Expo Go config remains unchanged.
- Expo prebuild generated the ignored ios project, not a new app repository. Existing npm scripts
  were preserved. Native folders remain generated artifacts, not the source of configuration.
- Temporary development identity used for generation: com.deepeshr.freshtrack.development.
  This is provisional, not an App Store identifier or a claim of domain ownership/availability.

Commands:

```sh
npx expo install expo-dev-client
APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development npx expo prebuild --platform ios --no-install
# After CocoaPods is available, use the same identity whenever regenerating/building:
APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development npx expo run:ios --device
# Subsequent JS-only development after successful installation:
npx expo start --dev-client
# Expo Go remains available explicitly:
npx expo start --go
```

No automatic signing request, Apple team selection, certificate creation or app installation ran.
If Personal Team signing exposes unsupported capabilities, inspect the generated entitlements and
fix only the local configuration; do not remove working notification features globally. Auth origin
and existing account/session behavior require retesting in the separate application sandbox.

## Checks

- Mobile npx tsc --noEmit: passed.
- Backend npx tsc --noEmit: passed; backend runtime untouched.
- node --experimental-strip-types --test tests/*.test.mjs:207/207 passed, including local-ID
  validation and unchanged production guards.
- Expo web/iOS/Android export: passed,35 routes, /private/tmp/freshtrack-devclient-export.
- Expo Doctor:19/21, missing CocoaPods plus the six previously recorded Expo patch mismatches.
  Generating ios exposes native-tooling checks; no successful CocoaPods or native build is claimed.
- Existing lint setup gaps remain; no new lint tooling is added in this setup slice.

## Current blocker and next step

CocoaPods is absent; Homebrew is also absent from the checked locations. macOS supplies Ruby2.6.10.
A user-local gem installation failed: ffi requires Ruby>=3.0 while system Ruby is2.6.10.
Some prerequisite gems were installed in the user gem directory, but the pod executable is absent.
Do not modify system Ruby or use sudo gem install to work around this. Install Homebrew and its
cocoapods formula, which supplies a suitable Ruby dependency, then recheck pod --version.
Homebrew setup may require the owner to enter the Mac administrator password locally.
Public RubyGems HTTP endpoints returned200; this observed failure is dependency compatibility,
not evidence of an offline Mac.
No pod install or signed compilation has succeeded. OCR package selection, SDK57 compatibility,
receipt capture/parser/review/import, barcode catalog choice and all phone checks remain incomplete.

First get CocoaPods working, then install native dependencies and attempt a signed local device
build, resolving only evidenced failures. After a successful baseline, evaluate an on-device OCR
module against SDK57 and revise the Phase6 receipt architecture explicitly. The backend continues
to validate identity, household ownership and all reviewed imports regardless of OCR location.
No receipt draft may write Pantry data without confirmation. Phase8 development review remains
closed with its skipped phone checks; Phase9 has not started.

Official docs consulted:
- https://docs.expo.dev/versions/v57.0.0/sdk/dev-client/
- https://docs.expo.dev/guides/local-app-development/
- https://developer.apple.com/xcode/system-requirements
