# Phase 6 — explicit receipt quantity/unit suggestions

19 October 2026. Small receipt-detection slice; local iPhone acceptance pending. Barcode follow-up stays deferred.

## Behavior and limits

The existing review editor detects explicit leading measured quantities (`0.750 kg Apples`), leading integer counts (`2 x Milk 500ml`) and trailing Qty/Quantity labels (`Eggs Qty: 6 pcs`). Supported metric/count unit spellings normalize to kg/g/l/ml/piece/pack. Decimal comma normalizes to dot. Suggested quantities respect the existing nine-integer/three-fraction digit bounds; zero, negative, excess precision and conflicting expressions yield no hint.

Quantity and unit fields still start blank. Use Detected Quantity explicitly applies the hint; unsupported/unknown units remain for manual choice. Count expressions without a unit preserve an already-entered user unit rather than inventing one. The user can subsequently correct all fields. Suggestions are based on the editable item-name text; editing away the quantity expression removes the hint. Original OCR remains visible and unchanged. Product names are not automatically rewritten.

Trailing product sizes (`Milk 500ml`, `Rice 5kg`) do not establish purchased quantity and receive no hint. Multipack expressions without a clear product boundary, separate numeric columns, unit prices and unknown formats are not interpreted. Whole-entry purchase value is never multiplied, divided or converted. There is no expiry/category/alias inference in this slice.

The name-only suggestion pass can now retain supported food names with an explicit decimal leading weight despite their decimal text. Fields remain unfilled until review. Existing source-use guards, removal/matching recovery, caps, duplicate review, frozen retry payload and import API/schema stay unchanged.

## Files and design

- `lib/receiptQuantity.ts`: pure hint/apply helpers and supported unit spellings.
- `lib/receiptCandidates.ts`: admit explicit quantity-bearing name-only lines without price association.
- `features/scanner/LocalReceiptReview.tsx`: existing themed editor gains hint and explicit apply button.
- `lib/receiptLayoutFixtures.ts`: local-only Quantity review fixture in the existing protected diagnostic route.
- `tests/receipt-quantity.test.mjs`: eight focused cases covering bounds, ambiguous pack size, unknown units, non-mutating apply, manual corrections and final reviewed fields.

Uses existing cards, text, buttons and keyboard-aware form; no visual redesign. Receipt reference/design-system inspection from the preceding receipt slice remains applicable. No new route, backend/schema, dependency, native, environment or deployment change. No user groceries read/written by the agent.

## Actual checks

- Mobile/backend `npx tsc --noEmit`:pass. Backend `npm run build`:pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:266/266 pass, zero failed/skipped, including eight new cases. Existing Node module-type warning remains.
- Backend `node --test tests/receipt-import.test.cjs`:4/4 pass with local server access; no database/provider calls.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-quantity-export`:pass,40 routes.
- `npx expo-doctor`:20/21, exit1; existing Expo/linking/notifications/router/splash patch mismatches remain.
- Backend `npm run lint`:exit127, eslint not found; root has no lint script.
- Existing port8087 iOS manifest and bundle:HTTP200, FreshTrack Dev; Quantity review fixture/Use Detected Quantity control present. LAN192.168.1.10. No device UI observation claimed.
- `git diff --check`:pass.

Temporary logs: `/private/tmp/freshtrack-receipt-quantity-tests.log`, `freshtrack-receipt-quantity-export.log`, `freshtrack-receipt-quantity-doctor.log`; exported artifacts at `/private/tmp/freshtrack-receipt-quantity-export`.

## Local iPhone exercise — pending

Scanner → Test Receipt Layout Review → Quantity review must show five unreviewed candidates. Apply0.750kg on Apples, Cancel and reopen to verify fields stayed blank; apply again and explicitly correct to0.5kg with manual2026-11-30 and value45.00. On2xMilk, Apply suggests2 with no unit and leaves120.00 unchanged; explicitly choose bottle and manual2026-11-30 before saving. Eggs Qty6pcs suggests6piece, Cancel leaves it unselected. Milk500ml has no purchased-quantity hint. Local haul/confirmed-field previews include only the two saved reviews with their exact values. Reset restores unreviewed rows; Pantry is unchanged.

This is synthetic local review verification, not real receipt recognition or persisted import acceptance. The diagnostic cannot import groceries. Existing real receipt save/retry contracts are covered by earlier checks and current regressions.

## Next step

Record the phone result, then continue bounded retailer abbreviation/name/layout improvements. Longer receipts/currencies/discounts, food classification, sourced storage-dependent shelf lives, confirmed purchase dates/automatic editable date suggestions, package-date handling and failure/native QA remain incomplete. Existing manual expiry defaults were not changed. No Phase9.
