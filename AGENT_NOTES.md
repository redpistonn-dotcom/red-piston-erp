# Agent notes — why this repo looks the way it does

This repo was created by an AI coding agent (Claude) splitting the
owner/staff/mechanic surface out of `red-piston-frontend` into its own
app. This file explains the mechanical decisions behind that split, so a
human (or the next agent) picking this up doesn't have to reverse-engineer
them from the diff.

## Why this repo exists

`red-piston-frontend` is one React SPA with four "shells": a public
marketplace (customer), an ERP (shop owner/staff), an admin console, and a
mechanic app. The plan is to split it into separate frontends per audience
— `redpiston.com` (marketplace), `shop.redpiston.com` (this repo: ERP +
mechanic + car-decor management), `admin.redpiston.com` — all still
talking to the one existing backend and database. Nothing about the
backend or database changes for this; only the frontend boundary moves.

Shop was picked to split off first (over Admin, which would have been
lower-risk, or Marketplace, which would have had the biggest bundle-size
win) because it's the highest day-to-day value surface and the one the
user wanted to prioritize.

## How the split was done: copy-then-trim, not extract-then-share

This repo started as a byte-for-byte copy of `red-piston-frontend`'s
`src/`, `package.json`, `vite.config.js`, etc. Then everything that isn't
owner/staff/mechanic-facing was deleted:

- `shells/MPShell.tsx`, `shells/AdminShell.tsx`
- `pages/LandingPage.tsx`, `marketplace/components/LoginModal.tsx`,
  `context/CartContext.tsx`
- The customer marketplace pages: `MarketplacePage`, `CartPage`,
  `SavedItemsPage`, `SuppliersPage` (marketplace one — there's a
  same-named mechanic one, kept), `ServiceDiscoveryPage`, `BookingPage`
  (the customer book flow), `PublicStorefrontPage`, `MyBookingsPage`,
  `PricingPage`
- `pages/SuperAdminPage.tsx`, `pages/admin/SystemMonitor.tsx`
- Two dead files that weren't imported anywhere even in the original
  monolith: `LogisticsPage.tsx`, `OEMPartsPage.tsx`

**Why not extract shared code into a package instead?** That's the
"right" long-term answer (a `packages/ui`, `packages/api-client` etc.
workspace shared by all three apps), but it means standing up a monorepo
tool and cross-package dependency management on top of an already large
change. Copy-then-trim was chosen so this split could be verified working
end-to-end quickly, with the shared-package extraction as an explicit,
separate follow-up once this repo (and the marketplace/admin splits after
it) have proven stable. Until then, `theme.ts`, `api/client.ts`, and the
`components/ui/` kit are **duplicated** between this repo and
`red-piston-frontend` — if you fix a bug in one, check the other.

## `context/store.ts` and `context/AppCtx.ts` had to be split, not copied

Unlike the UI kit, the shared store and app-context genuinely mixed
ERP-only state with marketplace-only state in the monolith:

- `store.ts`'s `StoreContextValue` had ERP fields (`products`,
  `movements`, `orders`, `parties`, `vehicles`, `jobCards`, `activeShopId`,
  `logAudit`/`resetAll`/`clearStore`) alongside marketplace-only fields
  (`cart`, `selectedVehicle`, `marketplacePage`, an `appMode` toggle).
  This repo kept the ERP fields and removed the marketplace ones — there's
  no "app mode" concept needed when the app only ever is one mode.
- `AppCtx`'s value (built in `App.tsx`) mixed generic state (toast,
  `currentUser`, auth) with ERP-only business handlers (`saveProduct`,
  `handleSale`, `handleMultiItemSale`, `handlePurchase`,
  `handleAdjustment`, `handlePaymentReceipt`). All of that stayed, since
  it's all genuinely used here.
- Two pre-existing, separate cart implementations were found during this
  work (`store.ts`'s `cart` field vs. a whole separate
  `context/CartContext.tsx`) — an inconsistency in the original monolith,
  not something introduced by the split. Neither is relevant here (this
  app has no cart), so both were dropped without trying to reconcile them
  — that reconciliation is `red-piston-frontend`'s problem, not this
  repo's.

## `api/marketplace.ts` → `api/vehicleCatalog.ts`

The original `api/marketplace.ts` was a ~240-line client for the whole
customer marketplace: search, browse, cart-adjacent order creation, order
tracking, vehicle lookups, number-plate lookup. Once the marketplace pages
were deleted, a check of every export found only two functions still had
any consumer in this app: `fetchVehicleManufacturers` and
`fetchVehicleModelsByManufacturer` (used by `InventoryPage`'s and
`PartiesPage`'s vehicle-fitment dropdowns, both via `hooks/queries.ts` and
directly). Everything else — `searchMarketplace`, `createOrder`,
`updateOrderStatus`, `trackOrder`, `fetchShops`, `lookupPlate`,
`mapPartToRanked`, `browseMarketplace`, `buildHomeDataFromApi`,
`searchVehicles`, `fetchVehicleMakes`, `fetchVehicleModels`,
`fetchVehicleVariants` — had zero remaining callers. Rather than leave a
mostly-dead file named after a feature this app doesn't have, it was
trimmed to the two live functions and renamed to `vehicleCatalog.ts`. The
matching dead hooks in `hooks/queries.ts` (`useMarketplaceBrowse`,
`useMarketplacePart`, `useCreateOrder`, `useTrackOrder`,
`useVehicleVariants`, `useVehicleSearch`) were removed at the same time.

This in turn made `src/marketplace/` (an `engine.ts` + `mockDatabase.ts`
pair, only reachable through the old `api/marketplace.ts`) fully dead —
removed entirely.

## Docs that were removed, not carried over

`red-piston-frontend` had a `tester.txt` (a manual QA plan for the *whole*
monolith — customer registration, admin console, cart/checkout, the
works), `AutoMobile_DevGuide.md` (a ~2000-line product roadmap covering
all three surfaces), and a `CHANGELOG.md` spanning the monolith's full
history. All three describe features and routes that don't exist in this
repo (there's no `/admin`, no cart, no customer registration here) — kept
verbatim they'd actively mislead whoever opens this repo next. They still
exist, accurately, in `red-piston-frontend`. This repo's `README.md`
covers what's specific to running and understanding this app instead.

## Verification done when this repo was created

`npx tsc --noEmit` showed the same errors as `red-piston-frontend`'s
existing baseline, just shifted line numbers (confirmed line-by-line, not
just by count) — zero new errors from the split. `npx vite build` clean.
Live-verified against the real (shared) backend with a seeded shop owner:
Dashboard, Inventory, POS Billing, Services, Bookings all rendered and
behaved identically to the monolith; dropped routes (e.g. `/marketplace`)
redirect cleanly via the catch-all route instead of erroring.
