# Phase 4 — server-wide Pantry filters and sorting

Development-only slice authorized on 12 October 2026, after user-reported iPhone expiry acceptance.
No schema/dependency/native-module change, production data writes or Phase 5 work.

## Changes

The existing Pantry search, category/freshness chips and sort toggle now query the API for real
households. Demo filtering is preserved. `GET /api/v1/pantry` accepts optional `q`, `category`,
`freshness` and `sort` alongside existing pagination. Unknown/nested/duplicate fields and unsupported
values are rejected. Search is NFC-normalized, whitespace-collapsed and case-normalized, capped at
120 characters; `%`, `_` and backslash are literal name characters, not SQL patterns. Prisma binds
values; identity/household selection cannot be supplied by the client.

Only active, unarchived membership-scoped items match. Critical includes overdue/today/tomorrow,
Caution uses days2–6, Fresh uses day7 onward. Filtering and DTO countdowns share one captured time
and the household calendar date. Default order remains earliest expiry, with ID tie-breaking.
Name order uses normalized names then ID; category order uses alphabetic category, normalized name then ID.
Because PostgreSQL enum order differs from the existing alphabetic UI order, category pages use
matching group counts and bounded per-category queries (at most seven), rather than fetching the
whole inventory or changing the enum/schema. Pagination runs after matching/order, so a match outside an earlier page can be found directly.

The response adds full active-household category counts and active total, independent of selected
filters. Matched pagination totals remain distinct. Existing category pills/search placeholder use
these global counts. Value/risk totals remain explicitly labeled as loaded known value rather than
claiming complete financial totals.

The Context preserves criteria for refresh and subsequent pages, rejects older response generations,
and guards repeated Load More taps. Changing criteria clears old rows/paging and starts a new query.
The screen debounces typing for250ms and hides rows from previous criteria during that interval.
Changing filters/order clears batch selection; actions are unavailable while a new result is loading.
A confirmed mutation invalidates old list reads and re-queries current criteria rather than inserting
an item that may no longer match. A list refresh failure after an add does not undo the successful
save; the saved detail response remains available, and Pantry shows retry feedback. This intentionally
updates the previous comment/behavior that always inserted a saved row regardless of filters.
Other tabs remain prototypes. Filters are session UI state, not persisted preferences.

## Verification and recovery

| Check | Actual result |
|---|---|
| Mobile `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` / `npm run build` | Passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 85/85 passed |
| Backend combined auth/household/foundation/deployment/Pantry suite | 42/42 passed after category-order correction |
| Backend `npm test -- --runInBand` | Health1/1 passed |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-filter-export` | Web/iOS/Android passed;34 static routes |
| Backend `npm run lint` | Existing exit127: ESLint absent |
| Mobile lint | No lint script |
| `git diff --check` / source review | Passed; no added secrets/debug logs |
| Guarded live Pantry tests | Final corrected sequential run14/14 passed; fixture cleanup assertions passed |

The initial live run passed11 tests, then failed expiry/filter/freshness checks with safe database
errors; cleanup also failed (11 passes/4 failures including the cleanup hook). No assertion diagnosis
established the root cause. A direct/pooled readiness check subsequently passed with Auth schema
unchanged. Guarded serial recovery validated exact `freshtrack-dev-test:pantry:<UUID>` subjects,
My Kitchen/INR/Kolkata metadata and one member per household, removed18 synthetic households and
asserted remaining reserved memberships0. Seed fixtures and real accounts were excluded. The suite
was stopped before recovery; cleanup did not overlap a running test. The subsequent run passed13/14, with successful cleanup; it exposed a category enum-order
assertion mismatch. Alphabetic category pagination was fixed and regression coverage added. The
final corrected run passed14/14, including cleanup assertions. One `npm run build` invocation from the mobile root failed because it has no build script; the
correct backend command then passed. TLS, connection configuration and authentication policies were not changed.

New tests cover strict raw-query validation, literal metacharacters, calendar boundaries, composed
criteria, stable paging ties, matching beyond a previously loaded page, household isolation, global
counts versus matched totals and resolved items leaving the list. Native debounce/race and actual
50-item Load More interactions require device acceptance; small-page database tests verify pagination.

## Deployment / next step

Preview `dpl_5u4pezTaWMXfrnuDWhTGEj6p494N` is READY at
https://freshtrack-7hyj2sqvh-dragon-2818.vercel.app. Explicit Preview/DRAGON scope deployment passed;
production URL null, no deployment protection. Public health200 and tokenless filtered Pantry401
passed. Ignored public mobile API URL updated; Neon Auth origin/settings unchanged. Cloud install
still reports the prior36 audit findings; dependencies unchanged. User reported all requested iPhone checks working on 12 October 2026 at
exp://192.168.1.21:8085: normalized search, composed freshness/category filters, clear/reset,
expiry/name/alphabetic-category order, refresh preserving criteria, full-inventory counts,
rapid search changes settling correctly, no-match recovery and batch selection reset.
This is user-reported acceptance, not automated device evidence. Actual50-item Load More,
offline/race failure paths and Android remain unverified.
Exact next slice: duplicate detection with explicit user confirmation, preserving existing items. Remaining Phase4: duplicate handling, offline-readable/recovery behavior and final review.
Android, full-cap batches, failure-path/native visual QA and release remain deferred. No Phase5.
