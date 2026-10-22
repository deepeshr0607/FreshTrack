# Receipt item and price recovery — 22 October 2026

User reported that the supplied public ten-line grocery receipt produced only six products, then clarified that none of the prices appeared on the phone. This follows completion of the UI work; the slice is an extraction/visibility correction, not a new redesign.

## Reproduction and cause

Public source image: [Food 4 Less receipt graphic](https://california-times-brightspot.s3.amazonaws.com/f5/14/685bc22a4d48878744c1834b4a73/food4less-receipt.png), published in the [Los Angeles Times article](https://www.latimes.com/food/story/2024-04-15/99-cents-stores-only-closing-alternative-discount-grocery-shopping). Original SHA256 `9a24836f002858f0ff91a529a9d81f0051dce8c1a8f98789163db96b5896d1f6`. Image/OCR/positions remain in temporary local evaluation files, not committed fixtures. No private receipt was requested or uploaded.

The default macOS Vision replay returned22 observations. Before the correction, normal `receiptProducts` returned6 products and2 detected prices. This reproduces the product count, not the exact phone price result (user reported0). Most names and prices were independent observations, with no Amount heading; the existing position matcher required that heading. Decimal package-size/rate annotations were excluded by name-only recovery, while unfamiliar foods were absent from its vocabulary. Same-line price detection accounted for the two local values. Different iPhone segmentation/compression is not reproduced by the Mac replay.

## Correction

- Add a bounded headerless single-column matcher under the existing same-row proposal path. Require at least3 repeated unambiguous physical name/amount pairs, one right-aligned numeric column and a recognized footer. No matching by OCR string order, product whitelist expansion, unit-price multiplication or total borrowing.
- Names with parenthesized decimal size/rate notes and unfamiliar names can be recovered when positions establish their separate amount. Originals/provenance are retained. Competing numeric columns, overlapping/fragmented names, unreadable cells, summaries/adjustments/non-food guards and mismatched/invalid geometry abstain; text remains available for existing correction paths.
- Existing same-line and labelled/code-row matchers, pristine-only upgrades, reviewed/excluded edits, source uniqueness and50-product bound remain. The new proposals feed the existing editable product-review pipeline; no import/outcome is triggered.
- Product cards and editor now show the original detected receipt amount and currency status. Explicit foreign currency remains visible while INR value stays unknown; currency is not converted. Unmarked amounts remain unverified under the existing INR review behavior and must be checked before saving. This US sample does not print a currency marker, so the app cannot infer USD from the image or internet source.

No native recognizer, permissions, backend/schema/dependency/provider/environment/deployment or expiry-rule changes. No grocery/account writes by the agent. String-only recognition retains existing fallback; this is not Android geometry support. Quantity/food-form/shelf-life coverage is unchanged, not newly accepted by this receipt replay.

## Verification

- Root `npx tsc --noEmit`, `npm run lint`: pass, zero lint warnings.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:472/472 pass. Ten new regressions: headerless/decimal/unfamiliar recovery; shuffled observation order/footer exclusion; absent geometry/footer/headings/insufficient evidence; competing columns/wrapped/duplicate/offset cells; foreign-currency preservation; pristine/edited/mismatched-source guards; summaries/non-food/unreadable cells; mixed same-line/cap/source bounds; actual card/editor foreign amount visibility; actual product review extracted amounts and Edit Cancel. Synthetic fixtures only. Relevant focused run16/16 passes.
- Backend lint, TypeScript and `npm test` including build: pass,166/166. No live fixtures run.
- Existing `scripts/receipt-vision-evaluate.swift` replay:22 observations. Compiled actual `ReceiptLayoutRecognizer.swift` with `scripts/receipt-layout-native-evaluate.swift` and replayed the same public image:22 positioned strings. Corrected pipeline returns10 products and10 exact item/amount associations, with18 distinct original sources (two rows already same-line) and detected amounts summing to20.33. Footer total is not a product. Every name/amount association was checked against the image. This is one local macOS/native-core replay, not iPhone, Android or broad receipt accuracy acceptance.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-receipt-price-fix-export`: pass, iOS/Android/web,41 routes. Signed Xcode Release build: BUILD SUCCEEDED; strict/deep signature verification and embedded new receipt-amount strings pass. Bundle SHA256 `9c9d8a81ff673e769c55e4754ed0864fa7b22993fb718835a1efe45fca2ac7e6`; same development identifier, no uninstall. Device installation/launch recorded below. Existing Node module-type, Expo color-environment and native toolchain warnings remain; Doctor not rerun for this parser/presentation change.

## Device update

Same-identifier iPhone installation returned success. Device process launch also returned success; in-app acceptance is pending. The existing Personal Team profile expires23October at10:08:49AM IST. No Metro startup needed.

`git diff --check` passed.

## Remaining

Re-upload the same image in the updated FreshTrack Dev app and verify all ten product cards and their detected amounts, Edit Cancel and unchanged Pantry. Do not confirm import of the foreign-price sample. Headerless layouts without adequate positional evidence remain manual; recognition/quantities/categories/storage assumptions still require review. Phase9 and paused decoder/advisory/signing/platform limitations remain open; no store publishing.
