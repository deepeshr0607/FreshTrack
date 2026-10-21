# Receipt workflow correction — 21 October 2026

The user requested a normal scan → automatic recognition → separate editable products → packaged-label verification → reviewed Pantry import flow for both camera and photo uploads. This is a Phase 9 usability correction to the existing receipt implementation, not a new OCR provider or a catalogue expansion. Barcode work stays deferred.

## Behavior

- Normal receipt capture and upload now immediately run the existing on-device OCR. “Read Text on Device” remains only in the explicitly enabled diagnostic screen. Failed recognition offers retry without requiring another photo; picker cancellation preserves the previous haul.
- A separate product card shows name, suggested category, quantity/unit, known INR value and expiry. Edit, include/exclude, remove and add-missing controls are available. Ten cards are shown per page, retaining the existing 50-product bound.
- Conservative same-row and code/amount/description geometry proposals populate prices automatically where supported. Unknown layouts retain their original text behind View Receipt Text and manual correction remains available. There is no new accuracy benchmark or claim of universal receipt parsing.
- Supported fresh produce/raw meat/shell eggs get the existing source-attributed, lower-bound storage estimate starting from the displayed purchase date (default: current Kolkata date). Conditions and sources are shown on each applicable card. Changing the purchase date recalculates untouched automatic estimates, preserving edited, excluded and package/manual choices. These are tracking assumptions, not established production dates, remaining safe life or cold-chain verification. The existing 20-food scope is unchanged; unsupported fresh foods require manual review.
- Dairy (including milk), rice, processed products and unsupported names require an expiry/details check. Each product can open the camera directly on Scan Expiry Tag; label uploads are also supported. OCR runs automatically on the label photo. The user chooses and confirms/corrects a full tagged EXP/use-by/best-before date. No manufacture-date arithmetic or month-only date is invented. Numeric date interpretation is DD/MM/YYYY, explicitly shown; unsupported formats require manual correction.
- Confirming a printed date keeps PACKAGE_DATE provenance through the existing import API. Manual fallback keeps USER_ENTERED provenance. Cancelling label capture leaves the product unchanged. Label photos use the existing owned-cache lifecycle and are released when capture closes.
- Included incomplete products block the final review action. The existing authenticated household duplicate review, Cancel/back, final confirmation, idempotency and persisted retry controller are reused unchanged. No Pantry write occurs during OCR, product editing or label scanning.

Quantity defaults to **1 piece** when no explicit receipt quantity is recognized; this is explained in the UI and is editable. A package size is not multiplied into a purchased quantity. Unknown prices remain unknown, free values remain zero, foreign values are not converted, and displayed INR values still require review. Automatic prefills do not verify product identity.

## Changed implementation

- `lib/receiptOcrProbe.ts`: optional acquisition-and-recognition operation, preserving its existing diagnostic/manual API and generation/cleanup guards.
- `lib/receiptProducts.ts`: typed product prefills, existing geometry proposals/storage rules, bounded tagged package-date extraction.
- `features/scanner/ReceiptScannerScreen.tsx`: normal automatic flow, compact preview and optional raw text; diagnostic review retained.
- `features/scanner/ReceiptProductReview.tsx`: product cards, optional editor, purchase-date changes and reviewed import handoff.
- `features/scanner/PackageExpiryCapture.tsx`: automatically read label photos, explicit date confirmation/manual correction, cancellation and cleanup.
- `tests/receipt-products.test.mjs`: acquisition cancellation/races/retry, mixed haul, exclusions/incomplete blocking, quantity/value/provenance, cap/invalid fields, both geometry layouts, and date-format/manufacture guards.

No backend, Prisma, provider configuration, new dependency, cloud OCR or existing household data changes are required by this correction. The earlier paused decoder/dependency changes were already in the working tree and have been preserved separately; the test/build environment includes them.

## Verification

- Focused product workflow: 10/10 tests pass.
- Mobile/shared `node --experimental-strip-types --test tests/*.test.mjs`: 401/401 pass, including the 10 new workflow tests and the pre-existing paused decoder tests.
- Root/backend `npm run lint` and `npx tsc --noEmit`: pass, including the final geometry integration.
- Backend `npm test`: build and 166/166 pass. The first sandbox run failed on local HTTP listeners (`listen EPERM`); rerun with loopback permission passed. No live database fixture run or deployment was needed.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-receipt-products-export`: pass for iOS, Android and web (41 routes).
- Expo Doctor: 21/21 pass. `CI=1 npx expo install --check`: local SDK map reports dependencies up to date; it explicitly warns that online version validation is unavailable in the restricted shell.
- Existing Xcode Release scheme: BUILD SUCCEEDED. Toolchain/third-party Hermes warnings remain; this is not a zero-warning build. Strict/deep codesign verification passes. Embedded Hermes bundle contains the updated workflow and the unchanged hosted development API destination. The first string-inspection assertion only checked UTF-8 and missed a UTF-16 Hermes string; corrected encoding-aware verification passes.
- Same-identifier iPhone update and direct process launch: pass using devicectl, without uninstalling. No Metro listener on 8081–8087 was found. The current Personal Team profile expires 23 October 2026 at 10:08:49 IST.
- Updated iPhone functional acceptance: all eight checks passed by user report. The user answered “All checks passed” to camera auto-recognition, independent product edits/fresh estimates, packaged-label extraction/confirmation, completing or excluding pending rows, duplicate-review Cancel/back and final import, Pantry persistence after restart, and automatic upload recognition without importing twice. This is user-reported end-to-end evidence, not direct agent observation, measured OCR accuracy across receipts or Android acceptance. It does not independently establish label-photo disk cleanup or every error path.
- This acceptance update changes documentation only. Prior automated/build results at `1ac276e` were not rerun; `git diff --check` was run.

Build artifact: `/private/tmp/freshtrack-phase9-personal-build/Build/Products/Release-iphoneos/FreshTrackDev.app`; bundle SHA-256 `f6a61422acd915993bd5869bf5a32dc0c8ab3025690eb74b0afb4f6ee933c613`. Local build/install/launch and verification records are under `/private/tmp/freshtrack-receipt-products-*`. No native signing artifacts are committed.

Next: await any further requested app corrections. The earlier decoder task remains paused; it has not been resumed by this phone-test result.

Existing Phase 9 security/reliability/platform/signing limitations remain open. This does not mark the phase complete or publish to an app store.
