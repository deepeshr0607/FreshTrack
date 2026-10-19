# Phase 6 — reviewed receipt abbreviation suggestions

19 October 2026. Bounded receipt-name slice; local synthetic iPhone acceptance passed by user report. Barcode follow-up remains deferred.

## Behavior

A centralized explicit dictionary supports MKL LOPFT→Low-Fat Milk (the project plan’s example spelling), CHKN BRST→Chicken Breast, WW BRD→Whole Wheat Bread, BSMT RICE→Basmati Rice, BNNA→Bananas, TMTO→Tomato and PTTO→Potato. These are supported test spellings, not a claim of universal retailer abbreviations or verified product identities. Case/spacing normalize for matching; there is no fuzzy correction, guessed brand or partial-token substitution.

The existing grocery editor shows Suggested name and Use Suggested Name. Only that explicit action changes the editable name. Original OCR remains unchanged/visible, and cancelling the editor discards the proposed change. Unknown abbreviations and manual custom names remain unchanged. Exact matches can retain one trailing metric package size and explicit quantity wrappers, so applying a name does not discard package size or break the preceding quantity hint workflow. Applying either helper does not infer category, expiry, package condition or production date. Names/quantities/prices can still be manually corrected before final confirmation.

The name-only detection pass uses supported aliases as an additional hint to propose abbreviated groceries even without prices. Raw draft names remain unexpanded and rows start unreviewed/unselected. Unknown names stay available in unassigned lines. Existing metadata exclusions, source-use/removal/matching, distinct repeated purchases, unknown/foreign values and shared20-row cap stay intact. No raw OCR, alias key or provenance is added to API/retry payloads; only final reviewed fields are sent by the existing import flow.

## Files and verification

- `lib/receiptNameAliases.ts`: explicit dictionary and pure suggestion/apply helpers.
- `lib/receiptItemNames.ts`: supported aliases participate in name-only recognition.
- `features/scanner/LocalReceiptReview.tsx`: existing themed editor gains explicit name-suggestion control.
- `lib/receiptLayoutFixtures.ts`: Abbreviation review fixture in existing protected local diagnostic.
- `tests/receipt-aliases.test.mjs`:7 focused cases for exact/unknown matches, quantities/package sizes, no automatic renaming, cancellation/manual edits, source recovery, foreign values and final field whitelist.

Actual commands/results:

- Mobile/backend `npx tsc --noEmit`:pass; backend `npm run build`:pass.
- `node --experimental-strip-types --test tests/*.test.mjs`:273/273 pass, zero failed/skipped. Existing Node module-type warning remains.
- Backend `node --test tests/receipt-import.test.cjs`:4/4 pass with localhost test-server permission; no live database/provider calls.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-alias-export`:pass,40 routes.
- `npx expo-doctor`:20/21, exit1; same five Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint`:exit127, eslint not found; root has no lint script.
- Existing development iOS manifest/bundle:HTTP200, FreshTrack Dev; new fixture and Use Suggested Name present. Current LAN192.168.1.10:8087. No direct device UI acceptance claimed.
- `git diff --check`:pass.

Existing design-system cards/text/buttons and keyboard-aware editor retained. No new route, dependency, native build, backend, Prisma schema, deployment or environment change. No user groceries read/written by the agent. No receipt images or private receipt text collected. Temporary logs live at `/private/tmp/freshtrack-receipt-alias-tests.log`, `freshtrack-receipt-alias-export.log` and `freshtrack-receipt-alias-doctor.log`.

## Local phone checklist — passed by user report

Use Scanner→Test Receipt Layout Review→Abbreviation review, which cannot import groceries. Expect five raw-name candidates. Milk’s original abbreviation/package size should remain visible; Apply then Cancel leaves its draft unexpanded. Apply again, enter explicit1bottle/manual2026-11-30/Dairy, keep60.00 and save. Chicken’s name Apply should preserve Qty0.5kg; quantity Apply then explicit correction to0.4kg/manual2026-11-30 with150.00 must survive local preview. BNNA with unknown value can be explicitly renamed then manually corrected, reviewed and previewed. MKL UNKNOWN remains unassigned without a suggestion. Reset restores five unreviewed raw names. Pantry remains unchanged.

This synthetic exercise checks review controls and deterministic matching, not real receipt OCR accuracy or persisted import acceptance. Prior quantity/name-only phone reports are historical evidence for those earlier slices.

## Remaining work

Broader real retailer names/aliases and receipt layouts, discounts/currencies/grouped prices and long receipts; food/category recognition; sourced storage-dependent shelf-life rules; confirmed purchase dates and editable automatic estimates; packaged date/unchecked date decisions; failure/native/accessibility QA and final Phase6 review. Existing manual date logic is unchanged. No Phase9 work.

## Acceptance update

The user answered “All checks passed” to the nine-step synthetic exercise: five raw abbreviated candidates; Milk name Apply/Cancel preserving original OCR and unexpanded saved draft, then explicit Low-Fat Milk1L review with1bottle/60.00/manual2026-11-30; Chicken name/quantity application preserving0.5kg before manual correction to Chicken Breast/0.4kg/150.00; BNNA expansion followed by explicit Reviewed Bananas/1bunch/unknown value; MKL UNKNOWN remaining unassigned; exact three-row local preview; Reset and no Pantry additions.

This is user-reported local UI evidence, not direct agent observation, real-photo OCR accuracy or new persisted-import acceptance. No runtime/backend/environment/deployment or grocery changes in this documentation-only update. Prior automated results were not rerun; `git diff --check` passes. Broader receipt detection, categories and automatic storage-dependent expiry suggestions remain incomplete; barcode follow-up remains deferred.
