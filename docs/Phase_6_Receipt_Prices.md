# Phase 6 — grouped receipt prices and currency context

19 October 2026. Bounded receipt-price slice; local iPhone acceptance pending. Barcode follow-up stays deferred.

## Behavior

The existing parser accepts valid Western grouped decimals (1,200.00;12,345,678.90) and Indian lakh/crore grouping (1,23,456.78;2,14,74,836.48), alongside existing plain two-decimal dot/comma formats. Canonical draft values remove grouping commas without floating point conversion. Original OCR remains unchanged. Missing decimals, malformed grouping, ambiguous European grouping, signed values and attached unrecognized tax codes remain for manual recovery. Existing final-entry value bounds are still enforced; parsing a number does not make it valid for import.

RM/MYR are explicitly foreign, alongside the previously supported USD/EUR/GBP markers. Explicit currency headers such as Currency:INR, Currency:MYR, Amount(RM), (RM) or Prices in USD supply local context to unmarked amounts. Any foreign header causes unmarked values to remain blank in the INR draft, including mixed-header receipts. Explicitly tagged amounts retain their own handling: an INR-tagged row can still be reviewed as INR, while foreign-tagged rows never prefill rupees. Context is scoped to one parse, not remembered across receipts. Unsupported header patterns and other currency codes remain limitations; absence of a detected marker still means currency unspecified, not verified INR.

Separate amount lines retain local currency context for later explicit matching. No order-based association or currency conversion is performed. Name-only suggestions continue to have unknown prices. Zero remains free; blank remains unknown. Financial adjustment lines (including recognized discount/coupon/refund labels and signed adjustments) stay unassigned rather than becoming positive grocery purchases. Discounts are not distributed across items; users must review/correct actual whole-entry values. No arithmetic reconciliation with the receipt total is claimed.

## Files

- `lib/receiptCandidates.ts`: supported amount grammar, normalization, scoped header context, RM/MYR and adjustment exclusion; explicit pairing retains local context.
- `lib/receiptLayoutFixtures.ts`: Grouped INR prices and Foreign currency receipt in the existing protected local diagnostic. No new route or UI layout.
- `tests/receipt-prices.test.mjs`:8 focused cases covering exact formats, malformed values, context/explicit tags, pairing, adjustments, reviewed paise and bounds.
- Three existing parser tests updated for the new supported grouping: previously uncertain Rice1,200.00 is now explicitly asserted as1200.00; malformed-grouping recovery uses1,20.00 instead; overflow counts reflect the additional valid row. No assertions removed to hide failures.

No backend/schema, native, dependency, deployment or environment change. No user groceries read/written by the agent. Currency context/provenance stays local; existing reviewed field whitelist and immutable import retry contract are unchanged.

## Actual checks

- Mobile/backend `npx tsc --noEmit`:pass; backend `npm run build`:pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:281/281 pass, zero failed/skipped, including8 new tests. Existing module-type warnings remain.
- Backend `node --test tests/receipt-import.test.cjs`:4/4 pass with localhost permission; no database/provider calls.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-price-export`:pass,40 routes.
- `npx expo-doctor`:20/21, exit1; same five existing Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint`:exit127, eslint not found; root has no lint script.
- Existing development iOS manifest/bundle:HTTP200, FreshTrack Dev; both price fixtures present. Current LAN192.168.1.10:8087. No direct phone observation claimed.
- `git diff --check`:pass.

Logs under `/private/tmp/freshtrack-receipt-price-tests.log`, `freshtrack-receipt-price-export.log`, `freshtrack-receipt-price-doctor.log`. No public-image recognition benchmark was rerun for this parser slice; earlier limited public results remain historical.

## Local phone exercise — pending

Scanner→Test Receipt Layout Review→Grouped INR prices:three candidates, no adjustment/summary rows. Rice should review1200.00 and retain its grouped original through Cancel. Save explicit1bag/manual2026-11-30, keep1200.00. Oil should review123456.78 (Cancel without saving); Milk should retain0.00 after explicit1bottle/manual2026-11-30 review. Local confirmed-field preview should show exactly Rice1200.00 and Milk0.00.

Select Foreign currency receipt:Milk’s unmarked9.00 and Bread’s RM4.50 should have foreign warnings and blank INR values. Review Milk explicitly with1bottle/manual2026-11-30, leaving value blank; cancel Bread. Remove Bananas to free its name, explicitly match it to2.50 and confirm the editor retains foreign context/blank INR; Cancel without saving. Local confirmed-field preview should contain only Milk with unknown value. Reset restores three unreviewed suggestions. Pantry must remain unchanged; this diagnostic cannot import.

This is synthetic UI acceptance, not real-photo recognition or a new persisted-import test. No artificial accuracy score is assigned.

## Remaining Phase6 work

Longer receipts beyond the shared20-row client/server cap and remaining layout/failure checks; food/category recognition; researched storage-dependent shelf lives; confirmed purchase dates/automatic editable suggestions; package-date/unchecked-date handling; native/accessibility QA and final review. Unsupported currencies/formats and discount allocation remain explicit manual-review limitations. Barcode follow-up deferred; no Phase9.
