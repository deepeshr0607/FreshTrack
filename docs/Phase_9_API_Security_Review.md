# Phase 9 — API authentication and household-access review

20 October 2026. Targeted source review, HTTP regressions and development database checks; not an independent penetration test or complete Phase 9 security acceptance.

## Findings and focused fix

The registered data routes derive identity from a verified Neon JWT. The verifier pins server-configured issuer/audience, EdDSA keys, verified email and a maximum token age of fifteen minutes. Client identity/household headers do not select an account. Identity/body/query overrides are rejected on data endpoints; `/auth/me` deliberately ignores selectors and returns only the verified identity. The deleted-account guard blocks application access while allowing deletion recovery.

Pantry mutations resolve membership inside a serializable transaction, scope item reads to that household and current membership, and append events transactionally. Foreign or missing items return the same not-found response. Mixed-household batches reject before writes. Manual/receipt retry keys are household-scoped; receipt request hashes also include the verified subject. Chef queries are membership-scoped; recipe details must belong to current suggestions. Analytics SQL uses parameterized household/subject values and membership predicates. Account deletion resolves its own sole household and blocks shared-household deletion. No cross-household bypass was demonstrated by the reviewed paths/tests; this is a bounded finding, not a claim of universal security.

One request-processing gap was confirmed: the global rate limiter followed two 10 MB body parsers. Malformed requests therefore bypassed its accounting, and the API accepted an unnecessarily large parsing budget despite receipt images staying on-device.

`backend/src/app.ts` now:

- Runs the existing 120 requests/minute global limiter before body parsing, including malformed requests.
- Limits JSON and legacy form parsing to 128 KiB. Form parsing uses flat fields and at most 100 parameters. Current writes still require JSON.
- Rejects compressed request bodies rather than inflating them. FreshTrack's JSON client does not compress requests.
- Sets `Cache-Control: no-store` before CORS, parsing and authentication, including early errors.

Existing route validation, retry contracts, safe error envelopes and server-owned request IDs are unchanged. Oversized input returns 413; unsupported compression returns 415; malformed JSON returns 400. These expose only fixed safe messages/codes, never the body, bearer token or driver/provider error. A fifty-item multilingual receipt with provenance and duplicate choices still passes HTTP validation. No mobile UI, schema, native dependency or real household changes were required.

## Protected route inventory and ownership boundary

| Methods and paths under `/api/v1` | Ownership/selection |
|---|---|
| GET `/auth/me` | Verified JWT identity only; no household selector |
| GET/POST `/account/deletion` | Verified identity, its deny marker and sole membership; deletion recovery intentionally bypasses the active-account guard |
| POST `/households/current`; GET `/households/current`, `/households/:householdId` | Verified subject; requested household must contain that member |
| GET/POST `/pantry`; GET/PATCH `/pantry/:itemId` | Membership-derived household; foreign details/edit inaccessible; retry scope derived server-side |
| POST `/pantry/:itemId/consume`, `/waste`, `/undo-status` | Same membership/item scope; confirmed optimistic version, transactional event and retry checks |
| POST `/pantry/batch-outcome`, `/batch-undo` | All selected IDs must belong to current household before writes |
| POST `/pantry/duplicate-check`, `/receipt-review`, `/receipt-import` | Validated reviewed fields, current household only; no raw OCR/image endpoint |
| GET `/chef/expiring`; POST `/chef/suggestions`, `/filters`; GET `/chef/recipes/:recipeId` | Current membership/inventory; suggested recipe IDs rechecked; only ingredient names reach provider |
| GET `/analytics/summary`, `/series` | Current membership, parameterized scoped event SQL; no client household selector |
| GET `/scanner/barcodes/:barcode` | Authenticated generic catalog lookup, no household read/write; barcode follow-up remains deferred |

Total: **25 protected method/path pairs**. Health is public; unknown/unsupported routes remain 404. This inventory covers registered endpoints rather than unimplemented endpoints in the original plan.

## Automated evidence

Eight new tests in `backend/tests/security-boundaries.test.mjs` exercise the real app/router/auth middleware with local signed JWTs, injected services and disposable test listeners:

1. All 25 routes reject missing credentials, malformed tokens, wrong signing keys, expired tokens, unverified email and wrong audience before data/provider services run (150 rejection requests).
2. All routes fail closed on verification outage; deleted accounts only reach deletion recovery.
3. Valid signed identity reaches all routes; spoofed identity headers never select the owner. These service spies test routing/identity forwarding, not database ownership by themselves.
4. Query/body identity overrides fail before data access. `/auth/me` returns only the verified identity even with selectors.
5. Actual Pantry service foreign details/edit/Used/Wasted/Undo and mixed batches stop before item writes, event creation or event replay, using an asserted scoped query fixture.
6. Oversized/compressed/malformed input has redacted responses and structured logs before verification/service access.
7. Malformed bodies consume global quota; the 121st request returns 429 before parsing, with Retry-After.
8. A full fifty-item multilingual reviewed receipt reaches ordinary validation under the limit.

