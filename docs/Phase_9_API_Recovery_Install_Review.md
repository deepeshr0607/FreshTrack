# Phase 9 — API recovery and installation coverage review

21 October 2026. A local HTTP regression and evidence review. The installed Release app, its data, hosted backend and provider configuration are unchanged. Phase9 remains incomplete.

## API recovery coverage

Existing pure mobile tests mock fetch; server HTTP tests usually mock services without driving the actual mobile client. Added `backend/tests/api-recovery.test.mjs` to connect the real `createPantryApi` client to the real Express application over an ephemeral loopback listener:

1. A validated list request receives the server's503 error, with no automatic repeat. After the injected service recovers, an explicit retry returns data. A subsequent401 is ineligible for the cached-fallback policy and never reaches the service.
2. A failed create request can be explicitly retried through Express validation with the same exact fields and mutation key.
3. A real successful200 HTTP response is consumed and then deliberately dropped at the test transport boundary. The client reports save uncertainty without the private transport string. Explicit retry sends identical method/body/key bytes.

The third check uses a service spy and invokes it twice. It proves transport identity and wording, **not exactly-once database writes**. Existing guarded service/database tests supply separate idempotency evidence; no live fixture suite was rerun for this test-only change. All bearer values, identities and groceries in the new tests are synthetic. The injected verifier replaces provider authentication in this local fixture; this is not new live Neon acceptance.

The reviewed Pantry context has a separate cached-read policy: only availability/transport failures permit a scoped known-subset fallback, and cached state blocks ordinary writes. Authentication/validation/conflict failures clear the visible cached state. Live refresh restores normal controls. These React Native rendering paths were reviewed and their pure cache helpers tested; the new loopback tests do not mount React Native UI or force an API-only outage on the installed phone. The earlier iPhone offline test verifies Auth blocking/recovery, not an independent Pantry503 while Auth remains reachable.

No development fault switch, diagnostic UI, new runtime dependency or cloud fault injection was added.

## Installation and update evidence

| Scenario | Evidence and limit |
|---|---|
| SDK patch update to existing Debug app | Signed build/install verified; eight smoke checks passed by user report. See [compatibility report](Phase_9_Mobile_Compatibility.md). |
| Existing Debug app updated to embedded Release | Same identifier updated without uninstalling; signature/profile/bundle inspected. Eight standalone smoke checks passed by user report, including existing Pantry and remembered-session behavior. See [personal-use build report](Phase_9_Personal_Use_Build.md). This is functional evidence, not secure-storage forensics. |
| Release startup without Metro | Direct launch verified; standalone startup/restart, notification and offline-session checklists passed by user report. |
| Clean npm dependency installation | Root/backend clean installations recorded in earlier tooling/advisory checkpoints. Not rerun here; not equivalent to a clean native-device install. |
| Fresh checkout → regenerated native project → signed Release | Commands are documented. Current Release used the existing generated workspace/signing setup. A completely fresh-machine/checkout signing run remains unverified. |
| First Release install on a clean iPhone sandbox | Unverified. The owner's working app has not been uninstalled for this review. |
| Release-to-Release update across a version/storage migration | Unverified. No new runtime version or local-storage migration was introduced; reinstalling the same binary would not demonstrate this case. |
| Android install/update/runtime | Deferred/unverified. No Android result is inferred from exports or iPhone checks. |
| Signing lifetime | Current Personal Team profile expires23October2026 at10:08:49AM IST. Existing report documents local Xcode renewal; no signing/store changes here. |

Release notification delivery/actions and offline resume/cold-start/online recovery subsequently passed by user report; see [notifications](Phase_9_Release_Notifications.md) and [session recovery](Phase_9_Release_Session_Recovery.md). Those results do not close clean-device, cross-account, poor/intermittent-network or installation-interruption coverage.

## Actual checks for this checkpoint

| Command | Actual result |
|---|---|
| Backend `node --test tests/api-recovery.test.mjs` |3/3 new local HTTP checks pass|
| Root `npx tsc --noEmit`, `npm run lint` |Pass, zero lint warnings|
| Root `node --experimental-strip-types --test tests/pantry-api.test.mjs tests/pantry-read-cache.test.mjs tests/pantry-disk-cache.test.mjs tests/receipt-import-client.test.mjs tests/notification-outbox.test.mjs` |57/57 pass|
| Backend `npx tsc --noEmit`, `npm run lint`, `npm test` |Pass; build and166/166 tests including health and the three new checks|
| `git diff --check` |Pass|
| Metro listeners8081–8087 |None; `lsof` exit1 means no matches|

Node emits `MODULE_TYPELESS_PACKAGE_JSON` warnings when the backend test imports shared TypeScript ES modules. Tests pass; package module modes were preserved to avoid changing runtime loading. The first file-creation command used a redundant backend path from inside that directory and created nothing; correcting the path allowed the focused test to run. No application failure was concealed. Full root386-suite, Doctor/exports, native build/install and live database tests were not repeated because runtime/dependency/configuration code did not change.

## Next and open limits

No new phone checklist is needed for this test-only review. Physical Release API-only failure recovery remains unverified; the current passing evidence is the local HTTP boundary plus earlier scoped cache/controller tests. No outage was imposed on the user's hosted services or existing groceries.

Next: consolidate the final personal-use acceptance status and remaining decisions, including upstream security advisories, clean-install/Android limitations and the earlier unattributed read-only database failure. Record these as open or explicitly deferred; do not silently turn them into passes. Store publishing remains excluded. Phase9's no-known-high-severity and broader platform/security acceptance gates remain open.
