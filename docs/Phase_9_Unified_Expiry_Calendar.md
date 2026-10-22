# Unified expiry date and calendar selection — 22 October 2026

User requested a single “Expiry date” field that contains an app estimate when available and stays blank otherwise, with calendar/scroll selection rather than typing. Chose a reusable calendar using existing React Native primitives; no additional package or SDK integration.

## Behavior

- Normal receipt-product review now displays the resolved existing date in one Expiry date calendar field, including supported fresh estimates and confirmed printed dates. Unsupported/unestimated entries display Choose a date. Existing source/provenance is preserved when opening, cancelling or confirming the same date.
- Selecting a different date replaces the earlier estimate/printed choice with a user-entered expiry selection. Clear removes every date source; Save does not silently reapply the fresh estimate. An explicit Use Fresh-Food Estimate action remains available. Blank/incomplete products still cannot pass final import validation.
- Real Pantry Add and item details use the same single field; existing explicit shelf-life actions remain. Estimate start dates also use a calendar; days stay numeric. Estimates are not newly inferred from arbitrary names and the shelf-life catalogue/durations are unchanged. Only the winning date/source remains persisted through the existing API.
- Receipt purchase date and printed-label correction use the same calendar. Package OCR and explicit printed-date confirmation remain separate from ordinary user-selected tracking dates. Demo Pantry expiry entry also uses the calendar. Diagnostic advanced date-source controls remain separate, with calendar inputs instead of typed dates.
- Calendar supports previous/next month, month/year grids, today, selected-day feedback, explicit Use Date, Clear and Cancel. Blank fields do not default to today on opening. Cancel/native back dismiss without changes; disabled fields cannot open/commit. Date-only ISO values are validated and constructed with UTC calendar arithmetic, not device-local midnight conversions. Safe-area/scrolling modal, labelled controls, selected/disabled accessibility states and spoken selected value are included. This is a calendar on iPhone and Android, not an iOS wheel control.

No backend/schema/provider/auth/dependency/environment/deployment or notification changes. No account/grocery writes by the agent. Paused decoder/advisory changes remain excluded.

## Verification

- Root `npx tsc --noEmit`, `npm run lint`: pass, zero lint warnings.
- Focused actual calendar/receipt TSX and pure-helper tests15/15 pass. Seven new checks cover leap/invalid dates and year/month boundaries, estimate/package provenance, Cancel/exact one-date commit, blank/today/clear semantics, month/year leap-day shortcut and disabled state, receipt Clear/Save/import guard, and actual shared Pantry resolved-date/replacement behavior. Existing receipt editor/payload test now chooses a calendar date and verifies the submitted expiry. Native/session hosts are injected; this is not iPhone rendering or saved database acceptance.
- Full `node --experimental-strip-types --test tests/*.test.mjs`:479/479 pass. Backend `npm run lint`, `npx tsc --noEmit`, `npm test` including build: pass,166/166. No live database fixtures were needed/run.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-expiry-calendar-export`: pass, iOS/Android/web,41 routes.
- Signed Xcode Release build: BUILD SUCCEEDED. Strict/deep `codesign` verification, same identifier and embedded calendar strings passed. Bundle SHA256 `4b4cdfa947b479c81d8d382f42031d5c627fd1dc45ae6d9c392c96928c096438`. Same-identifier iPhone installation returned success; device process launch also returned success. This verifies install/launch, not phone interaction or saved-data acceptance. No uninstall or Metro dependency.
- `git diff --check`: pass. Existing Node module-type/Expo color/native build warnings remain. Doctor was not rerun for this dependency-free change.
- Browser preview is unavailable in the current session; no agent visual acceptance is claimed. Device appearance/interaction review remains pending.

## Remaining

Phone checks: supported estimate prefill, blank unsupported/packaged entry, calendar month/year/Cancel/Clear/Use Date, local receipt Save, real Pantry add/edit/restart for one named development sample and no unrelated grocery changes. Package-label OCR/date correction is unchanged apart from its input control and is not newly accepted from synthetic UI tests. Android runtime/full accessibility/native profiling remain open. Existing Personal Team signing expires23October10:08:49AM IST. Phase9/security/reliability and paused decoder gaps remain; no store publishing.
