# FreshTrack — Product Specification

## 1. Product overview

FreshTrack is a cross-platform mobile application designed to reduce preventable household food waste, forgotten groceries, and the money lost when food spoils. It helps people record groceries, monitor freshness and expiry dates, receive reminders, discover recipes using ingredients that need to be used soon, and understand the financial impact of discarded food.

The application targets iOS and Android through one React Native + Expo codebase.

## 2. Core value proposition

FreshTrack reduces manual effort by supporting receipt and barcode scanning, estimating freshness timelines for common groceries, scheduling local expiry reminders, recommending recipes around ingredients expiring soon, and translating food waste into understandable financial metrics.

## 3. User roles

### Household Manager — MVP
- Signs up/signs in and completes email OTP verification.
- Manages their profile and security settings.
- Scans receipts and barcodes, reviews detected items, and adds groceries to the pantry.
- Edits inventory, records items as consumed or wasted, views recipes and analytics, and configures notification preferences.

### Shared Pantry Participant — later expansion
- Multiple users/devices may eventually be associated with one household/tenant ID.
- Users would see and update the same inventory.
- Do not build invitations, realtime collaboration, or multi-user synchronization into the initial MVP unless explicitly requested.

## 4. Main navigation and screens

The authenticated app has four primary tabs: Pantry, Scanner, AI Chef, and Analytics. Authentication screens sit outside the tab navigation.

### Authentication: Sign-up and OTP verification
- Email sign-up/sign-in flow.
- Six-digit email one-time password (OTP) verification.
- Persist sessions appropriately on the device.
- Handle invalid/expired codes, resend limits, loading, network errors, sign-out, and unauthenticated routing.
- Verify the real Neon Auth integration path works with React Native/Expo before committing to an implementation.

### Tab 1 — Pantry Tracker
- Display current grocery inventory in a vertically scrolling list sorted by closest expiry date.
- Each item card shows its name, category, quantity, expiration date, and freshness indicator.
- Use red for items expiring within 48 hours, yellow for items expiring within 7 days, and green for items with more time remaining.
- Support creating, viewing, editing, and removing/archiving pantry items.
- Support marking an item Consumed or Wasted.
- The original product concept proposes swipe-right to mark Consumed and swipe-left to mark Wasted. Implement native swipe gestures if compatible with the chosen component stack; otherwise provide accessible buttons/menu actions.
- Include empty, loading, error, and offline states.

### Tab 2 — Scanner
- Provide entry options for Scan Barcode and Scan Full Receipt.
- Use the device camera to scan a barcode or capture a receipt image.
- For receipts, upload the image securely to the backend; the backend calls Google Cloud Vision OCR and processes the returned text.
- Clean retailer abbreviations and messy line-item descriptions using deterministic normalization and fuzzy matching (for example, a retailer abbreviation such as `MKL LOPFT 1L` may map to `Low-Fat Milk`). Treat inferred matches as suggestions, not guaranteed facts.
- Estimate expiry dates using a local/backend freshness-preset dictionary for common foods (example defaults: milk = 7 days, spinach = 5 days); allow edits and prefer an explicitly printed package expiry date whenever available.
- Show a review sheet with detected products, quantities/prices where available, proposed expiry dates, and confidence/uncertainty where useful. The user can edit the entries before tapping Add to Pantry.
- Barcode scanning only returns a barcode value; use a product lookup/catalog if available and offer manual entry when no product is found.
- Handle camera permission denial, unreadable receipts, empty OCR results, network failures, and retries.

### Tab 3 — AI Chef
- Highlight “Items Needing Immediate Use”: pantry items expiring in the next 48 hours.
- Provide a “Suggest Recipes” action.
- Integrate with Spoonacular through the backend, not directly from the mobile app.
- Send only the relevant near-expiry ingredient names/quantities needed for the request, rather than the entire pantry.
- Append a controlled list of common household staples (for example, oil, salt, pepper, and common spices) when appropriate.
- Display recipe cards with titles, available recipe imagery if supplied by the API, cooking instructions, and missing ingredients.
- Allow missing ingredients to be added to a basic shopping list.
- Handle no near-expiry items, no matching recipes, API limits, timeouts, and errors.

