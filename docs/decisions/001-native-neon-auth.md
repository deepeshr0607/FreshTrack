# ADR 001 — Native Neon authentication and API identity

Date: 11 October 2026.
Status: accepted for MVP by the user on 11 October 2026; verified for iPhone development.
Scope: Phase 2 development acceptance. Production deployment and Phase 3 are not authorized here.

## Context and decision

FreshTrack needs its existing password sign-up, six-digit email verification, password login,
remember-device choice and protected Expo Router navigation to work in native Expo. At the original
SDK inspection, Neon Auth 0.5.0-beta had no published Expo adapter. The user explicitly selected
Neon's documented lower-level API proof of concept instead of waiting for an adapter. This record
reports that inspected SDK state, not a claim about every future package release. No Neon SDK is
installed in the mobile app and no self-hosted authentication service was created.

Use Neon Managed Better Auth APIs directly for native authentication. Preserve the provider's
signed/encoded cookie rather than fabricating one from its opaque session token. Keep provider
session material in Expo SecureStore for Remember checked, process memory for unchecked; clear
old persisted material when switching to unchecked. Cookies are scoped to the configured branch
endpoint. Do not put passwords, OTPs or session material in navigation params, React state identity,
logs or Git. Identity state contains only id/email/name.

The mobile authority serializes operations, independently verifies the accepted account with
get-session, checks on startup/resume, blocks private content while checking and locks the kitchen
on invalid/failed restoration. Temporary failures retain secure material for explicit retry.
Provider sign-out succeeds before local state is cleared; failures are visible and retryable.
Real sessions and explicit prototype demo access are separate. Native production disables demo.
Web remains a labeled prototype; real web authentication is outside this native proof of concept.

For backend API identity, request the provider JWT through authenticated GET /token. Hold it only
for the request and transmit it as Bearer over HTTPS (the development diagnostic permits private-LAN
HTTP). The opaque cookie/session token is not this JWT. Backend jose verifies EdDSA signature against
server-configured branch JWKS, Auth origin issuer/audience, subject/expiry/issued-at, 15-minute maximum
age, verified email and non-banned claims. Never use client userId, token-supplied key URLs or fake
identity headers. Missing/invalid credentials return 401; verification outages fail closed with 503.
Only GET /api/v1/auth/me exists as a protected acceptance endpoint; no data endpoints were built.

## Logout and revocation choice

Current implementation revokes the provider session and removes mobile kitchen access at sign-out.
An already-issued API JWT is independently valid until expiry/max age: approximately 15 minutes,
with five seconds of verifier clock tolerance. Ban/email/role changes represented only in a token
also cannot be assumed to invalidate that token immediately. The app does not persist JWTs, but this
is not server-side immediate revocation.

Accepted MVP policy: keep the existing short-lived, provider-issued JWT verification, explicitly
accept this bounded window and revisit immediate revocation before introducing features that need
instant server invalidation. An immediate-revocation requirement instead needs a separately designed
server-side mechanism and tests; it must not be claimed merely because the local UI signs out.
No revocation storage, database, new logout API or production policy has been deployed in this review.
The user explicitly chose the current 15-minute token policy for the MVP. Immediate API revocation
is not an MVP requirement; revisit this decision if future sensitive features need instant invalidation.

## Installed versions reviewed

| Component | Installed version |
|---|---|
| Expo | 57.0.27 |
| Expo Router | 57.0.25 |
| Expo SecureStore | 57.0.4 |
| React Native | 0.86.3 |
| Mobile TypeScript | 6.0.3 |
| Backend Express | 4.22.3 |
| Backend jose | 6.2.12 |
| Backend TypeScript | 5.9.3 |

Existing SDK/config/routes/designs were preserved. The backend remains CommonJS output with Node16
module resolution/native ESM import for jose. No dependency was added during the final review.

## Evidence and limits

All core iPhone outcomes are user reports, not automated native observations. Signup/email/OTP,
resend, wrong/correct password, remembered/unremembered restart, protected navigation, logout/history/
deep links and backend matching subject passed. Offline block/retry, incorrect/reused/expired sign-in
OTP, attempt cap and fresh-code recovery also passed. The email stated ten-minute OTP validity;
expiry was checked after the requested eleven-minute wait. Account verification and resend passed
separately; failure-policy native tests used the development passwordless sign-in diagnostic.

Backend signature/claim/unauthenticated/outage checks use generated test keys, not real credentials.
They prove verification behavior, not provider account policy by themselves. See the final review
and failure matrix for exact checks and attribution.

Android native testing is deferred by the user. Signed standalone iOS/Android and live production
Auth/origin/API/signing checks are deferred; local EAS/config resolution and Expo exports do not
prove them. The user has no paid Apple Developer membership and can continue in Expo Go.
Phase 1 visual/native/accessibility/account-deletion UI QA remains deferred. Password recovery,
OAuth/biometrics, database, persistence, camera/OCR, notifications and recipe APIs remain later work.

## Sources

[Neon Email OTP](https://neon.com/docs/auth/guides/plugins/email-otp),
[Neon JWT plugin](https://neon.com/docs/auth/guides/plugins/jwt),
[Neon SDK package](https://github.com/neondatabase/neon-js/blob/main/packages/auth/package.json),
[Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/),
[Expo protected routes](https://docs.expo.dev/router/advanced/protected/),
[Expo release profiles](https://docs.expo.dev/build/eas-json/).
