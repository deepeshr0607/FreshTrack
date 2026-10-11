# Phase 3 item 4 — Shared API contracts and inventory rules

Completed 11 October 2026. This slice preserves existing endpoint paths and JSON envelopes,
Prisma 5.22/schema, Expo configuration and supplied UI. No dependency or migration was added.
Mobile remains a mock kitchen; household enrollment/Pantry persistence is not connected.

## Shared contracts and errors

`types/api.d.ts` contains mobile/backend type-only JSON contracts: success/failure, verified identity,
household DTO, paginated responses, pantry statuses and entry costs. It imports no database/native
module and emits no runtime code. Both TypeScript projects consume it without changing their roots.
Types describe the wire format; they do not validate untrusted JSON by themselves.

Existing health/auth/household success responses use `success(data)`; auth, household, 404, rate-limit
and global errors use `sendFailure`. Responses remain `{ data: ... }` or
`{ error: { code, message, requestId } }`. Request IDs remain server-generated before parsing/CORS.
An `InvalidApiInput` reaching the global boundary returns safe 400 `INVALID_REQUEST`; internal
validation diagnostics are neither returned nor logged. Existing parser/CORS/auth/unavailable codes
and protected `no-store` behavior are preserved. Household queries still require verified membership.
The mobile backend-identity checker uses the shared identity response type; its runtime match check
and network behavior are unchanged.

## Pagination for future list endpoints

| Rule | Contract |
|---|---|
| Query | `page`, `pageSize`, each a single positive decimal integer string |
| Defaults | page 1, pageSize 20 |
| Bounds | page 1–100,000; pageSize 1–100 |
| Offset | `(page - 1) * pageSize` |
| Response | `{ data: { items, pagination: { page, pageSize, total, totalPages, hasNextPage } } }` |
| Empty result | total 0, totalPages 0, hasNextPage false |
| Beyond last page | retain requested page; no next page; endpoint returns empty items |

`parsePagination` accepts raw `URLSearchParams` so duplicate/nested/prototype query keys cannot be
normalized away. It rejects unknown keys, empty values, leading zeros, signs, fractions, exponential
notation and oversized inputs. Future routes with filters must validate the complete allowed query
first and then pass only their pagination fields to this helper. No list endpoint is introduced here;
household endpoints continue rejecting all query options. Future list and count queries must share
membership/household/filter predicates and a stable ordering with a unique ID tie-breaker. Offset
pagination does not promise a snapshot while concurrent inventory changes occur.

## Date, quantity and money serialization

- Calendar dates are strict Gregorian `YYYY-MM-DD`, years 0001–9999; impossible dates are rejected.
  Prisma date-only values serialize from midnight UTC without a device-local conversion.
- Timestamps serialize as UTC ISO strings, with milliseconds; invalid/out-of-range years are rejected.
- Household calendar dates use an explicit validated timezone, Gregorian calendar and Latin digits.
  Expiry remains valid through its local expiry day and becomes overdue on the next local day.
  Day differences use calendar dates, so DST does not introduce fractional days.
- Display freshness tiers match the existing prototype: negative days expired; 0–1 critical;
  2–6 caution; 7+ fresh. This date-only display is not an exact 48-hour recipe window. Recipe selection,
  notification scheduling and package/user/preset date selection remain later integration work.
- Quantity is positive decimal text within Decimal(12,3), maximum `999999999.999`. Trailing fractional
  zeros normalize away. Pass Prisma Decimal's `toString()` to `quantityString`, never `toNumber()`.
  Numeric JSON quantities, exponent notation and extra precision are not accepted by this contract.
- Money is integer INR paise, nullable for unknown, maximum 2,147,483,647 per database field.
  `rupeesToPaise('125.50')` returns 12550 using integer arithmetic; extra decimal precision is rejected.
  `paiseToRupees(12550)` returns `125.50`. UI currency formatting is separate.
- `serializeCost` preserves unknown (`null`), known free (`0`) and estimated costs. UNKNOWN requires
  both costs null; PURCHASE/ESTIMATE require a total. Total cost remains authoritative and is never
  derived by multiplying a unit cost and quantity. No exchange-rate conversion is included.

## Status policy

`planStatusTransition` is pure; it does not write or append events.

| Current | Permitted actions |
|---|---|
| ACTIVE | consume, waste, assume, restore (restore is a no-op) |
| CONSUMED | consume (no-op), restore |
| WASTED | waste (no-op), restore |
| ASSUMED_CONSUMED | consume, waste, assume (no-op), restore |

Repeating an outcome returns `changed: false`; a future service must avoid another event for that
repeat. Changing a confirmed outcome requires explicit restoration first. Assumed outcomes remain
unconfirmed; expiry calculation never changes status. Authorization, overdue/consent eligibility for
system assumptions, archived-item handling and idempotency payload matching belong to future services.
Status writes, compatible outcome timestamps and immutable event snapshots must share a transaction.
This helper alone does not guarantee persisted idempotency or historical analytics correctness.

## Actual verification

| Command (backend working directory unless marked root) | Result |
|---|---|
| Root and backend `npx tsc --noEmit` | Both passed |
| `npm run build` | Passed |
| `npm run test:foundation` (final) | 10/10 passed |
| `node --test tests/foundation.test.cjs tests/auth.test.mjs tests/households.test.mjs` | 25/25 passed (10 foundation, 9 auth, 6 household) |
| `npm test -- --runInBand` | Health 1/1 passed |
| `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/households.integration.test.cjs` | Live development 5/5 passed; cleanup asserted |
| `npm run test:database` | Development guards 4/4 passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 70/70 passed |
| `npm run lint` | Existing exit 127: ESLint absent; mobile has no lint script |
| `git diff --check` | Passed |

Tests cover malicious/ambiguous pagination, paise limits and exact round trips, cost provenance,
Prisma Decimal quantities, invalid calendar dates, Kolkata midnight, leap days, DST, all status/action
pairs, safe validation responses, existing authentication/error envelopes and live household isolation.
The localhost HTTP checks initially failed with sandbox EPERM; approved reruns passed. Two initial
npm script invocations used the root directory (which has no build/foundation scripts); corrected
backend commands passed. Existing Node module-type warnings remain. Expo Doctor/exports/native checks
were not repeated: no native/runtime mobile/UI changes. Live tests use synthetic identities/local
signing keys as documented in item 3, not fresh provider/native enrollment. No production changes ran.

## Next step

Phase 3 item 5: Vercel deployment/environment configuration and readiness review, followed by final
Phase 3 acceptance/checkpoint. Phase 4 Pantry endpoints, mutation/event transactions and mobile
persistence remain outside this slice.

References: [Intl date parts and explicit timezone](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts),
[Prisma PostgreSQL native types](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql).
Actual Decimal/date behavior was checked using installed Prisma 5.22; no version upgrade was made.
