# Phase 9 — backend development tooling

20 October 2026. Backend-tooling checkpoint only; Phase 9 remains incomplete.

## Result and scope

The full backend audit dropped from 36 reported advisories (31 high, 5 moderate) to zero, including development dependencies. Backend runtime dependency versions and mobile dependencies are unchanged. This is the registry's current audit result, not a guarantee that all application/deployment security issues are resolved. Mobile dependency review, Expo compatibility and the previously recorded intermittent live database failures remain separate work.

The source changes do not change an API contract, database model, authentication flow, grocery or UI. No database/provider calls, migration, deployment, public environment update, Metro restart or native rebuild was needed. Existing untracked `output/` review artifacts were preserved and excluded from this checkpoint.

## Changes

- Removed Jest, ts-jest, @types/jest and ts-node-dev. Jest served only the health test; the other159 tests already used Node's runner. Removing those development chains avoids a broad forced dependency upgrade.
- Moved the health test from `tests/health.test.ts` to `tests/health.test.cjs`, preserving its status/service/timestamp assertions against the compiled Express factory. Removed the now-unused Jest configuration; no coverage claim is made.
- Added `scripts/test.cjs`: sorted non-integration Node test discovery, argument forwarding and child exit/signal propagation. `npm test` now compiles and runs all160 checks. It does not select guarded development database integration suites or load `.env`.
- Added `tsx`4.23.15 for development source watching. This replaces transpile-only ts-node-dev; TypeScript checking remains a separate required command. Its esbuild0.28.2 install script is explicitly included in the existing package-specific allowScripts policy.
- Added ESLint10.13.0, @eslint/js10.0.1 and typescript-eslint8.72.0 with a flat TypeScript configuration. Node24 satisfies their requirements. `npm run lint` checks `src/` with zero warnings, recommended core/TypeScript rules and a prohibition on console.log (structured console.info/error remain allowed).
- The initial lint run found12 intentional control-character regex checks and one obsolete suppression. `no-control-regex` is explicitly disabled because validators deliberately reject ASCII controls; existing regexes/validation behavior remain intact. An obsolete no-unused-vars directive was removed because the config now recognizes deliberate underscore parameters/destructured omissions. This is the documented reason for removing that comment.
- Updated the backend lockfile and current README commands. No runtime package version changed according to a before/after lockfile comparison. The lock contains430→256 package entries including optional platforms; the clean local install audits232 packages including the root.

The first attempted ESLint9 install was marked unsupported by the registry. It was replaced with supported ESLint10 before final checks; it is not the committed configuration.

## Commands and evidence

| Fresh command/check | Actual result |
|---|---|
| Baseline backend `npm audit --json` | 36 advisories:31high/5moderate |
| Backend `npm ci` | Pass,231 packages installed; zero advisories; no unapproved-install-script warning |
| Backend `npm run lint` | Pass:0 errors/0 warnings, also after clean install |
| Backend `npx tsc --noEmit` | Pass, also after clean install |
| Backend `npm test` | Build passes;160/160 tests pass, also after clean install. This replaces historical159 Node tests plus1 Jest health test. |
| Backend `npm audit --json` after clean install | Exit0;0 critical/high/moderate/low/info advisories |
| Root `npx tsc --noEmit` | Pass |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 384/384 pass |
| Development watcher smoke | Starts the actual server through tsx watch; health200 before and after a source timestamp change/restart |
| Test watcher smoke | Native test watch runs health, then reruns after the health-file timestamp changes |
| `npx --yes expo-doctor` | Exit1;20/21 checks. Existing patch mismatches:Expo57.0.27→57.0.30, Linking57.0.12→57.0.13, Notifications57.0.22→57.0.23, Router57.0.25→57.0.28, Splash57.0.9→57.0.10 |
| `git diff --check` | Pass |

Both watcher smoke checks used temporary local listeners and explicitly stopped their process groups/restored file timestamps. They made no API data calls beyond health and no source-content edits. No phone test is needed for this tooling-only slice. Mobile platform exports/native runtime and live database suites were not repeated; their previous results/limits remain historical, not newly passed here.

## Current usage

From `backend/`:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run dev
```

`npm test -- --test-name-pattern=health` forwards Node test-runner options. `npm run test:watch` watches tests and their compiled imports; after editing TypeScript API source, run `npm run build`, or run `npx tsc --watch` in a second terminal so emitted changes trigger tests. Database integration remains behind its existing explicit development guard/opt-in commands. Historical Jest `--runInBand` is no longer a supported test argument. The root mobile/shared tests still use their existing command, not the backend runner.

## Next step and remaining limits

Review and apply the five compatible Expo patches in a separate mobile compatibility checkpoint, add/verify mobile linting, then investigate the intermittent development database failures before personal-use-build acceptance. Backend audit zero does not establish root/mobile audit status. Shared serverless rate-limit/proxy review and broader security/native/reliability acceptance from the preceding API report are still open. No store publishing.

## Official references

- [Node24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html): built-in runner, watch and CLI options.
- [ESLint flat configuration](https://eslint.org/docs/latest/use/configure/configuration-files) and [typescript-eslint quickstart](https://typescript-eslint.io/getting-started/): recommended TypeScript flat-config setup. Installed package metadata/peer requirements were checked before selecting versions.
- [tsx source and documentation](https://github.com/privatenumber/tsx): maintained TypeScript execution/watch tooling; actual installed watch behavior was smoke-tested.
