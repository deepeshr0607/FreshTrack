# Phase 3 item 5 — Vercel preview deployment

11 October 2026. Existing backend configured and deployed to a dedicated Vercel project.
Production database/schema/auth settings were not changed. Phase 4 has not started.

## Current deployment

- Project: `dragon-2818/freshtrack-api`; linked locally under ignored `backend/.vercel/`.
- Preview: https://freshtrack-fay1ortmz-dragon-2818.vercel.app
- Deployment: `dpl_FuadUxp8mfkBc2N3EbK1qdmNHj2V`, READY, Preview (`target: null` in Vercel API).
- [Inspect build](https://vercel.com/dragon-2818/freshtrack-api/FuadUxp8mfkBc2N3EbK1qdmNHj2V).
- Protected hosting check via `vercel curl`: health 200 with `environment: preview`; household
  current without a Neon Bearer token 401 `UNAUTHORIZED` with request ID.
- User approved disabling Vercel Authentication for this dedicated development API project.
  The project API confirms `ssoProtection: null`. Public health now returns 200; identity and
  household requests without a Neon token return 401, as does an invalid token.
- Ignored mobile `.env.local` now points `EXPO_PUBLIC_API_URL` at this HTTPS Preview. No hosting
  bypass token is embedded. The existing Neon development Auth origin is preserved.
- Automatic GitHub connection failed (repository access). CLI deployment succeeded independently;
  Git-based automatic deployments are not configured.

## Configuration

Run Vercel CLI from **backend/**, never the Expo repository root. That directory is the uploaded
project root (`.` for the CLI project). For a later Git import of the full repository, configure its
Root Directory as `backend`; review that integration separately before automatic deployments.
No mobile static export or `express.static()` is used.

`backend/index.cjs` exports a thin Express wrapper around the existing app factory without starting
an HTTP listener. Local development still uses `src/server.ts`. Vercel's build detected both this
entry and `src/app.ts`, then correctly selected `index.cjs`.

`vercel.json` selects Express, Singapore function region `sin1`, `npm ci --include=dev` and
`npm run build:vercel`. Node is pinned to **24.x**, matching the tested local major (24.21.0) and a
supported Vercel runtime. The cloud build ran in iad1; function region is configured separately.
Build runs configuration validation, `prisma generate`, then `tsc`. It never migrates, seeds or pushes
schema. Prisma 5.22 and all dependency versions are preserved; lockfile only changes Node metadata.
Linux generated client/engine packaging is produced by the cloud build, rather than uploading Mac output.

Canonical wire declarations now live in `backend/src/contracts/api.d.ts`; root `types/api.d.ts`
re-exports them for mobile. The contract contents are unchanged. This resolves the backend-only upload
problem without duplicating types or requiring files outside the deployment root. An isolated copy
of backend source compiles without the mobile parent directory.

`.vercelignore` excludes `.env*`, Vercel login/project material, dependencies, generated output,
tests and key/log files. The actual dry-run contained 31 backend source/configuration files (270,577
bytes), excluding all local credential files and the mobile app. Git ignores project links and
pulled `.env.local`; placeholder environment examples remain tracked.

## Preview environment

Values were copied securely from ignored, verified development configuration through CLI stdin,
never command arguments/output or mobile code. Configure these only for Vercel **Preview**:

| Variable | Value policy |
|---|---|
| DATABASE_URL | Reviewed Neon development pooler, TLS, connection_limit=1, pool_timeout=10 |
| DIRECT_URL | Matching reviewed development direct endpoint; no build migration |
| NEON_AUTH_URL | Same development endpoint/database Auth URL |
| APP_ENV | preview |
| NODE_ENV | production explicitly (hosted Node mode, separate from data environment) |
| ALLOWED_ORIGINS | none for native-only preview; explicit HTTPS web origin if later needed |

`none` is an intentional browser-denial sentinel: native requests without an Origin pass existing
CORS middleware, browser requests with an Origin are rejected. It is not an Auth provider trusted
origin. Existing Neon/Expo origins were not changed. Vision/Spoonacular credentials and development
fixture/migration opt-in flags are not needed or installed on Vercel.

The preview guard checks hosted mode/Preview target, the pinned development DB/Auth combination,
TLS/URL options, bounded pool and explicit CORS configuration. It refuses production or wrong-target
configuration at build and app entry. Safe fixed field labels help diagnose failures; no environment
value or raw URL error is logged. Existing fixture tools still refuse Vercel environments.
A real production build requires a separately reviewed configuration/branch/migration decision later.

## Commands and actual results

| Command/check | Result |
|---|---|
| Root/backend `npx tsc --noEmit`; backend `npm run build` | Passed |
| Backend preview-mode `npm run build:vercel` (environment supplied in memory from local .env) | Passed: guard, Prisma 5.22 generation, TypeScript; no database writes |
| Backend `node --test tests/deployment.test.cjs tests/foundation.test.cjs tests/auth.test.mjs tests/households.test.mjs` | 29/29 passed (4 deployment, 10 foundation, 9 auth, 6 household) |
| Backend final `node --test tests/deployment.test.cjs` | 4/4 passed after safe diagnostic change |
| Backend `npm test -- --runInBand`; `npm run test:database` | Health 1/1; guards 4/4 passed |
| Root `node --experimental-strip-types --test tests/*.test.mjs` | 70/70 passed |
| Backend `npm run lint` | Existing exit 127: ESLint absent; mobile has no lint script |
| `npx --yes vercel@latest --version` / login / project link | CLI 63.1.2; user login and freshtrack-api link succeeded |
| `vercel deploy --dry --json` | Express detected; source-only upload reviewed; secrets/mobile excluded |
| Final `vercel deploy --yes --target preview --logs` | Cloud build and Preview deployment READY |
| `vercel curl <preview>/api/v1/health` | 200, preview environment |
| `vercel curl <preview>/api/v1/households/current` without Neon token | 401, safe UNAUTHORIZED envelope |
| Plain public health request after approved hosting change | 200, preview environment |
| Public identity/household requests without token; identity with invalid token | All 401 UNAUTHORIZED |
| Both `npx tsc --noEmit` checks after local environment update | Passed |
| Read-only `npm audit --omit=dev --json` | Exit 0, zero runtime vulnerabilities |
| Cloud full install audit | Existing 36 findings (5 moderate, 31 high); dev-tool dependency review remains |
| `git diff --check` and credential/debug review | Passed |

Vercel assigns the first deployment to production even with `--target preview` in this CLI flow.
The guard stopped that first attempt before generation/writes; there is a failed production-target
record, no working production API. The next attempt was correctly Preview but required explicit
NODE_ENV=production. After that setting, the final hosted build passed. Neither failure weakened the
guard or copied development credentials into Production. Initial schema-check attempts lacked a
validator/draft-04 meta-schema; generic schema constraints passed with meta-validation skipped, and
Vercel CLI/cloud accepted the actual config. One initial npm build invocation ran from the wrong
(root) directory; corrected backend builds passed. Native/device exports were not repeated because
no UI/native/runtime mobile code changed. User subsequently confirmed Settings → Check Backend
Identity succeeds on iPhone against this HTTPS Preview. This verifies provider-issued JWT identity
through the hosted function. It does not query Prisma; hosted database access remains unverified.
Local/live development isolation evidence remains in item 3.

## Remaining work and exact next step

The iPhone hosted identity check passed by user report on 11 October 2026. The next check is an
authenticated household read through the hosted function to verify its Prisma/Neon connection.
Development-only Settings → Check Backend Database now verifies matching backend identity, then
uses the same transient JWT for `GET /api/v1/households/current`. A valid household response or the
specific `HOUSEHOLD_NOT_FOUND` envelope confirms the scoped query completed; generic 404s, 401s,
service errors and malformed responses fail the check. It does not bootstrap, mutate, persist tokens,
or connect the mock Pantry to real data. Native hosted result is pending the user's iPhone test.
Keep data on Neon development.
Then Phase 3 item 6: final acceptance/review and checkpoint. Production release, Git integration
permissions and development-tool dependency findings remain separate follow-up work. Pantry
persistence/endpoints and mutation/event transactions still belong to Phase 4.

Probe validation: both `npx tsc --noEmit` checks pass; root strip-types tests 73/73 pass, including
read-only requests, expected no-household versus failures, and mismatched identity blocking.
Backend `npm test -- --runInBand` passes 1/1 after permitting its temporary localhost listener
(initial sandbox EPERM). Backend lint still exits 127 because ESLint is absent; mobile has no lint script.
`npx expo export --platform all --output-dir /private/tmp/freshtrack-phase3-db-check-export` passes
for web, iOS and Android (34 static routes). Exports do not prove native interaction or hosted DB access.

References: [Express entry/export support](https://vercel.com/docs/frameworks/backend/express),
[Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json),
[Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
[Prisma build generation](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel),
[environments](https://vercel.com/docs/deployments/environments).
Prisma v6 guidance was checked against installed 5.22; no newer generator/adapter APIs were adopted.
