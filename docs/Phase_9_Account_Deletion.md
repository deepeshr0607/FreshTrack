# Phase 9 — account/data deletion

19 October 2026. Implemented for the existing native development app; **live Neon deletion and iPhone acceptance remain pending on a disposable account**. No existing real account or household was deleted by the agent. This is not completed Phase9, store publishing or a standalone build.

## Workflow and boundaries

Settings → Account Details → Delete Account & Data opens an authenticated, read-only review. It shows counts of all household groceries (including outcomes/archives), events and receipt records without returning household/member IDs. Opening, refreshing and Cancel do not mutate data.

The form requires the signed-in email, exact `DELETE`, current password and an additional destructive native confirmation. The normal app first asks Neon to verify the password. Passwords and provider cookies go only to Neon, never to the FreshTrack API or its deletion table. The backend independently authorizes its own destructive request using its verified short-lived bearer identity plus explicit email/DELETE confirmation; the password check is part of the native workflow, not a separate server password-verification proof.

1. Refresh the server-side review and reject shared-household deletion.
2. Verify the current password directly with Neon. A failed verification stops before app-data deletion.
3. The backend serializable transaction writes a deny marker, removes events/items/receipt scans in foreign-key-safe order, then removes the sole-member household and cascading membership/preferences. Missing-household accounts still receive a marker. Shared households are not partially deleted or detached.
4. Lock the native session while clearing the saved Pantry copy, receipt/barcode purchase intents, notification outbox, account reminder preference and FreshTrack scheduled alerts. Existing storage writers are drained/invalidated; reminder preference writes/cleanup are serialized. Original Photos-library assets are unchanged.
5. Request Neon `/delete-user` using the current provider session/password. Only explicit `success: true` with `message: "User deleted"` counts as completion. A verification-email response is pending, not success. Clear the saved session and return to Welcome only on confirmed completion.

The Postgres transaction and provider request cannot be one atomic transaction. After step3, a later failure is explicitly shown as FreshTrack data deleted/locked with Neon deletion unconfirmed. Review/retry resumes the remaining work without recreating or deleting another household. An acknowledgement-loss API retry is idempotent. A stale confirmation cannot act on another signed-in subject. No provider key, password, token or raw receipt is persisted in a deletion intent.

If the provider completed deletion but its response was lost, the next session verification may return to Welcome because that provider session is gone. Server application data was already removed and device cleanup precedes the provider request. Actual provider failure/restart behavior still needs device acceptance; injected tests do not prove provider configuration.

## Deny marker and legacy API protection

Two additive application migrations add `AccountDeletion(subjectHash, createdAt)` and a membership insert/update trigger. No managed `neon_auth` schema/table is modified. The hash is SHA-256 over a fixed UTF-8 domain, NUL byte and provider subject, using the same bytes in Node/Postgres; no email, name, grocery or receipt content is stored. The marker is retained without automatic expiry to prevent the same still-existing provider identity from recreating data. It is pseudonymous retained data, not a claim of total erasure.

The current server denies protected application reads/writes for marked identities, including still-valid JWTs; it fails closed on marker/database-read failure. The account-deletion review/retry route deliberately still accepts those verified identities. Household setup rechecks inside its own transaction to close authorization/setup races. The database trigger also blocks a legacy deployment that tries to insert a new membership without the current app guard; the surrounding bootstrap transaction rolls back the attempted orphan household. Normal sign-out's previously accepted short-lived-token policy is otherwise unchanged.

Provider backups, historical deployments/copies and other devices are not remotely erased by this feature. Other devices must reverify sessions to lock their local UI; this slice does not claim forensic deletion of OS caches/backups or process-death receipt-cache sweeping. Generic recipe-response caching retains its existing five-minute expiry. Shared-household deletion and passwordless-account deletion are not supported by this password-required MVP flow.

## API

