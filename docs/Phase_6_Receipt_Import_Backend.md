# Phase 6 — protected atomic receipt import backend

16 October 2026. Backend slice complete locally; not deployed or connected to mobile yet.
The existing on-device OCR and editable-haul phone acceptance remain separate evidence.

## Contract and behavior

- `POST /api/v1/pantry/receipt-review`: authenticated, read-only household duplicate review for
  1–20 explicitly reviewed grocery fields. Response includes row IDs, full matching counts, up to
  five existing purchases per row and matching row IDs within the submitted haul.
- `POST /api/v1/pantry/receipt-import`: requires `confirmed: true`, validated fields and an
  `Idempotency-Key` of 16–100 ASCII letters/digits/underscore/hyphen. Each row has a distinct,
  bounded `rowId` and `item` using the existing Pantry create contract. Rows are canonicalized by
  row ID. Query strings, client ownership/source/receipt IDs, raw OCR text/images and unexpected
  fields are rejected before service work. Existing verified identity middleware and global rate
  limit apply. No third-party integration or receipt upload was introduced.
- Duplicate identity follows existing Pantry rules: normalized name, category, expiry date, active
  and nonarchived within the verified household. Quantity/value do not change duplicate identity.
  Review does not merge items. Import rechecks household and within-haul duplicates transactionally;
  every matching submitted row needs explicit Add Separately confirmation. Skipping will mean
  omitting that row from the final confirmed payload; no existing purchase is changed.
- One existing Serializable transaction creates an IMPORTED ReceiptScan, all RECEIPT PantryItems
  and one CREATED snapshot/event per grocery. Any failure rolls everything back. Receipt metadata
  contains no uploaded image, raw text or detected-items payload. No new schema/migration needed.
- Names/quantities/paise, unknown versus zero costs and confirmed expiry choices use the existing
  server validation. Source and household ownership are server-owned. Creation events snapshot
  exact quantity/cost/category/expiry/timezone. Original local OCR remains on the device.
- Idempotency events use `receipt:<key>:<index>` in the existing household-unique ledger, distinct
  from manual/mutation/batch namespaces. Exact keys are queried (not wildcard prefix matching).
  The canonical request hash binds verified subject, all rows/fields and duplicate decisions.
  Reordering rows replays; changed fields/cardinality/IDs/decisions conflict without writes.
  Concurrent first requests retry serialization/unique conflicts using the existing bounded policy.
- Successful replay returns the same receipt/item IDs and current item statuses. It never reverses
  a later confirmed outcome or adds history. Hard deletion of all item/event history is not exposed
  by current APIs; future deletion/ledger-retention work must account for cascade deletion of keys.

## Changed files

`backend/src/contracts/api.d.ts`, `backend/src/services/pantry.ts`,
`backend/src/routes/pantry.ts`, and two new receipt-import test files. Mobile consumes the contract
through its existing type-only facade; no mobile UI/API client change in this checkpoint.

## Actual verification

| Check | Result |
|---|---|
| Mobile `npx tsc --noEmit` | Passed |
| Backend `npm run build` and `npx tsc --noEmit` | Passed |
| Root strip-types tests | 215/215 passed |
| Selected backend regression suite, including new receipt HTTP/validation tests | 125/125 passed |
| Existing synthetic HTTPS transport guard test (separate run) | 1/1 passed; no SQL call |
| Backend Jest health | 1/1 passed |
| Guarded live Prisma development receipt cases | 8/8 passed |
| Guarded live maximum-20-item case (separate run) | 1/1 passed |
| Fixture cleanup in both live runs | Passed; known synthetic households/members removed |
| `git diff --check` and source review | Passed; no receipt/credential logging introduced |
| Backend `npm run lint` | Exit127: `eslint: command not found`, existing setup gap |
| Mobile lint | No existing lint script; not claimed passed |
| Expo/native exports/build/Doctor | Not repeated for backend/type-only changes; prior review slice exports36 routes and Doctor20/21 remain historical |
| Deployment/hosted authenticated acceptance/new phone save | Not performed; client not connected |

Live tests opt in through the existing pinned-development-target guard. Only uniquely named
`freshtrack-dev-test:receipt:*` households were created. Tests verify authoritative receipt/item/event
counts, exact fields, no writes during review, cross-household isolation, within-haul/household duplicate
rejection and explicit separate purchases, unchanged existing items, concurrent confirmations,
reordered replay, changed payload rejection, rollback on the second event, current-status replay after
Waste and full20-item import/replay within the existing transaction budget. This is development
correctness evidence, not a load/performance guarantee. It does not read or change the user's groceries.

The initial HTTP test run failed only because the sandbox disallowed Supertest's localhost listener.
The network-enabled rerun passed4/4. No bypass or test expectation was weakened.

Commands (backend unless noted):

```sh
npm run build
npx tsc --noEmit
node --test tests/receipt-import.test.cjs
# Selected existing regression files plus receipt-import.test.cjs:125 tests
node --test tests/analytics-https.test.cjs
npm test -- --runInBand
ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/receipt-import.integration.test.cjs
# Initial live run contained8 cases; added capacity case was then run independently:
ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test --test-name-pattern='maximum twenty' tests/receipt-import.integration.test.cjs
npm run lint
# Root
npx tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs
```

Logs: `/private/tmp/freshtrack-receipt-import-{live,capacity,root,backend}.log`.

## Exact next step

Connect reviewed-haul confirmation and household duplicate Skip/Add Separately choices to these
endpoints. Persist only confirmed reviewed fields plus the frozen payload/request key before sending,
with account/branch isolation, restart recovery and safe sign-out handling; do not persist OCR text or
images. Add retry/response-loss tests for that client controller. Then deploy the development Preview,
verify health/tokenless rejection and give the user a clear numbered iPhone import/restart/duplicate
checklist. The current phone preview still does not save groceries. Barcode and broader native QA
remain incomplete. Phase9 has not started.
