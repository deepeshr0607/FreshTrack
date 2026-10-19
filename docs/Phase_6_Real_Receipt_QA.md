# Phase 6 — real receipt accuracy check

19 October 2026. Prepared; phone results pending. Barcode follow-up remains deferred.

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