The first focused run passed 7/8: the combined override test reached the existing per-account recipe rate limit (429) while expecting validation (400). Isolating those validation cases from their quota fixed the test setup; no production quota was weakened. Final focused result: **8/8**.

| Fresh command/check | Actual result |
|---|---|
| Root `npx tsc --noEmit` | Pass |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 384/384 pass |
| Backend `npx tsc --noEmit` and `npm run build` | Pass |
| Backend Node non-integration `*.test.cjs`/`*.test.mjs` suite | 159/159 pass, including the eight new tests |
| Backend `npm test -- --runInBand` | Health 1/1 pass |
| `node --env-file=.env scripts/database.cjs check` | Development database ready; Auth schema unchanged (schema metadata fingerprint only) |
| Guarded live household/Pantry/receipt/analytics suite | 42/43 pass in combined run; maximum-haul receipt check failed with a safe database failure. No root cause proven by that error label. |
| Isolated receipt suite | 9/10 pass: maximum-haul check passed; initial read-only review failed with the same safe database failure label. Cleanup completed without a reported failure. |
| Targeted read-only receipt-review retry | 1/1 pass with scoped fixture cleanup; this does not turn either preceding suite run into a full pass. |
| Backend `npm audit --omit=dev --json` | Zero reported runtime advisories |
| Backend `npm audit --json` | 36 reported development-tree advisories: 31 high, 5 moderate, 0 critical. Full audit returns nonzero; summary extraction is read-only. |
| `git diff --check` | Pass |

Combined live command: `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/households.integration.test.cjs tests/pantry.integration.test.cjs tests/receipt-import.integration.test.cjs tests/analytics.integration.test.cjs`. Household5, Pantry16, receipt10 and analytics12 checks total43. Analytics uses synthetic CTEs shadowing application tables; other suites create uniquely scoped development fixtures and run cleanup assertions. No test uses a real account's groceries. The combined run's cleanup hooks completed without a reported cleanup failure. The isolated initial review was retried with `--test-name-pattern='review reads only'`:1/1 passed; the intermittent failure remains recorded. The maximum-haul reliability result remains explicitly separate from access-control results; transaction limits were not increased.

Mobile export/Expo Doctor/lint were not repeated for this backend-only slice: the preceding receipt checkpoint passed all-platform41-route exports; Doctor20/21 with five patch mismatches and missing backend ESLint/root lint script remain unresolved. No dependency versions/lockfiles were changed here.

## Development deployment

Development-only Preview deployed: `https://freshtrack-be4qoobnm-dragon-2818.vercel.app`, Ready. Its build validated the existing Preview environment and development database target without migrations/writes; production was not deployed. Public checks: health200, anonymous Auth/Pantry/deletion/Chef/Analytics401, oversized JSON413, all with no-store and safe failure envelopes where applicable. These anonymous checks do not establish hosted authenticated cross-user acceptance.

Only the ignored mobile public API URL was updated to this Preview. Metro8087 was restarted with diagnostics off. The actual served iOS manifest/bundle returned200 and the bundle contains the new URL. No native rebuild, authentication-origin changes, secrets or provider configuration changes.

## Remaining work and next step

- Review and remediate development-tool advisories (Jest/@types/Jest transitive chain and ts-node-dev); some suggested fixes require major changes or have no automatic fix. Do not run `npm audit fix --force`. Runtime audit zero is not proof of no vulnerabilities. The Phase9 no-known-high-severity acceptance is **not satisfied** while this remains open.
- Existing rate limits use in-process MemoryStore. They reset on restart and are not a global distributed serverless quota. Review deployment-specific proxy/IP trust and shared limits before public/production use. Provider hard quotas and current per-account guards remain unchanged.
- Investigate intermittent development database failures before final reliability acceptance. Combined run42/43 and isolated receipt9/10 each had a different failing check. The isolated maximum-haul case did pass; this does not make either whole run successful. The safe error label does not establish a network, pool or transaction-timeout root cause.
- Review Expo patch compatibility, restore runnable lint tooling, then remaining reliability/personal-use build work. Android runtime, clean-install/update and broader native/performance/accessibility acceptance remain incomplete. No store publishing.
- No new iPhone checklist is required to establish the server rejection/scoping tests; phone checks cannot replace them. This slice adds no UI interaction.

## Primary references

[Express body-parser options](https://expressjs.com/en/resources/middleware/body-parser/): bounded parsing and `inflate: false`; installed Express4/body-parser source/types were also inspected. [express-rate-limit configuration](https://express-rate-limit.mintlify.app/reference/configuration): middleware configuration, Retry-After and MemoryStore restart limitations. These references inform the small parser-order/limit change, without upgrading either library.
