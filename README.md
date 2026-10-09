# FreshTrack

> **Smart pantry manager — stop wasting food, start saving money.**

FreshTrack is a cross-platform mobile app (iOS + Android) that tracks grocery expiry dates, scans receipts with OCR, recommends recipes for near-expiry ingredients, and shows the financial cost of food waste.

---

## Architecture

```
React Native / Expo app (mobile)
    └── HTTPS API calls only
            ↓
Node.js + Express API (backend/)
    ├── Prisma ORM
    └── Neon PostgreSQL

Third-party APIs (server-side only):
    ├── Google Cloud Vision  — receipt OCR
    └── Spoonacular          — recipe suggestions
```

**Key rule:** The mobile app never connects to the database directly and never holds Google/Spoonacular API keys.

---

## Repository Layout

```
FreshTrack/
├── app/                    # Expo Router file-based routes
│   ├── (tabs)/             # Tab navigator (Pantry, Scanner, AI Chef, Analytics)
│   └── _layout.tsx
├── assets/                 # Fonts, icons, splash screen
├── components/             # Reusable UI components (Phase 1+)
├── context/                # React Context providers (Phase 2+)
├── features/               # Feature modules (Phase 1+)
├── lib/                    # Shared utilities: API client, date helpers (Phase 1+)
├── types/                  # Shared TypeScript types (Phase 1+)
├── design-reference/       # All supplied screen designs — read before implementing UI
├── docs/                   # Product specification and implementation plan
├── backend/                # Express TypeScript API
│   ├── src/
│   │   ├── app.ts          # Express app factory
│   │   ├── server.ts       # HTTP server entry-point
│   │   └── routes/health.ts
│   ├── prisma/
│   │   └── schema.prisma   # Placeholder; full schema in Phase 3
│   ├── tests/
│   ├── .env.example        # Required variables with dummy values — copy to .env
│   ├── package.json
│   └── tsconfig.json
├── AGENTS.md               # Agent instructions — READ BEFORE EDITING
├── README.md               # This file
└── .gitignore
```

---

## Prerequisites

| Tool | Required version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Expo CLI | installed globally or use `npx expo` |

---

## Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd FreshTrack
```

### 2. Install mobile dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure backend environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in your values:
#   DATABASE_URL, DIRECT_URL, NEON_AUTH_URL, GOOGLE_CLOUD_PROJECT_ID,
#   GOOGLE_APPLICATION_CREDENTIALS, SPOONACULAR_API_KEY
```

> ⚠️ **Never commit `backend/.env`** — it is excluded by `.gitignore`.

---

## Running Locally

### Mobile (Expo)

```bash
npm start           # Start Expo dev server (Metro)
npm run ios         # Open iOS Simulator
npm run android     # Open Android Emulator
```

> Requires a connected device or simulator. After adding native modules, run `npx expo run:ios` or `npx expo run:android` for a development build.

### Backend API

```bash
cd backend
npm run dev         # Start API server with ts-node-dev (hot reload)
# Server starts on http://localhost:3001
# Health check: http://localhost:3001/api/v1/health
```

---

## Scripts

### Root (mobile)

| Script | Command | Description |
|---|---|---|
| `npm start` | `expo start` | Start Expo dev server |
| `npm run ios` | `expo start --ios` | iOS simulator |
| `npm run android` | `expo start --android` | Android emulator |
| `npm run web` | `expo start --web` | Web |
| `npx tsc --noEmit` | — | TypeScript type check |
| `npx expo-doctor` | — | Diagnose dependency issues |
| `npx expo install --fix` | — | Fix incompatible package versions |

### Backend (`cd backend` first)

