# Phase 9 — receipt transaction reliability

21 October 2026. A bounded development investigation and receipt-import fix; not a claim that all database/network failure modes are resolved.

## Observed failure

The read-only development readiness check passed. The unchanged maximum-haul integration check then failed on the existing development branch. A temporary local Prisma transaction observer recorded only operation labels, elapsed milliseconds, model-call counts and validated driver codes; it did not print query arguments, exception messages, connection strings, subjects or receipt contents.

The first 50-item import completed in 5,291 ms with 104 model calls. Importing the same haul as explicitly separate purchases subsequently failed with `P2028` after 10,044 ms and 137 calls, last at `pantryItem.create`. The configured interactive-transaction timeout is 10,000 ms. This reproduces a transaction-budget failure on that path. It does not establish the cause of the earlier intermittent initial read-only receipt-review failure, which did not reproduce in the passing runs below. Failed-run fixture cleanup completed and its scoped absence assertions passed.

## Change

- Import still counts existing duplicates in the same serializable, household-scoped transaction, but does not fetch preview cards that import never returns. The review endpoint continues to provide those cards.
- Items use `createManyAndReturn`, available in the installed Prisma 5.22 client. History uses `createMany` in the same transaction. No `skipDuplicates` or partial import is used.
- Server-generated item UUIDs map returned rows back to canonical receipt row IDs. Database return order cannot swap grocery values, event identities or retry keys.
- Existing expiry provenance, exact zero/unknown/paid costs, quantity, receipt linkage, current-status replay and request hashes are preserved.
- The 50-item bound, 10-second timeout, 5-second acquisition wait, serializable isolation, four-attempt conflict handling and public API contracts are unchanged. No new connection retry or larger timeout is introduced.

References: [Prisma CRUD and bulk-return support since 5.14](https://docs.prisma.io/docs/orm/v6/prisma-client/queries/crud), [transaction boundaries and time limits](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions). The local generated 5.22 types/build and live PostgreSQL tests additionally verify compatibility; Prisma was not upgraded.

## Evidence

| Check | Actual result |
|---|---|
| `node --env-file=.env scripts/database.cjs check` in backend | Pass; development target ready, managed Auth schema unchanged |
| Original maximum-haul test, with temporary safe observer | Fail, 0/1; `P2028` at 10,044 ms; fixture cleanup passed |
| Modified isolated receipt integration suite | 10/10 pass; fixture cleanup passed |
| `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/households.integration.test.cjs tests/pantry.integration.test.cjs tests/receipt-import.integration.test.cjs tests/analytics.integration.test.cjs` in backend | 43/43 pass; scoped fixture cleanup passed |
| `node --test backend/tests/receipt-bulk.test.cjs` | 3/3 pass: shuffled return association/provenance, duplicate guard and incomplete-return protection |
| `npm run lint` in root and backend | Both pass, zero warnings |
| `npx tsc --noEmit` in root and backend | Both pass |
| `npm test` in backend, including build and health | 163/163 pass |
| `node --experimental-strip-types --test tests/*.test.*` in root | 386/386 pass |
| `git diff --check` | Pass |

The integration commands also loaded the temporary observer with `--require /private/tmp/freshtrack-db-observe.cjs`; it did not modify application code, transaction options or inputs. Logs are local `/private/tmp/freshtrack-db-{baseline,batched,combined}.log`. The normal commands above exercise the same service without instrumentation.

For the isolated modified run, the successful 50-item new/separate imports took 815/563 ms with six model calls each. The combined run measured 726/737 ms on successful attempts. These are individual development measurements, not a latency SLA or a production benchmark. Model-call counts exclude Prisma's internal transaction-control statements. The combined suite encountered `P2034` serialization conflicts and existing bounded retries recovered; that behavior is not hidden as a first-attempt success. The read-only 50-match review still uses 52 model calls (about 2.5 seconds here); further optimization, if needed, is separate.

Rollback tests now deliberately violate the second/last event foreign key after checking that all items exist inside the transaction. They assert real `P2003` failure and then zero receipt/item/event counts outside the rolled-back transaction, including for 50 groceries. Existing tests verify one receipt and exactly one CREATED event per item under concurrent first submission, reordered replay and explicit separate-purchase import. New fast tests guard row-to-event association when bulk results are shuffled.

An initial backend test attempt was blocked by sandbox localhost `listen EPERM` (113 pass/50 fail); rerunning with listener permission passed all 163. Root has no `npm test` script; that attempted command reported Missing script, and the explicit Node command above passed. An initial new fast-test fixture omitted required nullable expiry-selection fields; the fixture was corrected, then all three passed. These were not suppressed application failures.

## Scope and remaining work

Only disposable, uniquely scoped development integration fixtures were created/deleted. No schema/migration, provider/Auth setting, credential, production deployment or existing household groceries were changed. Mobile/UI/native dependencies were unchanged; Expo exports/Doctor/native rebuild and phone tests were not repeated for this server-only change.

The earlier generic read-only failure remains unattributed. Passing bounded reruns do not prove universal database availability or hosted authenticated reliability. Upstream mobile advisories and remaining personal-use installation/update, network/failure-path and Android runtime acceptance remain open. No store publishing.

## Development deployment and next step

Deployed only the existing dedicated Vercel development Preview using the cached CLI: `vercel deploy --yes`. Build validated its existing development target without migrations. Ready URL: `https://freshtrack-k8b7wkr5p-dragon-2818.vercel.app`.

Public probes: registered `/api/v1/health` 200; anonymous receipt import 401; oversized receipt body 413. All return `Cache-Control: no-store`. An initial probe of unregistered `/health` correctly returned 404; the subsequent registered health probe passed. These probes do not establish hosted authenticated import acceptance.

Updated only the ignored root `.env.local` public API URL, preserving Auth configuration. Restarted the existing Metro port8087 with the existing native identifier and diagnostics disabled; actual served iOS manifest and bundle return200 and the bundle contains this Preview URL. No native rebuild or new phone checklist for this server-only slice.

Next: personal-use build readiness review, preserving existing user data and recording clean-install/update/network acceptance gaps. Keep the earlier unattributed read-only availability failure and upstream advisory work open; do not call Phase9 or final security acceptance complete. No App Store publishing.
