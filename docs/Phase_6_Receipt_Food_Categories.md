# Phase 6 — receipt food/category suggestions

19 October 2026. Bounded deterministic recognition/review slice; local synthetic iPhone acceptance passed by user report. Barcode follow-up remains deferred.

## Behavior

A shared typed food catalogue supplies canonical local identifiers/labels, supported English words and the existing Pantry categories. The name-only detector derives its vocabulary from the same catalogue, retaining its existing metadata exclusions and exact abbreviation support. Original food words remain supported; chips and additional common produce names are included. There are no storage conditions, expiry durations, provider calls or nutritional/safety classifications in the catalogue.

The unchanged parsed draft starts as Other and unreviewed. Cards show detected food and suggested category; the editor offers Use Suggested Category when it differs from the current choice. Only this explicit action applies the category. Cancel discards editor changes, manual overrides remain valid, and reopening/renaming does not auto-overwrite the chosen category. Category application preserves all names, quantities, prices, dates and source text. Name/quantity suggestion buttons continue working independently. All rows still require explicit review before import.

Supported fruits/vegetables→Produce; milk/curd/cheese etc→Dairy; meat/poultry/fish→Meat; bread/buns/cake→Bakery; biscuits/cookies/chips/chocolate→Snacks. An explicit positive frozen keyword with a recognized food suggests Frozen, but does not verify actual storage. Rice/dry staples and eggs retain Other under the existing seven-category taxonomy while their food identity can still be recognized. No enum/schema change or invented Grains/Eggs category.

Clear finished-product matches can take precedence over ingredient words (milk biscuits→Snacks, chocolate cake→Bakery). Unknown/multiple unresolved foods, prepared-product terms such as soup/juice/powder/cooked, nonfood/metadata names, supported plant-dairy indicators and negated frozen labels stay Other/Needs Review. Exact supported aliases and quantity wrappers participate without silently renaming the item. The matcher is intentionally limited: unknown languages/brands/formats and mixed products need manual review; there is no confidence percentage or universal food-identification claim.

Local `foodId`/label/status metadata is not persisted or sent in the receipt API. Only the final existing category enum enters the reviewed immutable retry payload and backend duplicate/import flow. Food identity/category alone must not be treated as verification of production day, freshness, packaging or storage when the next expiry engine is implemented.

## Files and design

- `lib/receiptFoodCatalog.ts`: shared typed food vocabulary/category rules.
- `lib/receiptFoodRecognition.ts`: bounded alias-aware recognition and explicit category apply helper.
- `lib/receiptItemNames.ts`: derive name hints from the shared catalogue rather than a separate word list.
- `features/scanner/LocalReceiptReview.tsx`: detected-food/category text, explicit apply button, manual fallback; existing radio choices, theme and keyboard-aware editor retained.
- `lib/receiptLayoutFixtures.ts`: ten-item Food category review in the existing protected local diagnostic; no Pantry writes.
- `tests/receipt-food-recognition.test.mjs`: nine cases for categories, finished products, ambiguous/plant/nonfood/negated labels, aliases, Cancel/manual choices, no date inference and final-field-only retry restoration.

No backend source, schema, dependency, native build, deployment or environment change. No user groceries read/written by the agent. No new navigation route or design direction.

## Actual checks

- Mobile/backend `npx tsc --noEmit`:pass; backend `npm run build`:pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:294/294 pass, zero failed/skipped (nine new tests). Existing Node module-type warning remains.
- Backend `node --test tests/receipt-import.test.cjs`:5/5 pass with local server permission; no database/provider calls. Live database suites were not repeated for this mobile-only feature.
- Final `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-food-export-final`:pass,40 routes.
- `npx expo-doctor`:20/21, exit1; same five Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint`:exit127, eslint not found; root has no lint script.
- Existing port8087 iOS manifest/bundle:HTTP200, FreshTrack Dev; new fixture and Use Suggested Category present. LAN192.168.1.10. Direct device UI acceptance not claimed.
- `git diff --check`:pass.

Temporary logs: `/private/tmp/freshtrack-receipt-food-tests.log`, `freshtrack-receipt-food-export-final.log`, `freshtrack-receipt-food-doctor.log`. Earlier preliminary focused/export outputs are also local temporary artifacts. No real receipt OCR accuracy benchmark performed.

## Local phone exercise — passed by user report

Scanner→Test Receipt Layout Review→Food category review must show ten unreviewed candidates with category hints, leaving actual draft categories Other. Apples Apply/Cancel must not save the category; Apply then explicit1bag/manual2026-11-30/40.00 review saves Produce. Milk’s abbreviation should suggest Dairy without requiring name expansion; Apply then deliberately choose Snacks and review1bottle/manual2026-11-30/60.00 to verify manual override survives reopening. Chicken Apply saves Meat with explicit0.5kg/manual2026-11-30/120.00. Milk biscuits suggests Snacks, Frozen spinach Frozen, Rice recognized/Other; Chicken soup/Unknown product/Milk cheese require manual review. No category button may populate expiry. Local confirmed-field preview contains only the three reviewed rows with exact user choices; Reset restores ten unreviewed rows; Pantry unchanged.

This local synthetic exercise checks UI/classification behavior, not real receipt recognition, persisted database import or Android acceptance. Prior real import/retry evidence is recorded separately in the long-receipt report.

## Next

Research and implement storage-dependent shelf-life rules with confirmed purchase-date bases and editable estimated dates. Printed package-date/unchecked-date decisions, remaining real-receipt/failure/native/accessibility QA and final Phase6 review remain. Barcode follow-up deferred; no Phase9 implementation. Store submission/publishing are excluded per the user’s scope update; device use remains the goal.

## Acceptance update

The user answered “All checks passed” to the nine-step synthetic exercise: ten unreviewed candidates; expected Produce/Dairy/Meat/Bakery/Snacks/Frozen hints; Rice recognized under Other, with Chicken soup/Unknown product/Milk cheese needing review; Apples category Apply/Cancel leaves Other and no expiry before explicit Produce/1bag/40.00/manual2026-11-30 review; Milk Dairy suggestion followed by deliberate Snacks override with1bottle/60.00 persists when reopened; Chicken Meat/0.5kg/120.00 review; exact three-row local confirmed-field preview; Reset and unchanged Pantry.

This is user-reported local UI evidence, not direct agent observation, real-photo OCR/food recognition accuracy or new persisted-import acceptance. No runtime/backend/environment/deployment or grocery changes in this documentation-only update. Prior automated results were not rerun; `git diff --check` passes. Storage-dependent shelf-life rules, confirmed purchase-date bases and editable automatic expiry suggestions remain incomplete. Barcode follow-up stays deferred; store submission/publishing remain outside user scope.
