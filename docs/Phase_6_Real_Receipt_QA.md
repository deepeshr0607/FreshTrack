# Phase 6 — real receipt accuracy check

**Historical checkpoint.** Current parser/Vision replay and the verified non-food fix are recorded in [the accuracy recheck](Phase_6_Receipt_Accuracy_Recheck.md). Currency/name-only observations below describe the earlier implementation, not the current parser.

19 October 2026. Two public samples tested locally at the user’s request; iPhone real-photo checks remain unverified. Barcode follow-up remains deferred.

## Scope

Compare two actual grocery receipts from different retailers/layouts against on-device recognition and local candidate review. Prefer one short, clear receipt and one longer receipt or a receipt with separate name/amount columns. Use existing receipts; no purchase is needed. This is a small exploratory check, not an accuracy benchmark or a claim of broad retailer coverage.

Do not send receipt photos, raw recognized text, addresses, payment details or credentials to the agent. Report only counts, field types and generic layout problems. Do not prepare duplicate review or confirm import; Pantry must remain unchanged.

## Phone procedure

1. Keep the laptop awake. Open FreshTrack Dev (not Expo Go), reload and sign in to the real account. The verified local development server is on port 8087; the current Wi-Fi address is 192.168.1.10. Recheck the address if the network changes.
2. Choose two existing grocery receipts from different retailers. For each, count the grocery purchase lines on the paper, excluding totals, taxes, discounts and payment lines. Record A or B and that count privately.
3. Scanner → Receipt OCR → Photograph Receipt. Capture receipt A upright in good light with all text visible. Check its preview, then tap Read Text on Device.
4. Tap Show Recognized Text. Compare names and amounts against the paper. Note how many grocery lines have both readable names and correct amounts. Do not count a correct raw line as a correctly parsed candidate until checking the next step.
5. Inspect the grocery candidates and Show Unassigned Lines. Note candidate count, missed groceries and any totals/taxes/payment lines proposed as groceries. Separate columns are deliberately unpaired; this is different from missing recognized text.
6. Review one grocery. Verify original text and suggested amount; manually correct the name/value if needed. Enter quantity, unit, category and a date that you explicitly choose. Save Grocery Review. Check those reviewed fields. Stop before Check Duplicates & Continue; do not import.
7. If separate name and amount lines are available, explicitly match one pair against the paper, review and cancel the editor. Otherwise use Add Missing to open a missing-item review, then Cancel Edit. Verify no extra review row is saved by cancellation.
8. Tap Clear Photo & Text. Expect image, recognized text and local reviews to disappear. Tap Choose Receipt Photo and select a photo of receipt B. Read Text on Device; repeat the comparisons in steps 4–5. The previous receipt’s edits must not appear.
9. Leave the receipt screen and reopen Receipt OCR. Expect no unconfirmed photo, recognized text or review rows. Return to Pantry; no groceries should have been added by this exercise.

## Result format

A: paper grocery lines / readable name-and-amount lines / automatic candidate count / false grocery candidates.
B: the same four counts.
Then report whether correction, cancellation, Clear, second-photo replacement and leaving/reopening pass. Describe only generic issues such as “amount split into another column” or “tax proposed as grocery.” No private contents are required. A low count should be reported honestly rather than recorded as a pass.

## Agent checks before phone verification

- Mobile and backend `npx tsc --noEmit`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 251/251 pass, zero failed/skipped. Full output: local temporary log `/private/tmp/freshtrack-receipt-accuracy-tests.log`.
- Existing port8087 iOS manifest: HTTP200, FreshTrack Dev with launch asset.
- No runtime, dependencies, backend, native build, deployment, environment or user-data changes. Existing Doctor patch mismatch and missing lint tooling remain documented in the split-line report; not rerun for this documentation-only checklist.

Real-photo results remain pending. Android runtime, broader failure/accessibility/performance QA, remaining parser formats and final Phase6 review remain incomplete. Phase9 has not started.

## Public-image evaluation performed by agent

