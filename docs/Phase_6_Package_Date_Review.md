# Phase 6 — unchecked package-date review

19 October 2026. Automated verification complete; new local iPhone checklist pending.

## Behavior

Receipt grocery review now distinguishes four local declarations: printed date not checked, printed date unreadable/unavailable, loose/fresh item without a package date, and printed date checked by the user. No packaged-food classification is inferred from names. Existing category and twenty-food estimate support remain unchanged.

Entering a package date shows Package date (awaiting confirmation). Saving it requires I Checked This Printed Date, which validates the calendar date and records the exact item name/date locally. Correcting the date, editing the item name or applying a name suggestion clears confirmation. Saving or preparing a selected haul rejects stale/inconsistent declarations. This is user confirmation, not camera/AI verification of a label.

Printed Date Unreadable / Unavailable and Loose / Fresh Item — No Package Date explicitly clear the package field and confirmation; they supply no replacement date. Users can enter a manual date or explicitly choose/customize an estimate. Missing dates still block Save; an item can stay unreviewed/unselected while other groceries proceed. Default unchecked status also permits explicit manual/estimated dates but never promotes them to printed provenance.

Receipt cards and the haul preview display the local declaration beside the existing Package date / User set / Estimated labels. Confirmed printed dates preserve package > manual > estimate priority; only the winning choice survives Save. Cancel leaves the original row unchanged. Bulk estimate application preserves unchecked declarations and never confirms a package label.

## Persistence boundary

The optional typed `packageDateReview` is current-review UI state, not a new database flag. It is validated before Save and selected-haul preparation, then excluded from the existing reviewed import payload. Persisted/durable retries retain the existing winning `PACKAGE_DATE`, `USER_ENTERED` or `PRESET_ESTIMATE` provenance (and base/days for estimates). They do not retain a separate unreadable/not-applicable declaration. Pantry continues showing its existing date-source labels; no new persistent package-inspection badge is claimed.

Legacy confirmed retries without this local metadata remain compatible and unchanged. No backend/schema/API migration, environment, deployment, provider, native build or dependency changes. No user-grocery reads or writes by the agent. No automatic package-date OCR or barcode follow-up.

## Files

- `lib/receiptPackageDates.ts`: typed local declaration, exact confirmation/validation and labels.
- `features/scanner/ReceiptPackageDateReview.tsx`: checked/unavailable/no-package controls with validation.
- `lib/receiptCandidates.ts`: optional local metadata and consistency validation on Save/selected review.
- `features/scanner/LocalReceiptReview.tsx`: declaration state, reset on name/date changes and card/preview labels.
- `components/PantryExpiryFields.tsx`: optional awaiting-confirmation summary for receipt use; other Pantry forms unchanged.
- `lib/receiptLayoutFixtures.ts`: centralized synthetic four-row Package date review fixture using existing diagnostic route, local preview only.
- `tests/receipt-package-dates.test.mjs`: eight behavioral cases.

Existing receipt card, theme, button, form and keyboard/safe-area shell reused. No new screen or different visual direction.

## Actual checks

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 327/327 pass, no skips. New cases cover blocked unchecked package source, strict confirmation, unreadable/manual and unchecked/estimate provenance, corrected dates/names, printed priority/discarded lower choices, no-package validation, selected-haul consistency, batch behavior, durable source restoration and legacy compatibility. Cancel is verified as non-mutating pure review preparation; native interaction remains pending.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass; temporary localhost listeners, no database/provider calls.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-package-date-export`: pass, 40 routes.
- Expo Doctor: 20/21, same five SDK patch recommendations, exit 1.
- Backend `npm run lint`: existing missing ESLint, exit 127. Root has no lint script.
- `git diff --check`: pass.
- Existing FreshTrack Dev iOS manifest/bundle: HTTP 200; confirmation, unavailable and awaiting-confirmation labels present. LAN `192.168.1.14:8087`. This is bundle delivery, not direct device UI observation.

No actual persisted phone import or new native build performed for this mobile-only slice. Existing source/provenance restoration has automated evidence, not a new live database claim.

## Local iPhone checklist (pending)

Keep the laptop awake; use FreshTrack Dev on the same Wi-Fi. If needed, enter `http://192.168.1.14:8087` in its development launcher. Use synthetic values only; this does not assert any actual food label was checked.

1. Reload/sign in → Scanner → Test Receipt Layout Review → Package date review. Expect four unreviewed groceries, each with Printed date not checked.
2. Review Chocolate biscuits. Quantity `1`, unit `pack`, Package date `2026-11-30`. Expect awaiting confirmation. Save Grocery Review before checking: expect an error. Tap I Checked This Printed Date: expect checked status. Cancel Edit; reopen and verify fields/check were not saved.
3. Enter those biscuit fields again and confirm the printed date. Change the package date to `2026-12-01`: confirmation should clear and Save should fail until I Checked This Printed Date is tapped again. Confirm and Save. Reopen: Package date `2026-12-01`, checked status; Cancel Edit.
4. Review Milk. Quantity `1`, unit `bottle`, enter Package date `2026-12-05`. Tap Printed Date Unreadable / Unavailable: package field should clear without an invented date. Enter Manual expiry `2026-11-25` and Save. Card should say User set and unreadable/unavailable.
5. Review Rice. Quantity `1`, unit `bag`. Tap Set Custom Shelf-life Estimate; enter starting date `2026-10-19`, Shelf life `7`. Save. Expect Estimated `2026-10-26` and Printed date not checked. No printed-date claim.
6. Review Apples. Quantity `1`, unit `bag`, tap Loose / Fresh Item — No Package Date. Save without a date: expect validation. Enter Manual expiry `2026-11-20`, Save. Expect User set and loose/fresh/no-package status.
7. Reopen Chocolate biscuits; change the name to Chocolate biscuits edited. Expect confirmation cleared and Save blocked until reconfirmed. Cancel Edit; original name, checked status and `2026-12-01` must remain.
8. Preview Reviewed Haul: expect four rows with their distinct declarations and sources: biscuits package `2026-12-01`/₹30, Milk manual `2026-11-25`/₹60, Rice estimated `2026-10-26`/₹100, Apples manual `2026-11-20`/₹40. Preview Confirmed Fields (Local Only) must retain exact dates/values.
9. Reset Layout Check: four unreviewed rows with unchecked status return. Return to Pantry and verify nothing was added.

## Remaining / next

Record the package-review phone result, then real-receipt accuracy/recovery and final native/failure/accessibility/performance review. The twenty-food coverage scope is closed, with its new phone test explicitly waived; do not expand it. Barcode follow-up stays deferred. Phase 6 remains incomplete; no Phase 9 or store publishing.