### Tab 4 — Waste Analytics
- Show the total estimated cost of wasted food for the current calendar month (example display: “You lost ₹1,200 this month on spoiled food”).
- Store an item's purchase price when known; otherwise use a documented, configurable local cost estimate and clearly treat it as an estimate.
- Show interactive charts for monthly waste costs and saved-versus-discarded items, including month-over-month comparisons.
- Use `react-native-chart-kit` and `react-native-svg`, unless project validation indicates a better compatible choice.
- Show a reconciliation banner when items expired without a confirmed outcome, for example: “We noticed 4 items expired recently. Did they make it to your plate or the bin?”
- Allow users to classify such items as Consumed or Wasted and update the analytics history accordingly.

## 5. Inventory and expiry logic

- Store the item name, quantity/unit, category, purchase/added date, expiry date, source (manual, receipt, barcode), price if known, status, and relevant timestamps.
- Prefer a manufacturer/package expiry date over an estimated freshness preset.
- Allow users to edit preset estimates and final expiry dates.
- Sort active pantry inventory by nearest expiry.
- Planned local notification milestones: 3 days before expiry, 1 day before expiry, and on expiry day.
- Avoid assuming the mobile operating system will execute arbitrary background code at an exact time. Reconcile overdue records when the app opens/resumes and when relevant APIs are called.
- The original concept proposes automatically archiving expired items as “Assumed Consumed” and asking users to reconcile their outcome. Preserve the concept, but make the behavior explicit, reversible, and tested. Prefer a clear assumed/unknown status rather than silently recording an unconfirmed item as definitely consumed or wasted.
- The original concept proposes automatically consuming a near-expiry item when a fresh scanned item matches it. This can cause false matches. Before implementing automatic consumption, define a safe matching threshold and confirm the behavior; the safer default is to ask the user to confirm a match.

## 6. Notifications

- Use `expo-notifications` for local scheduled expiry notifications.
- Calculate notification timestamps from each item's expiry date and the user's notification preferences.
- Reschedule or cancel notifications when an item is edited, consumed, wasted, deleted, or its expiry date changes.
- Where the OS and notification APIs support interactive actions, provide Consumed and Wasted actions from the notification. On unsupported or unreliable platforms, open the app to complete the action.
- Make notification handling idempotent: processing the same action more than once must not create duplicate events or corrupt analytics.
- Local notifications do not require a continuously running cloud push service, but platform permissions, OS scheduling policies, and device testing still matter.

## 7. Updated technology stack

### Mobile frontend
- React Native + Expo managed workflow.
- TypeScript.
- Expo Router for file-based navigation.
- `expo-camera` for barcode scanning and receipt photos.
- `expo-notifications` for local expiry alerts.
- `react-native-chart-kit` + `react-native-svg` for analytics charts.
- React Context for session and client-side state/cache where suitable.
- Use Expo-compatible libraries and `npx expo install` for Expo-managed native dependencies.

### Backend
- Node.js + Express API deployed with Vercel Serverless Functions.
- Prisma ORM for typed database access and migrations.
- Server-side validation, authentication checks, authorization, error handling, and rate limiting.

### Database and authentication
- Neon PostgreSQL for application data.
- Prisma schema/migrations for FreshTrack application tables.
- Neon Auth for accounts and email OTP verification, provided its selected SDK/integration is verified to work with Expo/React Native and the planned backend.
- Do not recreate or directly modify provider-managed Neon Auth internal tables.

### Third-party APIs
- Google Cloud Vision API for OCR, called only from the backend.
- Spoonacular API for recipe matching, called only from the backend.

## 8. End-to-end system workflow

