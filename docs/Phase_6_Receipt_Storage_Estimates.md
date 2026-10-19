# Phase 6 — confirmed storage estimates

19 October 2026. Implementation verified automatically; new phone acceptance pending.

## Change

Receipt review now offers researched food-specific estimates after the user explicitly confirms the displayed storage/food condition and enters a purchase date. Dates are never inferred from a receipt's timestamp or treated as production dates. The existing shared calculator adds calendar days; the lower end of each published range is the suggested tracking duration.

A central typed catalogue in `lib/receiptShelfLife.ts` records condition, food IDs, range and source URL. Supported foods in this first bounded slice: strawberries, ripe pears, spinach/lettuce, carrots, broccoli/cabbage, potatoes/onions, raw chicken and shell eggs. No category-wide fallback. Explicit frozen, cut, cooked, dried and other excluded forms are rejected. Unrecognized/prepared names and milk, rice or biscuits have no researched rule in this slice.

Sources checked on 19 October:

- [FoodSafety.gov cold storage chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts): refrigerated raw chicken 1–2 days; refrigerated shell eggs 21–35 days.
- [University of Maryland Extension produce storage](https://extension.umd.edu/resource/storing-garden-fruits-and-vegetables): food-specific refrigerated or cool/dry produce guidance. The code retains the stated ranges and conditions.

These are storage guidelines, not measured remaining life or guarantees. Product age and past storage are unknown. Freezer quality periods are not turned into safety expiry dates. Earlier printed instructions and a shorter date for older food must be respected. These sources do not establish India-specific supply-chain conditions; storage must be confirmed by the user.

## Behavior and scope

- Valid canonical purchase date required; future purchase dates rejected against Asia/Kolkata today. Leap days/month/year rollover use the existing server-shared calculator.
- Explicit Confirm Condition & Use Estimate fills base/days; it does not save or select a grocery. Duration/base remain editable. Cancel discards the editor.
- Existing package/manual choices block applying the suggestion. Package > manual > estimate remains unchanged when saving.
- Receipt review replaces generic preset shortcuts with a custom estimate action that supplies no duration. Manual Pantry add/edit retains its existing behavior.
- Unsupported foods remain editable using printed/manual dates or an explicitly entered custom duration; no invented automatic duration.
- Only the accepted expiry source/date/base/days enter existing review/import/durable retries. Storage confirmation and source IDs are local to the edit, not persisted. A new edit asks for confirmation again before reapplying a rule. Purchase date is retained only as the chosen estimate base, not as a separate receipt-wide purchase record.
- Normal/diagnostic receipts share this UI; the new Storage expiry review fixture is synthetic, local only and cannot write to Pantry.
- Existing theme/cards/forms/scroll shell are reused after inspecting the supplied receipt design. No native, backend, schema, dependency, environment or deployment changes. No account groceries read or written by the agent.

## Verification

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 300/300 pass, no skips; six new semantic tests cover rule selection/exclusions, strict dates, precedence/cancellation, saved provenance and immutable durable restart. An initial fixture insertion changed the old default fixture and caused five layout failures; appending the new fixture restored the default and all tests pass.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass; HTTP listener permission required. No DB/provider calls.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-storage-expiry-export-final`: pass, 40 routes. Final export recorded after final source review.
- Expo Doctor: 20/21, exit 1; unchanged five SDK patch recommendations (Expo, Linking, Notifications, Router, Splash Screen).
- Backend `npm run lint`: exit 127, existing missing ESLint. Root has no lint script.
- Existing local server iOS manifest/bundle: HTTP 200, new controls/fixture present; LAN 192.168.1.10:8087. This is bundle delivery, not direct observation of phone UI.
- `git diff --check`: pass. No live SQL/native rebuild or actual persisted phone import performed for this mobile-only slice.

## Phone checklist (pending)

Use FreshTrack Dev on the same Wi-Fi as the laptop; open http://192.168.1.10:8087 if its launcher needs a server. Sign into a real development account. Do not use an actual food as evidence for the synthetic conditions below.

1. Reload. Scanner → Test Receipt Layout Review → Storage expiry review. Expect six unreviewed groceries.
2. Edit Spinach. In Food storage estimate, enter purchase date `2026-02-30`, tap Confirm Condition & Use Estimate: expect a date error and no estimate. Change it to `2026-10-19`, confirm: expect 2 days and Estimated `2026-10-21`. Tap Cancel Edit; reopen Spinach and verify the estimate was not saved.
3. Repeat the valid Spinach confirmation. Set quantity `1`, unit `bag`, keep value `30.00`. Change Shelf life to `3`: expect Estimated `2026-10-22`. Save Grocery Review; reopen and check that date/base/duration survived. Cancel Edit to keep the saved row.
4. Edit Chicken breast. Enter purchase date `2026-10-19` and confirm its raw/refrigerated condition: expect 1 day and Estimated `2026-10-20`. Set quantity `1`, unit `pack`. Enter Package date `2026-10-21`: expect Package date to win and the condition-confirm button disabled. Save, reopen: package date remains and the discarded estimate is not restored. Cancel Edit.
5. Edit Potatoes. Confirm the cool/dry whole-potato condition with purchase date `2026-10-19`: expect 14 days and Estimated `2026-11-02`. Set quantity `1`, unit `bag`, Save Grocery Review.
6. Open Milk, Milk biscuits and Frozen spinach separately. Each should have no researched estimate. No generic 7-day milk shortcut should appear. On Milk, tap Set Custom Shelf-life Estimate: starting date appears, but no duration is invented. Cancel Edit for each item.
7. Tap Preview Reviewed Haul. Expect only the three saved rows: Spinach estimated `2026-10-22`, Chicken package date `2026-10-21`, Potatoes estimated `2026-11-02`. Use Preview Confirmed Fields (Local Only); verify quantities and ₹30/₹120/₹40 values.
8. Reset Layout Check: all six rows return unreviewed. Return to Pantry and verify this exercise added nothing.

If the household day is earlier than 2026-10-19, report that before using these dates. The implementation deliberately rejects future purchase dates.

## Remaining

Phone acceptance of this slice; broader supported-food/condition rules (especially milk, dry versus cooked rice and remaining produce), convenient receipt-wide confirmed purchase date and reviewed bulk application, packaged/unchecked-date handling, real-receipt accuracy and failure/native/Android/accessibility/performance QA, final Phase 6 review. Barcode follow-up stays deferred. No Phase 9 or store submission work.
