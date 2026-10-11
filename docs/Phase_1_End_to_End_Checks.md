# Phase 1 — End-to-end prototype checks

11 October 2026. Scope: remaining-work item 4 only. Visual matching, general native
accessibility/layout QA and auth/OTP QA (items 1–3) are deferred at the user's request.
All operations use in-memory demo data. No integration or dependency changes.

## Evidence

| Flow | Browser, directly observed | iPhone Expo Go, user reported | Android |
|---|---|---|---|
| App launch | Pass | Pass after initial connection issue | Not available |
| Recipe details/missing ingredients | Pass | Pass | Not verified |
| Shopping deduplication/purchased clearing | Pass | Pass | Not verified |
| Cooking cancel/confirm/shared Insights outcome | Pass: $92.98, 2 used, repeat disabled | Pass | Not verified |
| Preference validation/save/navigation | Pass: invalid 25:99; 18:30 persists | Pass | Not verified |
| Report preview | Pass: $92.98 | Pass | Not verified |
| Native share sheet open/cancel | Not applicable | Pass | Not verified |
| Receipt edit/review/import | Pass: 3 entries with duplicate skipped | Pass | Not verified |
| Barcode duplicate/add separately | Pass: two chips purchases, $7.98 filtered value | Pass | Not verified |
| Reconciliation cancel/confirm | Pass: expired milk retained on cancel, removed on confirm; $16.69 | Pass | Not verified |

Browser report download-event confirmation timed out in this run. Do not infer a failed
application export or a successful download from that timeout. Earlier web-export evidence
is retained in README; native share-sheet verification here is user reported.

No simulator tool (`simctl`) or Android `adb`/emulator was available on this Mac.
Local Expo server listens on port 8084; iOS manifest check returned HTTP 200 with a LAN
bundle URL. The user confirmed FreshTrack opens in Expo Go on an iPhone. This verifies
an iOS launch, not all native acceptance criteria or Android compatibility.

## Repeatable iPhone sequence

Start a fresh demo session. Use dummy auth details and the public demo OTP `123456`
if the welcome/auth flow is shown. Do not reload during a sequence: reloading resets data.
Allow only the simulated Scanner permission inside FreshTrack; no real camera is used.

1. Recipes → Garlic Ricotta & Crispy Spinach Rigatoni. Available pantry entries are spinach
   and Horizon milk. Add Missing twice; shopping has two entries: pasta and ricotta.
   Check pasta and clear purchased; only ricotta remains.
2. Return to the recipe. Save toggles independently. I Cooked This → Cancel keeps pantry
   entries. Confirm Cooked marks both complete entries used; repeating is disabled.
   Insights This Month shows $92.98 (sample $84.50 + confirmed $8.48), 2 used, 0 wasted.
3. Insights → Adjust Reminder Window. Save 25:99 shows validation. Save 18:30, leave
   and return; the value persists for this session. No notifications are scheduled.
4. Insights share arrow → report preview → Share Report. The iOS share sheet should
   contain the $92.98 report text. Cancel without sending; the app remains usable and
   inventory values do not change.
5. Scanner → Receipt OCR → Simulate Receipt Scan. Edit Whole Vitamin D Milk expiry to
   `2000-01-01`; save. Back to Review from confirmation makes no inventory changes.
   Review again and confirm. After cooking, the spinach purchase is no longer an active
   duplicate: all four receipt entries normally import, total $16.16. If a duplicate hint
   appears, review it explicitly and choose Add separately for this sequence. Edits reset
   duplicate choices, requiring review again. Suggested dates remain estimates; changed
   dates are user entered. No real OCR runs.
6. Change Scanner Mode → Barcode Scan → sample Kettle Sea Salt Chips. Simulate lookup,
   Use Estimate or Simulate Date Stamp, then Confirm Date & Next. The completed queue
   opens review automatically. Without a duplicate choice, Review Items to Add must fail.
   Add separately → Review Items to Add → Confirm Add Packaged Items. Pantry search
   for Kettle shows two independent purchases, $3.99 each. Existing purchase remains active.
7. Insights → Impact & Financial Analytics → Inventory Reconciliation. The imported milk
   appears as expired. Wasted → Cancel retains it. Confirm Waste removes it from the
   pending queue once; June Food Wasted becomes $16.69 ($12.40 sample + $4.29).

## Automated regression

`tests/prototype-flow.test.mjs` exercises one connected scenario with real centralized
fixtures and existing reducers: receipt duplicate rejection/skip, expired purchase import,
barcode duplicate separate purchase, shopping checked-state/deduplication, recipe identity,
confirmed cooking, reconciliation, immutable original fixtures and import/outcome replay.
Expected combined outcomes: $8.48 saved, $8.28 wasted, 2 used, 2 wasted, 8 active entries;
the report shows $92.98. This tests shared domain behavior, not native rendering or UI events.

- `node --experimental-strip-types --test tests/prototype-flow.test.mjs`: 1/1 passed.
- `node --experimental-strip-types --test tests/*.test.mjs`: 31/31 passed;
  existing Node module-type warnings remain.
- Root `npx tsc --noEmit`: exit 0.
- Backend `npx tsc --noEmit`: exit 0.
- `git diff --check`: exit 0.

The user reported both iPhone test batches working, including receipt, barcode duplicate and
reconciliation checks. These are user-reported results; the agent did not directly control or inspect
the iPhone. Android flows require an Android device/emulator. General safe-area/keyboard/accessibility/OTP and visual checks
remain outside this slice. Phase 1 remains in progress; Phase 2 is not authorized.
