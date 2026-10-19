# Phase 6 — barcode lookup backend

19 October 2026. Backend-only development slice; camera-to-catalog UI and barcode import are not connected.

## Implementation

- Protected `GET /api/v1/scanner/barcodes/:barcode`, using the existing verified Neon identity middleware and no-store response envelope. Reject queries, bodies, unsupported retail formats and bad check digits before provider work. This is generic catalog data, so no household/database access is necessary.
- Mobile camera and backend now share the pure GTIN validator in `backend/src/contracts/barcode.ts`. Its original behavior and leading zeroes are preserved. No server integration code is imported into mobile.
- Selected Open Food Facts v3 read-only lookup. Request only code, name, brand, package size and category label. Do not return or infer expiry, quantity purchased, purchase date, price or a FreshTrack category from provider data.
- Responses distinguish `FOUND`, `NOT_FOUND` and `INCOMPLETE` (no usable name). A missing/malformed provider response is an error, not a not-found result. Catalog text is bounded and HTML/control characters rejected; returned barcode must match, permitting leading-zero GTIN equivalence.
- Source includes provider URL, staging/production environment, ODbL identifier and `COMMUNITY_UNVERIFIED` confidence. Attribution and user review must remain visible in the later mobile UI; there is no invented confidence percentage.
- Fixed HTTPS hosts, redirects disabled, 8-second timeout, 64KB streamed/decompressed response cap, no raw provider error forwarding. No images downloaded and no identity, token, receipt, quantity or Pantry values sent upstream.
- Per-account HTTP limit of 12/minute. Provider calls are at least five seconds apart per process, identical in-flight calls coalesce, success results cache five minutes and unknown/incomplete results one minute. Cache is bounded to 100 entries; results are cloned. HTTP 429 respects numeric/date Retry-After with a bounded cooldown. Configuration changes invalidate cache/in-flight reuse.
- No new dependency, schema, database write, native rebuild or deployment. Existing camera proof and Demo preview remain unchanged. Lookup errors include manual-entry recovery guidance; actual navigation comes in the mobile slice.

## Provider setup and limitations

References: [API introduction](https://openfoodfacts.github.io/openfoodfacts-server/api/), [v3 product lookup](https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/), [response status schema](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/ref/responses/response-status/response_status.yaml), and [usage form](https://docs.google.com/forms/d/e/1FAIpQLSdIE3D8qvjC_zRJw1W8OmuHhsWJ_NSckiiniAHlfaVwUZCziQ/viewform).

The provider documents community data without completeness/accuracy guarantees, ODbL database licensing and attribution/share-alike conditions, and separate licensing for images (not used here). Review the linked reuse terms before public rollout or building a combined catalog database. This implementation neither publishes nor bulk-downloads a derived catalog.

The current introduction lists 15 product reads/minute/IP and asks for usage registration plus a custom app/contact User-Agent. It directs development tests to staging. Serverless instances do not share our process-local rate guard; deployment-wide/IP quota enforcement remains a production prerequisite. Staging data can differ from production, and real packaging coverage, response-envelope compatibility and availability still require live verification.

`backend/.env.example` contains dummy `OPEN_FOOD_FACTS_USER_AGENT` and staging `OPEN_FOOD_FACTS_ENV`. Empty/placeholder configuration produces `BARCODE_NOT_CONFIGURED`. The user supplied a public developer contact for this purpose; it is saved only in ignored `backend/.env`, not source/docs or mobile configuration. Other environment settings were preserved. The user reported submitting the provider usage form; two subsequent read-only staging requests passed as documented below. Staging's public off:off HTTP access is the provider-documented test credential, not a FreshTrack account secret. No paid billing or provider write account is configured by this slice.

## Implementation-checkpoint verification

- Mobile and backend `npx tsc --noEmit` — pass; backend `npm run build` — pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs` — 234/234 pass.
- Selected backend regression suite (all non-integration test files, excluding the Jest health test and helper) — 142/142 pass, including 16 barcode cases. All upstream responses are injected; no catalog/database calls. Coverage includes authorization, malformed selectors, GTIN equivalence, missing/unsafe data, 404 versus outage, staging/production request shape, cache expiry/cloning/config changes, simultaneous requests, backpressure, numeric/date cooldown, oversized responses and timeout.
- Backend `npm test -- --runInBand` — health 1/1 pass.
- `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-catalog-export` — pass, 38 routes.
- `npx expo-doctor` — 20/21, exit 1; same five existing Expo/linking/notifications/router/splash patch mismatches.
- Backend `npm run lint` — exit 127, `eslint: command not found`, existing setup gap. Root has no lint script.
- `git diff --check` — pass. Initial HTTP tests were blocked by sandbox localhost permissions, then rerun outside the sandbox. One test incorrectly expected Superagent to retain a bare `?`; replaced it with an actual unsupported query selector. No application fix was needed for that test assumption.

## Live staging verification — 19 October

After the user reported submitting the usage form, ran two separate bounded Node processes under backend with `node --env-file=.env`, requiring `dist/integrations/openFoodFacts.js` and calling `createOpenFoodFactsProvider().lookup(...)`. Both processes asserted staging configuration before requesting anything. Used the user-authorized contact only in the User-Agent; output contained safe status/field-presence metadata, not the email or environment secrets.

1. `3017620422003` — `FOUND`, product name and brand present, package size absent/null; source `COMMUNITY_UNVERIFIED`, environment staging. The real response passed the existing parser without code changes.
2. `0000000000000` — `NOT_FOUND`, product null, environment staging. This reserved zero code was a negative diagnostic input, not a claimed retail package; the actual provider 404 envelope passed the existing parser.

Both processes exited 0. No database access, Pantry reads/writes, image transfer, production provider calls, environment changes, deployment or native changes in this verification step. Prior automated results above were not rerun for this documentation-only acceptance update. This is direct transport/parser evidence for two staging cases, not a benchmark of packaging coverage, production availability, hosted routing or mobile behavior. A missing package size remains explicitly unknown rather than inferred.

## Next step

Connect camera lookup to the existing editable Pantry form, including source attribution, no-result/error/manual fallback, explicit purchase/expiry fields, duplicate review and idempotent BARCODE-source saving. Phone acceptance follows the connected slice, not this backend-only checkpoint. Android/native failure QA and remaining Phase 6 review are still pending; no Phase 9 work.
