# Phase 6 — longer receipt review and atomic import

19 October 2026. Implemented, tested and deployed to the development Preview. Local iPhone paging acceptance pending. Barcode follow-up remains deferred.

## Change

A shared `RECEIPT_MAX_ITEMS=50` now bounds OCR candidates, name-only suggestions, local editing/matching, reviewed payloads, API validation and idempotency replay lookup. The existing Pantry Used/Wasted batch limit stays20. No schema migration or wire-field change. Each explicitly confirmed haul remains one Serializable transaction with matching CREATED events; it is not split into partially saved batches. Inputs beyond50 are rejected by the API; excess OCR lines remain available in unassigned text. The existing500-line/50k-character OCR bounds remain.

Receipt review displays10 cards per page, with range/page counts and Previous Items/Next Items controls. All review/edit/include state lives in the complete row array, so the final haul includes selected reviews from every page. Page selection clamps after removal. Add Missing and matching enforce the same50-row cap. The existing themed cards/buttons and keyboard-aware editor remain; no redesign or new route. Central synthetic Long receipt(50items) uses the existing protected local diagnostic, which cannot import.

Retry storage keeps its version1 manifest, keys and400-code-point chunks. The bounded chunk count increases64→160 for larger validated payloads; restoration and cleanup use that bound. Existing20-item version1 records still restore unchanged. Chunk sizes remain below the conservative2KB per native value budget in the maximum-size Unicode/expiry fixture. Raw OCR/images/auth material remain excluded.

## Database issue found and fixed

The first live capacity run failed9/10 because50-item import reached the existing10-second transaction budget. Its cleanup assertions passed. Rather than raising timeouts, receipt duplicate counts now use one household/auth-scoped groupBy query for the requested normalized-name/category/expiry identities. Only identities with existing matches need the bounded five-match read. Duplicate criteria, within-haul checks, latest-five ordering, transaction isolation and replay hash semantics remain unchanged. The existing10-second budget is unchanged.

After this change, all10 live tests pass: exact source/value/event snapshots, concurrent confirmation, household isolation, duplicate choices, key conflicts, full50-item import/replay, shrinking a50-item retry to20 or changing its last row, fifty existing duplicate reviews/Add Separately, and rollback when the final event fails. The22.9-second maximum test case includes multiple separate API-service calls (import/replay/conflict/review/separate import); it is not a single22.9-second transaction. Cleanup assertions passed for every fixture.

A separate actual mobile-controller/Prisma integration suite also passed4/4, including real50-item commit followed by simulated lost response, controller restart, explicit identical-key/payload retry, exactly one receipt/50items/50events and cleared retry storage. Its50-item case took about7.1seconds across all its operations; this is local evidence rather than a mobile-network performance benchmark. All live writes used isolated guarded development fixture households and were cleaned. No existing user groceries were changed.

## Files

- `backend/src/contracts/receiptLimits.ts`, `lib/receiptLimits.ts`: shared public bounds.
- `backend/src/services/pantry.ts`: receipt validation/replay capacity and batched duplicate counts.
- `lib/receiptCandidates.ts`, `lib/receiptImport.ts`: coherent review/wire/storage bounds and legacy restoration.
- `features/scanner/LocalReceiptReview.tsx`, `lib/receiptLayoutFixtures.ts`:10-card paging and local50-row exercise.
- `tests/receipt-long.test.mjs`: four new long-haul/storage/restart cases; existing cap tests use the shared bound while retaining explicit overflow checks.
- Backend receipt HTTP/live/client tests:50/51 boundaries, late repeated IDs, real maximum haul/replay/duplicates/rollback and lost-response recovery.

## Actual commands and checks

- Mobile/backend `npx tsc --noEmit`:pass; backend `npm run build`:pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:285/285 pass, zero failed/skipped (four new tests). Existing Node module-type warning remains.
- Backend `node --test tests/receipt-import.test.cjs`:5/5 pass; `node --test tests/pantry.test.cjs`:16/16 pass, with local test-server permission.
- Read-only guarded Prisma SELECT1 probe:pass before fixture writes.
- `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/receipt-import.integration.test.cjs`:initial9/10, then final10/10 after batching counts; cleanup assertions pass.
- `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --experimental-strip-types --test tests/receipt-client-retries.integration.test.cjs`:4/4 pass with cleanup assertions.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-long-receipt-export`:pass,40 routes.
- `npx expo-doctor`:20/21, exit1; existing five Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint`:exit127, eslint not found; root has no lint script.
- `git diff --check`:pass. No debug logging/secrets introduced.

## Development deployment

Existing project freshtrack-api Preview: `dpl_H5bv2QSS6tDnQJicWRH9BEYraq93`, Ready at https://freshtrack-3erpdq4jj-dragon-2818.vercel.app . Preview environment guard/build passed; no migrations or Auth/provider setting changes. Deployment install emitted existing dependency advisories(36) and deprecation notices; dependencies/lockfile were not changed.

Vercel deploy/inspect used the existing cached CLI with `deploy --target preview --yes`. Public `/api/v1/health` returns200/ok; unauthenticated receipt-review/import return401. An initial `/health` probe returned404; the actual registered health route was then verified. These probes are not hosted authenticated50-item acceptance.

Only the ignored root `.env.local` public API URL changed to this Preview; Auth entries preserved. Existing port8087 iOS manifest/bundle return200, FreshTrack Dev; both paging fixture/control and the new API URL are in the served bundle. Current LAN192.168.1.10. No native rebuild/dependency change. No direct phone UI observation is claimed.

Logs are in `/private/tmp/freshtrack-long-receipt-{root,database,database-final,client-live,export,doctor,deploy,inspect}.log` (the initial focused parser log is `freshtrack-long-receipt-tests.log`).

## Local phone exercise — pending

Scanner→Test Receipt Layout Review→Long receipt(50items). Expect50candidates, five pages of10, no preselected rows, Previous disabled on page1 and Add Missing disabled at capacity. Explicitly review rows01/21/50 across pages with manual2026-11-30:1bag/1.00,2bags/21.00,1bag/50.00. Returning to page1 must retain those reviews, and local preview must contain exactly these three rows. Exclude/reinclude a review across pages without changing its fields; remove an unreviewed row to enable Add Missing, then cancel its editor; Reset restores50 unreviewed candidates. Pantry remains unchanged. This is synthetic UI verification, not50-item phone import, real receipt OCR accuracy or Android acceptance.

## Next

Record local paging acceptance, then implement food/category recognition and the researched, storage-dependent editable expiry suggestion workflow requested by the user. Unsupported layouts/aliases/currencies/discount allocation stay explicit review limitations. Receipts beyond50, Android/native/failure/accessibility/performance QA and final Phase6 review remain. Barcode follow-up deferred; no Phase9.
