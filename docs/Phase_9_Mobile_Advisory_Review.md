# Phase 9 — mobile advisory review and scoped UUID fix

21 October 2026. Review checkpoint with one verified build-tool fix. **Security acceptance and Phase9 remain incomplete.**

## Outcome

The root audit changed from29 reported affected packages (18high/11moderate) to21 (18high/3moderate). These counts include dependent parent packages; they are not29 or21 distinct vulnerabilities. Four underlying advisory libraries became three after fixing the UUID dependency. Backend full audit remains0. No Expo/React/React Native/native-module version, UI, app API, database schema, provider configuration, environment value or grocery was changed.

`package.json` now pins **only `xcode@3.0.1` → `uuid@11.1.1`** through an npm override. Installed source inspection showed Xcode's generator calls only `uuid.v4()` and converts the result into24-character project IDs. The patched release retains its CommonJS/v4 interface. This crosses the generator's declared `^7.0.3` UUID range deliberately; it is a local, narrowly tested compatibility measure, not an upstream-endorsed dependency range. No global UUID override, SDK substitution, audit exclusion or `npm audit fix --force` was used. Keep the override scoped and review removal when upstream fixes its dependency.

The committed lockfile changes the resolved UUID package only. Clean `npm ci` preserves the override, and `npm ls uuid --all` identifies its overridden Xcode consumer. No fresh native compile/install was needed: the changed package generates project files on the Mac and is absent from the checked client bundles. The already accepted iPhone/native build is historical evidence, not a new phone pass for this checkpoint.

## Advisory disposition

| Library / dependency path | Evidence and disposition |
|---|---|
| **uuid7.0.3** via Splash → config-plugins → xcode3.0.1 | Fixed locally with scoped11.1.1. The advisory concerns undersized external buffers for v3/v5/v6; the inspected generator uses v4 without an external buffer. The actual generator and patched bounds checks are covered below. This finding was not an observed account-data exploit. |
| **braces3.0.3** via Expo → Metro/file-map → micromatch | Open. Advisory lists no patched release; registry latest remains3.0.3. The inspected watcher matches filesystem paths against configured globs. No FreshTrack grocery/receipt input path was found in this call-site review. Remains a Node build/dev-server issue if matching input becomes attacker-controlled; not dismissed or marked fixed. |
| **node-forge1.4.0** via Expo CLI/code-signing certificates | Open. Advisory lists no patched release; registry latest remains1.4.0. Inspected CLI certificate/signature checks use Forge. This is separate from FreshTrack API JWT verification, which uses jose/EdDSA. This review did not inspect private keys, certificates, sessions or provider accounts, and does not declare all signing-tool exposure harmless. |
| **decode-uri-component0.2.2** via Router57.0.28 → query-string7.1.3 | Open and client-reachable. Router's path-to-state code invokes query parsing; client source maps include both libraries. Fixed0.5.0 is ESM whereas query-string7 synchronously calls its CommonJS require result as a function. Isolated substitution demonstrably breaks an ordinary valid query. Do not apply that override without an adapter/backport/SDK-compatible upstream change and navigation acceptance. |

Reviewed primary advisories: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [URI decoder](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Their package-level scores do not establish exploitability of every FreshTrack call path. Conversely, no runtime disclosure/RCE claim is needed for the URI availability risk to remain relevant.

No incompatible automatic audit suggestions (including Expo44/React Native0.72 substitutions) were accepted. SDK57 is preserved. The remaining decoder path needs an upstream compatible backport or an explicitly evaluated adapter/SDK migration; the two high-severity leaves need patched upstream code or a reviewed replacement/backport. This review does not silently accept these risks or satisfy the final no-known-high-severity criterion.

## Candidate compatibility experiment

Installed published decoder0.5.0 and UUID11.1.1 into `/private/tmp/freshtrack-advisory-candidates` with scripts disabled, leaving the app graph unchanged during evaluation. The new decoder's registry metadata declares ESM. Ran query-string7's actual unmodified source in an isolated CommonJS context with identical export aliases and dependency resolution, replacing only the decoder:

- Installed0.2.2 baseline: `fixture=hello%20world` parses correctly.
- Candidate0.5.0: `TypeError`, specifically `decodeComponent is not a function`.

Only short synthetic data was used; no adversarial CPU-exhaustion payload was run on the phone or public service. No decoder substitution was applied to the app. The temporary candidate install is not a new project dependency.

## Committed regressions

Two tests in `tests/build-project-uuid.test.mjs` resolve UUID from the actual Xcode consumer:

1. v3/v5/v6 reject an undersized synthetic external output buffer with RangeError, and the v4 string API remains usable. This checks the published bounds issue without private data.
2. Actual Xcode generator creates256 distinct correctly formatted project IDs, adds a group/file, writes a synthetic `.pbxproj`, parses it again and preserves group/file/build-reference IDs. Temporary fixtures are removed. No generated real iOS project file is rewritten by this test.

Both final tests pass. These are bounded compatibility/security regressions, not a complete test of every Xcode API or a guarantee of random-ID uniqueness.

## Client bundle evidence

Exported iOS/Android/web with `--source-maps`, then counted package source paths across each platform's maps (including all web chunks):

| Platform | Maps / distinct sources | braces / node-forge / uuid / xcode | decoder / query-string |
|---|---|---|---|
| iOS |1 /1879|0 /0 /0 /0|1 /1|
| Android |1 /1964|0 /0 /0 /0|1 /1|
| Web |5 /1642|0 /0 /0 /0|1 /1|

These observations support the client/build-tool distinction for this export, not binary forensics, all native dependencies, historical deployments or every future configuration. Maps stay under `/private/tmp`, outside the repository. Audit `dev` flags alone were not used for classification: Expo build tools are transitively under runtime-listed dependencies.

## Fresh checks

| Command/check | Result |
|---|---|
| Root `npm ci` |Pass;720 packages installed. Reports21 advisories, not a clean audit.|
| Root `npm run lint`, `npx tsc --noEmit` |Pass|
| Root `node --experimental-strip-types --test tests/*.test.mjs` |386/386 pass, including2 new regressions|
| Backend `npm run lint`, `npx tsc --noEmit`, `npm test` |Pass; build and160/160 tests|
| Root `npm audit --json` |Exit1;21 reported packages:18high/3moderate/0critical|
| Backend `npm audit --json` |Exit0;0 advisories|
| `CI=1 npx expo install --check` |Dependencies up to date|
| `npx --yes expo-doctor` |21/21 pass|
| `npx expo export --platform all --source-maps --max-workers 2 --output-dir /private/tmp/freshtrack-advisory-export` |Pass; iOS/Android/web and41 static routes|
| Development Metro manifest/actual iOS launch bundle |BothHTTP200 after clean install/server restart|
| `git diff --check` |Pass|

No new phone checklist, native rebuild, data mutation, backend deployment or live database/provider tests for this build-tool-only fix. Existing unrelated `output/` artifacts remain untouched/excluded. The previously reported database failures remain unresolved; these passing local suites are not database-reliability acceptance.

## Exact next step

Investigate the intermittent development database failures using guarded disposable fixtures and safe driver error categories, while keeping the three upstream/adaptation advisory items open. Do not restart the same advisory review repeatedly or mark it solved by audit exclusions. Before final security acceptance, obtain compatible upstream patches/backports or a separately reviewed replacement/migration and verify affected paths. Remaining personal-use-build, Android/runtime and reliability work remains; no store publishing.
