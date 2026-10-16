# Phase 6 — on-device OCR proof of concept

16 October 2026. User chose a free local OCR direction after Google Cloud required a prepayment.
This is a bounded development diagnostic, not completed receipt ingestion or Phase6 acceptance.

## Provider and compatibility decision

Selected expo-text-extractor2.0.0 (MIT, no runtime dependencies), an Expo Modules wrapper using
Apple Vision VNRecognizeTextRequest on iOS and Google ML Kit via Play Services on Android.
Inspected the published package's native implementations and declarations before installation.
The first candidate, Infinite Red's wrapper, brings unrelated testing dependencies/peers; it was
inspected but not installed. No Google billing account, cloud OCR key or receipt upload is used.

The wrapper exposes text strings, not confidence scores, bounding boxes or grocery candidates.
The UI explicitly shows raw OCR and does not invent accuracy percentages. Android uses the
Play Services recognizer; first-use model availability/download and Android native behavior are
not verified. iOS does not use Google Cloud or Google ML Kit for this proof.

Original Cloud Vision receipt instructions in the product/implementation plan are superseded by
this user-selected direction for Phase6. Future normalization/review will operate on local text;
only user-reviewed fields should reach the protected backend import. Server-side validation,
household scoping, transactions and idempotence remain mandatory. Remote provider APIs, including
Spoonacular or any future Cloud Vision fallback, remain server-side only.

Sources:
- https://github.com/pchalupa/expo-text-extractor
- https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/
- https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/
- https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/

## Implemented slice

Scanner adds a development-only Test On-device Receipt OCR button for real accounts. It opens
protected /scanner/ocr-check, using existing theme, safe-area/keyboard screen shell and cards.
The supplied receipt reference PNG and design tokens were inspected. Existing prototype Receipt
and Barcode modes are preserved; they are not connected to real imports by this slice.

The diagnostic captures a still photo or uses the system image picker, previews a normalized
JPEG, then explicitly reads raw text on-device. It has cancellation, permission/settings recovery,
loading, empty, retry, unavailable-module, clear and manual-entry controls. Camera permission is
requested only on Photograph Receipt; no microphone or broad library permission is requested.
ImagePicker's microphone permission is disabled in native configuration.

Rejects input over40MP/20MB; resizes longest edge to at most2000px, JPEG quality0.8, and rejects
output over6MB. No base64, EXIF capture, network OCR or persistence in application/database state.
Returns at most500 nonempty text lines/50000 characters; malformed/excessive results fail with
fixed messages instead of logging native error bodies or receipt content. This is not a quality,
retailer/language coverage, fraud or total-value validation claim.

Recognition and capture taps are serialized. Generation/account checks discard late responses;
cancel preserves the previous photo, failures retain the selected preview for retry, a new photo
clears old results, and leaving/clear/sign-out removes screen state and attempts to delete our
cache copies. Cleanup is best effort: abrupt process death/failed deletion can leave OS-cache
files until the OS clears them. Original Photos assets are never deleted. No image/text analytics
logging, clipboard automation or cloud/backend call is added. The screen permits deliberate text
selection by the user. Native OCR calls are not cancellable and do not yet have a forced timeout.

New dependencies: pinned extractor2.0.0, SDK-compatible image-picker57.0.20,
image-manipulator57.0.21 and explicit file-system57.0.7 (previously transitive/native).
No backend/schema/migration/cloud deployment or new permission for audio.

## Verification and build status

Results and final build/phone status are recorded below before committing. Initial implementation
checks caught stale generated route types, incomplete dependency installation and a strip-types
unsupported parameter property; these were corrected before final checks. Installation completed
successfully after its native artifact download. No broad dependency update/audit fix was run.

An initial pod attempt selected a Hermes source-build fallback and could not find CMake. The
normal official prebuilt endpoint subsequently returned200 and a plain pod install retry passed;
CMake was not installed and the React Native/Hermes version/source selection was not changed.
After interruption, checks were resumed with fresh logs, not inferred from missing temporary files.

## Remaining Phase6 work

The bounded iPhone diagnostic passed by user report; Android and broader native failure/accuracy
coverage remain unverified. Next implement deterministic candidate parsing, uncertain/missing fields, original editable receipt
review, duplicates and atomic confirmed import with event/idempotency protections. Barcode camera,
catalog choice/manual fallback and corresponding native/failure QA remain. No Phase9 work.

## Final verification — fresh resumed run

| Check | Actual result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npx tsc --noEmit | Passed; no backend change |
| node --experimental-strip-types --test tests/*.test.mjs | Final212/212 passed |
| New OCR session tests | 3/3 passed: bounded lines, retained preview/cancel/redacted retry/empty, double-tap and stale/account cleanup |
| Expo all-platform export | Passed,36 routes |
| Expo Doctor | 20/21; existing five patch recommendations |
| pod install | Passed,114 dependencies/113 pods |
| Local iPhone build | Build Succeeded,0errors/2warnings; signed and installed |
| Device launch with8087 development URL | Passed, command exit0 |
| Actual iOS manifest | HTTP200, FreshTrack Dev and launch asset |
| Phone capture/OCR/permission/no-text/cleanup | User reported “All checks passed” to the 12-step checklist; not directly observed |
| Android native build/runtime | Not run |

Commands:

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs
# backend/
npx tsc --noEmit
# root
npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-ocr-export
PATH=/opt/homebrew/bin:$PATH npx expo-doctor
# ios/
PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/pod install
# root (actual hardware UDID supplied locally, omitted here)
APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development npx expo run:ios --device --no-bundler
APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development npx expo start --dev-client --lan --port 8087
```

Logs are /private/tmp/freshtrack-ocr-{tests-final,pods,build,export,doctor,metro}.log.
No repeated backend regression suite was needed for this mobile-only slice. Existing lint setup
gaps remain (root has no lint script, backend ESLint unavailable); not rerun here. Existing native
warnings are duplicate libc++ linkage and dev-launcher script dependency analysis. No new warning
was suppressed. Native compilation establishes local SDK57 build compatibility, not recognition
accuracy, memory/load limits, complete language coverage or runtime receipt parsing.

FreshTrack Dev is installed and reopened at current LAN172.20.10.2/port8087. Baseline account data
is untouched; no application records were created by automated tests. The next phone checklist
must test camera/photo selection, cancellation, raw text/no-text, retry/clear/navigation cleanup
and unchanged Pantry. Never include receipt content/credentials in the result report.

## iPhone acceptance — 16 October 2026

User answered “All checks passed” after the 12-step checklist covering FreshTrack Dev real-account
access, camera permission/cancel/capture, text recognition and repeat without accumulated output,
library cancellation/selection, blank-image no-text state, clear and navigation reset, and unchanged
Pantry. This is a broad user report, without per-step screenshots or receipt contents; it is not a
recognition-accuracy benchmark, Android acceptance or completed receipt ingestion. No code, runtime,
dependency, environment or backend data change in this acceptance update. Prior automated results
above were not rerun for this documentation-only checkpoint.
