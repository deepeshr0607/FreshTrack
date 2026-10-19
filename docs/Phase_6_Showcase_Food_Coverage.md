# Phase 6 — limited 20-food showcase coverage

19 October 2026. Food-coverage implementation is complete within the user's requested 20-food limit. New phone testing was explicitly waived for this item; it is not recorded as passed. Phase 6 overall is still incomplete.

## Agreed scope and implementation

The user limited coverage for a project review, ultimately requesting 20 foods total. Existing fourteen supported food/type entries remain intact; six additions bring the total to twenty. White and brown rice are counted separately. Recognition/category vocabulary still supports more names; an identifiable name does not imply an automatic shelf-life rule.

`lib/receiptShelfLife.ts` adds six source-attributed condition-specific rules. Existing confirmation, calendar validation, editable estimates, package > manual > estimate priority and durable import contracts are reused. Apple/banana/orange/grape preparations and ground/stew/organ beef or processed fish are excluded from these new whole-food rules. No bulk application or automatic assignment from scan alone was introduced.

## Supported showcase items

Durations below are editable app tracking defaults after the displayed condition and purchase date are confirmed. They are not verified remaining life, manufacture dates or guarantees of safety. Older food needs a shorter date; earlier printed instructions apply.

| # | Food/type | Tracking days | Required condition summary |
|---|---|---:|---|
| 1 | Apples | 21 | Whole, firm, refrigerated in a sealed bag |
| 2 | Bananas | 3 | Already ripe, whole, peel intact, refrigerated |
| 3 | Oranges | 10 | Whole, ripe, unpeeled, refrigerated |
| 4 | Grapes | 7 | Whole, unwashed, refrigerated |
| 5 | Strawberries | 2 | Whole, unwashed, refrigerated |
| 6 | Pears | 5 | Whole, ripe, refrigerated |
| 7 | Spinach | 2 | Fresh, unwashed, refrigerated, ventilated bag |
| 8 | Lettuce | 2 | Fresh, unwashed, refrigerated, ventilated bag |
| 9 | Carrots | 7 | Whole, tops removed, refrigerated |
| 10 | Broccoli | 3 | Whole, fresh, refrigerated, ventilated bag |
| 11 | Cabbage | 3 | Whole, fresh, refrigerated, ventilated bag |
| 12 | Potatoes | 14 | Whole, dry, cool/dry/ventilated, away from light |
| 13 | Onions | 14 | Whole, dry, cool/dry/ventilated, away from light |
| 14 | Chicken | 1 | Fresh/raw, refrigerated continuously, not thawed |
| 15 | Fish | 1 | Fresh/raw fin fish, whole/fillet, refrigerated continuously |
| 16 | Beef | 3 | Fresh/raw steaks/chops/roasts; not ground/stew/organ meat |
| 17 | Eggs | 21 | Raw, intact shells, refrigerated continuously |
| 18 | Milk | 7 | Unopened pasteurized dairy milk, refrigerated continuously |
| 19 | White rice | 365 | Dry/uncooked, tightly sealed, cool/dry storage |
| 20 | Brown rice | 180 | Dry/uncooked, tightly sealed, cool/dry storage |

Refrigerated conditions require 4°C or below; rice uses the displayed approximately 21°C cool/dry condition. Original source ranges and special rice day-conversion notes remain visible in review. Unsupported foods/forms retain printed/manual dates or explicit custom estimates. They are not silently mapped to category-wide durations. No more catalogue expansion is required for the agreed project-review scope.

## Sources

New rules checked on 19 October:

- [Iowa State University Extension — Apples](https://spendsmart.extension.iastate.edu/produce-item/apples/): refrigerated whole apples up to three weeks. App uses 21 days.
- [Virginia Cooperative Extension storage guide, Table 6 on printed page 13](https://www.pubs.ext.vt.edu/content/dam/pubs_ext_vt_edu/348/348-960/FST-510.pdf): refrigerated ripe bananas three days, citrus ten–twenty-one days and grapes one week. App uses 3/10/7 days under the stated conditions. Not a room-temperature tropical-storage assumption.
- [FoodSafety.gov cold storage chart](https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts): refrigerated fin fish 1–3 days and beef steaks/chops/roasts 3–5 days. App uses their lower bounds. These are not ground-beef or freezer-quality rules.

Existing source details remain in [storage estimates](Phase_6_Receipt_Storage_Estimates.md) and [milk/rice estimates](Phase_6_Milk_Rice_Estimates.md). No source verifies an individual purchase's age or prior handling.

## Showcase access

Added centralized synthetic `Project showcase (20 foods)` in `lib/receiptLayoutFixtures.ts`, accessible through the existing development-only Scanner → Test Receipt Layout Review route. It uses twenty distinct names with synthetic ₹100 values. Every row starts unreviewed/unselected with blank quantity/unit/expiry. Existing ten-card pagination and local-only confirmed-field preview apply. It cannot import anything to Pantry. This is a demo fixture, not evidence of OCR accuracy on a photographed receipt.

## Verification

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 310/310 pass, no skips. Four additional cases cover the exact twenty-food inventory and all rule coverage, six new date calculations/validation/precedence, incompatible preparations, and a complete twenty-row durable retry with unknown/free/known values and unchanged expiry provenance.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass; temporary localhost HTTP listeners, no live database/provider calls.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-showcase-export`: pass, 40 routes.
- Expo Doctor: 20/21; same five SDK patch recommendations, exit 1.
- Backend `npm run lint`: existing missing ESLint, exit 127. Root has no lint script.
- `git diff --check`: pass.

No new screen, UI layout, native build, dependencies, backend source, schema, runtime environment or deployment changes. No actual user-grocery reads/writes. New source rules and showcase have automated evidence only: no new direct native UI/OCR or persisted phone-import acceptance. User requested no phone testing for this item, so no checklist is pending for it.

## Next step

Coverage is closed at this twenty-food scope. Next: convenient receipt-wide confirmed purchase date and explicit reviewed estimate application, followed by packaged/unchecked-date handling and remaining real-receipt/failure/native/accessibility/performance review. Barcode follow-up remains deferred. Phase 9 and store publishing are not started.
