# Phase 5 item 8 — live overdue reconciliation

Implemented on 14 October 2026 after user authorization. The user reported the iPhone checklist passed. Final Phase 5 review
and broader native QA remain pending. No Phase 6 work.

## Screens and behavior

Pantry and the existing nested Financial Analytics screen now share a live Inventory Reconciliation
banner. It reports the whole-household overdue count independent of Pantry search/category filters
and opens the protected /pantry/reconcile route. Loading/unavailable states provide safe feedback;
zero overdue hides the banner. A cached read-only Pantry offers online refresh before outcomes.

The new route presents live expired ACTIVE entries, searchable by normalized name, with exact
quantity/INR values, individual Used/Wasted choices and selection for batches up to twenty. It loads
twenty cards initially with Show More, within the existing 1,000-active-item live-read bound. No-match,
empty, loading/error and read-only states are explicit. Unknown price and zero/free price stay
distinct. Searching or refreshing clears selection; pending notification outcomes cannot be selected
or confirmed again. Queue conflicts are also enforced in the existing Context mutation boundary.

Each action opens the existing cancellable confirmation sheet with the exact reviewed versions and
one stable key. Single entries use the same one-entry atomic batch contract as groups. Retry after
an error retains the original rows/key; a fresh selection creates a new request. Current backend
version/session/household/idempotency checks and transactional event insertion remain authoritative.
Cancel changes no item. Successful acknowledgement uses the existing Context path to refresh Pantry,
overdue discovery, saved copy, notification cancellation/reconciliation and Last Outcome/Undo state.
No automatic consumed/assumed-consumed status, estimated savings or analytics event classification
is inferred from mere expiry.

The supplied Pantry/financial PNGs and theme tokens were inspected. The supplied designs have no
separate reconciliation-page PNG; this route extends the existing card/pill/batch/confirmation
patterns using Plus Jakarta Sans, safe areas, keyboard handling and constrained responsive width.
The existing tab structure is unchanged. Normal Back uses history with a Pantry fallback for direct
links. Native visual/dynamic-text/gesture verification is not claimed by compilation or unit tests.

For real accounts, the financial screen's old mock reconciliation controls are replaced by the live
banner. Its financial charts/metrics remain explicitly labeled samples until Phase 8. Demo keeps its
existing mock reconciliation and never enters real data through this feature. This adds no duplicate
dashboard, new dependency, API/schema/migration, backend runtime or deployment change. The read-only
item 7 coordinator continues to own live discovery; the development inspector remains available.

## Actual checks before the phone test

| Command/check | Result |
|---|---|
| Root `npx tsc --noEmit` | Passed |
| Backend `npx tsc --noEmit` / `npm run build` | Passed |
| `node --experimental-strip-types --test tests/*.test.mjs` | 172/172 passed, including six reconciliation tests |
| Backend `node --test tests/auth.test.mjs tests/households.test.mjs tests/foundation.test.cjs tests/pantry.test.cjs tests/database-guard.test.cjs tests/deployment.test.cjs` | 48/48 passed with temporary localhost listeners |
| Backend `npm test -- --runInBand` | Health 1/1 passed |
| Backend `env ALLOW_DEVELOPMENT_DATABASE_TESTS=true node --env-file=.env --test tests/pantry.integration.test.cjs` | 17/17 passed; after-hook fixture/membership cleanup assertions passed |
| `npx expo export --platform web --platform ios --platform android --output-dir /private/tmp/freshtrack-reconciliation-export` | Final exports passed on all three platforms, 35 routes including /pantry/reconcile |
| `npx expo-doctor` | 20/21; existing installed expo57.0.27/router57.0.25/splash57.0.9 versus recommended 57.0.28/57.0.26/57.0.10. No dependency changes. |
| Root `npm run lint` | Existing missing script, exit 1 |
| Backend `npm run lint` | Existing ESLint missing, exit 127 |
| `git diff --check` / focused secret/debug review | Passed |
| Existing Expo tunnel `/status` | packager-status:running |

New tests cover literal/case/Unicode/space search; freezing exact selected versions, quantities and
known/unknown prices; readiness guards; pending-action group rejection; empty/duplicate/over-cap
selection; and missing/resolved/today/future entries. They do not exercise React Native touch/modal
rendering. Existing live tests verify atomic batch/undo replay, stale/foreign isolation, rollback,
immutable history and household-scoped reads. They operate only on guarded reserved synthetic
development households and clean them up; no real account fixture or production record was changed.
No cleanup is pending. Direct service/database tests are separate from hosted native acceptance.

## Numbered phone checklist

Use the existing Expo tunnel on mobile data, keep Metro awake, sign into the real account, and leave
reminders Off. Expect zero pending notification actions before testing this flow.

1. Pantry → Clear Filters → Refresh Pantry. Note the ready overdue baseline N from the existing
   development inspector. A zero baseline means no banner is shown yet.
2. Add Reconcile Test Used (value 60.50), Reconcile Test Unknown (value blank), and Reconcile Test Free
   (value 0.00). Each: Other, quantity 1, unit piece, Manual expiry 2000-01-01; package/estimate blank.
   These are deliberate development records, independent of the phone's current calendar date.
3. Expect banner N+3. Review Expired Items → search “rEcOnCiLe   tEsT”: expect the three rows with
   ₹60.50, Unknown value and ₹0.00 respectively.
4. Used on the Used sample → Cancel: unchanged. Repeat → Confirm Used: only that row disappears,
   total becomes N+2, and the filtered review contains Unknown and Free.
5. Select Visible (up to 20), with the search still limited to those two named samples. Mark Selected
   Wasted → Cancel: neither changes. Search no-such-reconcile-item: no-match and selection cleared.
   Search Reconcile Test again, select the two remaining samples and confirm Wasted. Expect both
   gone and count N; confirmation must distinguish Unknown from ₹0.00.
6. Back to Pantry → Undo Last Outcome → Cancel: both remain absent. Repeat → Confirm Restore:
   Unknown and Free return ACTIVE and banner N+2. The Used sample remains resolved.
7. Review Expired Items → search Reconcile Test → select only Unknown/Free → Mark Selected Used →
   Confirm Used: count returns to N and the named samples are gone from active review.
8. Restart Expo Go and Refresh Pantry: count N and no active Reconcile Test samples. If N is zero,
   the banner disappears; otherwise original overdue groceries remain untouched. Insights → Impact &
   Financial Analytics uses the same live banner/count while its sample metrics remain unchanged.

On 14 October the user answered “All checks passed” to the short question box after receiving
the eleven numbered phone steps. Recorded as user-reported passes for banner/search, single
and bulk cancellation/confirmation, Undo, restart and Financial Analytics entry. No individual
numeric counts or direct agent observation were supplied. Empty/all-caught-up, larger-list/20-cap, cached/failure/conflict,
pending-notification, sign-out/direct-link, Android/standalone and full visual/accessibility QA
remain separate native checks. Next: final Phase 5 review when authorized. This acceptance update changes documentation only;
root TypeScript and diff checks passed again. Prior runtime/live suites were not rerun.
