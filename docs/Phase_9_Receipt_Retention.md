# Phase 9 — receipt retention and restart cleanup

Implemented 20 October 2026. All eight requested iPhone checks passed by user report on 20 October; Phase 9 remains incomplete. No store publishing.

## Change

New receipt camera/picker copies are adopted into the app-cache directory `freshtrack-receipts-v1`. Only generated filenames directly inside that directory are eligible for recovery deletion. Files outside app cache are copied rather than moved; original library photos are preserved. No directory-wide ImagePicker, ImageManipulator or generic cache deletion is performed.

An in-memory reference count protects an active preview, asynchronous transfer and native OCR read. Clear/navigation releases the preview; finishing OCR releases its separate reference. After final release the managed image is removed. The confirmed import's pending/saved state also clears the photo and raw OCR state, while preserving the immutable reviewed fields needed for a retry. Cancel before confirmation retains the scan.

Startup and foreground recovery remove abandoned, unreferenced managed files, independently of authentication/network success. Account changes/sign-out also request recovery; account deletion checks recovery as part of device cleanup. No task runs while the app is terminated: cleanup happens the next time its JavaScript starts. The development client therefore still needs Metro. A failed deletion is reported by the Privacy control and blocks new capture until cleanup succeeds; manual grocery entry remains available.

Settings → Privacy & Data now shows the actual managed-copy count and **Clear Unused Receipt Photos**. It preserves files still in use, reports unreadable counts as unknown rather than zero, and never displays receipt paths/content. It uses existing theme tokens and screen components; no separate Settings design was supplied.

## Retention policy

| Data | Current behavior |
|---|---|
| Managed receipt image copies | While the scan/OCR uses them; released on Clear, leaving or confirmed import. Abandoned copies recovered on next startup/resume or manual cleanup. No fixed background timer. |
| Unconfirmed raw OCR strings, positions and review state | Memory only; discarded on Clear/leaving, confirmed import, or process termination. |
| Confirmed pending receipt fields | Existing account-scoped secure retry storage until successful import, explicit discard or sign-out/account cleanup. Contains reviewed fields/idempotency key, never image URI or raw OCR. No new TTL introduced. |
| Imported groceries, receipt import metadata and outcome events | Existing household database records; retained until supported account/data deletion. No new server retention/deletion job. |
| Recipe provider cache | Existing server-process cache with five-minute expiry; no receipt images or raw OCR. Process restart also drops it. |
| Saved Pantry copy | Existing secure snapshot of at most 20 groceries; rejected after 24 hours and cleared by sign-out/deletion. This is not a receipt photo cache. |
| Deleted-account deny marker | Existing one-way identity fingerprint and deletion time retained without a scheduled expiry to deny old-token access; provider backups are outside this mechanism. |

## Limits

- The camera/photo processor can create a default SDK file before returning its URI. Termination in that window can leave an unregistered SDK copy. Those files, legacy untracked copies, OS-managed copies and backups are outside this cleanup guarantee. Sweeping unrelated SDK directories would risk deleting other files.
- This is deletion of managed cache entries, not forensic erasure. The OS may evict cache files at any time. No image uploads, backend/schema/provider changes, new dependencies or native rebuild are part of this slice.
- The counter covers only recognized files in the owned directory, not all device storage. Android runtime behavior and native filesystem forensics have not been verified.
- Existing account-deletion acceptance remains user-reported; no accounts or groceries were changed by this slice.

## Verification

Fresh commands on 20 October:

| Command | Result |
|---|---|
| `npx tsc --noEmit` | Pass (mobile) |
| `node --experimental-strip-types --test tests/*.test.mjs` | 384/384 pass |
| `cd backend && npx tsc --noEmit` | Pass |
| `cd backend && npm run build` | Pass |
| Backend non-integration `*.test.cjs`/`*.test.mjs` Node suite | 151/151 pass |
| `cd backend && npm test -- --runInBand` | Health 1/1 pass |
| `npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-phase9-retention-export-verified` | Pass: iOS, Android and web; 41 static routes |
| `npx --yes expo-doctor` | 20/21; existing five patch mismatches: Expo, Linking, Notifications, Router, Splash Screen |
| `cd backend && npm run lint` | Cannot run: `eslint: command not found` (exit 127, pre-existing). Root has no lint script. |
| `git diff --check` | Pass |
| Served iOS manifest and actual launch bundle | Both HTTP 200; new Privacy control and managed directory present |

Initial backend HTTP checks failed with sandbox `listen EPERM`; rerunning with local test listeners allowed passed. Initial sandbox export/Doctor runs were stopped and rerun with the required access; they are not counted as successful checks. No live database/provider tests were needed for this mobile-only slice.

Eleven new tests use disposable filesystem fixtures. They cover cold restart cleanup, original/unrelated/retry preservation, copy/move policy, live OCR protection, in-flight transfer protection, deletion and listing failures/recovery, partial-transfer cleanup, canonical paths/traversal rejection and filename collisions. A real OCR-store/import-controller/storage test confirms review/Cancel preserves the scan, confirmed pending import clears it, and restored retry fields remain intact without image URI/raw OCR or network/Pantry writes. Fixtures are removed after tests.

## iPhone acceptance — 20 October

User answered “All checks passed” to the eight-step checklist: opening the normal development app, zero-count/manual cleanup, selecting and reading a receipt, preview retention across resume/picker Cancel, Clear removing photo/text with zero managed copies, force-closing while a preview was visible and reopening with zero copies/no previous scan, Back cleanup, and original Photos-library preservation with Pantry unchanged.

This is user-reported functional evidence, not direct agent observation or filesystem forensics. Confirmed-import photo cleanup is covered by the automated controller test, not this phone checklist. Android runtime and SDK pre-return/legacy/backup cleanup remain unverified or outside scope. No runtime changes or automated test reruns were needed to record this acceptance; `git diff --check` was run.

## Next step

Continue with the Phase 9 security and household-authorization review, followed by tooling/reliability and personal-use-build work. Barcode follow-up remains deferred, twenty-food coverage unchanged, and store submission is excluded.

## SDK references

- [Expo SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/): awaited file move/copy, scoped file deletion and directory listing.
- [Expo SDK 57 ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/): image export writes to SDK cache; no custom destination argument.