### Receipt ingestion
1. User opens Scanner and captures a receipt image with the mobile camera.
2. App uploads the image over HTTPS to a protected backend endpoint.
3. The backend sends the image to Google Cloud Vision OCR.
4. Server-side parsing normalizes text, finds likely item descriptions and prices, and matches them to known product/freshness rules.
5. The backend returns suggested line items and expiry dates for user review.
6. After confirmation, the backend stores valid items in Neon PostgreSQL through Prisma.
7. The app refreshes pantry state and schedules/reschedules local notifications.

### Pantry lifecycle
1. App retrieves the authenticated user's active inventory through the API.
2. App displays items by nearest expiry and freshness status.
3. User marks an item Consumed or Wasted; the API validates ownership and records the outcome.
4. Analytics reads the event history and updates monthly costs/charts.

### Expiry reminders
1. The app calculates local notification schedules based on known expiry timestamps and preferences.
2. The device OS delivers notifications according to platform permissions and scheduling policies.
3. A supported notification action or an in-app action updates the item through the backend.
4. The app reconciles local cached state with the server response.

### Recipe suggestions
1. App selects ingredients expiring in the next 48 hours.
2. The backend requests matching recipes from Spoonacular using a minimal relevant payload.
3. Results are normalized/cached and returned to the app.
4. App presents recipe directions and missing ingredients.

## 9. Security and data integrity requirements

- Never put database URLs, Google Cloud credentials, Spoonacular keys, or server-only secrets in mobile source code or `EXPO_PUBLIC_*` variables.
- Store secrets in the Vercel backend environment configuration.
- Mobile app communicates with the backend over HTTPS; it must not connect directly to PostgreSQL.
- Authenticate requests and authorize access to every user-owned resource on the server.
- Validate request bodies and query parameters; reject invalid IDs, quantities, dates, prices, and item status transitions.
- Keep test data and production data separate.
- Avoid logging OTPs, access tokens, secrets, or sensitive receipt data.
- Provide account deletion and document what user data is retained or deleted.
- Use database transactions for inventory status changes and history/event creation where needed.
- Make state-changing endpoints idempotent where retries could duplicate actions.

## 10. Product design principles

- Reproduce the user's existing screen designs instead of inventing a new visual direction.
- Keep layout, spacing, typography, colors, and common components consistent across screens.
- Implement reusable components and centralized theme tokens.
- Support different phone sizes, iOS and Android safe areas, accessible touch targets, keyboard behavior, and readable text.
- Preserve empty, loading, offline, permission-denied, and error states.
- Do not substitute a web app for the requested native mobile app.

## 11. MVP boundaries and acceptance criteria

The first MVP should support one manager account and the full core loop: sign in, add/scan groceries, review expiry estimates, view pantry, receive reminders, record consumed/wasted outcomes, obtain recipe suggestions, and review waste-cost analytics.

The MVP is not complete until:
- The provided designs have been implemented and navigation is functional.
- Authentication/session behavior has been tested using the chosen Expo-compatible integration.
- User data is isolated and backend routes enforce authorization.
- Pantry records survive app restarts and are loaded from the server.
- Create/edit/consume/waste actions produce correct, non-duplicated history.
- Notification schedules update when items change and are tested on real devices.
- Receipt OCR has an editable review step and safe failure handling.
- Barcode lookup has a manual fallback.
- Recipe API keys remain on the server and rate-limit failures are handled.
- Analytics calculations have tests for month boundaries, unknown prices, and reconciliation.
- TypeScript checks and relevant automated/manual tests pass, or known failures are documented honestly.

## 12. Development rule for AI coding agents

Implement the project in small phases. Before changing code, read this file and `FreshTrack_Implementation_Plan.md`, inspect the existing repository, and identify the current phase. Preserve working code and compatible Expo configuration. Do not implement the entire project in one pass. After each phase, run relevant checks, document outstanding issues, and create a Git checkpoint. When moving from Antigravity to Codex, use the same repository and read `AGENTS.md`, `README.md`, and the latest Git history before continuing.
