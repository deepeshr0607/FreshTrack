# Dashboard usability refresh — 21 October 2026

The user requested a more visual, interactive app, starting with Dashboard. This slice changes only the normal Home page and its presentation/data helpers. The remaining page redesigns are not implemented in this pass. The earlier decoder task remains paused and its unrelated working-tree changes are preserved.

## Design and interactions

Reviewed `design-reference/freshtrack_dynamic_hub/screen.png`, its HTML, and the existing design tokens. The refresh keeps emerald, the lilac surface, Plus Jakarta Sans, rounded cards, the supplied meal artwork and existing navigation dock.

- Personalized greeting and actual account initials replace the generic account picture on this page.
- A short visual kitchen-digest hero changes with empty Pantry, upcoming expiry, overdue groceries and Shopping mode. Its CTA opens Pantry, the existing reconciliation screen, receipt capture or the shopping list as appropriate.
- Inventory and recorded-value cards are tappable. They show exact active-entry counts and known whole-entry INR values, not invented savings. Unknown costs stay excluded; priced-item coverage is visible. A zero-cost purchase is distinct from an unknown price.
- Scan receipt, Add item and Shopping list quick actions open their existing routes.
- Use-first, Overdue and All-item controls filter the horizontal expiry cards. Cards open actual item details; their secondary action opens recipe discovery or item review. Printed/manual/estimated expiry provenance remains visible. No Used/Wasted outcome is performed by the Dashboard.
- A photo-led meal-inspiration card opens Recipes. It is an illustration/entry point, not a fabricated provider recipe or automatic paid search.
- Recent additions sort by actual creation time and open item details. Insights and Settings remain directly accessible.
- Shopping mode changes the hero immediately and uses the same session shopping list as Recipes. Checkboxes update that list and its pending count. The session-only lifetime is stated concisely.
- Pull-to-refresh, loading placeholders, empty states and a compact Retry/Open Pantry error card replace explanatory paragraphs. Existing safe-area handling, floating-dock clearance, content-width bounds and large-text/narrow layouts are preserved.

## Data and boundaries

Inspection found the previous Home route always read `MockPantryContext` and hardcoded dollar/digest/recipe figures, including for actual accounts. The route now uses the new live Dashboard for normal authenticated sessions; the existing demo implementation and its interactions remain untouched behind explicit Demo mode.

The live page reads a complete active inventory using the existing authenticated `reminderItems()` snapshot reader, independently of the Pantry screen's search/category/sort/page state. It does not reset Pantry filters. That reader caps a complete snapshot at1,000 items and rejects changed/partial snapshots; errors are shown rather than treating a partial page as a complete household total. Existing read-only Pantry recovery uses its existing reload path; cached diagnostic preview is not bypassed.

The Dashboard request controller coalesces repeated refreshes, checks focus/current verified account, rejects late results after blur/account/session changes, and redacts errors. It holds no persistent cache. Opening Home does not fetch Spoonacular suggestions or change the selected Analytics month. Shopping state is the existing Chef context, with its established account/session reset behavior.

No backend source/API/schema changes, dependencies, cloud services, environment changes or deployment are introduced. No direct database query or grocery/outcome mutation was performed for this slice. Real data never falls back to demo fixtures.

## Verification

- Root `npm run lint`, `npx tsc --noEmit`: pass.
- Root `node --experimental-strip-types --test tests/*.test.mjs`:416/416 pass. Eight Dashboard cases cover exact totals/unknown/free prices, sorting/date labels, overdue retention, focus/account invalidation, coalescing/retry, actual controls and navigation callbacks, loading/error/empty states, Shopping mode and real-account route selection without touching mock inventory.
- Backend `npm run lint`, `npx tsc --noEmit`, `npm test`: pass; build and166/166 tests. No live fixture mutation or API deployment was needed.
- `CI=1 npx expo export --platform all --max-workers 2 --output-dir /private/tmp/freshtrack-dashboard-export`: pass for web/iOS/Android and41 routes.
- Actual Dashboard TSX was rendered through React Native Web in a local-only synthetic preview. Chrome screenshots inspected regular/narrow widths and Shopping mode, with original fonts/artwork and substituted native safe-area/icon/image hosts. A literal newline rendering issue was found and fixed before final checks. Separate large-text control assertions pass. This is not native-device rendering/accessibility acceptance. The preview is not a shipped route and contains no actual account/receipt data.
- Version-sensitive references: [React Native RefreshControl](https://reactnative.dev/docs/0.86/refreshcontrol), [Expo57 safe areas](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/).
- Existing Xcode Release build: BUILD SUCCEEDED. Strict/deep codesign verification and embedded Dashboard/API destination checks pass. Same-identifier update and direct iPhone launch pass, without uninstalling. Toolchain/third-party Hermes warnings remain; not a zero-warning build.
- Bundle SHA-256: `1cd7bfd8b71b66c10831f85d284c229268abe1ae39feeaf669dd25e399536d80`. Personal Team profile expires23October2026 at10:08:49IST, unchanged by this rebuild.
- iPhone visual/functional acceptance: user selected “Looks good — all checks passed” for the six-step Dashboard checklist. The report covers appearance/readability, real count/value comparison, Scan/Add/Shopping navigation without saving, expiry filtering/details, Shopping mode, Recipes/Insights/profile shortcuts and return/pull-to-refresh. This is user-reported acceptance, not agent observation, confirmed grocery mutations, Android runtime or full accessibility acceptance. The Shopping check allowed an empty list, so it does not independently prove populated-list checkbox manipulation. Local build/test/export/installation logs use `/private/tmp/freshtrack-dashboard-*`. Temporary synthetic-preview server/tab were stopped/closed after inspection.

Earlier Expo Doctor21/21 and unresolved Phase9 audit/signing/platform/reliability limits are retained as historical results, not rerun or waived by this UI change. Tests/builds include the pre-existing paused decoder working tree; this slice does not commit those dependency changes.

Acceptance recording changes documentation only; prior automated checks were not rerun. `git diff --check` passes.

Dashboard review is complete. Next UI slice: Pantry, preserving the approved visual style and working Scanner/authentication/backend behavior. Other Phase9 gaps remain open.
