# Phase 7 — first backend ingredient slice

Started on 15 October 2026 after the user explicitly authorized Phase 7 and deferred Phase 6.
Google Cloud billing/OCR is not a prerequisite for this slice. Phase 5 development review remains
recorded separately with native acceptance gaps. No Phase 6, 8 or 9 implementation was performed.

## Implemented

GET /api/v1/chef/expiring uses existing verified Neon JWT middleware, no-store responses and the
global rate limiter. It rejects query fields and bodies; clients cannot select a household, user,
window or ingredient list. The service reads the verified subject's membership and eligible items
inside a RepeatableRead transaction. It neither bootstraps a household nor changes Pantry/events.
A missing household returns HOUSEHOLD_REQUIRED, storage failure CHEF_UNAVAILABLE. Errors are safe
consistent envelopes with server-generated request IDs; no raw driver details are exposed.

The bounded query includes only ACTIVE, unarchived groceries in that household, additionally
checking membership through the item relation. Stable expiry/id ordering selects at most 201 rows;
more than 200 fails explicitly with CHEF_INGREDIENT_LIMIT rather than silently truncating. The
minimal response contains normalized names, exact decimal quantities, units, pantry IDs and expiry
dates, plus household date/timezone/window metadata. Prices/history/account details are excluded.
Duplicate purchases remain separate; no quantities with incompatible units are merged.

## Date semantics and limits

Dates are date-only, not package use-by instants. The named response window
HOUSEHOLD_TODAY_AND_TOMORROW matches the existing critical tier (daysLeft 0–1). Expired records and
day 2 onward are excluded. Household timezone is server-owned; the clock is sampled once per
request. This is a calendar approximation, not an exact rolling 48-hour selection. Future recipe UI
must describe this honestly; plan item 1's exact-hour wording is not fully satisfied by date-only
storage. No new time-of-day assumptions or schema changes were introduced.

The endpoint is local only, not deployed or connected to the mobile recipe screen. This is backend
preparation, not working provider-backed recommendations. Existing Recipes/details/shopping/cooking
prototypes are preserved. No new provider call, package, secret, database migration or data write.

## Actual verification

- Root npx tsc --noEmit: passed.
- Backend npm run build and npx tsc --noEmit: passed.
- Root node --experimental-strip-types --test tests/*.test.mjs: 172/172 passed.
- Backend node --test tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs
  tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs
  tests/deployment.test.cjs: 54/54 passed, including six new Chef tests.
- Backend npm test -- --runInBand: health 1/1 passed.
- New tests cover calendar rollover/Kolkata timezone, exact scoped query/field selection,
  empty/no membership/overflow, identity/timezone/driver failures and HTTP auth/input/error privacy.
  They use injected database adapters; no live database isolation or provider behavior is claimed.
- git diff --check: passed. Reviewed changed source for secrets/debug logs.
- First build command was mistakenly run at root and failed because root has no build script;
  corrected backend build passed. No fix or script addition was needed.
- No Expo exports/Doctor/lint rerun: no mobile runtime/config/dependency changes. Final Phase 5
  checks earlier on 15 October passed all-platform/35-route exports; Doctor20/21 recommended six
  patches. Existing root lint missing script/backend ESLint absent remain unchanged.

No phone test requested for this backend-only, undeployed endpoint. No live fixture cleanup is pending.

## Spoonacular setup and next slice

User reports no developer account/key. Use the direct Spoonacular Free plan instead of RapidAPI.
Official pricing checked on 15 October: Free $0/month, 50 points/day, 1 request/second, two concurrent
requests, backlink required; exhausted free quota stops calls. Direct Free signup requires no credit
card. Points are not equivalent to recipe count. Verify the displayed terms at signup.

1. Open https://spoonacular.com/food-api/pricing and select Get Started under Free.
2. Create/sign into the developer account and complete any email verification.
3. Open https://spoonacular.com/food-api/console and locate the API key/profile area.
4. Keep the key private. Do not paste it into chat or mobile EXPO_PUBLIC variables.
5. Next configuration will replace only SPOONACULAR_API_KEY in ignored backend/.env and add the
   matching value to the development backend's Vercel Preview environment. Other envs stay intact.
   Do not enable production integration or buy a paid plan for this checkpoint.

Official references:
https://spoonacular.com/food-api/pricing
https://spoonacular.com/food-api/console

Next: securely configure the direct key, review provider API/caching/attribution terms, implement
server-only ingredient search with bounded quota/error handling, test it, then connect the supplied
Recipes UI in a later coherent slice. Live ingredient/database isolation and hosted HTTP checks
remain pending before deploying this endpoint. Whole Phase 7 acceptance is incomplete.
