# Phase 8 — individual confirmed uses on/before expiry

16 October 2026. Implemented; deployment and phone result recorded below. Category phone acceptance
has not yet been reported and is not inferred from the user's instruction to continue.

## Scope and evidence labels

Financial Analytics now connects the individual-item card pattern from the supplied financial
design. The panel is called Used On or Before Expiry: it lists confirmed uses, not proven prevented
waste or money saved. Existing Insights reaches it through the Financial Analytics link.
Both supplied Analytics PNGs were reinspected. Theme/card/emoji/Pressable patterns and protected
Pantry details are reused; Demo is preserved. No new dependency or native integration was added.

Latest20 selected-month entries are ordered by outcome timestamp descending, then event UUID.
The default visible list has three entries and can expand to the loaded latest20. Header count
includes every qualifying outcome; the panel explicitly distinguishes loaded entries from full
monthly totals. It is not an all-history browser or monetary-value ranking. Current archived items
remain represented, with review disabled; active/nonarchived references open existing protected
Pantry details. Opening a row does not automatically change groceries.

Eligible rows are latest effective, non-SYSTEM CONSUMED outcomes whose outcome-local date is on or
before snapshot expiry. After-expiry, assumed/system, undone/superseded, foreign and future outcomes
are excluded. Household timezone determines selected month; immutable outcome timezone determines
expiry-day eligibility. Unknown and estimated prices remain explicitly labelled; known zero is a
recorded value. No quantity is displayed because event snapshots lack a unit snapshot.

Item names also are not historical snapshots in the current schema. A scoped current Pantry name
is displayed with CURRENT_PANTRY_NAME basis and an explicit note in UI/report. Financial value,
category and expiry remain immutable event fields. No historical-name or recipe-rescue story is
invented and no schema migration is needed.

## Backend and client boundaries

Extracted the existing effective-transition CTE into a shared builder. Series now reads aggregate
groups and a bounded individual query inside the same RepeatableRead transaction, same membership,
timezone/asOf and selected month. Summary remains one aggregate query. Joined Pantry records must
match the event's household; membership is checked in the CTE. No client record/limit selector was
added. Unknown/missing/corrupt rows fail with existing fixed503 recovery rather than partial success.

Backend and client validate UUID uniqueness, eligibility dates, price provenance and current-name
basis. Returned rows reconcile with category before/on-expiry counts and cost subtotals exactly
when the full list fits20; a capped list must not exceed the full category coverage. The client
retains existing generation/account/month guards and rejects inconsistent responses before display.
Reports include the bounded list with current-name/outcome-snapshot caveats and outcome timezone.
Two scoped history reads may cost more than one; large-history load performance is not established.

## Actual verification

| Check | Result |
|---|---|
| Root npx tsc --noEmit | Passed |
| Backend npm run build and npx tsc --noEmit | Passed |
| Root strip-types tests | Final206/206 passed |
| Selected backend regression suite | Final122/122 passed |
| Backend npm test -- --runInBand | Health1/1 passed |
| Read-only synthetic Neon SQL via HTTPS | 11/11 passed |
| Expo web/iOS/Android export | Final all-platform, 35 routes passed |
| git diff --check and secret/debug scan | Passed |

```sh
# backend/
node --test tests/analytics-used.test.cjs tests/analytics-categories.test.cjs tests/analytics-https.test.cjs tests/analytics-series.test.cjs tests/analytics.test.cjs tests/recipe-ranking.test.cjs tests/recipe-matching.test.cjs tests/chef-details.test.cjs tests/chef-suggestions.test.cjs tests/chef.test.cjs tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs
ALLOW_DEVELOPMENT_DATABASE_TESTS=true ANALYTICS_SQL_TRANSPORT=https node --env-file=.env --test tests/analytics.integration.test.cjs
# root
node --experimental-strip-types --test tests/*.test.mjs
npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-phase8-used-final-export
```

Four new backend tests cover shape/provenance/date/category consistency, unknown/estimate/zero,
full/subset coverage and coherent transaction/scoped bounded query behavior. Four new mobile tests
cover response rejection, labels/report and capped/duplicate identity handling. Three new live SQL
cases cover all exclusions, immutable values/current names, archive review, scope, latest20 order,
month/expiry timezones and estimates. The prior eight SQL cases pass after the shared CTE refactor.
HTTPS fixture guard now additionally requires a synthetic PantryItem CTE whenever its query joins
that table. All three application tables are shadowed; no real records are read/written and no
cleanup is required. This is not a fresh Prisma driver/transaction integration pass.

Existing Expo Doctor20/21, six patch recommendations and lint setup gaps are recorded in the prior
category report; not rerun because no dependency or native configuration changed. Local Prisma
connection remains unresolved and was not retried. No schema, migration, dependency, production or
Auth-settings change. Hosted authenticated list reads and native UI are pending phone verification.

## Deployment and next step

Development Preview `dpl_7pR71SBGwVHVMPnwtprz6eFA7BFN` is Ready at
https://freshtrack-pnipjo6h0-dragon-2818.vercel.app. Public health returned200; tokenless
summary and series both returned401. Existing Metro is running on8086 at172.20.10.2.
Only the ignored public API URL changes; existing Neon Auth configuration is preserved.

Next: numbered individual-entry phone checks, followed by any outstanding category phone result,
remaining failure/native/accessibility QA and final Phase8 review. Carbon, food mass and achievement
scores lack a supported measurement and remain explicitly unavailable. Phase6 remains deferred;
Phase9 is unstarted. Full Phase8 completion is not claimed.
