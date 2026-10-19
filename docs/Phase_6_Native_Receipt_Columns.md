# Phase 6 — native receipt positions and explicit column review

19 October 2026. Implemented, checked, compiled, signed, installed and launched FreshTrack Dev on the connected iPhone. **The user subsequently reported “All checks passed” for the seven-step phone checklist below.** Phase 6 is not complete.

## Changes

- Added a small local Expo module under `modules/freshtrack-receipt-layout`, autolinked on iOS. It uses Apple Vision on a local file, verifies the file-size/pixel/text limits, applies orientation and a 2000px maximum edge, and returns original text with normalized top-left observation boxes. Native errors expose only a generic message. No networking, persistence, raw-text logging, new permission or paid service.
- The existing Android ML Kit/string-only adapter and older iPhone builds retain their current text-only/manual workflow. This slice provides iOS positions only; Android position recognition/runtime has not been verified.
- Extracted the existing position validator into `lib/receiptTextBoxes.ts` to keep OCR state independent of the geometry parser. `ocrRecognition` accepts either legacy strings or the new packet. Malformed/misaligned positions are discarded while valid text remains usable. Recognition failure still produces the existing redacted retry state.
- OCR state keeps positions only in memory. Clear, new photo, re-read failure, navigation and stale/account-generation guards discard them alongside text. A cancelled picker preserves the current photo/result. No geometry, raw OCR or images enter the reviewed API/durable retry payload.
- Added `Review Column Matches` to the existing receipt review, with explicit `Names Beside Amounts` / `Names Below Code & Amount` choices. The choice persists while entering/cancelling grocery reviews. Matches are paged ten at a time and retain every original source. Unknown/ambiguous layouts retain manual matching/Add Missing.
- Matches open the existing grocery editor rather than silently adding/importing. Save explicitly reviews/selects the item. Cancel changes nothing. Only a pristine, unselected name-only suggestion can be replaced; saved/edited/excluded/estimated rows and conflicting sources are protected. Removal releases originals for correction. The fifty-item limit remains enforced.
- Added the centralized `Positioned column review` synthetic fixture to the existing development-only, local-only layout check. This is separate from real OCR and cannot save groceries to Pantry.

No backend/schema/provider/environment/deployment change. Existing root generated native folders/configuration/signing were preserved. CocoaPods regenerated ignored project artifacts to link the local module; no installed package or lockfile change. Twenty-food estimate scope and deferred barcode follow-up are unchanged. No Phase 9/store publishing.

## Official API references and native verification

