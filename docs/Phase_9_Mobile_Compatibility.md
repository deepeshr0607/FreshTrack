# Phase 9 — SDK 57 patches and mobile lint

21 October 2026. Implementation and automated verification checkpoint; all eight iPhone smoke checks passed by user report on21October. Phase 9 remains incomplete.

## Changes

Used `CI=1 npx expo install --fix` to apply the installed SDK's compatible recommendations:

| Direct package | Before | After |
|---|---|---|
| expo |57.0.27|57.0.30|
| expo-linking |57.0.12|57.0.13|
| expo-notifications |57.0.22|57.0.23|
| expo-router |57.0.25|57.0.28|
| expo-splash-screen |57.0.9|57.0.10|

SDK57, React19.2.3 and React Native0.86.3 are preserved. Expo's installer also refreshes compatible transitive dependencies, including ModulesCore57.0.23/JSI57.1.2/UI57.0.25 and associated build tools; this is not a claim that only five lockfile entries changed. Existing app identifiers, plugins, environment values, routes, layouts and supplied design styling are preserved. No backend/schema/provider/deployment/grocery changes.

Added supported ESLint10.13.0, @eslint/js10.0.1, typescript-eslint8.72.0 and react-hooks7.1.1 via Expo install. `npm run lint` checks actual mobile TypeScript/TSX folders (`app`, `components`, `constants`, `context`, `features`, `lib`, `types`) with zero-warning enforcement, recommended core/TypeScript rules and Rules of Hooks/exhaustive dependencies. It excludes backend, generated/native files, output artifacts, tests and Node config/scripts. The native-only `modules` directory has no TypeScript files and is not passed to ESLint.

SDK57's recommended Expo preset depends on eslint-plugin-react7.37.5, whose peer range stops at ESLint9. A direct flat config uses the supported ESLint10 and Hooks/TypeScript rules instead; no legacy-peer/forced install was used. This does not claim to include every Expo/React-specific preset rule.

The initial source lint run found50 pre-existing findings. Focused fixes:

- Replace prototype navigation `any` casts with existing typed routes/params; remove unused reads/imports and preserve the unused fixture helper under an underscore name.
- Memoize request/restore/review/stop/lookup callbacks. Effects depend on stable callbacks or primitive subject/enabled values, not whole context objects that change on publication. This avoids introducing refresh loops just to satisfy dependency rules.
- Keep existing busy flags, mounted checks and monotonically increasing request-generation invalidation. Cleanup invokes a stable invalidator; it still increments the latest counter rather than capturing an old value. Notification intents still select the same account subject and require confirmation.
- Remove an obsolete barcode effect suppression after making stop stable; the explanatory lifetime comment is preserved. The barcode changes are lint/lifecycle maintenance only; no barcode feature follow-up or new runtime acceptance is claimed.

Explicit lint policy exceptions are documented in `eslint.config.mjs`: ASCII-control matching is intentional validation; two existing API decoder files (`analyticsApi.ts`, `chefApi.ts`) retain their structural-any guard implementation pending a separate unknown-based refactor; root layout/designAssets retain Metro's required static asset `require` calls. Other files keep those recommended checks. Passing lint does not claim the legacy decoder anys were removed or that every mobile line is type-safe. No UI redesign or new feature.

## Verification

| Command/check | Actual result |
|---|---|
| Root `npm run lint` | Pass0errors/0warnings |
| Root `npx tsc --noEmit` | Pass |
| Root `node --experimental-strip-types --test tests/*.test.mjs` |384/384 pass|
| Backend `npm run lint`, `npx tsc --noEmit`, `npm test` |Pass; build and160/160 tests|
| `CI=1 npx expo install --check` |Dependencies up to date|
| `npx --yes expo-doctor` |21/21 pass, previously20/21|
| `npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-phase9-mobile-export` |Pass:iOS, Android, web and41 static routes|
| Root `npm ci` |Pass:720 packages installed; lint/TypeScript and384/384 tests pass again after clean install|
| Root audit |29 reported advisories:18high/11moderate,0critical; unresolved below|
| Native build/install |Unsigned and signed generic-iOS Debug builds pass; codesign strict verification and existing-app update on connected iPhone pass|
| `git diff --check` |Pass|

