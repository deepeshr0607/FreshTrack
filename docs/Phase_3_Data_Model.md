# Phase 3, item 1 — Application database model

11 October 2026. Model defined in `backend/prisma/schema.prisma`, using the existing Prisma 5.22
installation. This is a local schema contract, not an applied migration or functioning persistence.
The next slice creates/reviews migrations and adds the database client and development-only seed.

## Confirmed defaults and ownership

- User selected **INR**, stored as integer **paise**, and **Asia/Kolkata** for real households.
- PostgreSQL UUIDs identify application records. Auth subject is the opaque verified provider subject;
  do not assume it is a UUID, email, or client-supplied user ID.
- Application models belong to the application schema; no model or foreign key targets `neon_auth`.
- MVP allows one household per account, enforced by unique `HouseholdMember.authSubject`. Each
  member is a MANAGER. Shared invitations/multiple households are deferred; the compound membership
  key preserves the eventual household boundary but removing the MVP unique constraint needs a migration.
- Household owns timezone/currency. User preferences own reminder consent/time and date display;
  they do not duplicate household timezone/currency and cannot change the meaning of existing money.
- USD prototype fixtures, mobile routes and UI remain unchanged. They must not be seeded or silently
  converted into real INR data. Development seed records will have synthetic auth subjects.

## Table inventory

| Model | Contract |
|---|---|
| Household | Name, INR currency, IANA timezone, timestamps; inventory ownership boundary |
| HouseholdMember | Provider subject, MANAGER role, household; unique account membership |
| PantryItem | Name/normalized name, category, quantity/unit, dates/provenance, purchase costs, status, archive/status timestamps, optional barcode/receipt/notes |
| PantryItemEvent | Append-only mutation/outcome history, previous/new status, outcome-time quantity/category/cost/currency/expiry/timezone snapshots, source and idempotency key |
| ReceiptScan | Household and member creator, processing status, temporary private image key/deletion deadline, reviewed-candidate JSON, safe error code and timestamps |
| UserPreference | One record per member subject, reminder consent (off by default), local HH:mm reminder time (18:30), date format (DD/MM/YYYY) |

RecipeCache remains deferred until the Phase 7 provider payload/cache contract is known. Recipe saves
and shopping-list persistence are not introduced by this foundation slice.

## Dates, quantities and money

- Purchase date (optional) and expiry date (required) are PostgreSQL `date`: API representation will be
  `YYYY-MM-DD`. Do not turn a date into a device-local timestamp before serializing it.
- Mutation timestamps are `timestamptz(3)`; API timestamps will be UTC ISO strings. Expiry is valid
  through the household's calendar date; it is overdue on the next local day. Past expiry is allowed
  for review/reconciliation. Notification timing and threshold functions remain later work.
- Quantity is exact `Decimal(12,3)`, positive, maximum `999999999.999`; API quantity will be a decimal
  string, supporting 0.5 kg without binary floating-point math. Unit is trimmed text (1–32 characters);
  do not infer conversions between units.
- MVP consumes/wastes whole entries. Partial consumption is deferred; quantity snapshots record the
  entire entry at the time of the outcome. Quantity edits do not retroactively change an outcome.
- `totalCostMinor` is authoritative for the whole entry. `unitCostMinor` is optional informational
  per-unit cost; do not overwrite the total by multiplying it by a fractional quantity.
- Costs use nullable nonnegative PostgreSQL integers (maximum 2,147,483,647 paise per value).
  `null` means unknown, **0 means a known free entry**. CostSource is PURCHASE, ESTIMATE or UNKNOWN.
  UNKNOWN requires both costs null; PURCHASE/ESTIMATE require a total. UI/API should distinguish
  estimates and unknown costs. Unknown costs must not imply precise zero-cost waste.
- INR API money values will be integer paise, with currency attached. Parse human rupee amounts
  using decimal/string arithmetic; reject more than two decimal places rather than silently rounding.
  Example: ₹125.50 becomes 12550 paise. No exchange-rate conversion is part of this model.

## Inventory and historical integrity