The user requested testing with two receipts found online instead of photographing their own. Selected two food-purchase examples from the public [ICDAR/SROIE repository](https://github.com/zzzDavid/ICDAR-2019-SROIE). Visually inspected both images and compared public text-box annotations. No source image or full transcript is added to the repository.

Pinned source tree: `27be4271b251c256f695acbade9a801bffe85994`.

- [A: Asia Mart, data/img/014.jpg](https://github.com/zzzDavid/ICDAR-2019-SROIE/blob/27be4271b251c256f695acbade9a801bffe85994/data/img/014.jpg), reference `data/box/014.csv`. Nine purchase rows, including repeated purchases. SHA256 image: `096a23d4824ba6f370defe01768be25a28a39d6fd273391b9e045191443e2956`.
- [B: AEON, data/img/031.jpg](https://github.com/zzzDavid/ICDAR-2019-SROIE/blob/27be4271b251c256f695acbade9a801bffe85994/data/img/031.jpg), reference `data/box/031.csv`. One purchase row. SHA256 image: `e921f4bca358d8085f5177b5e32ea3bd12b01b1f38a2cbd640f7850ed2abb879`.

### Actual method

Downloaded images/annotations only into `/private/tmp/freshtrack-public-receipts`. A temporary Swift harness used macOS Apple Vision `VNRecognizeTextRequest` defaults and `topCandidates(1)`, matching the request/projection inspected in installed `expo-text-extractor` iOS source. ImageIO downsampled to a maximum 2000-pixel edge (A763×2000; B1080×1527). This approximates the app’s size bound but does not reproduce its JPEG recompression, UIKit decoding, device OS/model or camera capture. macOS Vision results are not iPhone/Android acceptance.

Executed for both samples:

```sh
swift /private/tmp/freshtrack-public-receipts/recognize.swift INPUT.jpg OUTPUT-vision.json
```

Then loaded each resulting string array through the unchanged production `parseReceiptCandidates` using Node strip-types. No transcript normalization, annotation geometry or manual row joining was supplied to the parser. Reference annotations were for human comparison only.

| Sample | Purchase rows on image | Vision strings | Automatic grocery candidates | False automatic candidates | Unassigned preserved |
| --- | ---: | ---: | ---: | ---: | ---: |
| A | 9 | 110 | 0 | 0 | 110/110 |
| B | 1 | 39 | 0 | 0 | 39/39 |

Both layouts separate item names from numeric columns. Zero automatic candidates therefore measures zero automatic item coverage on these samples, not successful extraction. The parser intentionally requires explicit pairing or manual recovery. No whole-receipt character accuracy or name/amount pairing accuracy score was computed: the adapter drops geometry and reference boxes do not map one-to-one to Vision strings.

A has faded/occluded areas with truncated or altered product names. B recognizes its product name but reads the attached price/tax-code token as `75.005R`; the parser conservatively does not strip that suffix or borrow a repeated total. Separate unit prices, line amounts and totals are available in A, but string ordering cannot reliably establish their association. These are observed limitations, not passed accuracy criteria.

Both receipts are Malaysian rather than Indian. RM is not currently an explicitly supported foreign marker in the parser; standalone unmarked numbers remain currency-unspecified and can be copied into a draft only subject to the existing INR review warning. The app cannot infer their currency from a separate header. Do not keep RM values as INR. In this evaluation, a local manual recovery assertion explicitly kept INR purchase value unknown. Broader foreign-marker handling remains a follow-up; no currency conversion or production behavior change was made.

### Checks and result

- Both local recognition commands exited0.
- Actual parser assertions: no candidates selected; every input string preserved in original order as unassigned for both samples.
- Actual local manual-review/payload assertion: explicit reviewed name, quantity/unit/date accepted; blank INR value stays `null`; raw OCR is excluded. No network/import function was invoked.
- Fresh root suite:251/251 pass, zero failed/skipped; mobile/backend `npx tsc --noEmit`: pass.
- `git diff --check`: pass. Runtime code, dependencies, backend, deployment, environment and Pantry were unchanged.

Temporary artifacts: `recognize.swift`, `014-vision.json`, `031-vision.json`, `014-parsed.json`, `031-parsed.json`, `regression.log` under `/private/tmp/freshtrack-public-receipts`. These are disposable local evidence, not committed fixtures or durable storage.

This substitutes a limited public-image evaluation for the requested user-receipt exercise. It does not mark its camera/edit/cancel/clear/navigation phone steps passed. Existing synthetic UI acceptance is recorded separately. Next: address bounded parsing/currency gaps with regression fixtures, then remaining receipt/native failure QA and final Phase6 review. Barcode follow-up stays deferred.
