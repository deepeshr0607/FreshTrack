# Phase 4 — batch outcomes and undo

12 October 2026. Resumed at the user's request. Batch/undo is implemented, verified at API/database
boundaries and deployed to development. **iPhone acceptance is pending.** Phase 4 remains in progress.
No schema migration, dependency change, production change or Phase 5 work.

## Connected behavior

- Real Pantry reuses the existing Batch Select, visible selection and cancellable Used/Wasted sheet.
  Up to 20 unique loaded items may be selected; larger visible lists require individual selection.
  ₹ totals count known values only; unknown-price rows are explicitly labelled.
- `POST /api/v1/pantry/batch-outcome` requires confirmed consume/waste, unique item IDs/loaded
  versions and a retry key. `POST /api/v1/pantry/batch-undo` requires confirmed selected versions and
  a retry key. All rows must belong to the verified account's household and be in the expected state.
- The service validates the whole selection before changing it. A serializable transaction updates
  every item and appends each status event, or rolls everything back. Canonical order/hash/key handling
  protects reordered retries; a changed request with the same key is rejected.
- Undo restores CONSUMED/WASTED items to ACTIVE and appends STATUS_CHANGED reversal history; it
  does not erase or edit original events. It clears current outcome timestamps and updates versions.
  Stale versions cannot undo newer outcomes. ASSUMED_CONSUMED/archive restoration is outside this slice.
- Last-outcome undo can restore the latest successful single or batch action, after another
  confirmation. Resolved item details also have confirmed `Undo Outcome`, using the scoped
  `POST /api/v1/pantry/:itemId/undo-status` endpoint.
- Cancel sends no mutation. Busy sheets cannot be dismissed/repeated. Failed requests retain the
  sheet/retry key. A replay returns current state; the client rejects a superseded result instead of
  announcing a successful restore. Shared inventory updates after server success and refreshes.
- Demo interactions, supplied styles, routes and primary navigation remain intact.

## Recovery evidence

The earlier run lost its Neon connection and could not clean its fixtures; it was not accepted.
On resume, guarded readiness passed. An initial cleanup retry failed; a later narrowly scoped recovery
removed **14** reserved synthetic Pantry households. This cleanup overlapped an active run, which
finished 10/11 and was deliberately discarded as acceptance evidence. After that process completed,
cleanup ran again (zero remaining), then a fresh sequential live suite passed **11/11**, including its
fixture cleanup assertions. A separate read-only prefix count confirmed **zero reserved Pantry test
memberships** afterward. Real provider accounts and seed fixtures were excluded by the recovery guard.
The intermittent connection cause was not established; no TLS/credential/branch workaround was applied.

## Deployment and actual checks

Preview: https://freshtrack-hsxvu62lb-dragon-2818.vercel.app
READY deployment: `dpl_5okbejrBGF9gDoqP5hHWW8262EDu`, dedicated `dragon-2818/freshtrack-api` project.
The first deploy returned Not authorized; read-only login/team/project checks passed, and retrying with
explicit `--scope dragon-2818` succeeded. No access policy/account/Git integration change was required.
Existing Preview-only development DB/Auth settings and hosting policy are preserved. Build generates
installed Prisma 5.22 and compiles; no seed/migration runs. Ignored mobile public API URL points here;
Auth URL/origin are unchanged. Expo runs at `exp://172.20.10.2:8085` on the current network.

| Command / check on resume | Actual result |
|---|---|
| Backend `npm run db:check` | Passed, direct/pooled application reads; auth structure unchanged |
| Guarded synthetic recovery + read-only reserved-prefix count | Cleanup recovered; final remaining test memberships 0 |
| Mobile/backend `npx tsc --noEmit`, backend `npm run build` | Passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 79/79 passed; existing module-type warnings |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/deployment.test.cjs tests/pantry.test.cjs` | 37/37 passed |
| Backend `ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/pantry.integration.test.cjs` | Final sequential run 11/11 passed with cleanup |
| Backend `npm test -- --runInBand` | Health1/1 passed |
| `npx --yes expo-doctor` | 21/21 passed |
| `npx expo export --platform all --output-dir /private/tmp/freshtrack-phase4-batch-undo-resumed-export` | Web/iOS/Android passed; 34 static routes |
| Backend `npx --yes vercel@latest deploy --yes --target preview --scope dragon-2818 --logs` | Preview build/deploy passed |
| New Preview public fetch checks | Health200; tokenless batch-outcome/batch-undo/single undo401 |
| Backend `npm run lint` | Existing exit127: ESLint absent; mobile has no lint script |

Live tests cover atomic outcomes/undo, retry/hash conflicts, original/reversal history, foreign/stale/
resolved entries rejecting whole batches, rollback on the second event failure, and older undo replay
not reversing a newer outcome, plus prior Pantry regression checks. Local tests validate confirmation,
1–20 size/unique IDs/version limits and client superseded-response feedback. Tests use synthetic
development identities, not real accounts. Network/localhost checks ran with approved escalation.
Cloud full dependency audit still reports previously documented development-tool findings; no upgrade.

## Native acceptance and next step

Requested iPhone checks use two named development samples: batch Used cancel/confirm; last-outcome
undo cancel/restore and restart; batch Waste/restore; and single detail Used/Undo Outcome. Do not
claim these interactions verified until the user reports results. Large text/accessibility/native
offline/conflict cases and Android remain unverified; exports do not prove device behavior.

The last-action undo bar is session/process scoped and is not restored after termination. Database
outcomes and reversals persist; resolved details offer undo when reached by their scoped item route.
A history navigation screen/disk cache/queued mutations are not implemented. Search/filters/alternate
sort still apply to loaded pages. Batch cap 20 is validated; live/native success at the full cap is
not claimed by the two-item scenarios.

Next: finish iPhone acceptance for this slice, then the next authorized Phase 4 inventory slice.
Presets/expiry precedence, server-wide filters, duplicate/offline handling and final review remain.
