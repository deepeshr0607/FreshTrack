# Phase 6 — descriptions below receipt price rows

19 October 2026. Completed a local grouping/evaluation slice. It improves the pinned public development sample, but is not connected to mobile OCR. Phase 6 remains incomplete.

## Implemented

`lib/receiptGeometry.ts` now shares bounded table detection between the existing same-baseline proof and a separate `suggestReceiptBlockPairs` evaluator:

1. Require a unique Item/Description/Particulars heading beside a clearly labelled amount column and a terminating summary.
2. Require at least two long-digit structural code rows in the item column. An optional punctuation suffix/joined count is retained as original text, never interpreted as purchased quantity or used for catalog lookup.
3. Match one valid amount observation near that code row. Unit-price columns, duplicated prices, unreadable values and uncertain suffixes cannot supply a replacement amount.
4. Bound each description using the next positioned code or amount-column cell, including unreadable cells. Do not borrow the next product's name when a code or price is missing.
5. Require exactly one complete description inside that block. Short fragments, multiple lines, non-food text, crossing boundaries and existing same-line candidates block uncertain matches. No automatic spelling correction or reconstruction.
6. Preserve code, name and amount originals/IDs, keep all input observations unchanged, and respect the shared fifty-item limit. All suggested fields still require review; quantity, unit and expiry stay blank. Existing explicit foreign currency remains unknown in INR.

Geometric tolerances are heuristic constraints, not confidence scores or a guarantee of correct extraction. This is entirely local TypeScript; the string-only native adapter, receipt review screens and API are unchanged. No image/text upload, raw-data logging, new dependency or Pantry write.

## Public sample replay

Replayed exactly the pinned macOS Vision positions from the [position proof](Phase_6_Receipt_Geometry_Proof.md), not new phone captures. The [original accuracy report](Phase_6_Receipt_Accuracy_Recheck.md) contains the pinned public image links. All input layout hashes match the committed baseline.

`scripts/evaluate-receipt-blocks.mjs` verifies layout and annotation hashes. The matcher receives no annotations, source mappings, names or expected amounts. Human-inspected source mappings are used only afterward to score each distinct purchase once; an unassessed output fails evaluation instead of being silently counted correct. Raw images/transcripts/positions remain outside the repository. [Aggregate results](Phase_6_Receipt_Block_Results.json) contain counts only.

| Public sample | Grocery rows | Proposed pairs | Correct purchase associations | Exact name + amount | Needs name correction |
|---|---:|---:|---:|---:|---:|
| 014, Asia Mart | 9 | 4 | 4 | 3 | 1 |
| 031, AEON | 1 | 0 | 0 | 0 | 0 |
| 000, non-food control | 0 | 0 | 0 | 0 | 0 |

All four amounts match their annotated line totals, not unit prices. Three names also match exactly after the prior case/punctuation normalization with digits retained. The fourth recognized name needs correction. All four foreign purchase values remain blank in INR. There are no unassessed/false purchase associations among these proposed pairs; this does not mean all recognized names are correct.

The earlier same-baseline proof remains at zero pairs. This new layout-specific proof raises exact name/amount coverage from zero to three of the ten public grocery rows. These are development samples used while implementing the algorithm, not a held-out benchmark or a general accuracy percentage. Six grocery rows remain unpaired, and one proposed row needs name correction. Native camera recognition, Android behavior and broad receipt acceptance are not established.

## Verification

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: **349/349**, no skips.
- Ten new block-layout tests plus the eight prior geometry tests: **18/18**. Cover reversed observation order, joined counts without quantity inference, currency/zero/unit prices, short/wrapped fragments, unknown/multiple prices, non-food rows, existing candidates, missing-code boundaries, date-like codes, table limits and explicit reviewed payload provenance stripping.
- Backend `node --test tests/receipt-import.test.cjs`: **5/5**, local test listeners only; no database/provider access.
- All three local public evaluators pass their assertions: unchanged original string-parser results, unchanged same-baseline results, and the new block results above.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-block-export`: pass, **40 static routes** plus native platform bundles.
- Backend `npm run lint`: exit **127**, pre-existing missing ESLint. Root has no lint script.
- Expo Doctor was not repeated for this pure TypeScript/evaluation change; the preceding checkpoint records **20/21** with five existing Expo patch mismatches. No SDK/configuration/dependency change.
- `git diff --check`: pass.

Reproduce the new replay:

```sh
node --experimental-strip-types scripts/evaluate-receipt-blocks.mjs /private/tmp/freshtrack-public-receipts
```

Temporary sample files must exist; acquisition and native position-output commands are documented in the preceding reports. Changed OCR/positions/annotations require visual reassessment before updating expected hashes/mappings.

No new phone checklist: this slice changes no phone behavior. No backend/schema/native module/environment/deployment or existing-grocery changes. Twenty-food coverage remains capped; barcode follow-up remains deferred. No Phase 9 or store publishing.

## Exact next step

Expose bounded observation positions through the free on-device OCR adapter, then connect these proposals to explicit local receipt review with source-overlap guards and the current manual fallback. Verify the rebuilt iPhone app before claiming phone support. After that, finish permission/error/cancellation/cleanup/accessibility/performance QA and the final Phase 6 review. Unpaired/incorrect rows must remain manually correctable; broader receipt accuracy is still a documented limitation.