| Script | Command | Description |
|---|---|---|
| `npm run dev` | `ts-node-dev` | Start with hot reload |
| `npm run build` | `tsc` | Compile to `dist/` |
| `npm start` | `node dist/server.js` | Run compiled build |
| `npm run typecheck` | `tsc --noEmit` | TypeScript type check |
| `npm test` | `jest` | Run all tests |
| `npm run db:migrate` | `prisma migrate dev` | Apply migrations (dev) |
| `npm run db:migrate:deploy` | `prisma migrate deploy` | Apply migrations (prod) |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run db:seed` | `ts-node prisma/seed.ts` | Seed development data |

---

## Environment Variables

All secrets live in `backend/.env`. See [`backend/.env.example`](backend/.env.example) for the full list.

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | backend | Neon pooled connection (Prisma runtime) |
| `DIRECT_URL` | backend | Neon direct connection (Prisma migrations) |
| `NEON_AUTH_URL` | backend | Neon Auth base URL |
| `GOOGLE_CLOUD_PROJECT_ID` | backend | GCP project for Vision API |
| `GOOGLE_APPLICATION_CREDENTIALS` | backend | Path to service-account JSON (local dev only) |
| `SPOONACULAR_API_KEY` | backend | Spoonacular recipe API |
| `PORT` | backend | API listen port (default: 3001) |
| `NODE_ENV` | backend | `development` / `production` |
| `ALLOWED_ORIGINS` | backend | Comma-separated CORS origins |

**Mobile:** Only `EXPO_PUBLIC_API_BASE_URL` (the backend URL) is needed in the app. No secrets.

---

## Development Phases

| Phase | Goal | Status |
|---|---|---|
| **0** | Scaffold, configure, health endpoint | ✅ **Complete** |
| 1 | Implement supplied designs and navigation | ⬜ Not started |
| 2 | Validate Neon Auth + Expo OTP flow | ⬜ Not started |
| 3 | Prisma schema, migrations, API foundation | ⬜ Not started |
| 4 | Pantry CRUD end-to-end | ⬜ Not started |
| 5 | Local expiry notifications + reconciliation | ⬜ Not started |
| 6 | Barcode scan + receipt OCR | ⬜ Not started |
| 7 | AI Chef (Spoonacular integration) | ⬜ Not started |
| 8 | Waste analytics and data integrity | ⬜ Not started |
| 9 | Settings, privacy, release preparation | ⬜ Not started |

---

## Project Status

**Current phase: Phase 0 — COMPLETE**  
Last checkpoint: `chore: scaffold FreshTrack mobile and API projects`

### Phase 0 results

| Check | Result |
|---|---|
| Mobile `tsc --noEmit` | ✅ 0 errors |
| Backend `tsc --noEmit` | ✅ 0 errors |
| Backend health test (`jest`) | ✅ 1/1 passed |
| `GET /api/v1/health` returns `{ data: { status: "ok" } }` | ✅ Verified by test |
| No secrets in repository | ✅ `.env` excluded by `.gitignore` |
| `.env.example` present with all variable names | ✅ |
| Mobile starter runs (simulator/device) | ⚠️ Not confirmed — requires manual `npm start` with a simulator |

### Issues fixed in Phase 0

- **Pre-existing type error** in `components/ExternalLink.tsx` (Expo SDK 57 template): `href` prop was typed as `string` but passed to `Link` which requires `Href`. Fixed by casting to `ComponentProps<typeof Link>['href']`.
- **tsconfig scope**: root `tsconfig.json` was picking up `backend/tests/*.ts`. Fixed by adding `"exclude": ["backend"]`.

### Outstanding tasks before Phase 1

1. Run `npm start` and confirm the Expo starter loads on at least one iOS Simulator or Android Emulator.
2. Create a git checkpoint: `git add -A && git commit -m "chore: scaffold FreshTrack mobile and API projects"`.

---

## Design References

Screen designs are in [`design-reference/`](design-reference/). **Read all images before implementing any UI.**

| Screen | Reference |
|---|---|
| Welcome / landing | `freshtrack_welcome_get_started_centered_hero/screen.png` |
| Sign-up | `freshtrack_account_sign_up_login/screen.png` |
| Log in | `freshtrack_account_log_in/screen.png` |
| Home dashboard | `freshtrack_dynamic_hub/screen.png` |
| Pantry / inventory | `kitchen_inventory_swipe_actions/screen.png` |
| Scanner — expiry verification | `packaged_item_expiry_verification/screen.png` |
| Scanner — receipt OCR | `receipt_ocr_scanner/screen.png` |
| AI Chef / Recipes | `recipe/screen.png` |
| Analytics / Insights | `financial_eco_analytics/screen.png` |
| Design tokens | `freshtrack_design_system/DESIGN.md` |

---

## API Contract (planned)

All endpoints are prefixed with `/api/v1`. Success: `{ data: ... }`. Error: `{ error: { code, message, requestId } }`.

### Available now

- `GET /api/v1/health` — service health check (no auth)

### Planned (Phase 3+)

- `GET/POST/PATCH /api/v1/pantry`
- `POST /api/v1/pantry/:id/consume`
- `POST /api/v1/pantry/:id/waste`
- `POST /api/v1/receipts/scan`
- `GET/POST /api/v1/chef/expiring`
- `POST /api/v1/chef/suggestions`
- `GET /api/v1/analytics/summary`

See `docs/FreshTrack_Implementation_Plan.md § 4` for the full contract.

---

## Security Notes

- No API keys, database URLs, or credentials belong in mobile source code or `EXPO_PUBLIC_*` variables.
- Store all secrets in Vercel environment config (production) or `backend/.env` (local dev).
- `backend/.env` is excluded by `.gitignore` — confirm with `git status` before every commit.
- If a secret is accidentally committed, rotate it immediately.

---

## License

[See LICENSE](LICENSE)
