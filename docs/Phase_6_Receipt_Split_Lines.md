# Phase 6 — separate receipt name/amount lines

19 October 2026. Local parser/review slice; phone UI acceptance pending. Barcode follow-up is deferred at the user's request.

## Change

The OCR adapter returns strings without bounding boxes, so column order cannot establish a trustworthy name/price match. Existing same-line candidates are preserved. Unassigned lines now distinguish possible names, standalone decimal amounts and other text; no positional or equal-column-count pairing is automatic.

In the existing receipt review, choose an unused name line and amount line against the receipt photo, then Review Matched Lines. The editor shows both originals and the detected amount/currency. Quantity, unit and expiry remain blank; category remains provisional Other. Cancel Match/Cancel Edit leave review rows and source availability unchanged. Saving a valid grocery review consumes both lines in the local list; removing the grocery returns them. Excluded rows continue holding their source lines until removed, preventing accidental reuse. Selected review rows with overlapping source IDs cannot prepare import.

`sourceLineIds` are local provenance only. The existing reviewed-fields whitelist excludes them and raw OCR from API/retry payloads. Paired row IDs fit the existing backend contract. The normal duplicate-check, explicit import, receipt persistence and household behavior are unchanged.

Standalone currency amounts such as `Rs. 60.50`, `INR 40.00` and `$4.29` are now amount lines rather than candidate groceries named Rs/INR/USD. INR, unmarked, foreign and zero-value handling stays consistent: unmarked values need user INR review; foreign amounts are displayed but not copied or converted; blank remains unknown and zero remains free. Thousands separators, negative discounts, missing decimal digits and other uncertain text remain recoverable through manual review. Obvious column headings and financial summaries remain unassigned.

## Deterministic phone exercise

Development real-account Scanner → Test Receipt Layout Review opens protected `/scanner/receipt-layout-check`. Central typed synthetic fixtures cover separate INR columns and foreign/uncertain amounts. They use the same LocalReceiptReview controls as real receipts. Its final button is Preview Confirmed Fields (Local Only); callback only displays a local field preview. There is no OCR recognition, photo, provider request, household duplicate request, persistence or Pantry import in this diagnostic. Existing authentication may still verify its session normally. The diagnostic is hidden/disabled outside development and Demo.

This exercise verifies UI behavior with known text, not recognition accuracy or real receipt coverage. Normal Receipt OCR uses the new matching controls when its actual recognized text contains eligible separate lines. No backend/deployment/native/dependency/environment changes were needed. The existing iOS app can reload the JavaScript update.

## Files

- `lib/receiptCandidates.ts`: line classification, explicit pair creation, local source-use guard.
- `features/scanner/LocalReceiptReview.tsx`: matching controls, editor provenance and source recovery.
- `lib/receiptLayoutFixtures.ts`, diagnostic route and Scanner/root links: local-only exercise.
- `tests/receipt-layout.test.mjs`: nine focused layout/provenance/contract cases.

Inspected the supplied receipt OCR image and design-system tokens; retained existing cards, theme, typography and safe-area/keyboard-aware shell.

## Actual checks

- Mobile/backend `npx tsc --noEmit`: pass.
- Backend `npm run build`: pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`: **251/251 pass**. New cases cover no automatic joining, explicit cross-order choices, standalone currencies, invalid/used/over-limit selections, removal and non-mutating cancellation, currency/unknown/free behavior, summary recovery, source-free import payloads and bounds. Existing same-line/receipt/barcode regressions pass. Node retains its existing module-type warning.
- Backend `node --test tests/receipt-import.test.cjs`: **4/4 pass** using local test servers; no database/provider calls.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-layout-export`: pass, **40 routes**.
- Actual existing iOS manifest/bundle HTTP200; FreshTrack Dev, Review Matched Lines and Preview Confirmed Fields controls present.
- `npx expo-doctor`: **20/21**, exit1; same five existing Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint`: exit127, `eslint: command not found`. Root has no lint script.
- `git diff --check`: pass. No new debug logging, source image/text logging or secret changes.

No live database fixtures, real receipt contents or user groceries were read/written by the agent in this slice. No automatic phone launch or visible UI pass is claimed.

## Next step and limits

Run the numbered local iPhone matching/Cancel/edit/remove/currency/preview checklist and record the user-reported result. Then evaluate real receipt layouts and remaining parser improvements. Geometry-based automatic column matching, retailer aliases, quantity/unit extraction, discounts and grouped-number support remain incomplete. Receipt failure/native/accessibility/performance QA and final Phase6 review remain; barcode follow-up stays deferred. No Phase9 work.
