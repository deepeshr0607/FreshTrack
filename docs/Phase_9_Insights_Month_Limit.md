# Insights month/year upper limit — 22 October 2026

User requested that Insights cannot navigate into future years/months. This is a mobile selection/session correction shared by normal Insights and nested Financial Analytics. The backend's historical API representation/calculations and Demo data are unchanged.

## Change

- Compute the latest selectable month using the household calendar (Asia/Kolkata), not the device-local or UTC month. Current month and all valid earlier months remain selectable.
- Disable and visibly dim Next at the current month. Historical months can move forward toward current, but cannot cross that limit. Previous is also disabled when no valid earlier target exists.
- Validate explicit YYYY-MM entry before requesting data. Future years, later months of the current year and malformed months show a local error and preserve the last valid selection/data. Current Household Month clears that message and still asks the server to select its current month.
- Add a session-level future-month guard so bypassed UI callbacks cannot request a future period. It invalidates pending responses and clears stale data before presenting a safe recovery error. Existing active-account checks, request coalescing, response generations, current reset, exact financial values and report behavior remain.
- The limit is recomputed from the current household date on render/request; a new household month becomes allowed at rollover. This does not restrict future grocery expiry dates or alter the expiry calendar.

No backend/schema/auth/provider/dependency/environment/deployment or account/grocery changes. No live household writes or fixtures. Paused Router decoder/advisory work remains excluded. The device clock supplies the current instant, converted to the fixed household timezone; this is a navigation rule, not a server authorization boundary.

## Verification

- Root `npx tsc --noEmit`, `npm run lint`: pass, zero lint warnings.
- Focused analytics/mobile/actual-TSX tests22/22 pass. Five new regressions cover Kolkata versus UTC December/January boundaries; invalid/future key validation; disabled/guarded Next plus typed month/year rejection in both real screens; historical next/previous year transitions; session guard/API suppression and late-response invalidation; and rollover/current server-selected recovery. Existing callback test updated for the blocked future request; deterministic UI clock cap prevents dependence on the runner date.
- Full `node --experimental-strip-types --test tests/*.test.mjs`:484/484 pass. Backend `npm run lint`, `npx tsc --noEmit`, `npm test` including build: pass,166/166.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-insights-month-limit-export`: pass, iOS/Android/web,41 routes. Signed Xcode Release build: BUILD SUCCEEDED; strict/deep signature and embedded month-limit strings verified. Same development identifier. Bundle SHA256 `fe0728b5e8846543d5372f0a2159dd562986b6f44a75c2c8e82cd3bf1ab2487f`. Device update results recorded below. Existing Personal Team profile expires23October2026 at10:08:49AM IST.
- No new SDK integration or visual redesign; no fresh Doctor/browser-visual claim. Existing Node module-type, Expo color and native toolchain warnings remain.

## Device update

Same-identifier iPhone install returned success, with no uninstall/Metro dependency. Device process launch also returned success; in-app acceptance is recorded below. `git diff --check` passed.

## iPhone acceptance — 22 October

The user reported “All checks passed” for the four numbered checks: current-month Next disabled, historical navigation/return to current, typed future month/year rejection without navigation, current reset and shared Financial Analytics behavior. No grocery changes were requested. This is user-reported evidence, not direct observation or native month-rollover verification. Prior automated checks were not rerun for this documentation-only update.

## Remaining

This correction has user-reported iPhone acceptance. Android runtime and existing Phase9 security/reliability/signing limits remain open. No store publishing.
