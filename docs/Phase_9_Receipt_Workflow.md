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

## Follow-up: fresh-only scanning and actionable Add — 21 October

The user subsequently reported that Watermelon was offered an expiry scan, blocking access to later products, and Add to Pantry was disabled. This exposes a gap in the earlier eight-check acceptance; the report above remains historical evidence for those checks, not coverage of this case.

Root causes: every card rendered a Scan Expiry Tag control; the queue treated every unreviewed product as packaged; Watermelon was recognized as produce but lacked a duration; and any pending product disabled Add without allowing the user to request actionable validation.

Changes:

- Fresh/packaged classification is now independent of estimate availability. Recognized fresh produce/raw meat/shell eggs have no package-scan control. Unsupported fresh foods require a manually entered tracking date, not a package photograph. Unknown items ask for a type/details review. Edit Product allows an explicit Fresh / loose or Packaged correction; that local-only choice is excluded from API/retry payloads.
- The packaged queue contains only included packaged products missing a date. Each is directly selectable, with its own paging if necessary; the user need not complete the first item before selecting another. Invalid quantities/values are separate detail errors, not reasons to scan a label.
- Whole uncut Watermelon receives a targeted storage rule: 14 days from the purchase date under cool ventilated storage around 13°C. This uses [University of Minnesota Extension's watermelon guidance](https://extension.umn.edu/garden-and-home/yard-and-garden/gardening-in-minnesota/harvesting-and-storing-home-garden-vegetables), which describes cool storage and a two-week estimated shelf life; its general guidance says nonideal storage shortens life. The UI displays the conditions/source and allows an earlier date. No assumption that a warm Kolkata kitchen meets those conditions or that the date guarantees safety is made. Cut/sliced/processed watermelon gets no whole-fruit estimate. This one specifically reported food is an exception to the earlier 20-food scope, bringing supported food/type entries to21 while preserving all original20. No broad catalogue expansion.
- Review & Add is enabled when at least one product is selected and Pantry is writable, except while changing the purchase date. With incomplete products it names the first problem, reveals its page and asks for edit/packaged scan/exclusion. It does not send invalid data or silently drop selected products. Ready fresh-only hauls proceed directly to the unchanged duplicate/final-confirmation stage. Read-only and empty selections remain guarded and explained.

Verification so far: mobile/shared408/408, backend build/tests166/166, both lint/TypeScript and all-platform41-route exports pass. Thirteen product-logic tests include Watermelon, unsupported fresh food, invalid fields, local type overrides and API stripping. Four additional tests render the actual TSX using React with native host/button substitutes: fresh-only hides all scan controls and prepares an import; mixed hauls offer each packaged item and don't send incomplete data; unsupported fresh food gets manual-date guidance; and cached/empty imports remain guarded. These are conditional UI/handler checks, not physical camera/native rendering acceptance. Existing source tests now preserve the original20 while explicitly covering the single Watermelon addition.

The signed Release build passed and strict/deep codesign verification passed. Embedded Hermes checks confirm the new whole-watermelon rule, fresh-only control message and actionable Add guidance, plus the unchanged hosted API destination. Bundle SHA-256: `5baf0807d56203fa671c695c255ef959b88c0fd799a1760c549bf8a31f6348ac`. The existing app identifier/profile are retained; profile expiry remains23October10:08:49IST.

The first iPhone installation attempt failed with CoreDevice transport timeout (`Network.NWError60`). After the user reconnected/unlocked the iPhone, retrying the same verified artifact successfully updated the existing app and direct process launch passed. No uninstall was performed. Targeted phone acceptance remains pending; the earlier eight-check pass does not cover this correction. Local build/check/install/launch logs use `/private/tmp/freshtrack-fresh-queue-*`. Automated/build results from `890f233` were not rerun for this installation/documentation checkpoint; `git diff --check` passes.

Next phone check: automatically recognize the receipt containing Watermelon; confirm fresh cards have an estimate and no package-scan control; select any packaged item directly; verify Add gives guidance for incomplete selected products; then exclude unfinished items and open the final review for Watermelon, cancelling without importing.

No backend source, schema, API, environment, provider or dependency changes are introduced by this follow-up. No uninstall or existing-household write was performed. Earlier paused decoder work remains separate and paused.
