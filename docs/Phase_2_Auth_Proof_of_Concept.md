# Phase 2 authentication proof of concept

Status (11 October 2026): this proof-of-concept slice passes user testing on iPhone/Expo Go;
the full Phase 2 acceptance gate remains open.
The user confirms real email delivery, fresh OTP acceptance and verified signed-in session on
iPhone/Expo Go. The original bearer transport failed restoration; the corrected provider-signed
session-cookie transport passed the native sign-in check. The user also confirms restoration after
restart and successful sign-out followed by a restart with no active session.

## Decision and scope

The user approved the lower-level Neon API proof of concept after reviewing the SDK gap.
The published `@neondatabase/auth` version is `0.5.0-beta`; its exports have no Expo adapter.
The proposed [Expo adapter](https://github.com/neondatabase/neon-js/pull/213) is still draft.
The older official React Native demo uses Stack Auth, so it is not proof of compatibility with
the selected Managed Better Auth service.

This small slice adds `/(auth)/native-check`, reachable from the development Welcome screen
through **Test Real Email Sign-In**. It uses the existing account/OTP typography, form and button
components. The existing mock authentication and kitchen screens remain available. This is
passwordless email-OTP registration/sign-in, not the full password sign-up/verification design.
No database schema, protected pantry API, OAuth, password recovery or production auth infrastructure
is implemented here. Phase 1 visual/native QA remains deferred by the user.

## Verified API contract

The development branch's `/open-api/generate-schema` was inspected without printing secrets.
Its schema exposes:

| Request | Body / response used |
| --- | --- |
| POST `/email-otp/send-verification-otp` | `{ email, type: 'sign-in' }` |
| POST `/sign-in/email-otp` | `{ email, otp, name }`; returns provider session token and user |
| GET `/get-session` | Provider session cookie; returns session and user, or null |
| POST `/sign-out` | Provider session cookie with empty object body |

The unauthenticated development `/get-session` returned HTTP 200 with a null session.
Although the generated schema labels bearer security, the returned raw session token did not
restore a session in the native check. The SDK identifies `__Secure-neon-auth.session_token` as
the primary cookie; the probe preserves its encoded, signed value from `Set-Cookie` rather than
manufacturing a cookie from the response's raw token. It ignores unrelated/cache cookies and
does not expose tokens in UI. User confirmed native cookie transport and authenticated session
verification, restart persistence and sign-out. No OTP was sent by the
agent or test account silently created.

Only public `EXPO_PUBLIC_NEON_AUTH_URL` and `EXPO_PUBLIC_NEON_AUTH_ORIGIN` are configured in
ignored root `.env.local`. Database credentials remain exclusively in ignored `backend/.env`.
The originally edited tracked environment template was restored before implementation.

Provider signed session-cookie material is stored in Expo SecureStore `~57.0.4`, keyed by the Auth endpoint.
It is not placed in React state, logs, URLs or ordinary browser storage. Session restoration always
checks the provider. Null/401 sessions remove stale secure material; temporary failures retain it
for retry. Sign-out requests provider revocation before clearing local storage. Persistence failure
attempts provider sign-out. This does not imply instant revocation of separately issued JWTs.
The proof of concept is disabled on web because a browser session adapter is outside this slice.

Sign-out initially failed with `MISSING_OR_NULL_ORIGIN`. Cookie-authenticated requests now include
Origin/Referer for the actual Expo development server, `http://192.168.1.21:8085`. The user explicitly
approved this development-only trusted domain; it was added in Neon Console and verified in
**Your trusted domains**. An earlier attempt to register `freshtrack://` was rejected by Neon
(`Scheme freshtrack is not allowed; use http or https`) and did not change the allowlist. CSRF checks
remain enabled. Production requires its own registered HTTPS application origin. If the LAN
address/port changes, update the local public origin and the development allowlist, then restart
Expo. No production settings changed. The user confirms the corrected sign-out passes on iPhone.

## Checks

- Mobile and backend `npx tsc --noEmit`: passed.
- `node --experimental-strip-types --test tests/*.test.mjs`: initially 37/37 passed, including six auth
  transport/storage tests. Existing Node module-type warnings remain. An initial parameter-property
  incompatibility with strip-only mode was fixed before the passing run.
- Following the native restoration failure, the complete suite passes 39/39; eight auth transport/cookie tests pass, including
  signed-cookie preservation, combined headers with Expires, and absent/deleted cookie handling.
- Backend `npm test -- --runInBand`: 1/1 passed after retry with localhost access; initial sandbox
  listener attempt failed with EPERM.
- `npx expo install --check`: dependencies up to date using the SDK 57 bundled map; offline-mode
  warning means this was not an online dependency check.
- `npx expo-doctor`: 21/21 passed with online access.
- `npx expo export --platform web --platform ios --platform android --output-dir
  /private/tmp/freshtrack-neon-auth-probe`: all three exports passed, including the new route.
- Final cookie-transport exports also passed for web/iOS/Android at
  `/private/tmp/freshtrack-neon-auth-cookie-probe`.
- Final Origin/Referer configuration exports passed for web/iOS/Android at
  `/private/tmp/freshtrack-neon-auth-final`.
- Backend `npm run lint`: existing failure, `eslint: command not found`. Mobile has no lint script.
- Installation reported 29 npm audit findings (11 moderate, 18 high); attribution and remediation
  were not part of this slice. No force upgrades were performed.

## Device acceptance checks

User-reported iPhone passes: email delivery, fresh-code sign-in, authenticated session verification,
session restoration after fully closing/reopening Expo Go, and sign-out followed by restart with
no session. Resend delivery was exercised during debugging. Deliberate incorrect/expired/reused
code and rate-limit checks, offline restoration and Android testing remain pending; unit fixtures
do not substitute for those provider/device checks.

Use an email the tester controls. Never send an OTP or session token to the agent.

1. Open Welcome → Test Real Email Sign-In on iPhone/Expo Go. Enter name/email; request the code.
2. Enter an incorrect code and confirm safe failure; enter the actual code and confirm a session.
3. Close/reopen FreshTrack; return to this check. Confirm the same identity restores from Neon.
4. Sign Out; restart and return. Confirm no session restores.
5. Request another code; verify cooldown, resend delivery, old-code/reuse rejection and expiry.
   Provider policy controls expiry and rate limiting; the UI does not invent an expiry duration.
6. Repeat restoration with no network, then reconnect and retry.
7. Repeat on Android when a device/emulator is available.

At the original proof-of-concept checkpoint, the next work was connecting the existing account
forms, protected navigation and backend identity verification. The forms follow-up is recorded below.
Phase 3 stays blocked until all Phase 2 acceptance criteria pass.

Sources: [Neon email OTP](https://neon.com/docs/auth/guides/plugins/email-otp),
[Neon overview](https://neon.com/docs/auth/overview),
[SDK package exports](https://github.com/neondatabase/neon-js/blob/main/packages/auth/package.json),
[SDK cookie constants](https://github.com/neondatabase/neon-js/blob/main/packages/auth/src/server/constants.ts),
[Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/).


## Existing forms follow-up

Remaining item 1 is implemented in the existing `sign-up`, `sign-in` and `verify-otp` routes.
See the current README and implementation-plan slice for commands and verification status.
Inspected schema also confirms `POST /sign-up/email`, `POST /sign-in/email` and
`POST /email-otp/verify-email`. Email verification resend calls the same send endpoint with
`type: 'email-verification'`. The [official verification guide](https://neon.com/docs/auth/guides/email-verification)
and [Email OTP guide](https://neon.com/docs/auth/guides/plugins/email-otp) confirm automatic code delivery
at sign-up and the distinct verify-email endpoint. The native transport decision is unchanged.
The full suite now passes 48/48. New-account sign-up/email/OTP passes user testing on iPhone;
password login, wrong-password rejection and both remember-device restart cases also pass by user
report. Verification resend and newest-code verification also pass user testing on iPhone. Protected routing
and backend verification remain future Phase 2 work.


## Protected navigation follow-up

Remaining item 2 is implemented and passes the core iPhone checks by user report. Authentication
now enters Home directly; Settings owns real identity display and Sign Out. The diagnostic route
uses the shared authority and is public only when outside kitchen access. Both auth forms and
private routes use a single provider-verified state. See README for commands/results and limits.
The suite passes 55/55. Backend verification is next; full Phase 2 remains incomplete.

Consulted [Expo protected-route documentation](https://docs.expo.dev/router/advanced/protected/)
and the installed SDK 57 types. Used `Stack.Protected guard`; did not use the SDK 58-only
`redirectTo` option. Guard changes remove disallowed route history, including nested kitchen screens.
These client checks do not authorize server data; that backend contract remains to be implemented.


### Backend identity checkpoint — 11 October 2026

Remaining item 3 is implemented. Authenticated `/token` supplies the API JWT, distinct from the
opaque session token. `GET /api/v1/auth/me` uses jose/JWKS EdDSA signature and issuer/audience/
expiry/subject/verified-email checks, returns only safe identity, rejects unauthenticated or forged
credentials, and fails closed during verification outages. JWKS is configured server-side from
Neon Auth's branch URL. No client userId is trusted and no database work was performed.

User reports iPhone Settings → Check Backend Identity succeeds. Live public JWKS and health
return 200; unauthenticated identity returns 401. Mobile/shared tests 60/60, backend auth tests 7/7,
health 1/1, both TypeScript checks, Doctor 21/21 and all-platform exports pass. Existing lint gaps
remain. See README for exact commands and local setup.

JWTs are held only for requests, never persisted. An already-issued JWT can remain valid for its
15-minute lifetime after provider sign-out. Immediate JWT revocation is not implemented; the
production policy remains a Phase 2 acceptance decision. Deliberate provider failure/offline checks,
Android checks and remaining production/acceptance review remain open. Phase 3 has not started.


### Failure/offline follow-up — 11 October 2026

User reports iPhone offline resume locks private routes and reconnect/Retry Session Check restores
the same account without OTP. Wrong-code rejection, correct-code retry and reused-code rejection
without replacement also pass. User confirmed actual Too many attempts and successful fresh-code
recovery. Email states a 10-minute lifetime; user reports expiry rejection and resend/new-code
recovery after the requested 11-minute wait. Item 4 is complete for iPhone development checks.
Non-JSON HTTP failure handling and verified/non-banned restoration were tightened; only safe
allowlisted error labels are shown. Use a Code Already Received on the existing development
diagnostic enables reuse/expiry checks without sending a replacement code. No dependency or
provider-policy change. 65/65 root tests, backend auth 7/7, health 1/1, both TypeScript checks, Doctor
21/21 and all-platform exports pass. See Phase_2_Failure_Checks.md for the result matrix.
Phase 2 remains open; no Phase 3 work.


## Final acceptance — 11 October 2026

The Phase 2 development gate is complete with the recorded iPhone user evidence, architecture
review and explicit acceptance of bounded 15-minute JWT validity for the MVP. Android/live
production/signing checks remain deferred. Final review fixed redaction/request-ID errors and
passed 70 root tests, nine backend auth/boundary tests, health 1/1, both TypeScript checks and
Doctor 21/21. See Phase_2_Final_Review.md and decisions/001-native-neon-auth.md. The final checkpoint
is `feat: validate native authentication and protected route flow` (see Git log). Phase 3 has not started.