Consulted [Expo local modules](https://docs.expo.dev/modules/get-started/), [module API](https://docs.expo.dev/modules/module-api/) and [autolinking](https://docs.expo.dev/modules/autolinking/). The module uses the installed SDK57 ExpoModulesCore API; successful device compilation checks its actual Swift/bridge signatures. Local modules are found in `./modules`, without adding a root npm dependency. Native functionality requires the rebuilt FreshTrack Dev app, not Expo Go.

Commands/results:

- Expo module autolinking resolve for Apple: finds `FreshTrackReceiptLayoutModule`.
- `pod install` in existing `ios`: succeeds, 116 total pods, including the local module.
- `APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development xcodebuild -workspace ios/FreshTrackDev.xcworkspace -scheme FreshTrackDev -configuration Debug -destination 'id=00008150-000918810A84401C' -allowProvisioningUpdates build`: **BUILD SUCCEEDED**. Build warnings include existing React legacy deprecations, duplicate C++ linkage and script output-analysis warnings. No build errors.
- `codesign --verify --deep --strict`: pass.
- `xcrun devicectl device install app`: succeeds for existing `com.deepeshr.freshtrack.development` identity, without deleting the app.
- `xcrun devicectl device process launch` with current 8087 dev-client URL: succeeds. This confirms a process launch, not visible UI acceptance.
- Existing Metro iOS manifest: HTTP200, FreshTrack Dev, launch asset present. Actual iOS bundle: HTTP200 and includes the new native adapter, review controls and position-aware diagnostic label.

## Local recognition evidence

Compiled the **actual native recognition core** with the local public-image runner:

```sh
swiftc -module-cache-path /private/tmp/freshtrack-public-receipts/module-cache \
  modules/freshtrack-receipt-layout/ios/ReceiptLayoutRecognizer.swift \
  scripts/receipt-layout-native-evaluate.swift -o /private/tmp/freshtrack-layout-evaluate
/private/tmp/freshtrack-layout-evaluate \
  /private/tmp/freshtrack-public-receipts/014.jpg \
  /private/tmp/freshtrack-public-receipts/014-native-layout.json
```

All three previously pinned public samples were processed with this core. Counts are 110/39/43 positioned strings. Validated normalized boxes/text match the preceding pinned public macOS outputs exactly. Passing those packets through the mobile OCR normalizer and the actual proposal helper returns 4/0/0 below-code suggestions. The earlier annotation scoring remains **four correct purchase associations, three exact names+amounts and one name requiring correction** on the nine-item sample; all foreign values remain unknown in INR. See [block grouping results](Phase_6_Receipt_Block_Grouping.md).

This macOS core replay does not establish iPhone camera/JPEG/bridge behavior or broad recognition accuracy. The iPhone test is still required. Raw images/recognized text/positions remain only in the temporary local sample directory.

## Automated checks

- Mobile and backend `npx tsc --noEmit`: pass.
- Backend `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: **356/356**, no skips. Seven new tests cover legacy/native packet handling, geometry fallback, picker cancellation, error/re-read/clear/account-generation cleanup, non-mutating proposal cancellation, source protection, edited/estimated/excluded rows, removal recovery and capacity guards. Existing geometry/import/receipt tests remain passing.
- Backend `node --test tests/receipt-import.test.cjs`: **5/5**, permitted local HTTP listeners only; no database or provider calls.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-native-layout-final-export`: pass, 40 static routes plus iOS/Android bundles.
- `npx --yes expo-doctor`: **20/21**, same five existing Expo patch mismatches.
- Backend `npm run lint`: exit **127**, existing missing ESLint; root has no lint script.
- `git diff --check`: pass.

## iPhone checklist — passed by user report, no Pantry writes

Use FreshTrack Dev, connected to the laptop's network. Current launcher: `http://192.168.1.14:8087`. The updated app was installed and opened; keep the laptop awake.

1. Sign in to the real account. Scanner → **Test On-device Receipt OCR**. Photograph a readable receipt (or choose a receipt photo) → **Read Text on Device**. Expect text and **Position-aware OCR available**. No particular number of matches is promised for an arbitrary receipt. Do not import.
2. Tap **Clear Photo & Text**. Expect the result/review to disappear. Go back to Scanner → **Test Receipt Layout Review** → **Positioned column review** (last fixture button). This synthetic exercise cannot save to Pantry.
3. In **Review Column Matches**, select **Names Beside Amounts**: expect no unambiguous matches. Select **Names Below Code & Amount**: expect two possible matches, Milk 60.50 and Bread 25.00. These are line totals, not the 10.00 unit-price cell.
4. Tap **Review Column Match: Milk**. Expect the original code/name/amount, blank quantity/unit/date and purchase value 60.50. The code's joined count 2 must not become a purchased quantity. Tap **Cancel Edit**. Expect both matches still offered; the existing Milk card remains unreviewed/unknown value.
5. Open that Milk column match again. Set quantity **1**, unit **piece**, manual expiry **2026-11-30**; leave package/estimate fields blank and keep value **60.50**. Save Grocery Review. Expect Milk reviewed/selected at ₹60.50 and only the Bread column match remaining. There must be exactly one Milk grocery card.
6. Open Bread's column match → Cancel. Preview Reviewed Haul: only Milk should be selected. Tap **Preview Confirmed Fields (Local Only)**: expect one Milk, 1 piece, ₹60.50, 2026-11-30. Nothing is sent or saved.
7. Back to Review → **Reset Layout Check**: edits/preview disappear and the fixture starts over. Leave to Pantry and confirm no sample Milk/Bread was added. Return to normal Scanner → Receipt OCR and confirm photograph/choose/manual entry remain available. Do not import during this check.

The user answered “All checks passed” on 19 October. Recorded as user-reported acceptance of position-aware recognition/clear, both layout choices, cancellation, explicit reviewed replacement without a duplicate Milk card, exact local preview, Reset and unchanged Pantry. No private receipt contents or credentials were collected. This is not direct agent observation, a broad camera-recognition accuracy benchmark, Android verification or new persisted-import evidence. No runtime/native/environment/data changes or repeat test/build runs were needed for this documentation-only update; the automated/native results above remain the implementation checkpoint evidence.

## Next

Continue the remaining Phase6 permission/error/cancellation/cleanup/accessibility/performance review and document partial real-receipt accuracy/manual fallback. Barcode follow-up remains deferred; no later phase starts automatically.
