# Phase 6 — one receipt purchase date and reviewed estimate prefills

19 October 2026. Automated checks pass; new receipt-date phone acceptance pending. The separate twenty-food coverage item remains closed with its phone testing explicitly waived.

## Behavior

Receipt review now has a shared purchase date. Users enter and confirm it once; blank, invalid calendar dates and future dates are rejected using Asia/Kolkata today. Confirmation alone changes no grocery. The date is prefilled in individual storage-estimate forms, where an item-specific date can still be entered.

Review Suggested Dates Together opens a paged list (ten groceries per condition page). Each grocery requires its own explicit storage/type choice; there is no select-all assumption. Generic Rice retains separate white/brown choices and chooses neither automatically. Unsupported foods/forms remain unavailable for a researched estimate. Source attribution and storage conditions are shown; the existing twenty-food catalogue is unchanged.

Preview Chosen Estimates shows exact names, date base, durations and proposed dates. Apply Chosen Estimates prefills only the chosen dates. It never marks a grocery reviewed or selects it for import, changes quantities/categories/prices or saves anything to Pantry. Every grocery still needs its normal field approval. Cancel Suggested Dates discards the choices/preview without changing rows; the shared confirmed purchase date remains available.

All reviewed groceries, including excluded ones, and any row already holding an expiry/expiry selection are protected from batch replacement. This includes prior manual/package/custom dates and earlier prefills. Changing the shared date never rebases existing rows; individual edits remain explicit. Preserved rows can be edited through their existing grocery form.

An immutable local preview captures a row snapshot. Removal, renaming, field/selection changes or a repeated application invalidate that snapshot. The apply helper revalidates selected rules and dates and rejects tampered/duplicate proposals before changing any row. The local prefill is atomic. Conditions/choices remain keyed by row ID across pages.

## Files and boundaries

- `lib/receiptBatchEstimates.ts`: strict shared-date validation, eligible options, explicit preview and guarded local apply.
- `features/scanner/ReceiptEstimateBatch.tsx`: date confirmation, paged condition choices, preview/Cancel/Apply and error/success states.
- `features/scanner/LocalReceiptReview.tsx`: shared date and batch-prefill connection, pending estimated-date labels.
- `features/scanner/ReceiptExpirySuggestion.tsx`: optional shared date as the starting value for individual date input; no automatic rule application.
- `tests/receipt-batch-estimates.test.mjs`: nine behavioral cases.

Existing card/form/button/theme components and the keyboard-aware safe-area scroll shell are reused after inspecting the supplied receipt design. No new route or dependency. Backend/schema/native/environment/deployment/provider settings unchanged. No user-grocery reads or writes by the agent.

Unconfirmed shared date/plans stay in the current local receipt review and are discarded on leaving/replacing the receipt or sign-out. They are not a separately persisted receipt purchase record. Once an item is explicitly reviewed, its winning estimate date/base/days enter the existing API/retry contract. No raw OCR, whole-receipt snapshot, rule ID or new metadata is sent or stored in durable retries. Existing import/duplicate confirmation remains separate and mandatory.

## Actual checks

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 319/319 pass, no skips. New cases cover strict date confirmation, explicit generic-rice choices, no-side-effect preview/Cancel, mandatory individual review, preservation of reviewed-excluded and package/manual/custom dates, stale/tampered/duplicate plans, unchanged dates after rebasing the shared input, fifty-row capacity and a twenty-food reviewed durable restart.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass with temporary localhost listeners; no live database/provider calls.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-batch-estimate-export`: pass, 40 routes.
- Expo Doctor: 20/21, same five SDK patch recommendations, exit 1.
- Backend `npm run lint`: existing missing ESLint, exit 127. Root has no lint script.
- `git diff --check`: pass.
- Existing FreshTrack Dev iOS manifest/bundle: HTTP 200, all new primary action labels present; current LAN `192.168.1.14:8087`. This verifies bundle delivery, not direct native UI observation.

No actual DB import/new native build or live receipt accuracy benchmark was performed for this mobile-only slice.

## Phone checklist (pending — shared-date flow only)

Use FreshTrack Dev, laptop awake, same Wi-Fi. If needed use `http://192.168.1.14:8087` in its development launcher. This is a synthetic local exercise, not an instruction to assume these conditions for real food.

1. Reload/sign in. Scanner → Test Receipt Layout Review → Milk and rice expiry review. Expect seven unreviewed rows.
2. In Receipt purchase date, enter `2026-02-30` → Confirm Receipt Purchase Date: expect an error. Confirm `2026-10-19` instead: expect the confirmed-date message and no grocery dates assigned.
3. Review Milk. Its individual purchase-date input should already contain `2026-10-19`. Set quantity `1`, unit `bottle`, Package date `2026-10-20`, Save Grocery Review. Tap Included once to exclude Milk. It must keep its package date.
4. Review Suggested Dates Together. Milk should say Existing review/date preserved. Choose the dry-white condition for Rice and dry-brown condition for Brown rice. The cooked/UHT/raw/biscuit entries should have no condition choice. Preview Chosen Estimates: expect two dates (`2027-10-19` and `2027-04-17`). Cancel Suggested Dates. Review Rice: shared input prefilled, but no estimate saved. Cancel Edit.
5. Repeat those two condition choices and preview, then Apply Chosen Estimates. Rice/Brown rice cards should show their estimated dates while still needing review, with no new import selections. Milk must stay excluded with its package date. Preview Reviewed Haul should be disabled because no grocery is both reviewed and selected.
6. Review Rice: base `2026-10-19`, 365 days. Set quantity `1`, unit `bag`, Save Grocery Review. Review Brown rice: base `2026-10-19`, 180 days. Set quantity `1`, unit `bag`; change Shelf life to `7` (expect `2026-10-26`), then save.
7. Change the shared receipt date to `2026-10-18` and confirm. Reopen Rice and Brown rice: their saved base/dates must remain unchanged. Milk's printed date and excluded choice must remain. No batch-eligible groceries should remain.
8. Preview Reviewed Haul → Preview Confirmed Fields (Local Only): exactly Rice (`2027-10-19`, ₹100) and Brown rice (`2026-10-26`, ₹90), one bag each. Milk stays excluded. Reset Layout Check: seven unreviewed rows and blank shared date. Return to Pantry: nothing added.

## Remaining / next

Record shared-date phone acceptance, then packaged/unchecked-date handling and remaining real-receipt/failure/native/accessibility/performance review. Food coverage stays limited to twenty named foods/types. Barcode follow-up deferred; no Phase 9 or store publishing.
