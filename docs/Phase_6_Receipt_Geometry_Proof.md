# Phase 6 — local receipt-position proof

19 October 2026. This is a completed, bounded evaluation slice, not a completed split-column feature. The phone OCR/parser/UI/import flow is unchanged. Phase 6 remains incomplete.

## What changed

- `scripts/receipt-vision-evaluate.swift` optionally writes observation positions alongside its unchanged string output. Positions use normalized top-left coordinates. Images, text and positions stay in the explicit local temporary directory, with only counts printed.
- `lib/receiptGeometry.ts` validates at most 500 positioned strings, sequential source IDs, text bounds and finite/in-bounds boxes. The evaluation-only matcher requires one clearly labelled amount column before a table-ending summary. It pairs only unique names and amounts on the same baseline, to the right of the name, aligned with that column. Later summary tables are excluded. These tolerances are conservative heuristics, not measured confidence scores.
- Existing parser/currency checks and `pairReceiptLines` preserve both original lines and provenance. Other numeric columns do not replace the labelled line amount. Explicit foreign currency stays unknown in INR. Suggestions have no quantity, unit or expiry, and remain unreviewed/unselected. No inventory writes occur.
- Eight regression tests cover reordered OCR observations, unit-price rejection, foreign prices, missing/duplicate headers, missing table boundaries, ambiguous matches, vertical offsets, non-food rows, summaries, invalid inputs, subsequent tax tables and the fifty-item cap.
- `scripts/evaluate-receipt-geometry.mjs` checks exact text hashes against the earlier pinned public samples, checks geometry/string correspondence and source uniqueness, and prints aggregate counts/hashes only. Raw positions and transcripts are not committed.

Apple's [recognized text observation](https://developer.apple.com/documentation/vision/vnrecognizedtextobservation) exposes observation geometry. The coordinate conversion was also compiled and exercised against the installed local Vision SDK. No Expo SDK integration/native adapter change is made here.

## Actual public-image results

Same pinned public sources and reference row counts as [the accuracy recheck](Phase_6_Receipt_Accuracy_Recheck.md). Fresh macOS Vision runs retained 110, 39 and 43 observations respectively. Exact string hashes were unchanged. See [aggregate layout results](Phase_6_Receipt_Geometry_Results.json).

| Sample | Grocery purchase rows | Same-baseline proposed pairs |
|---|---:|---:|
| 014, Asia Mart | 9 | 0 |
| 031, AEON | 1 | 0 |
| 000, non-food control | 0 | 0 |

This does **not** improve the measured 0/10 complete automatic name/amount result. It establishes a reproducible position-based baseline and confirms that same-baseline alignment alone is insufficient. Sample 014 puts descriptions below code/quantity/amount rows and has fragmented/uncertain recognition. Sample 031 retains an uncertain price suffix. Guessing the nearest number or stripping the suffix is not accepted. No native camera accuracy, food shelf-life accuracy or general receipt coverage is claimed.

The module is not imported by the phone app. The installed mobile extractor still returns strings only. A geometry adapter/native rebuild is deferred until a useful grouping algorithm has evidence on these samples and independent synthetic ambiguity cases. There is no new phone checklist for this local-only slice.

## Reproduce

Public inputs remain in `/private/tmp/freshtrack-public-receipts`; pinned image/annotation hashes and public download links are in the preceding accuracy report/evaluator. For each ID `014`, `031`, `000`, run (substitute that ID):

```sh
swift -module-cache-path /private/tmp/freshtrack-public-receipts/module-cache \
  scripts/receipt-vision-evaluate.swift \
  /private/tmp/freshtrack-public-receipts/014.jpg \
  /private/tmp/freshtrack-public-receipts/014-vision-current.json \
  /private/tmp/freshtrack-public-receipts/014-layout.json
node --experimental-strip-types scripts/evaluate-public-receipts.mjs /private/tmp/freshtrack-public-receipts
node --experimental-strip-types scripts/evaluate-receipt-geometry.mjs /private/tmp/freshtrack-public-receipts
```

Local Vision needs access to macOS system services. The first sandboxed attempt failed with a Foundation service error; all three runs succeeded outside that sandbox. No network or private receipt was used by these commands.

## Checks

- Mobile and backend `npx tsc --noEmit`: pass.
- Backend `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 339/339 pass, no skipped tests.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass with permitted local HTTP listeners. Initial sandbox-only attempt: 3 pass, 2 blocked by `listen EPERM`; rerun resolved that environment restriction. No database/provider calls.
- Fresh Swift runs for all three samples: pass. String and geometry evaluators: pass their validation/assertions; extraction accuracy remains the zero-pair result above.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-geometry-export`: pass, 40 static routes plus iOS/Android bundles.
- Backend `npm run lint`: exit 127, existing missing `eslint`; root has no lint script.
- `npx --yes expo-doctor`: 20/21 checks pass; the same five Expo patch mismatches remain. Initial sandbox invocation could not resolve the npm registry; the permitted retry completed.
- `git diff --check`: pass.

No UI, backend, database schema, native module, dependencies, environment, deployment or existing groceries changed. No Phase 9 work or publishing.

## Exact next step

Build and evaluate conservative grouping for repeated code/quantity/amount rows with descriptions below them, preserving all component sources and abstaining when rows/fragments are ambiguous. Compare proposed names and amounts one-to-one against public annotations. Connect native geometry and explicit phone review only after that proves useful. Remaining receipt failure/permission/cleanup/accessibility/performance checks and the final Phase 6 review follow; barcode follow-up remains deferred and food coverage remains capped at twenty.
