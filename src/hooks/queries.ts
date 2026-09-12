/**
 * src/hooks/queries.ts
 *
 * Central place for all TanStack Query hooks.
 * Each hook wraps one API function — gives you loading/error/data automatically.
 *
 * Usage:
 *   const { data, isLoading, error } = useInventory();
 *   const { data: manufacturers } = useVehicleManufacturers();
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInventory,
  toggleMarketplace,
  bulkStockIn,
  searchCatalog,
  lookupByBarcode,
  recordPurchase,
  recordAdjustment,
  getMovements,
} from "../api/inventory";
import {
  fetchVehicleManufacturers,
  fetchVehicleModelsByManufacturer,
} from "../api/vehicleCatalog";
import { getParties, getPartyLedger } from "../api/parties";
import { getDashboard } from "../api/dashboard";

// ─── Query keys — one source of truth for cache invalidation ──────────────────
export const KEYS = {
  inventory:     ["inventory"]        as const,
  movements:     (id: string) => ["inventory", id, "movements"] as const,
  catalog:       (q: string)  => ["catalog", q]                 as const,
  barcode:       (b: string)  => ["barcode", b]                 as const,
  manufacturers: (type?: string) => ["manufacturers", type]     as const,
  models:        (mfgId: number, type?: string) => ["models", mfgId, type] as const,
  parties:       ["parties"]          as const,
  suppliers:     ["suppliers"]        as const,
  ledger:        (id: string) => ["ledger", id]                 as const,
  dashboard:     ["dashboard"]        as const,
};

// ─── Inventory ────────────────────────────────────────────────────────────────

/** Fetch the current shop's full inventory from the API. */
export function useInventory() {
  return useQuery({
    queryKey: KEYS.inventory,
    queryFn:  () => getInventory(),
  });
}

/** Fetch movement history for one inventory item. */
export function useMovements(inventoryId: string) {
  return useQuery({
    queryKey: KEYS.movements(inventoryId),
    queryFn:  () => getMovements(inventoryId),
    enabled:  !!inventoryId,
  });
}

/** Catalog text search — fires when q has 2+ characters. */
export function useCatalogSearch(q: string) {
  return useQuery({
    queryKey: KEYS.catalog(q),
    queryFn:  () => searchCatalog({ q }),
    enabled:  q.trim().length >= 2,
    staleTime: 2 * 60 * 1000, // catalog doesn't change often
  });
}

/** Barcode lookup — fires only when a barcode string is provided. */
export function useBarcodeSearch(barcode: string) {
  return useQuery({
    queryKey: KEYS.barcode(barcode),
    queryFn:  () => lookupByBarcode(barcode),
    enabled:  !!barcode,
    staleTime: 10 * 60 * 1000, // barcodes never change
  });
}

/** Toggle a product live/offline on the marketplace, then refresh inventory. */
export function useToggleMarketplace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, listed }: { id: string; listed: boolean }) =>
      toggleMarketplace(id, listed),
    onSuccess: () => {
      // Refresh inventory so the UI reflects the new marketplace status
      qc.invalidateQueries({ queryKey: KEYS.inventory });
    },
  });
}

/** Record a purchase (stock-in single item). */
export function useRecordPurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => recordPurchase(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.inventory });
    },
  });
}

/** Bulk stock-in from supplier. */
export function useBulkStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ items, supplier }: { items: unknown[]; supplier: unknown }) =>
      bulkStockIn(items, supplier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.inventory });
    },
  });
}

/** Stock adjustment (damage, correction etc). */
export function useRecordAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: unknown) => recordAdjustment(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.inventory });
    },
  });
}

// ─── Vehicle lookups ───────────────────────────────────────────────────────────

/**
 * Fetch all vehicle manufacturers.
 * Cached for 30 minutes — manufacturer list rarely changes.
 */
export function useVehicleManufacturers(vehicleType?: string) {
  return useQuery({
    queryKey: KEYS.manufacturers(vehicleType),
    queryFn:  () => fetchVehicleManufacturers(vehicleType),
    staleTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch models for a manufacturer.
 * Only runs when manufacturerId is provided.
 */
export function useVehicleModels(manufacturerId: number, vehicleType?: string) {
  return useQuery({
    queryKey: KEYS.models(manufacturerId, vehicleType),
    queryFn:  () => fetchVehicleModelsByManufacturer(manufacturerId, vehicleType),
    enabled:  !!manufacturerId,
    staleTime: 30 * 60 * 1000,
  });
}

// ─── Parties & Ledger ─────────────────────────────────────────────────────────

export function useParties() {
  return useQuery({
    queryKey: KEYS.parties,
    queryFn:  () => getParties(), // all parties (customers + suppliers)
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: KEYS.suppliers,
    queryFn:  () => getParties("supplier"), // filtered by type
  });
}

export function usePartyLedger(partyId: string) {
  return useQuery({
    queryKey: KEYS.ledger(partyId),
    queryFn:  () => getPartyLedger(partyId),
    enabled:  !!partyId,
  });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Dashboard overview stats.
 * Refreshes every 5 minutes automatically.
 */
export function useDashboard() {
  return useQuery({
    queryKey: KEYS.dashboard,
    queryFn:  () => getDashboard(),
    refetchInterval: 5 * 60 * 1000,
  });
}
