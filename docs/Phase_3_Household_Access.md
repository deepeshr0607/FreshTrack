# Phase 3 item 3 — Authenticated household access

Completed on development, 11 October 2026. Mobile remains a mock kitchen; it does not yet call
these endpoints. No real account enrollment, production migration/deployment or provider changes ran.

## API contract

All routes require the existing verified Bearer JWT middleware and return `Cache-Control: no-store`.
The subject comes from verified claims, never a client userId, header or body field.

| Endpoint | Behavior |
|---|---|
| `POST /api/v1/households/current` | Explicit, repeatable setup; returns 200 for both new and existing household |
| `GET /api/v1/households/current` | Reads existing membership; never creates data |
| `GET /api/v1/households/:householdId` | Reads only a household containing the verified subject |

POST accepts no body or empty JSON `{}`. Query options and extra payload fields are rejected.
GET accepts no body. IDs must be canonical UUID-shaped strings; uppercase is normalized.
Success is `{ data: { household } }`, with id, name, currencyCode, timezone, UTC ISO createdAt/updatedAt,
the caller's membership role and preferences (notificationEnabled, preferredNotificationTime, dateFormat).
No auth subjects, member IDs or other members' preferences are returned.

New households are `My Kitchen`, `INR`, `Asia/Kolkata`, with one `MANAGER` membership and schema-default
preferences. Setup preserves existing choices and repairs missing preferences. No preferences-edit
endpoint, sharing, Pantry CRUD or mobile enrollment hook is included.

Errors use `{ error: { code, message, requestId } }`: 401 `UNAUTHORIZED`, 400 `INVALID_REQUEST` or
`INVALID_HOUSEHOLD_ID`, 404 `HOUSEHOLD_NOT_FOUND`, and safe 503 `HOUSEHOLD_UNAVAILABLE` for database failures.
Foreign and unknown households have the same 404 response; raw driver details are never returned.

## Atomicity and isolation

Setup uses a serializable interactive transaction to resolve/create membership, create a household
when needed, upsert preferences and read the response. A unique authSubject enforces the MVP's
one-household-per-account rule. Rollback removes partial writes. Up to four attempts retry serialization
conflicts or authSubject uniqueness races, with bounded backoff; unrelated failures do not retry.

Reads include membership in the database predicate, rather than fetching a household then checking
ownership. Removing membership blocks subsequent reads even with the same valid JWT. This does not
revoke the provider JWT or ban the account; explicit setup can create a new household if membership
is absent. The accepted MVP policy for already-issued JWTs (up to about 15 minutes) is unchanged.
Future Pantry queries and mutations still need their own membership-scoped service and transaction tests.

## Verification

Commands were run from the repository root unless a backend working directory is stated.

| Command/check | Actual result |
|---|---|
| Mobile `npx tsc --noEmit` | Passed |
| Backend `npm run build` and `npx tsc --noEmit` | Passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 70/70 passed |
| Backend `npm run test:households` | 6/6 passed |
| Backend `ALLOW_DEVELOPMENT_DATABASE_TESTS=true npm run test:households:integration` | 5/5 passed |
| Backend final `node --test tests/households.test.mjs tests/auth.test.mjs` | 15/15 passed (6 household, 9 auth) |
| Backend final `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/households.integration.test.cjs` | 5/5 passed |
| Backend `npm run test:database` | 4/4 guard tests passed |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| Backend `npm run lint` | Existing exit 127: ESLint absent; mobile has no lint script |
| `git diff --check` | Passed |

Live tests require the pinned development target and explicit consent. They use random synthetic
subjects, real development Prisma transactions, and locally generated Ed25519 JWTs against an injected
JWKS verifier. They do not prove a fresh Neon-issued account/native enrollment flow. Six concurrent
setup calls produced one household; repeat setup preserved preferences; injected failure rolled back
partial writes; signed account A/B requests could not read each other's household. Temporary records
were removed with cleanup assertions. Existing synthetic seeds and real accounts were preserved.

The first health run exposed eager JOSE loading after Prisma loaded the backend environment.
Lazy JWT-library loading fixed that regression; auth and health reruns passed. Existing Node module-type
warnings remain. No mobile/config changes, so Expo Doctor/exports/device checks were not repeated.
No new dependencies, schema edits or migration were needed.

## Next step

Phase 3 item 4: shared protected API contracts, pagination, date/money serialization and expiry/status
helper tests. Deployment configuration and final Phase 3 review follow. Phase 4 Pantry persistence
and later OCR/recipe/notification integrations remain outside this slice.

References: [Prisma transaction isolation and retries](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions),
[Prisma client errors](https://www.prisma.io/docs/orm/v6/reference/prisma-client-reference).
These version 6 references were checked against installed Prisma 5.22 and actual development tests;
the installed version and configuration were preserved.
