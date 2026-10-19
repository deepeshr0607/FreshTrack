# Phase 6 — barcode camera proof

19 October 2026. This is the first barcode slice, not complete barcode import.

## Scope

- Protected `/scanner/barcode-check`, reached from **Test Barcode Camera** in Scanner for real accounts in development only. Demo and normal barcode preview stay unchanged.
- SDK-compatible `expo-camera ~57.0.6`, rear camera, explicit permission request, denied/blocked/settings recovery, mount-error fallback and torch for low light. No audio permission or image capture.
- EAN-8, UPC-A, EAN-13 and ITF-14 retail numbers only. Leading zeroes are retained; length, numeric content and GS1 check digit are checked. UPC-A may be emitted as zero-prefixed EAN-13 on iOS. QR data is not accepted. UPC-E is not yet supported.
- Synchronous scan latch accepts one valid result, stops the camera and requires an explicit new scan. Cancel, background, navigation blur and session/account changes stop scanning. In-flight permission requests are invalidated when the screen loses access.
- Captured number is local screen state only. It is not a product name, price or expiry. Manual fallback opens the existing blank reviewed Pantry add form; no barcode association is claimed or silently saved.
- No catalog requests, backend/database/schema changes, receipt changes, uploads or automatic Pantry writes.

## References and next lookup decision

Visual reference: `design-reference/packaged_item_expiry_verification/screen.png` and design-system tokens; reuse existing headers/buttons and camera frame layout. This diagnostic does not display fake recognized products or expiry stamps.

API reference: [Expo SDK 57 Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/), plus installed camera declarations and config plugin. Unmount camera on blur/background rather than relying on the iOS-only `active` prop. Disable microphone and Android audio recording in app config.

Researched [Open Food Facts API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/) as a possible catalog. No provider is connected in this slice. Before choosing it, review its usage registration/contact, attribution/database licensing, current rate limits and bounded server-side read transport. A maintained limited local catalog is also allowed by the implementation plan. Do not treat the existing fake demo barcode fixtures as a real catalog.

## Verification

- `npx tsc --noEmit` — pass mobile and backend.
- `npm run build` in backend — pass.
- `node --experimental-strip-types --test tests/*.test.mjs` — 234/234 pass, including three new retail validation/latch cases. Node retains its existing module-type warning.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-barcode-export` — pass, 38 routes.
- `npx expo-doctor` — 20/21; existing five Expo/linking/notifications/router/splash patch mismatches, exit 1. Camera matches SDK.
- Native prebuild and CocoaPods — pass, 115 pods. Original package start scripts preserved. Generated iOS files remain ignored. Pods emits path-with-space find warnings; native build result recorded below.
- Native build succeeded with zero errors/two warnings (duplicate C++ library and existing dev-launcher script dependency analysis). Code-signature verification passes. Expo CLI stalled at connecting after compilation and was stopped; direct `xcrun devicectl device install app` succeeded.
- Local iOS manifest and actual launch JavaScript bundle HTTP 200, manifest name FreshTrack Dev and launch asset present. Bundle includes the new screen. The user subsequently reported all ten numbered iPhone checks passed; see acceptance below.
- Root lint script and backend ESLint configuration remain unavailable; lint is not claimed.

## iPhone acceptance — user report

The user answered “All checks passed” to the ten-step checklist: real-account entry, explicit start/permission, physical package capture and camera stop, no repeated results, explicit rescan, torch on/off and cancellation, background/return stopped, manual add form/back without saving, and unchanged Pantry. This is user-reported evidence, not direct agent observation or an accuracy benchmark. Denied/blocked permission and Android runtime were not explicitly covered by this checklist. No new code, runtime or deployment change in this acceptance update; automated results above are from the implementation checkpoint, not rerun for documentation.

## Remaining

Implement selected backend catalog lookup, explicit editable barcode product/expiry review, household duplicate handling and idempotent BARCODE-source save. Android runtime, permission-denied, physical barcode coverage and broader native QA remain. No Phase 9 work.
