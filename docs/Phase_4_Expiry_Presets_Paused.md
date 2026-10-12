# Phase 4 expiry presets — paused at user request

Historical pause on 12 October 2026 because the user needed to close the laptop. User subsequently requested resume; see [current report](Phase_4_Expiry_Presets.md).

## Saved work (not deployed or device-accepted)

- Shared typed expiry selection and pure calendar calculator: package date > manual date > preset estimate.
- Central milk 7 / spinach 5 / bread 5 day assumptions plus Produce/Dairy/Bakery defaults; editable 1–365 days per entry, explicitly not food-safety guarantees.
- Shared real-household Add/Edit expiry fields, source summary, starting date and editable duration. Demo forms preserved.
- Backend validates date/source consistency and persists existing expiry provenance/base-date fields without a schema migration or dependency change.
- Real Pantry package badge uses “Package date”, avoiding a claim that a manually supplied date was verified.
- Regression tests added for boundaries, precedence, validation, rehydration and live persistence/history/replay.

## Checks before pause

- Mobile `npx tsc --noEmit`: passed.
- Backend `npm run build`: passed.
- Root strip-types suite: 84/84 passed.
- Backend auth/household/foundation/deployment/Pantry suite: 38/38 passed after allowing temporary localhost listeners; initial sandbox run failed with EPERM.
- Health Jest test: 1/1 passed.
- Live development Pantry suite: 12/12 passed; its final cleanup hook passed, asserting fixture households and memberships were removed. No pending test cleanup.
- No new Preview deployed, ignored mobile API URL unchanged, no iPhone acceptance performed.
- Expo Doctor, exports, explicit backend noEmit, lint and final diff review remain pending for this slice.

## Resume next

Inspect Git status and this note; review current changes, especially estimate-base-date metadata when switching to manual/package dates and legacy edit behavior. Finish pending checks and review, deploy only the dedicated development Preview, then request iPhone expiry-estimate/precedence/restart checks. Keep Phase 5 out of scope. Existing verified batch/undo deployment remains available.