- `GET /api/v1/account/deletion`: identity-owned state `READY`, `SHARED_HOUSEHOLD` or `DATA_DELETED`, with bounded integer counts.
- `POST /api/v1/account/deletion`: JSON `{ email, confirmation: "DELETE" }` only. No user/household selectors, queries or password fields. Returns `DATA_DELETED` only after transaction success, not provider-account deletion.
- Authentication/no-store responses, bounded account request rate, safe structured errors and no raw driver/provider payload logging are retained.

## Verification

- Root `npx tsc --noEmit`: passed.
- Root `node --experimental-strip-types --test tests/*.test.mjs`: **373/373** passed. Covers workflow order, invalid confirmation boundaries, wrong-password/no-data-write, partial stages/retry, response validation, serialized auth locking/stale-subject rejection, outbox cleanup and explicit provider acknowledgement.
- Backend `npx tsc --noEmit` and `npm run build`: passed.
- Backend non-integration Node suite: **151/151** passed, including seven new service/HTTP/guard tests.
- Backend `npm test -- --runInBand`: health **1/1** passed.
- Guarded live deletion integration tests: **5/5**, including real FK deletion/cascades, another household preserved, shared membership protection, late rollback, application setup blocking and legacy bootstrap database rejection. Only run-created synthetic households/markers are affected; cleanup assertions pass.
- Existing guarded live household integration: **5/5**, including bootstrap/concurrency/isolation. Run-created fixture cleanup completed.
- Development migrations applied through `scripts/database.cjs migrate`: target guard and managed-auth structure fingerprint unchanged. Read-only database readiness passed after the marker migration; the guard migration and subsequent live tests also passed.
- Pinned backend Prisma5.22 client generation passed. An initial root `npx prisma generate` attempted a registry lookup and failed DNS; switched to the existing backend `npx --no-install prisma generate`, with no dependency/lockfile upgrade.
- Initial live deletion fixture attempt failed because its synthetic IMPORTED receipt omitted `importedAt`. All attempted fixtures were cleaned up. Fixed the fixture; actual live checks above then passed. No runtime constraint was weakened.
- All-platform Expo export: **41 routes**, web/iOS/Android passed. Compilation is not native/runtime acceptance.
- Expo Doctor **20/21**: the same five existing SDK patch mismatches remain. Backend lint **exit127**, ESLint still missing; no root lint script.
- `git diff --check` and tracked diff credential-pattern review passed.

## Development deployment/device preparation

Development-only Preview: `https://freshtrack-b0c1jjx67-dragon-2818.vercel.app`, build Ready. Public health200; tokenless account review401 and Pantry401. The ignored mobile public API URL now points here; auth settings/secrets are unchanged. Metro8087 was restarted with diagnostics off. Actual iOS manifest/bundle200 and bundled new API/screen verified; no native rebuild or production deployment.

The branch's public OpenAPI schema returns the documented `/verify-password` and `/delete-user` contracts. An unauthenticated/no-account-identifier capability probe returns401UNAUTHORIZED. This is **not live deletion acceptance** and does not prove the managed branch enables every deletion option. Device acceptance must use a separate, disposable verified email account, never the user's main account.

## Next step

Run the numbered disposable-account iPhone check: review/Cancel, destructive-dialog Cancel, wrong password preserving its grocery, real provider deletion, restart/rejected old login, and main account unchanged. If provider deletion is unconfirmed, stop and report the safe label; do not call the feature complete. Then continue remaining Phase9 retention/reliability/security/tooling/personal-use-build work. Barcode follow-up remains deferred, the twenty-food limit remains closed, and store submission/publishing remains excluded.

## Primary references

- [Neon user management](https://neon.com/docs/auth/guides/user-management) and the branch's public OpenAPI deletion/password schemas inspected during this work.
- [Better Auth user deletion](https://better-auth.com/docs/concepts/users-accounts): provider configuration/verification requirements must be respected, not bypassed by modifying managed auth tables.
- [PostgreSQL binary-string functions](https://www.postgresql.org/docs/current/functions-binarystring.html): built-in SHA-256 and UTF-8 byte encoding used by the application-table guard.