No new automated tests were added for mechanical lint changes. Existing controller/session/cache/notification/scanner tests were run; they do not substitute for rendering/navigation/physical-device checks. Android runtime, native notification delivery/actions after these patches and broad accessibility/performance checks are not established by exports.

## Native development build

The existing generated iOS project was preserved. Initial `pod install` rejected changed cached core specifications. Updating ExpoModulesCore alone also reported Worklets; `pod update ExpoModulesCore ExpoModulesWorklets --no-repo-update` succeeded with116 total pods. The reported generated core script phases were inspected: framework configuration selection and dSYM source mapping via existing Expo autolinking scripts. No handwritten ios/android directories, new permissions or cloud OCR setup.

Unsigned and signed generic-iOS Debug builds succeeded in `/private/tmp/freshtrack-phase9-mobile-build`, using the existing FreshTrackDev workspace/scheme and local development identifier. The signed build used `-allowProvisioningUpdates`; `codesign --verify --deep --strict` passed. `devicectl device install app` updated `com.deepeshr.freshtrack.development` without uninstalling it. Build warnings include existing React legacy deprecations, duplicate linkage and script-phase dependency analysis; no build errors. Installation is not visible UI acceptance. Metro was started with the local development identifier and diagnostics off on8087. Actual iOS manifest/bundle both returned200 and report SDK57.0.0/freshtrack-dev. A devicectl launch with the freshtrack-dev development-client URL succeeded on the connected iPhone. Phone results remain pending; process launch is not visible UI acceptance. Xcode26.6 is selected. The user reported the iPhone connected/unlocked; initial list showed a closed tunnel, but an explicit device-info request subsequently established the developer connection. No account/session data or original photos are requested by these tools.

## Mobile audit remains unresolved

The root audit after the Expo patches reports29 advisories, distinct from the preceding **backend-only** zero-advisory audit. Leaf reports include:

- braces≤3.0.3 (high stack-exhaustion DoS), propagating through Metro/CLI chains. Registry latest is3.0.3, so no patched published version was found.
- node-forge≤1.4.0 (high RSA signature-verification issue), propagating through Expo signing tools. Registry latest is1.4.0; no patched published version found.
- decode-uri-component≤0.4.2 (moderate malformed-URI DoS). A0.5.0 release exists, but Router's query-string7 chain resolves0.2.2; a major override is not established compatible here.
- uuid<11.1.1 (moderate buffer-bound issue) in splash/config-plugin → xcode3 → uuid7.0.3. Replacing this API-major transitively is not verified compatible.

The audit's automatic suggestions include Expo44/React Native0.72 and other incompatible major/downgrade substitutions. They were not applied. No `npm audit fix --force`, blanket overrides or exclusions were used to hide these reports. Advisory applicability/exploitability is not fully assessed; do not label every report as a remotely exploitable app vulnerability, or dismiss all of them as development-only. Final no-known-high-severity security acceptance remains open.

## iPhone acceptance — user report,21October

Check signed-in launch; Pantry search/details/back without refresh loops; read-only deletion review/Refresh/Cancel with all confirmation fields blank; saved reminder status/time without changes; camera Cancel and library-photo OCR/Clear; Privacy managed-copy count; Recipes/Insights navigation; sign-out and remembered sign-in/restart. No imports, Used/Wasted, cooking, deletion confirmation or reminder changes are requested. This does not test notification delivery/actions or barcode runtime. The user answered “All checks passed” to the eight numbered checks on21October. This is user-reported functional evidence, not agent observation; the exclusions above remain unverified. This documentation update makes no code/data/deployment changes. Automated results are historical from implementation checkpoint934600c and were not rerun; `git diff --check` was run.

## Next step

Review unresolved mobile advisories/compatible upstream options, then investigate the previously recorded intermittent development database failures. Remaining Phase9 personal-use-build, Android/runtime and reliability limits remain; no store publishing. Existing unrelated `output/` files are preserved and excluded from this checkpoint.

## References

- [Expo lint setup](https://docs.expo.dev/guides/using-eslint/): flat config/custom lint commands. Installed SDK57 bundledNativeModules and registry peer requirements were checked.
- [Expo incremental dependency guidance](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/): compatible dependency checks/Doctor; no SDK-major upgrade was performed.
- Registry audit links: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [decode-uri-component](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq). Counts/versions are the21October tool results, not a future guarantee.
