# RedPiston — Shop App

The owner/staff/mechanic-facing frontend for RedPiston. If you're a shop
owner running your parts inventory and billing, or a car-decor/detailing
shop managing bookings, or a mechanic working job cards — this is the app
you're in.

## Where this fits

RedPiston is moving from one monolithic frontend into three apps sharing
one backend and one database:

| App | Domain (planned) | Audience | Repo |
|---|---|---|---|
| Marketplace | `redpiston.com` | Public + customers | `red-piston-frontend` (current monolith, keeps this role) |
| **Shop** (this repo) | `shop.redpiston.com` | Shop owner, staff, mechanic | `red-piston-shop` |
| Admin | `admin.redpiston.com` | Platform admin | not split yet — still in `red-piston-frontend` |
| Backend API | `api.redpiston.com` | all of the above | `red-piston-backend`, unchanged |

This repo was split off from `red-piston-frontend` by copying it whole and
then deleting everything that isn't owner/staff/mechanic-facing — see
`AGENT_NOTES.md` for exactly what was kept, dropped, and why. It is **not
yet** wired to a separate domain or deployed anywhere; it's a local,
independent app you can run and verify side by side with the monolith.

## What's in here

- **Owner/staff ERP**: dashboard, inventory, POS billing (barcode scan +
  PDF invoice), parties/ledger (Udhaar), job cards, purchase returns,
  warranty, GSTR-1 export, staff management.
- **Car-decor / services marketplace management**: a shop's own Services,
  Storefront Settings, Portfolio, Bookings, and Reviews pages — the
  owner-facing half of the customer booking flow (the customer-facing
  half — search, book, review — lives in the marketplace app).
- **Mechanic app**: a separate role/login (`/mechanic`) for mechanics
  working job cards, either independently or attached to a shop.

Everything here talks to the same backend and database as the other two
apps — no separate schema, no separate API.

## Running it

```bash
npm install
npm run dev      # http://localhost:5174
```

Needs `red-piston-backend` running on `localhost:3001` (see that repo's
own README). A `.env` file with `VITE_API_URL`, Firebase, and Sentry keys
is required for full functionality — copy the shape from
`red-piston-frontend`'s `.env` (same backend, same third-party projects).

## Code layout

```
src/
├── App.tsx              # routes + auth/token lifecycle + business handlers
├── main.tsx             # React root, providers (React Query, Store, Router)
├── shells/               # ERPShell (owner/staff layout), MechanicShell
├── pages/                # one file per ERP page + car-decor management pages
├── pages/mechanic/       # mechanic app's own pages, under /mechanic
├── context/
│   ├── store.ts          # ERP data (products, movements, orders, parties...)
│   └── AppCtx.ts         # auth, toast, business handlers (saveProduct, handleSale...)
├── api/                  # one file per backend resource — thin fetch wrappers
├── components/           # ERP-specific components (modals, barcode scanner...)
├── components/ui/        # generic UI kit (Btn, Input, Modal, StatCard...) — no ERP logic
└── theme.ts, store.ts, AppCtx.ts  # one-line re-export shims, see note below
```

**About the shim files** (`src/theme.ts`, `src/store.ts`, `src/AppCtx.ts`):
these are one-line `export * from './styles/theme'` (etc) re-exports. Most
of the codebase imports via the shim path (`../theme`, `../store`) rather
than the real file (`../styles/theme.ts`, `../context/store.ts`) — that's
the established convention here, not a mistake to "fix". Import via the
shim unless you have a specific reason not to (a couple of files do import
the real path directly, usually to avoid a circular import).

## What changed in the split (for anyone diffing against red-piston-frontend)

- Removed: `MPShell`, `AdminShell`, the whole customer marketplace (browse,
  cart, checkout, order tracking, product pages), `SuperAdminPage`, and the
  marketplace-only slice of the shared store (cart, vehicle selector,
  app-mode toggle).
- Renamed: `api/marketplace.ts` (a large customer-marketplace API client)
  → `api/vehicleCatalog.ts`, trimmed to the two vehicle-lookup functions
  this app actually uses (vehicle make/model dropdowns in Inventory and
  Parties). The old file's other ~12 exports (search, cart, orders) had
  zero consumers left once the marketplace pages were removed.
- Removed entirely: `src/marketplace/` (a small delivery-ETA/mock-data
  folder only reachable through the old `api/marketplace.ts` — dead once
  that file was trimmed).
- Not done yet: extracting `theme.ts` / `api/client.ts` / the UI kit into
  a shared package used by all three apps. For now they're duplicated
  between this repo and `red-piston-frontend` — a deliberate, documented
  tradeoff (see `AGENT_NOTES.md`), not an oversight.

## Full architecture reference

For the diagram, subdomain plan, and the reasoning behind the split, see
the "RedPiston Architecture" PDF (delivered separately) — this README
covers only what's specific to running and understanding this repo.
