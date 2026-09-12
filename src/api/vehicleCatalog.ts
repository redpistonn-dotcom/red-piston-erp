/**
 * src/api/vehicleCatalog.ts
 *
 * Vehicle make/model lookups (manufacturers -> models), used by the
 * vehicle-fitment filter on InventoryPage and the Vehicles tab on
 * PartiesPage. Backed by the shared backend's vehicle_manufacturers /
 * vehicle_models tables — same tables the customer-facing marketplace
 * app uses for its own vehicle selector, hence the `/api/marketplace/...`
 * URL path below (backend route naming, unrelated to this app's own
 * file/folder names).
 *
 * This file used to be api/marketplace.ts, a much larger client for the
 * whole customer marketplace (search, cart, orders, order tracking).
 * None of that applies to this app — it was trimmed down to just the
 * two functions actually used here when this app was split off from
 * red-piston-frontend (see AGENT_NOTES.md at the repo root).
 */

import { api } from './client.js';

/** Fetch all vehicle manufacturers (e.g. Maruti, Hyundai, Tata). */
export async function fetchVehicleManufacturers(vehicleType?: string) {
  const params = vehicleType ? { vehicleType } : {};
  const res = await api.get('/api/marketplace/vehicles/manufacturers', params);
  return (res.data || res) || [];
}

/** Fetch models for a manufacturer. */
export async function fetchVehicleModelsByManufacturer(manufacturerId: number, vehicleType?: string) {
  const params: Record<string, unknown> = { manufacturerId };
  if (vehicleType) params.vehicleType = vehicleType;
  const res = await api.get('/api/marketplace/vehicles/models', params);
  return (res.data || res) || [];
}
