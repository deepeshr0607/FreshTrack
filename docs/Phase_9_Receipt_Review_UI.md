# Receipt review, editor and Add UI — 21 October 2026

User clarified that the redesign must include the inside of Scanner after extraction: product review and final Add, not only entry/capture. Inspected the supplied receipt/package designs and current review/import components and handlers. This slice extends the accepted emerald/lilac/Plus Jakarta Sans direction with shared receipt-only presentation components; global inputs/styles and other tabs are unchanged.

## Result

- After extraction, Receipt photo/capture controls collapse into a disclosure so the products come into view sooner; retake/upload remain available when expanded.
- Haul summary has real Detected/Ready/Needs review counts and an inline purchase-date action. Long estimate/currency/quantity guidance remains accessible in a disclosure. Storage conditions still appear on estimated-product cards. Packaged queue is expandable, with direct per-card scan actions retained; pages/limits remain unchanged.
- White product cards show category art, name, quantity/value, selection control, product type, source/date badge, actionable problems and compact Edit/remove controls. Only packaged cards offer expiry scanning. Fresh conditions/source guidance remain visible/linked; no coverage/rule expansion or safety guarantee.
- Edit Product has a clear heading, product type, expandable category selection, quantity/unit row, whole-entry value and expiry section. Field labels are explicit for accessibility. Original Save/Cancel, name-change invalidation, fresh estimate/manual/package priority and validation handlers remain.
- Final Add shows selected-row count and summed **known whole-entry INR value**, with priced coverage; unknown prices are excluded and zero values count as known. Skip choices update both totals. Possible duplicates have clear Skip/Add Separately selection and expandable existing matches. Final confirmation/cancellation still call the original controller, without automatic submission.
- Saved, pending retry, read-only, loading and error interfaces use the same visual components. Retry uncertainty and editing lock remain visible. Replay/outcome and sign-out information remains available. No retry keys, storage contracts, import semantics or provider/backend API changed.

No dependency, native module, backend/schema, environment, deployment or persistent field changes. Agent used only synthetic preview/test fixtures, with no actual receipt contents or account/grocery writes. Barcode follow-up remains deferred. Demo/local diagnostic exercises are not redesigned; shared import presentation retains diagnostic controls when explicitly enabled.

## Verification

- Root `npm run lint`: pass, zero warnings. `npx tsc --noEmit`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`:440/440 pass. Six new actual-TSX checks cover fresh/package controls, editor Cancel/Save with quantity/free-price/manual-date payload, selection/removal/incomplete/read-only guards, duplicate count/value/choice callbacks, unknown/free/error/busy paths and pending/saved destinations. Existing scanner tests also assert the photo disclosure keeps retake controls available. Four older screen tests initially failed because their renderer could not resolve the new presentation module; migrated them to the actual shared renderer while retaining fresh-only/mixed/unsupported/empty/read-only guards. Final full run passes all440.
- Renderers use actual pure parsing/expiry/payload code and injected native/provider/label/import hosts. They do not prove physical OCR, package capture, live duplicate responses or persisted imports. Test controller callbacks are spies; existing import/backend suites supply separate model/HTTP evidence.
- Backend `npm run lint`, `npx tsc --noEmit`, `npm test` including build: pass,166/166. No live fixtures/deployment needed.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-receipt-ui-export`: pass, iOS/Android/web,41 routes.
- Actual TSX/RN Web synthetic preview inspected product review at390px, editor/final duplicate review at320px and saved/pending states. Native hosts are substituted. Improved unit-field alignment, shortened inline action text and made category selection expandable during review. Preview server/tab stopped; not native/Android/full accessibility evidence.
- Existing signed Xcode Release build: BUILD SUCCEEDED; strict/deep signature, same identifier and embedded new interface verified. Same-identifier iPhone installation and direct launch pass without uninstalling. Bundle SHA256:`d9117581c099f6ef482edc42df65eb538b7e74d6ae83671976215f7f79add4e8`. Existing toolchain warnings and Personal Team expiry23October10:08:49IST remain; Metro not needed.
- `git diff --check`: pass. Logs use `/private/tmp/freshtrack-receipt-ui-*`.

Build/checks include the pre-existing paused decoder working tree; those dependency changes are excluded from this UI checkpoint. Doctor/security/platform/signing/other Phase9 gaps remain open, not rerun or waived. No store publishing.

## Phone review accepted

On21October2026 the user selected “Looks good — all checks passed” after receiving the eight numbered receipt-review/Edit/Add steps. This records interior design approval and reported success for receipt upload/automatic reading, product cards and photo disclosure/capture controls, Edit quantity Cancel/Save locally, inclusion/count changes and fresh/package action distinction, final-review fields/count/value, Back to Review with local edits retained, Clear Photo & Text and unchanged Pantry.

Duplicate choices were conditional on matches appearing, and Add Missing Product was a fallback if no ready rows existed. The broad response does not independently establish those branches. No final import was requested; saved/retry states remain synthetically verified for this UI slice, not newly phone-accepted. This is user-reported evidence, not agent observation, confirmed import persistence, new OCR accuracy measurements, Android runtime or full accessibility testing.

The earlier Scanner entry checklist was superseded by the request for this interior redesign; do not retroactively mark its separate manual-entry/settings/camera/picker-cancellation steps passed. Its overlapping upload/automatic-reading/photo/clear paths are covered by the new report. Prior440/440 and166/166/check/build results remain those at implementation checkpoint `edd82ce`; not rerun for this documentation-only acceptance. `git diff --check` passes.

Receipt interior review is complete. Next UI slice: Recipes / AI Chef, preserving the accepted scanner workflow and existing recipe/shopping behavior. Other Phase9 gaps and paused decoder work remain unchanged.
