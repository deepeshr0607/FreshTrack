# Phase 2 final acceptance review

11 October 2026. Reviewed the existing repository at checkpoint `2b04009` (working tree initially
clean). Continued only Phase 2. [ADR 001](decisions/001-native-neon-auth.md) records the selected native
API approach, exact installed versions, storage/navigation/API boundaries and logout policy choice.

## Acceptance evidence

| Implementation-plan criterion | Result and evidence |
|---|---|
| New account completes six-digit OTP flow on a device | Passed by iPhone user report: signup/real email/verification; existing forms preserved |
| Incorrect, expired, reused and resent codes handled safely | Passed by iPhone user report using sign-in diagnostic for failure policy, signup verification resend separately; transport rejection/retry fixtures pass |
| Session survives restart and logout clears it | Passed by iPhone user report; Remember checked restores, unchecked does not; provider sign-out/restart passes |
| Public/protected routes redirect correctly | Passed by iPhone report and prior browser checks; serialized authority tests cover resume/failure/races |
| Backend rejects unauthenticated requests and derives subject | iPhone matching-account check passed; live unauthenticated API returned 401; generated-key tests reject forged/expired/wrong-branch claims |
| Document architecture and versions | ADR 001 accepted; user chose the current bounded 15-minute JWT policy for the MVP |

This is iPhone development acceptance with explicit deferrals, not production readiness or Android
certification. The Phase 2 development gate is complete with the recorded deferrals and accepted
MVP policy. Checkpoint: `feat: validate native authentication and protected route flow` (see Git log).

## Final review fixes

Pre-existing global parser/error handling could log raw malformed bodies in development and omitted
request IDs on some failures. The review fixed this at the existing HTTP boundary:

- Generate server-owned IDs before CORS/parsing; response X-Request-ID and error requestId agree.
- Reject unallowed origins with safe 403; never echo/log the supplied origin.
- Structured redacted error/startup/shutdown records replace raw errors and legacy console.log.
- Malformed requests, CORS, not-found and rate-limit errors use a consistent safe envelope.
- Two additional backend tests prove secret-like input redaction and request-ID consistency.

No mobile UI, dependency, database/schema, data endpoint or production account setting changed.

## Commands and actual results

- Root `npx tsc --noEmit`: exit 0.
- Backend `npx tsc --noEmit`: exit 0.
- Root `node --experimental-strip-types --test tests/*.test.mjs`: 70/70 passed.
- Backend `npm run test:auth`: build exit 0; 9/9 passed, including two new boundary tests.
- Backend `npm test -- --runInBand`: health 1/1 passed.
- `npx expo-doctor`: 21/21 passed.
- Backend `npm run lint`: pre-existing exit 127 (`eslint` absent); mobile has no lint script.
- Last all-platform export at the preceding release-preparation checkpoint passed for iOS/Android/web
  and 34 static routes. It was not repeated for this backend-only review; no mobile/config source changed.
- `git diff --check` and source/documentation credential/debug scan: passed.
- Existing module-type warnings remain. Dependency audit findings recorded earlier were not resolved
  by broad upgrades. No EAS/cloud build or production service check was performed.

## Accepted policy and remaining deferrals

Current logout clears/revokes the provider/native session, but already-issued API JWTs remain valid
for approximately fifteen minutes (five-second clock tolerance). The user explicitly accepted this
MVP window. Immediate server revocation is not implemented or required for this MVP decision.
No Phase 3 database work was introduced.

User-authorized deferrals: Android device/emulator QA; paid Apple membership/signing; actual native
IDs/EAS linking; production HTTPS services/branch origins/SMTP; standalone release verification.
These remain prerequisites before the corresponding platform's production publication, not completed
tests. Phase 1 visual/general-native/auth-accessibility/account-deletion UI work remains deferred.

Save this review in the Phase 2 checkpoint. Phase 3 may start only when explicitly asked;
its first slice is the existing plan's schema/API foundation, using the verified backend subject and
household scoping. No migration or data endpoint has run in this review.
