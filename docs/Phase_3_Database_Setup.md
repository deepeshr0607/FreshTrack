# Phase 3 item 2 — Development migrations, client and seed

11 October 2026. Completed on FreshTrack's existing Neon **development** branch, not production.
The mobile kitchen remains a mock prototype. Household bootstrap/API authorization was subsequently
completed in [item 3](Phase_3_Household_Access.md).

## Target verification and migration

Neon Console's branch overview and Computes page confirmed project `wandering-scene-09436593`,
branch `br-long-glade-b3ovlfn0` (`development`) and endpoint `ep-dry-paper-b3ftfkqd`. The public
metadata in `backend/prisma/development-target.json` pins local mutation tools to that target;
it contains no credentials. Database URLs remain only in ignored `backend/.env` (0600).

Read-only direct-connection preflight succeeded and found **zero public application tables**.
Generated/reviewed `20261011000100_application_foundation` offline from the existing Prisma 5.22
schema, then applied it using `prisma migrate deploy` through the guarded wrapper. This created
six application tables, enums, relationships/indexes, SQL CHECK constraints and Prisma's migration
ledger. Explicit BEGIN/COMMIT makes the initial application DDL atomic. No reset, db push, shadow
database or provider-table migration ran. Managed auth schema columns/indexes/constraints were
fingerprinted before/after and were unchanged; no provider user/session rows were read.

The checks enforce positive quantities, nonnegative/provenanced costs, INR, nonempty names/unit,
estimated-expiry preset requirements, consistent outcome timestamps, event transition shape,
reminder HH:mm/date format and receipt image/import timestamp consistency. Composite foreign keys
enforce household consistency for events, receipt items and scan creators. They do not replace
membership authorization on future APIs. Input validation, status service transactions and
append-only permissions are still pending; no service or trigger guarantees immutable events yet.

## Local commands

Run from `backend/`, using Node **20.12+** (this machine ran 24.21). Native `--env-file` loads the
ignored local environment without a new dotenv dependency. Exported environment values take
precedence. Both NODE_ENV and APP_ENV must be development, VERCEL_ENV absent; pooled/direct
URLs must match the pinned endpoint/database/role/credentials with required TLS and public schema.
Unrecognized/duplicate connection options and another Auth endpoint are rejected.

```bash
npm run db:generate
ALLOW_DEVELOPMENT_MIGRATIONS=true npm run db:migrate
npm run db:status
npm run db:check
ALLOW_DEVELOPMENT_SEED=true npm run db:seed
npm run test:database
ALLOW_DEVELOPMENT_DATABASE_TESTS=true npm run test:database:integration
ALLOW_DEVELOPMENT_SEED=true npm run test:seed:integration
```

`db:migrate` applies already-reviewed migration files with deploy; it does not generate migrations
or automatically seed. `db:check` builds the existing backend and checks direct connectivity plus
pooled reads of all six application models. It outputs only readiness, never records or driver
errors. It is a CLI readiness check, not a public health/API endpoint change.

Prisma singleton (`backend/src/lib/prisma.ts`) reuses the client for development hot reload and
disables query/error payload logs. CLI clients disconnect on completion. Generate the client before
typechecking/building a fresh checkout. No additional dependency or installed Prisma version change.

For later schema changes, create/review a new migration on an isolated development database,
including explicit SQL checks that Prisma PSL cannot express. Never reset the Neon Auth branch to
resolve drift. Preserve committed migration files once applied. `db:migrate:deploy` remains the raw
production/CI Prisma command; it is not the development wrapper and has not been run against
production. Production setup/deployment remains a separate authorized task. The local guard prevents
accidental fixture writes, not a determined operator with credentials from bypassing the CLI.

## Development-only seed

Two fixture households with reserved `freshtrack-dev-seed:manager-a/b` subjects are stored in
development. Each has one manager, reminder preferences, a 0.5 l milk entry worth **6050 paise
(₹60.50)** and one CREATED event. These are synthetic database fixtures, not Neon accounts; they
are not linked to the user's tested email and do not populate the app. USD demo records are untouched.

The seed requires explicit consent plus the target/environment guard before opening a connection,
uses deterministic IDs and a transaction, refuses identity collisions and never overwrites existing
rows on replay. Seed is not automatically invoked on migrations/builds/startup. No seed hook is
registered for Prisma resets. Replaying it twice produced the same records/timestamps with no
duplicate events. Two rows remain in each of Household, HouseholdMember, UserPreference, PantryItem
and PantryItemEvent for the reserved fixture households; no ReceiptScan fixture is inserted.

Integration tests create separate `freshtrack-dev-test:` records inside transactions, always roll
back and disconnect. The seed verification confirms none of those temporary memberships remain.
The persistent seed fixtures remain intentionally; tests do not purge user data.

## Commands and actual results

| Check | Actual result |
|---|---|
| Installed Prisma offline migration diff/review | Passed; six tables, atomic DDL, no destructive/provider DDL |
| `prisma generate` / `prisma validate` | Passed with existing 5.22.0 |
| Read-only preflight | Passed outside sandbox; zero public application tables before migration |
| `ALLOW_DEVELOPMENT_MIGRATIONS=true npm run db:migrate` | Passed on pinned development branch; auth structure unchanged |
| `npm run db:status` / `npm run db:check` | Passed; direct connection and pooled application reads work |
| `ALLOW_DEVELOPMENT_SEED=true npm run db:seed` | Passed; two synthetic households |
| `npm run test:database` | 4/4 passed, including production/missing-consent rejection before DB access |
| Rollback-only `test:database:integration` | 14/14 passed |
| `test:seed:integration` | 1/1 passed; two replays identical, no leftover transaction fixtures |
| Root and backend `npx tsc --noEmit` | Both passed |
| Root strip-types tests | 70/70 passed |
| Backend `npm run test:auth` / health tests | 9/9 and 1/1 passed |
| Backend `npm run lint` | Pre-existing exit 127: ESLint not installed; mobile has no lint script |
| `git diff --check`, modified-file credential/debug review, CJS syntax checks | Passed; only URL match was the dummy guard-test fixture |

The first live CHECK tests failed because Prisma 5 exposes SQLSTATE 23514 as an UnknownRequestError;
the test classifier was corrected and the same checks then passed. No migration changes were needed.
The initial sandbox connection was blocked; network checks were rerun with approved escalation.
Existing Node module-type warnings remain. No mobile/config changes, so Expo Doctor/export/device
checks were not repeated. Database tests demonstrate structural integrity, not a household-isolated
HTTP API or production readiness.

## Next step

Item 3 household bootstrap and protected read-only access/isolation tests are now complete.
Next: Phase 3 item 4 shared API contracts/helpers, then deployment configuration and final review.
Pantry CRUD/UI persistence belongs to Phase 4; receipt/AI
providers and deletion/retention workers remain later work.

References: [Prisma migration SQL customization](https://www.prisma.io/docs/orm/v6/prisma-migrate/getting-started),
[deploy versus development migrations](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production).
These version 6 reference workflows were checked against installed 5.22 CLI behavior; no newer
Prisma configuration or migration APIs were adopted.