- Status enum preserves ACTIVE, CONSUMED, WASTED, ASSUMED_CONSUMED. Expiry alone never proves
  consumption/waste. Assumed entries remain unconfirmed and excluded from confirmed totals.
- Status-changing writes must update the current item and append an event in one transaction.
  Repeated same-status confirmations are no-ops; repeats must not count again in analytics.
- Only ACTIVE entries can be edited or confirmed normally. Reconciliation may confirm
  ASSUMED_CONSUMED as CONSUMED/WASTED. Undo/correction is a new event returning to ACTIVE,
  never modification of historical events; detailed service/tests follow in later slices.
- Current status timestamps reflect the current outcome: clear incompatible timestamps on transitions.
  Archiving is independent of outcome (`archivedAt`), so removal does not invent a waste event.
- Events snapshot category, quantity, cost source/value, currency, expiry and household timezone.
  Editing current inventory cannot rewrite prior financial history. Analytics must handle correction
  events to reverse the earlier outcome rather than sum every historical transition blindly.
- An optional idempotency key is unique within a household across its events. The future service
  must check that a replay represents the same item/action/payload; reject conflicting reuse.
- Normal inventory deletion is archival. Hard purge is reserved for explicit account/data deletion,
  with dependent item/events then receipts/preferences/members deleted in a transaction before the
  household. Restrictive receipt/creator links prevent accidental deletion of referenced history;
  purge ordering must be tested before the deletion endpoint is implemented.

## Database boundaries versus service guarantees

The schema defines IDs, enum types, required values, foreign keys, unique constraints and indexes.
Composite foreign keys ensure events and receipt-linked items cannot reference another household's
item/scan, and receipt creators must belong to the scan's household. Duplicate item names/barcodes
are deliberately allowed for separate purchases; lookup indexes do not make them unique.

Foreign keys are **not authorization**. The future service must resolve membership from verified
identity and include household ID in every owned query. Do not accept body userId as authority.
MVP bootstrap must atomically create household/member/preferences and handle the unique-account
race; no signup hook or database endpoint is added here.

The next migration must add SQL CHECK constraints, because these rules are not enforced by this
Prisma schema alone: positive quantity; nonnegative nullable costs; cost-source/null consistency;
positive preset days and required preset for estimated expiry; nonempty trimmed names/unit;
valid reminder HH:mm; consistent status timestamps. Validate matching rules on the backend too.
Validate supported currency, IANA timezone, input lengths, calendar dates, decimal precision and
safe candidate/event JSON at the request boundary. Treat provenance as reviewed user input, not
proof that OCR read a manufacturer date. No status trigger or append-only enforcement is installed;
service transaction tests and scoped DB permissions remain work to complete.

## Receipt retention and later integrations

The model stores no image blob or raw OCR text. A temporary private object key/deadline supports
later processing; detectedItems holds only bounded, validated candidates needed for review. Planned
Phase 6 policy: delete originals after processing (success/failure), with a 24-hour recovery deadline
and retryable cleanup for failed deletions; clear candidates after import/cancellation. A timestamp
alone does not delete anything. Cleanup, storage permissions, import idempotency and provider calls
are not implemented in Phase 3 item 1. Account deletion also requires provider cleanup later.

## Verification and next step

Checks/results for this slice are recorded in README. Prisma format/validate and offline SQL diff
check the installed tooling's model/relationship interpretation without connecting to Neon. They do
not establish that migrations apply, connection credentials work, cross-household APIs are blocked,
or runtime events are atomic. No migration/seed/generated client/API integration was performed.

Next: Phase 3 item 2 — review a development-only initial migration (including the checks above),
verify the development target and live connection, add the Prisma singleton and guarded seed, and
test migration application. Do not alter managed auth tables or seed production.

References: [PostgreSQL native-type mapping](https://docs.prisma.io/docs/orm/v6/overview/databases/postgresql),
[Prisma compound constraints](https://docs.prisma.io/docs/orm/v6/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints).
These reference pages are version 6; the actual contract is validated locally with installed 5.22,
without adopting newer configuration/generator APIs or changing the installed version.
