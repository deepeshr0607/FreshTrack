# Phase 2 authentication failure checks

Checkpoint: 11 October 2026. Phase 3 has not started. Real-device outcomes below are user reports,
not automated native observations. Never include passwords, OTPs, cookies or JWTs in reports.

## Verified coverage

| Scenario | Automated coverage | iPhone / real provider |
|---|---|---|
| Wrong password, correct password, remembered/unremembered restart | Existing typed fixtures/session/storage tests | Passed in item 1 |
| New account, verification resend and newest code | Existing transport fixtures | Passed in item 1 |
| Protected navigation and sign-out/history/deep links | Serialized session tests and prior browser checks | Passed in item 2 |
| Backend subject, invalid/expired/forged JWT, wrong branch, key failure | Seven tests with real test signatures | Valid JWT passed in item 3; unauthenticated local API returned 401 |
| Offline app resume locks private routes, reconnect/retry restores same account | Session and cookie-retention tests | Passed by user report in item 4 |
| Incorrect OTP, followed by successful retry | Safe provider-rejection fixtures | Passed by user report in item 4 |
| Reusing a successful OTP without requesting a replacement | INVALID_OTP rejection/retry fixture; cannot prove provider one-time use | Passed by user report in item 4 |
| Expired OTP | OTP_EXPIRED rejection/retry fixture | User reports rejection after the requested 11-minute wait; resend/new-code recovery passed |
| Verification attempt cap / rate-limit | TOO_MANY_ATTEMPTS and non-JSON HTTP 429 fixtures | User confirmed Too many attempts appeared; fresh code recovery passed |
| Non-JSON 401, gateway outage, malformed success, offline resend | Status-preservation, cookie cleanup/retention and retry fixtures | Automated coverage only |
| Unverified/banned restored identity | Sign-in rejection and cookie-clearing fixtures | Synthetic response coverage only |

User reports the email states a **10-minute** code lifetime and confirms the final test passed:
unused-code rejection after the requested 11-minute wait, private access blocked, then successful
resend/new-code recovery. Item 4 is complete for the iPhone development flow. No expiry policy
was changed. Final Phase 2 development acceptance is complete; the user accepted bounded JWT
validity for the MVP. Production/signing verification remains deferred.

Android remains unavailable. Existing Phase 1 visual/native QA remains deferred.

## Transport recovery policy

- OTP rejection never saves a session or enables private routes. A successful fresh code may retry.
- Only allowlisted error labels/messages are presented; provider bodies and unknown codes are not
  displayed or logged. A non-JSON 429 still reports TOO_MANY_ATTEMPTS; a non-JSON 401 still clears
  invalid saved sessions. Gateway/transport/malformed-success failures retain saved cookies for retry.
- Provider-restored identities must have verified email and must not be banned. Invalid identities
  clear local session material and cannot unlock the kitchen.
- App-resume verification hides/blocks private content while checking. Connectivity failure removes
  private access, retains secure material, and offers Welcome → Retry Session Check.
- Sign-out failure retains the session for a visible retry; success clears it. JWTs already issued
  can remain valid for their 15-minute lifetime; the user accepted this bounded validity for the MVP (ADR 001).

## Real-device instructions

Use only the development branch/account. Test Real Email Sign-In is a development diagnostic, not
production UI. Use a Code Already Received shows the same six-digit form without sending another
email, so existing-code expiry/reuse can be tested without replacement invalidation.

1. Offline recovery: keep Expo Go loaded; disable Wi-Fi and cellular internet, background/resume.
   Expect Welcome with a verification error and private-route blocking after the request finishes.
   Reconnect and Retry Session Check; expect the same account without another OTP.
2. Wrong/reused OTP: request a sign-in code, try one incorrect code, then the correct code. Sign out,
   return with the same email and Use a Code Already Received. The previously successful code
   must be rejected without another email being sent. Record only pass/fail and safe error labels.
3. Attempt limit: request a fresh code and try deliberately wrong codes, stopping as soon as
   TOO_MANY_ATTEMPTS or a rate-limit response appears. Do not loop indefinitely or spam resends.
   Wait for cooldown, request a fresh code, then confirm successful recovery.
4. Expiry: request a fresh unused code. Wait beyond the expiry stated in its email/provider settings
   without resending. If no expiry is stated, report that rather than assuming a duration. Enter the
   old code with Use a Code Already Received; expect rejection. Resend and confirm recovery.

The UI's 30-second resend cooldown is a convenience, not proof of provider rate limiting. Neon owns
OTP expiry and verification attempt limits. No provider policy was changed for these tests.

Sources: [Neon email OTP](https://neon.com/docs/auth/guides/plugins/email-otp),
[Neon JWT plugin](https://neon.com/docs/auth/guides/plugins/jwt).
