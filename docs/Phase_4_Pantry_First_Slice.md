# Phase 4 — household Pantry list and manual add

12 October 2026. User approved Phase 4. The first slice is implemented and deployed to development;
iPhone acceptance is pending. No production database/auth settings, Prisma schema/migration,
dependency version or supplied primary navigation changed. Phase 5 has not started.

## Implemented

- Signed-in native Pantry uses a session-scoped real-data provider. Opening it calls the existing
  idempotent household setup, then lists that household's active, unarchived items. Explicit demo
  mode retains its existing mock inventory, swipes, edits, scanner flows and USD styling.
- `GET /api/v1/pantry?page=1&pageSize=50` uses bounded pagination and deterministic nearest-expiry/ID
  ordering. `GET /api/v1/pantry/:itemId` returns a scoped item for read-only detail viewing.
- `POST /api/v1/pantry` validates name/category/quantity/unit/date/whole-entry cost. Identity and
  household come from server-verified JWT membership, never request fields. Manual dates are user
  entered; expiry days use the existing server-side household calendar calculator.
- Item insertion and CREATED snapshot event share a serializable transaction. A household-scoped
  `Idempotency-Key` and normalized-request hash return the same item on unchanged retries; changed
  payloads with the same key return 409. Conflict retries are bounded; event failure rolls back the item.
- Mobile API calls live in `lib/pantryApi.ts`; loading, retained-data error, refresh, load-more, empty,
  save feedback and read-only details are connected. Provider state resets with identity/demo scope;
  stale/unmounted work is ignored and token retrieval checks its session scope.
- Existing Pantry header, search/chips/banner, card and form designs are reused. Real data uses INR
  paise, exact decimal quantity text and Asia/Kolkata. Unknown cost remains null and displays Unknown
  value; explicit zero is free. Existing demo dollar fixtures are unchanged.

The first slice only supports active items and expiry ordering on the server. Search, category,
freshness and alternate sorts currently apply to loaded pages, clearly labelled in the Pantry banner.
Loaded known value is not a whole-household aggregate. Load More reads the next 50 rows; Refresh resets
to the first page. Unavailable lifecycle/batch actions are hidden on the real Pantry rather than
mutating mocks. Real detail editing, Used/Wasted, presets and scanner imports remain later slices.
Home/Scanner/Recipes/Insights and preferences remain labelled prototypes; their mock actions do not
write into the connected Pantry. The manual-add route, including Scanner's manual fallback, does.

## Deployment

- Vercel Preview: https://freshtrack-jms1l4bt1-dragon-2818.vercel.app
- READY deployment `dpl_5Kq7Vy9mmjXV72xCwXHSZnYW7J4U`; existing dedicated development API project.
- Build validates Preview target, generates installed Prisma 5.22 and compiles TypeScript; no migration
  or seed runs. Existing Preview-only database/Auth variables and access policy are preserved.
- Ignored mobile `.env.local` points at the new public HTTPS URL. Auth URL/origin are preserved;
  Expo restarted on port 8085. No secret or hosting bypass token goes to mobile.

## Checks and actual results

| Command / check | Result |
|---|---|
| Mobile/backend `npx tsc --noEmit`, backend `npm run build` | Passed |
| `node --experimental-strip-types --test tests/*.test.mjs` | 76/76 passed, existing module-type warnings |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/deployment.test.cjs tests/pantry.test.cjs` | 33/33 passed |
| Backend `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/pantry.integration.test.cjs` | 3/3 passed: fresh-client persistence, exact values/event, retries/conflict, sorting/pagination/isolation, rollback; temporary households cleaned |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-phase4-pantry-export` | Web/iOS/Android passed, 34 static routes |
| Final export to `/private/tmp/freshtrack-phase4-pantry-export-final` after session-scope guard change | Web/iOS/Android passed, 34 static routes |
| `npx --yes vercel@latest deploy --yes --target preview --logs` from backend | Cloud Preview build/deploy passed |
| Public new Preview fetch checks | Health200; tokenless list/detail401 |
| Backend `npm run lint` | Existing exit127: ESLint absent; mobile has no lint script |
| `git diff --check` and tracked/untracked source credential/config review | Passed; no non-example env files or credential-bearing Neon URLs included |

Network/HTTP server tests ran with approved escalation. Full cloud install still reports the previously
documented 36 development-tool audit findings; no dependency upgrade/audit fix was attempted.
Tests are evidence for the API/client boundaries, not proof of iPhone form interaction or hosted writes.

## Native acceptance and remaining work

Pending user checks: add Milk (0.5 l, ₹60.50), details, restart persistence, refresh without duplicates,
then add earlier-expiry Apples with unknown price and confirm expiry sorting. These are intentional
development-account records, separate from synthetic test fixtures.

Save retries reuse a key while the unchanged form remains mounted; retry keys and unsaved forms are
not persisted across app termination. Reads retain already-loaded items on failure within the session;
disk-backed offline inventory/queued mutations are not implemented. Login/session offline policy from
Phase 2 still blocks private navigation when provider verification cannot complete.

Next: resolve any iPhone acceptance failures, then the next Phase 4 slice: persisted editing and
confirmed Used/Wasted actions with transactional history. Remaining Phase 4 also includes server-wide
filters, presets/expiry precedence, duplicate handling, offline/retry coverage and final review.
Android/Phase 1 visual QA and production/signing checks remain deferred.

References reviewed: [Prisma v6 transaction API](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions)
(cross-checked against installed 5.22 and live tests; no upgrade/newer API),
[Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
