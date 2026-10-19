# Phase 6 — public real-receipt accuracy recheck

19 October 2026. Assessment completed on two public grocery receipts and one public non-food negative control. One verified false-grocery defect fixed. Automatic split-column item/price extraction remains inadequate on these samples; this is not full OCR acceptance or iPhone camera verification.

## Sources and method

Reused public images and box annotations from the [ICDAR/SROIE repository](https://github.com/zzzDavid/ICDAR-2019-SROIE), pinned to `27be4271b251c256f695acbade9a801bffe85994`:

- [014.jpg: Asia Mart](https://github.com/zzzDavid/ICDAR-2019-SROIE/blob/27be4271b251c256f695acbade9a801bffe85994/data/img/014.jpg), nine grocery purchase rows. Names and several numeric columns are separate; some printing is faded/occluded.
- [031.jpg: AEON](https://github.com/zzzDavid/ICDAR-2019-SROIE/blob/27be4271b251c256f695acbade9a801bffe85994/data/img/031.jpg), one grocery purchase row, opaque brand name and an attached price/tax-code recognition error.
- [000.jpg: non-food control](https://github.com/zzzDavid/ICDAR-2019-SROIE/blob/27be4271b251c256f695acbade9a801bffe85994/data/img/000.jpg), modelling-clay product with a food word in its description. One purchased non-food row, zero grocery rows.

All images were visually inspected. Image/annotation hashes and reference product-box indices are pinned in `scripts/evaluate-public-receipts.mjs`. Full images/transcripts remain only in `/private/tmp/freshtrack-public-receipts`; none are committed. No private receipts or accounts were accessed.

`scripts/receipt-vision-evaluate.swift` freshly runs macOS Apple Vision, maximum image edge 2000px, default `VNRecognizeTextRequest`, top candidate per observation. The installed Expo extractor's string projection was inspected locally. This reproduces the request shape but not iPhone hardware/OS, UIKit decoding, app JPEG recompression or camera capture. No recognition tuning or reference hints were supplied. Geometry is not supplied to the production parser. Reference annotations are used only for evaluation/manual-recovery assertions.

Strict name recovery uses case/punctuation normalization with digits retained and one-to-one occurrence matching. Repeated purchases require distinct recognized occurrences; a single matching name cannot satisfy two rows. This is not character accuracy, full field accuracy or correctly paired name-and-price accuracy. Verified candidate source IDs are bound to the exact recognized-output hashes; changed Vision outputs require manual reassessment before scoring.

## Actual results

| Sample | Grocery rows | Vision strings | Exact reference names, one-to-one | Complete automatic name/price candidates | Name-only suggestions | False grocery suggestions before → after | Explicit manual recovery |
|---|---:|---:|---:|---:|---:|---:|---:|
| A / 014 | 9 | 110 | 5/9 | 0 | 2 | 0 → 0 | 9/9 |
| B / 031 | 1 | 39 | 1/1 | 0 | 0 | 0 → 0 | 1/1 |
| Non-food / 000 | 0 | 43 | n/a | 0 | 0 | 1 → 0 | n/a |

Every recognized string is preserved as a candidate origin or unassigned line: 110/110, 39/39 and 43/43. Candidates are unreviewed/unselected. The two food suggestions in A identify actual purchase lines but are not a claim that every product field/category is correct.

Manual recovery is a local, explicit field-correction/payload check using reference names and quantities, not automatic extraction and not direct native UI observation. It uses an arbitrary explicit test date, quantity/unit review and unknown INR purchase values; no historical food-expiry inference is made. All ten manually reviewed groceries pass existing payload validation without an HTTP/import call. Receipt text/provenance is excluded from the payload. This does not mean ten groceries were automatically extracted or saved to a database.

A's `Amt (RM)` header was already supported before this change: all 37 standalone amount lines retain foreign context. A manually chosen item/line-total pair keeps its rupee value blank. My initial suspected abbreviated-header bug was incorrect; no currency change was needed or made. B has no recognized explicit currency header, so country/retailer is not used to infer one. Its uncertain attached price/tax token stays unassigned; a repeated total is never borrowed as an item price. Unknown INR values remain null rather than converted or invented.

## Verified defect and focused fix

The non-food control initially produced one name-only grocery suggestion because its modelling-clay description contained a supported food word. `lib/receiptItemNames.ts` now excludes explicit non-food markers such as modelling/modeling clay, toys, soap, detergent and pet products. These markers also prevent name-based food/category/storage suggestions. `lib/receiptCandidates.ts` applies the same exclusion to same-line priced non-food descriptions, keeping their original text available for explicit recovery.

Regression cases use synthetic examples rather than copied receipt transcripts. Whole-word boundaries preserve actual Fish, Milk, Bananas and Claypot rice; the exclusion is not a blanket substring filter. No new food aliases, shelf-life rules, price/tax suffix stripping or automatic cross-column matching was added. Coverage remains limited to the agreed twenty foods/types.

## Reproduce locally

Place the three pinned public JPG/CSV pairs in an explicit temporary directory, then run for each ID `014`, `031`, `000`:

```sh
swift -module-cache-path /private/tmp/freshtrack-public-receipts/module-cache scripts/receipt-vision-evaluate.swift /private/tmp/freshtrack-public-receipts/014.jpg /private/tmp/freshtrack-public-receipts/014-vision-current.json
node --experimental-strip-types scripts/evaluate-public-receipts.mjs /private/tmp/freshtrack-public-receipts
```

Repeat the Swift command for 031 and 000 before running the Node evaluator. It verifies source hashes and output hashes, prints counts only, preserves duplicate purchases in name matching, and asserts foreign-price safety and local manual recovery. Optional pre-change `*-baseline-current.json` files provide the before column. Aggregate run output is committed as `Phase_6_Receipt_Accuracy_Results.json`; no full transcript is included. The Swift program saves recognition JSON only to the explicit local path and logs only counts/dimensions. No upload or provider billing is involved.

## Actual checks

- Fresh Swift runs on all three samples: exit 0; dimensions 763×2000, 1080×1527 and 463×1013.
- `node --experimental-strip-types scripts/evaluate-public-receipts.mjs /private/tmp/freshtrack-public-receipts`: exit 0, all source/output hashes and preservation/manual-recovery assertions pass.
- Mobile/backend `npx tsc --noEmit` and backend `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 331/331 pass, no skips. Four new regressions cover non-food exclusions including priced lines, unaffected genuine-food names, existing abbreviated foreign-header/manual matching behavior and uncertain price/tax suffixes.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass with temporary localhost listeners; no live database/provider calls.
- All-platform Expo export to `/private/tmp/freshtrack-public-receipt-export`: pass, 40 routes.
- Expo Doctor: 20/21; same five existing patch recommendations, exit 1.
- Backend `npm run lint`: existing missing ESLint, exit 127. Root has no lint script. Existing Node module-type warnings remain.
- `git diff --check`: pass.

No backend/schema/native module/dependency/environment/deployment changes or Pantry/user-data writes. No new phone checklist is required for this public-image assessment; actual iPhone camera results remain unverified.

## Remaining limitation and next step

The assessment is complete, but broad receipt accuracy is not established. Complete automatic extraction remains 0/10 on these split-column food examples. A string-only OCR adapter cannot reliably associate product names with unit prices versus line totals; brand names outside the vocabulary also require manual correction. Local review/manual matching remains the supported recovery path.

Resolve or explicitly accept this split-column automation limitation before claiming general receipt accuracy, then finish remaining native/failure/accessibility/performance QA and the final Phase 6 review. Geometry-preserving OCR would be a separate implementation slice, not an improvement claimed here. Barcode follow-up deferred, twenty-food scope unchanged, no Phase 9/store publishing.
