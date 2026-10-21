# Settings, account details and privacy UI — 22 October 2026

User approved the Analytics UI and authorized the next Settings/preferences slice. Read the repository instructions, README/current plan, existing Settings/profile/privacy/deletion routes, reminder/receipt privacy cards and their native/model boundaries. No separate Settings reference exists; retained the supplied design-system tokens and Dashboard visual direction.

## Changes and preserved behavior

- Shared Settings-only header, icon tiles, white section cards and emerald identity card use actual account name/email and generated initials. No fabricated profile photo, editable-account promise, theme toggle or unsupported preference.
- Main Settings groups Account & Privacy, Expiry Reminders, fixed household INR/Asia/Kolkata values and Session. Existing Account Details/Privacy routes, guarded sign-out, development-only diagnostics and separate Demo preferences remain connected.
- Reminder permission, On/Off preference, enable/disable, editable time, save feedback and scheduled count/next alert remain visible. Permission refresh/manual sync and scheduling guidance expand independently. All existing model, permission prompt, account scope, request guard, read-only sync restriction, queue and automatic scheduling behavior are unchanged.
- Signed-in Account Details displays read-only identity with a clearly labelled deletion-review link. The deletion form, requests, password checks and irreversible confirmation flow are untouched. Opening the link still only opens review.
- Privacy uses independent topic disclosures and a short on-device receipt summary. All eight original explanatory paragraphs were retained, including storage/retention exceptions and deletion limits; this remains a development-app data description rather than a published legal policy. Back/Done preserve public/authenticated fallbacks.
- Temporary-photo controls keep real managed-copy counts, in-use/failure feedback and explicit safe cleanup. Layout adds an original-photo reassurance and expandable explanation; recovery/file handling logic is unchanged.
- Safe area, keyboard avoidance, scrolling and bottom clearance remain in the existing shell. Section titles can wrap at narrow widths. No shared/global form or button changes.

No backend/schema/provider/dependency/environment/deployment changes and no account/grocery/notification preference writes by the agent. Paused Router decoder/advisory changes remain separate.

## Checks

- Root `npm run lint` (zero warnings), `npx tsc --noEmit`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`:462/462 pass. Eight new actual-TSX checks cover account/household data and route wiring; visible reminder state plus expanded sync; enable/disable/time callbacks; blocked permission/read-only guards; read-only account/deletion-review link; independent privacy/caveat disclosures; explicit temporary-photo cleanup/feedback; and real/Demo session separation. Providers/native/session/model hosts are injected. Invalid time is forwarded unchanged to the existing validated model; these UI checks do not themselves claim native permission, persistence or delivery acceptance. Existing reminder/session/storage model tests remain in the full run.
- Backend `npm run lint`, `npx tsc --noEmit`, `npm test` including build: pass,166/166. No live fixtures run for this presentation-only slice.
- A source comparison confirmed all eight original privacy explanation paragraphs remain present.
- Local synthetic TSX/RN Web preview server prepared, but browser inventory was empty and both the previous Chrome binding and in-app browser were unavailable. No agent visual approval is claimed. Temporary server stopped; iPhone visual review remains required.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-settings-ui-export`: pass, iOS/Android/web,41 routes. Signed Xcode Release build: BUILD SUCCEEDED; strict/deep `codesign` verification passed. Same identifier `com.deepeshr.freshtrack.development`; embedded Settings/reminder/privacy strings verified. Bundle SHA256 `f2b237be9208f73747cc3252eda2de5ddd7f5bb86f6461121287329461bd5dc4`. Existing Personal Team profile expires23October2026 at10:08:49AM IST; renewal remains required for continued local use after expiry. `devicectl` same-identifier update and launch both returned success. No uninstall or Metro dependency. This confirms installation/launch, not in-app appearance or functional acceptance. Existing Node module-type/color-environment/native warnings remain; no fresh Doctor claim.

## iPhone acceptance — 22 October 2026

User answered “Looks good — all checks passed” to the eight numbered checks covering appearance/actual identity/grouped controls, account/deletion review and Cancel without submission, privacy disclosures/unused-photo cleanup, no unsolicited permission prompt, invalid reminder time and original-time recovery, expanded permission/sync guidance, preference restart/household labels, and sign-out/blocked Back/relogin/unchanged Pantry. Sync was conditional on availability; that branch was not separately confirmed.

This is user-reported appearance and functional approval, not direct observation, filesystem forensics, new confirmed deletion, notification delivery, Android/runtime or full accessibility acceptance. Documentation-only acceptance update: prior automated results above were not rerun. No runtime, build, deployment, environment or household-data change in this update. `git diff --check` passed.

Settings UI review is complete. Remaining forms/dialogs can be reviewed next. Phase9 is still open with existing advisory, Android/runtime, installation/signing and documented reliability gaps. No store publishing.
