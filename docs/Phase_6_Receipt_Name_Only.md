# Phase 6 — receipt groceries without same-line prices

19 October 2026. First bounded slice of the user’s receipt-first scope update. Phone acceptance pending; barcode follow-up stays deferred.

## Behavior

Receipt review now proposes common food names even when their price is absent or in a separate OCR column. The existing same-line parser runs first, followed by `suggestReceiptNameOnlyItems`. A centralized English food-word vocabulary supplies name hints only; metadata terms suppress obvious store/address/payment lines. Ambiguous number formats and unknown names remain available for manual recovery. This is not general food identification, category classification or retailer abbreviation expansion, and suggestions may be wrong.

Name-only suggestions retain the exact original OCR and local source ID. Price is unknown, not zero; quantity, unit and expiry are blank; category remains Other. Rows start unreviewed/unselected, so recognition cannot import groceries automatically. Existing reviewed field validation and API whitelist remain unchanged. There is no automatic adjacent-price association or expiry inference.

The base parse retains unassigned name lines. The screen hides sources held by review rows. Removing a name-only suggestion therefore returns its original line to explicit name/amount matching. An excluded row still holds its source until removed. Cancelling review or a proposed match does not consume an extra source. Names are preserved rather than silently renamed or merged; repeated purchases have distinct IDs. Same-line rows retain priority under the existing shared 20-row limit; overflow stays in unassigned lines. Raising that limit is a separate client/server task.

`lib/receiptItemNames.ts` contains vocabulary and metadata exclusions; `lib/receiptCandidates.ts` adds the pure suggestion pass; `features/scanner/LocalReceiptReview.tsx` uses it and explains unknown prices/source recovery. The existing protected local layout exercise adds the centralized “Items without prices” fixture. No route, backend, schema, dependency, native build, deployment or environment change.

## Verification

- Focused parser/layout/name-only tests:19/19 pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:258/258 pass (seven new tests). Cases cover mixed fresh/meat/bakery/dry/packaged food names, metadata suppression, unsupported numeric text, unknown price, cap/overflow, repeats, no automatic price pairing, source recovery/cancellation, explicit edits and reviewed payload provenance exclusion.
- Mobile/backend `npx tsc --noEmit`:pass; backend `npm run build`:pass.
- Backend `node --test tests/receipt-import.test.cjs`:4/4 pass with localhost permission. Initial sandbox run passed2/4 and blocked two HTTP tests with listen EPERM; rerun outside sandbox passed all four. No database/provider calls.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-name-export`:pass,40 routes.
- Existing development iOS manifest/bundle:HTTP200, FreshTrack Dev, both new explanation and fixture present. Current LAN192.168.1.10:8087. No phone UI observation claimed.
- `npx expo-doctor`:20/21, exit1; same five existing Expo/linking/notifications/router/splash patch mismatches. Initial sandbox registry lookup failed with ENOTFOUND; network-enabled rerun completed.
- Backend lint remains unavailable:exit127, eslint not found; root has no lint script.
- `git diff --check`:pass.

Replayed the two previously downloaded public macOS Vision string arrays through the updated review pipeline: sample014 now proposes1 name-only row (previously0); sample031 remains0. Both remain fully unreviewed with unknown prices. This narrow improvement is not broad receipt accuracy, successful image recognition on iPhone or automatic price matching. No source images/full transcripts are committed. See the existing public-receipt QA report for pinned sources and recognition method.

## Phone exercise — pending

Scanner → Test Receipt Layout Review → Items without prices. Expect six candidates:Milk, Bananas, Chicken breast, Whole wheat bread, Basmati rice, Chocolate biscuits. All start unreviewed with unknown value; seven other lines remain unassigned. Review Milk/Cancel leaves no selected grocery. Explicit review with blank value previews unknown. Removing Milk frees its name for matching with the60.00 amount; Cancel leaves both available, while a saved matched review keeps the explicitly chosen amount. Reset restores the six unreviewed suggestions. This route only previews reviewed fields locally; it cannot add Pantry items.

Existing synthetic layout checklists describe the behavior before this suggestion pass. The separate-column fixtures now also propose recognized food names; remove a suggested row before explicitly matching its source. Their earlier user-reported acceptance is historical, not verification of this new behavior.

## Remaining receipt-first work

Broader name/layout extraction, abbreviations, quantities/units, discounts/currencies and long receipts; food/category recognition; researched storage-dependent shelf-life rules; confirmed purchase date and automatic editable estimates; package-date/unchecked-date handling; mixed real-receipt and failure/native/accessibility QA; final Phase6 review. Existing expiry defaults are unchanged and not automatically applied by this slice. No Phase9 work.
