# Phase 5 item 7 — overdue groceries await confirmed outcomes

Implemented on 14 October 2026 after the user chose “Keep it active and awaiting Used/Wasted
confirmation.” The boxed iPhone checklist has been requested; native acceptance is pending.

## Product decision

Passing an expiry date never changes a grocery to CONSUMED, WASTED or ASSUMED_CONSUMED. It stays
ACTIVE until an explicit confirmed outcome. No automatic SYSTEM outcome event, assumed-consumed
timestamp or fabricated saved/wasted value is recorded. The existing ASSUMED_CONSUMED enum remains
reserved for possible future explicit policy changes; no schema migration or historical status
rewrite was performed. Real analytics integration remains Phase 8 and is unchanged by this slice.

## Implementation

The real native Pantry provider exposes one coalesced live overdue-review coordinator. Verified
startup/resume, explicit Pantry refresh and acknowledged add/edit/Used/Wasted/undo/batch/notification
outcomes request a new read. This is independent of notification permission and reminder On/Off.
It reuses the existing authenticated household bootstrap and unfiltered active-list pagination
reader, bounded to 1,000 entries. Bootstrap may create the account's household under the existing
Phase 4 setup behavior; discovery itself creates no groceries or outcome/history records.

Only daysLeft < 0 is overdue. The reader uses server-calculated household calendar days, not the
phone clock/timezone, search results or Critical freshness tier (which also includes today and
tomorrow). It derives the response's household day from expiresOn and daysLeft and rejects mixed-day
page snapshots, malformed dates/statuses, duplicate IDs and invalid day counts. Current households
use Asia/Kolkata. Empty active Pantry is a successful zero with no derived date; expired records
are ordered by expiry then ID and retain exact original DTO quantities/costs/status/version.

New signals supersede stale reads and coalesce bursts. Session checking/loss, another identity,
teardown and development cached-view tests invalidate the snapshot. Availability/limit failures show
unavailable, not a fresh zero. Cached rows never supply the review. A later verified resume or
Refresh Overdue Check retries. A normal cached Pantry display can stay read-only while an independent
authenticated live overdue read recovers. No offline authentication bypass or background polling
was added. Changes from another device are observed on the next successful read.

A development-only card in Pantry displays live count/date, up to five overdue names and Refresh
Overdue Check using existing theme/card/button styles. It is an inspection tool for item 7;
the release reconciliation banner and bulk action UI remain item 8. Existing outcome confirmations,
pending notification guards, editing, Undo and demo behavior are preserved. There is no new API,
backend service/schema/dependency/config/environment/deployment or production-data change.

## Actual verification

| Command | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` / `npm run build` | Passed; backend source unchanged |
| `node --experimental-strip-types --test tests/*.test.mjs` | 166/166 passed, including 9 new overdue-review tests |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs` | 48/48 passed with localhost listeners enabled |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-overdue-export` | Final all-platform export and 34 routes passed |
| `npx expo-doctor` | 20/21; existing expo57.0.27/router57.0.25/splash57.0.9 versus recommended 57.0.28/57.0.26/57.0.10. Dependencies unchanged. |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing missing ESLint, exit 127 |
| `git diff --check` / focused source review | Passed |
| Existing tunnel `/status` | packager-status:running before requesting phone checks |

New tests cover yesterday/today/future boundaries, resolved-item exclusion and unchanged source
records, server-day authority despite a different phone clock, empty Pantry, malformed/duplicate/
mixed-midnight responses, burst/stale-read supersession, auth/diagnostic invalidation, teardown,
availability/limit recovery and verified startup/resume without notification preferences. These
injected coordinator tests do not constitute actual native/network observation. No live database
fixture suite was rerun because server behavior is unchanged; prior item 6 7/7 and cleanup evidence
remains separate. No fixture cleanup is pending.

## Boxed iPhone checklist

The user was asked to sign into the real account in Expo Go over the existing tunnel, disable
reminders, note a live baseline N and household day, and add three Other/1 piece/unknown-price
samples with manual expiry yesterday/today/tomorrow. Only Yesterday should contribute N+1 and
all three must stay ACTIVE until confirmed. Remembered restart and repeated verified resume
should rediscover N+1 while reminders remain Off.

The checklist then tests Yesterday Used cancellation/confirmation, Undo restoration, Wasted
cancellation/confirmation and corresponding N+1/N changes. Editing Today to yesterday adds one
overdue entry while keeping it active; editing it to tomorrow removes it from overdue review.
Final restart should leave Today/Tomorrow active and Yesterday absent only because the user
confirmed Waste. The full steps are in the asynchronous question box. No user result is recorded
yet. Calendar rollover can legitimately change the baseline during the test.

## Remaining work

Item 7 phone acceptance is pending. Item 8 reconciliation banner/list/bulk-confirm interaction is
not implemented. The existing 1,000-item live-read limit, API availability, auth gating and response
calendar coherence are explicit bounds; unavailable counts are not treated as zero. No continuous
midnight/background update is promised. Real-build/Android/actual transport-loss QA and final Phase
5 review remain incomplete. Next: collect the boxed phone result, then item 8 when authorized.
