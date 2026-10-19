# Phase 6 — receipt recovery and bounded unassigned review

19 October 2026. Focused quality slice implemented and verified automatically; the phone checks below remain pending. Phase 6 final review has not been completed.

## Issues found and focused fixes

1. **Unassigned OCR lines mounted every source card.** The parser already bounds input to 500 strings and grocery review to fifty rows, but opening unassigned lines could still mount 500 cards with buttons. Added `receiptUnassignedPage`, rendering ten source cards per page. First/Previous/Next/Last controls preserve global name/amount selections and stable source IDs. Removing/saving a grocery filters used sources and clamps the current page rather than showing an empty invalid page. Original text is not dropped. The diagnostic fixture text preview is also bounded to ten lines, with a notice that all sources remain available in review; this avoids scrolling through 500 raw fixture strings before reaching the controls.
2. **Every OCR error offered device settings.** The OCR controller now retains its safe error code. Only permission errors offer Open Device Settings. Image preparation and recognition failures keep their appropriate choose-photo/read retry paths, with the existing generic/redacted messages. Starting another operation, recovery and Clear reset that code. Existing image/text retention on picker cancellation and prior-photo retention on permission denial are preserved.
3. **Matching buttons had repeated screen-reader labels.** Added an optional accessibility-label override to the reusable PrimaryButton without changing its appearance/default labels. Unassigned name/amount actions now include their source text and selection wording; manual-review labels use at most 120 characters. Button roles/disabled state and safe-area/keyboard behavior remain existing components. Consulted the installed RN0.86 types and [official RN0.86 accessibility documentation](https://reactnative.dev/docs/0.86/accessibility). Android live-region text is not claimed as an iOS VoiceOver announcement or a full assistive-technology audit.

Added centralized, development-only **Unassigned lines (500)** fixture to the existing local review exercise: one header, an unknown grocery name, 497 unclear lines and one INR amount. It cannot send an import or add groceries. This does not expand the twenty-food expiry catalogue.

## Automated evidence

- Mobile `npx tsc --noEmit`: pass.
- Backend `npx tsc --noEmit` and `npm run build`: pass.
- `node --experimental-strip-types --test tests/*.test.mjs`: **362/362**, no skips. Six new tests verify permission-denial image retention/library recovery; image/read error codes and redaction; empty/read retry/Clear; stale account/navigation errors; complete one-to-one traversal of 500 sources with at most ten visible cards; cross-page matching/Cancel/save/exact ₹40 reviewed payload/removal; and page clamping after source removal.
- Backend `node --test tests/receipt-import.test.cjs`: **5/5** with local test listeners; no database/provider access.
- `npx expo export --platform all --output-dir /private/tmp/freshtrack-receipt-quality-final-export`: pass, **40 static routes**, iOS/Android bundles.
- `npx --yes expo-doctor`: **20/21**; the five existing Expo/linking/notifications/router/splash patch mismatches remain.
- Backend `npm run lint`: exit **127**, pre-existing missing ESLint. Root has no lint script.
- `git diff --check`: pass.

Logs: `/private/tmp/freshtrack-receipt-quality-{tests,export,doctor,metro}.log`.

The previous Metro process was no longer listening; the initial manifest request received connection refused. Restarted only the existing development server on 8087 with the existing local app identity. Current LAN address is **192.168.1.19**. Final iOS manifest/bundle requests return HTTP200 and contain the new fixture, page controls, error routing and accessibility labels. An initial static bundle-token assertion included a colon created by template concatenation; checking the compiled static label fragments instead passed. No feature code change was required for that assertion.

No native module, native rebuild, package/lockfile, backend/schema, environment-file, Auth/provider setting or deployment change. No existing household groceries were changed. The previously installed FreshTrack Dev supports this JavaScript update. No new physical-device observation or acceptance is claimed yet.

## What this evidence does and does not establish

- Tests exercise state/source/payload behavior, not real OS permission dialogs or screen-reader speech.
- At most ten unassigned source cards now mount. This is a bounded render change, not a measured iPhone/Android frame-rate, memory or worst-case latency result. Fifty-item grocery/column pages remain ten cards each.
- Existing OCR generation/account/navigation guards discard late results. Image disposal is still best-effort and limited to app cache URIs; original Photos-library assets are not deleted. This slice does not prove cleanup after process termination or add a background retention sweep.
- Recognition failures retain the selected image for explicit retry; unreadable/empty/unknown layouts retain manual entry. The native iOS module bounds local files/pixels/text; Android position recognition and native Android QA remain unverified.
- Public receipt recognition is still partial: earlier pinned macOS evidence offers four purchase associations, only three exact names+amounts, across ten grocery rows. No broad receipt-accuracy improvement is claimed in this quality slice.

## Pending iPhone checks — no imports or Pantry changes

Use FreshTrack Dev, not Expo Go; keep the laptop awake and both devices on the laptop's network. Reload using `http://192.168.1.19:8087` in the development launcher if needed. Sign in to the real account.

1. On iPhone Settings → Apps → FreshTrack Dev, turn **Camera Off**. Return to FreshTrack (reopen/sign in if iOS restarts it), then Scanner → **Receipt OCR** → **Photograph Receipt**. Expect a permission message and **Open Device Settings**. **Choose Receipt Photo** should still open the photo picker; cancel it without selecting a photo.
2. Tap Photograph Receipt again to show the permission message. Tap **Open Device Settings**, turn Camera On, return to FreshTrack and wait for any session check. Tap Photograph Receipt; the camera should open. Cancel the camera: the app should stay usable, without a stuck loading state.
3. Photograph a plain blank sheet in good light, keeping printed text out of frame. Tap **Read Text on Device**: expect No text detected (report any stray recognized text). The image should remain, and **Read Text on Device** should remain usable. Choose Receipt Photo → Cancel: the previous image/result should remain. Go back to Scanner and reopen Receipt OCR: unconfirmed photo/text/reviews should be gone. Do not import.
4. Scanner → **Test Receipt Layout Review** → **Unassigned lines (500)** (last fixture). Scroll below the fixture text to **Show Unassigned Lines (500)**. Expect page 1/50, ten source cards and First/Previous disabled. On **Unclear grocery Alpha**, tap **Use as Item Name**. Next Lines then Previous Lines should retain that selected name.
5. Tap **Last Lines**: expect page 50/50 and Next/Last disabled. On **₹40.00**, tap **Use as Amount**. Scroll up within the review to **Review Matched Lines**: expect Alpha/40.00 with quantity/unit/date blank. Tap **Cancel Edit**: both matching choices remain, with no grocery saved and 500 unassigned lines.
6. Tap **Review Matched Lines** again. Enter quantity **1**, unit **piece** and manual expiry **2026-11-30**; keep value40.00 and leave package/estimate blank. **Save Grocery Review** should produce exactly one reviewed/selected Alpha grocery, 498 unassigned lines and a valid current page. **Preview Reviewed Haul** → **Preview Confirmed Fields (Local Only)** must show only that grocery, 1 piece / ₹40 / 2026-11-30. Nothing is sent or saved.
7. **Back to Review** → **Reset Layout Check**: the fixture returns to zero reviewed groceries and 500 available sources. Confirm paging responds without freezing. Return to Pantry: no Alpha sample was added. Restore Camera On if it is not already enabled.

Report any failing step/error without receipt contents or credentials. The result will be recorded as user-reported device evidence, not direct agent observation or automated OS testing.

## Exact next step

Complete and record the iPhone recovery/paging checklist, then perform the final Phase6 scope/acceptance review. Explicitly retain limited receipt accuracy, Android native QA, full screen-reader/large-text testing and device performance profiling as unresolved/deferred limits where evidence is absent. Barcode follow-up stays deferred per user. No Phase9 or store publishing starts automatically.
