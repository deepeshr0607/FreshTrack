# Phase 6 — milk and dry-rice estimate choices

19 October 2026. Automated verification complete; iPhone checklist pending.

## Change

Extended the existing receipt food/storage review rather than introducing another screen or expiry calculator. `lib/receiptShelfLife.ts` adds three explicit food-condition choices, source links and form exclusions. `ReceiptExpirySuggestion.tsx` supplies distinct confirmation buttons and milk/rice-specific explanations. The existing receipt form, source labels, package/manual priority, reviewed import contract and durable retry remain intact.

- Fresh pasteurized dairy milk: seven-day tracking suggestion only after confirmation that the milk is unopened and continuously refrigerated at 4°C or below. Earlier package instructions still apply. Raw, opened, UHT/ultra-pasteurized, shelf-stable, concentrated, powdered, boiled and plant-based forms do not receive this rule.
- Dry white rice: 365-day tracking suggestion from a confirmed purchase date under the displayed sealed/cool/dry conditions.
- Dry brown rice: 180-day tracking suggestion under the displayed conditions, explicitly described as an approximation of six months. It is not a prediction of the age or remaining life of a package.
- Generic Rice offers both clearly named confirmation actions and chooses neither automatically. Explicit White rice/Brown rice only offers its corresponding choice; contradictory types and unsupported varieties/preparations receive none.
- Cooked rice never receives dry-rice durations. Its cooking and cooling history cannot be derived from the receipt purchase date. This slice does not invent an hour-precise cooked-rice expiry using a date-only field.
- Other packaged items retain manual/custom review. There is no new unchecked-package persistence flag or automatic verified package date.

The current code saves only accepted expiry/base/days using existing `PRESET_ESTIMATE` provenance. Storage/type confirmation and research-source IDs are not new persisted fields. This distinction is unchanged from the previous storage slice. Purchase date is not assumed to be production date. Custom edits and Cancel retain their existing behavior; changing food names never automatically applies a different duration.

## Sources checked

- [USDA FSIS dairy guidance](https://ask.fsis.usda.gov/article/How-long-can-you-keep-dairy-products-like-yogurt-milk-and-cheese-in-the-refrigerator): seven days refrigerated for milk. The rule narrows this to explicitly confirmed unopened pasteurized dairy milk, and printed instructions take priority. The search-indexed official text was available; direct page retrieval timed out.
- [Virginia Cooperative Extension, How to Store Food Safely at Home](https://www.pubs.ext.vt.edu/content/dam/pubs_ext_vt_edu/348/348-960/FST-510.pdf): page 3 prose recommends using raw white rice within a year in tightly closed containers. The app uses 365 days; not the table's longer unopened storage option.
- [Utah State University Extension, Food Storage Booklet](https://extension.usu.edu/preserve-the-harvest/files/Food-Storage-Booklet.pdf): brown rice up to six months around 70°F. The UI calls out the 180-day approximation and shorter dates for older stock. Hot/humid household conditions must not be treated as the confirmed cool/dry condition.
- [UK Food Standards Agency rice guidance](https://www.food.gov.uk/print/pdf/node/4286): cooked-rice handling depends on cooling and elapsed hours, supporting its exclusion from the dry-rice estimate path. No hour-based use-by implementation is claimed.

Sources are general guidance, not evidence of India-specific retail freshness, verified cold-chain history or food safety. The UI directs users to check printed instructions and shorten estimates for older food.

## Verification

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: 306/306 pass, no skipped tests. Six added cases cover explicit type choices, incompatible forms, exact dates/future-date validation, package/manual priority, unreviewed fixture behavior and unchanged durable retry restoration. Existing source whitelist and unsupported-food expectations updated for the new supported rules.
- Backend `node --test tests/receipt-import.test.cjs`: 5/5 pass, using temporary HTTP listeners; no database/provider calls.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-milk-rice-export`: pass, 40 routes.
- Expo Doctor: 20/21; exit 1 for the same five Expo/Linking/Notifications/Router/Splash patch recommendations.
- Backend `npm run lint`: exit 127, existing missing ESLint. Root still has no lint script.
- `git diff --check`: pass.
- Existing 8087 server was stopped. Started the existing FreshTrack Dev project with `APP_LOCAL_NATIVE_IDENTIFIER=com.deepeshr.freshtrack.development npx expo start --dev-client --port 8087 --lan`. No project/environment file changed. Current LAN address: `192.168.1.14`.
- iOS manifest and bundle return HTTP 200; FreshTrack Dev identity and all three confirmation labels/new fixture present. Bundle delivery is not direct phone UI acceptance.

No backend source/schema/dependencies/native build/environment/deployment changes, live database tests or user-grocery reads/writes. Existing receipt design/theme/components reused. Broader real-receipt accuracy is not established by this synthetic exercise.

## iPhone checklist (pending)

Keep the laptop awake. Use FreshTrack Dev on the laptop's Wi-Fi; if needed enter `http://192.168.1.14:8087` in its development launcher. These are synthetic UI checks, not instructions to apply the conditions to actual groceries.

1. Reload/sign in. Scanner → Test Receipt Layout Review → Milk and rice expiry review. Expect seven unreviewed rows.
2. Review Milk. Enter purchase date `2026-10-19`, tap Confirm Refrigerated Milk & Use Estimate: expect seven days and Estimated `2026-10-26`. Enter Package date `2026-10-20`: package date should win and confirmation should be disabled. Cancel Edit; reopen Milk and check neither choice was saved.
3. Confirm Milk again with the same purchase date. Set quantity `1`, unit `bottle`, keep ₹60. Change Shelf life to `5`: expect Estimated `2026-10-24`. Save Grocery Review, reopen and verify date/base/duration; Cancel Edit.
4. Review Rice. Expect separate White and Brown confirmation actions with no initial expiry. Enter purchase date `2026-10-19`. Confirm Dry White Rice: expect 365 days, `2027-10-19`. Confirm Dry Brown Rice: expect 180 days, `2027-04-17`. Cancel Edit, reopen and check neither was saved. Confirm White again; quantity `1`, unit `bag`, keep ₹100, Save Grocery Review.
5. Review Brown rice. Expect only the Brown action. Confirm purchase date `2026-10-19`: 180 days, `2027-04-17`. Quantity `1`, unit `bag`, keep ₹90, Save Grocery Review.
6. Review Cooked rice, UHT milk, Raw milk and Milk biscuits separately. Expect no automatic estimate/action. Cooked rice should explain cooking-time/cooling review. Cancel each edit.
7. Preview Reviewed Haul → Preview Confirmed Fields (Local Only). Expect only Milk `2026-10-24`/₹60, Rice `2027-10-19`/₹100 and Brown rice `2027-04-17`/₹90, with the entered quantities/units.
8. Reset Layout Check: seven unreviewed rows return. Return to Pantry and verify nothing was added.

## Remaining

Phone acceptance; remaining supported produce/storage conditions; convenient receipt-wide confirmed purchase-date/bulk estimate review; explicit packaged/unchecked-date decisions; real-receipt coverage and failure/native/Android/accessibility/performance QA; final Phase 6 review. Opened/UHT/raw milk and hour-sensitive cooked rice are not completed supported estimate cases. Barcode follow-up deferred. No Phase 9 or store publishing.
