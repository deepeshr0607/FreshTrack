# Phase 6 — local receipt candidates and editable review

16 October 2026. Next small slice after the user-reported successful iPhone OCR diagnostic.
This is local review, not completed receipt ingestion. No Pantry writes or cloud deployment.

## Implementation

- `lib/receiptCandidates.ts`: typed, deterministic parsing of bounded OCR output. Recognizes
  same-line name/decimal-amount pairs, normalizes whitespace and decimal commas, keeps raw source
  lines, and excludes common headers/payment/tax/total lines from initial candidates. Every
  unassigned line remains available for manual review, including overflow after 20 candidates.
  Split-column layouts, thousands separators, unit prices, retailer aliases and discounts are not
  inferred. Heuristics can misclassify lines; users must review every selected grocery.
- Amounts marked INR/Rs/₹ remain suggestions. Unmarked amounts require INR confirmation during
  review. Recognized USD/EUR/GBP markers leave purchase value blank; no exchange conversion occurs.
  The currency detector is limited, not a comprehensive international-receipt parser.
- Candidates have blank quantity/unit/expiry, provisional Other category, and start unreviewed and
  unselected. No package date, shelf-life estimate or OCR confidence is fabricated. Unknown price
  remains blank; explicit zero remains zero. Review validation matches current Pantry name/unit,
  positive decimal quantity, calendar-date and exact price bounds.
- `features/scanner/LocalReceiptReview.tsx`: Haul Detected, original text, edit/category controls,
  validation, Cancel Edit, Save Grocery Review, include/exclude, Remove, Add Missing, unassigned-line
  recovery and Reviewed Haul Preview/Back to Review. The receipt reference PNG/design tokens were
  inspected; existing cards, typography, safe-area/keyboard shell and theme are reused. No fake
  reference totals, retailer, groceries or 98% match claim is inserted into real receipt results.
- `app/scanner/ocr-check.tsx`: mounts review only for completed nonempty OCR. Reading again, choosing
  a replacement, clearing, leaving or changing account removes the review with its parent lifecycle.
  Picker cancellation retains the current result. No image/text enters navigation params or storage.
- Preview detects repeated names within the selected haul without merging or dropping purchases.
  Household duplicate checks are explicitly deferred to confirmed import. Review edits are memory
  only and intentionally reset on another read/navigation, as explained on screen.

The existing mock Receipt OCR flow is preserved. Real-account development testing continues through
Scanner → Test On-device Receipt OCR in FreshTrack Dev. No new dependency, native configuration,
backend/API contract, Prisma schema, migration, environment, deployed service or application record
change. The existing Pantry endpoint creates one item; it must not be looped to pretend an atomic
receipt import. Bulk import will need scoped server validation, one transaction, receipt/item events,
repeat-safe idempotency, duplicate review and exact replay/failure tests before connecting Save.

## Verification

- Mobile `npx tsc --noEmit`: passed.
- Backend `npx tsc --noEmit`: passed; backend source unchanged.
- `node --experimental-strip-types --test tests/*.test.mjs`: 215/215 passed.
- New parser/review-contract tests: 3/3 passed. Cover non-item exclusion, raw provenance, no quantity/
  expiry invention, separate source rows, unknown/zero/currency distinctions, unsupported layouts,
  bounded candidates/output, invalid calendar/decimal/value bounds, explicit review and duplicate IDs.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-receipt-review-export`:
  passed; 36 routes. This is bundling evidence, not native interaction or visual acceptance.
- `PATH=/opt/homebrew/bin:$PATH npx expo-doctor`: 20/21, exit1. Existing five patch recommendations
  (expo, linking, notifications, router and splash-screen); no dependency changes made. Initial
  sandboxed attempt stalled and was stopped; the network-enabled run completed.
- Existing local Expo iOS manifest: HTTP200, FreshTrack Dev and launch asset.
- `git diff --check`: passed. Source review found no added receipt logging, secrets or network calls.
- No native rebuild required: only TypeScript/React UI changed. Android/native accessibility and
  receipt-layout accuracy are not verified. Existing lint setup gaps remain; no lint pass claimed.
- Phone review checklist: pending. Previous OCR-only phone acceptance does not cover this new UI.

## Next step

Verify the numbered candidate/edit/preview/reset iPhone checklist, then implement protected atomic,
idempotent receipt bulk import with server household duplicate review and confirmed fields only.
Barcode integration and wider native/failure QA remain incomplete. Phase 9 has not started.
