import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type {
  Shop, Product, Movement, Order, Party, Vehicle, JobCard,
  AuditEntry, Receipt,
} from '../types';
import { SEED_PRODUCTS, SEED_SHOPS, genSeededMovements, SEED_ORDERS, SEED_PURCHASES, SEED_PARTIES, SEED_VEHICLES, SEED_JOB_CARDS, uid } from '../utils/utils';
import { syncProductSave } from '../api/sync.js';

// ─── Typed store value shape ──────────────────────────────────────────────────

export interface StoreContextValue {
  /* Collections */
  shops:     Shop[]     | null;
  products:  Product[]  | null;
  movements: Movement[] | null;
  orders:    Order[]    | null;
  purchases: Movement[] | null;
  parties:   Party[]    | null;
  vehicles:  Vehicle[]  | null;
  jobCards:  JobCard[]  | null;
  auditLog:  AuditEntry[];
  receipts:  Receipt[];
  /* Shop scope */
  activeShopId:   number | string;
  setActiveShopId:(id: number | string) => void;
  persistShopId:  (id: number | string) => void;
  /* Persistence helpers */
  saveShops:     (d: Shop[]) => void;
  saveProducts:  (d: Product[], skipApiSync?: boolean) => void;
  saveMovements: (d: Movement[]) => void;
  saveOrders:    (d: Order[]) => void;
  savePurchases: (d: Movement[]) => void;
  saveAuditLog:  (d: AuditEntry[]) => void;
  saveReceipts:  (d: Receipt[]) => void;
  saveParties:   (d: Party[]) => void;
  saveVehicles:  (d: Vehicle[]) => void;
  saveJobCards:  (d: JobCard[]) => void;
  /* Actions */
  logAudit:    (action: string, entityType: string, entityId?: string | number, details?: string) => void;
  resetAll:    () => Promise<void>;
  clearStore:  () => void;
  /* Status */
  loaded:    boolean;
  apiSynced: boolean;
}

export const StoreContext = createContext<StoreContextValue | null>(null);

// ─── Provider hook ────────────────────────────────────────────────────────────

export function useStoreProvider(): StoreContextValue {
  const [shops,     setShops]    = useState<Shop[]     | null>(null);
  const [products,  setP]        = useState<Product[]  | null>(null);
  const [movements, setM]        = useState<Movement[] | null>(null);
  const [orders,    setOrders]   = useState<Order[]    | null>(null);
  const [purchases, setPurchases]= useState<Movement[] | null>(null);
  const [auditLog,  setAuditLog] = useState<AuditEntry[]>([]);
  const [receipts,  setReceipts] = useState<Receipt[]>([]);
  const [parties,   setParties]  = useState<Party[]    | null>(null);
  const [vehicles,  setVehicles] = useState<Vehicle[]  | null>(null);
  const [jobCards,  setJobCards] = useState<JobCard[]  | null>(null);

  const [activeShopId, setActiveShopId] = useState<number | string>(() => {
    try {
      const val = localStorage.getItem('vl_shopId') || 's1';
      const num = parseInt(val, 10);
      return !isNaN(num) ? num : val;
    } catch { return 's1'; }
  });

  const [loaded,    setL]          = useState(false);
  const [apiSynced, setApiSynced]  = useState(false);

  const persistShopId = useCallback((shopId: number | string) => {
    if (!shopId || shopId === activeShopId) return;
    setActiveShopId(shopId);
    try { localStorage.setItem('vl_shopId', String(shopId)); } catch {}
  }, [activeShopId]);

  // Transactional data comes from the API — this just flips the loaded gate
  // once on mount (kept as its own effect to match the original shape).
  useEffect(() => {
    setL(true);
  }, []);

  // ── Persistence helpers ───────────────────────────────────────────────────
  const saveShops     = useCallback((d: Shop[])       => { setShops(d); }, []);
  const saveProducts  = useCallback((d: Product[], skipApiSync = false) => {
    setP(prev => {
      if (!skipApiSync) {
        if (d.length === prev?.length) {
          const changed = d.find((p, i) => p !== prev?.[i]);
          if (changed) syncProductSave(changed).catch(() => {});
        } else if (d.length > (prev?.length ?? 0)) {
          const prevIds = new Set((prev ?? []).map(p => p.id));
          const added = d.find(p => !prevIds.has(p.id));
          if (added) syncProductSave(added).catch(() => {});
        }
      }
      return d;
    });
  }, []);
  const saveMovements = useCallback((d: Movement[]) => { setM(d); }, []);
  const saveOrders    = useCallback((d: Order[])    => { setOrders(d); }, []);
  const savePurchases = useCallback((d: Movement[]) => { setPurchases(d); }, []);
  const saveAuditLog  = useCallback((d: AuditEntry[]) => { setAuditLog(d); }, []);
  const saveReceipts  = useCallback((d: Receipt[])  => { setReceipts(d); }, []);
  const saveParties   = useCallback((d: Party[])    => { setParties(d); }, []);
  const saveVehicles  = useCallback((d: Vehicle[])  => { setVehicles(d); }, []);
  const saveJobCards  = useCallback((d: JobCard[])  => { setJobCards(d); }, []);

  const logAudit = useCallback((
    action: string, entityType: string,
    entityId?: string | number, details?: string,
  ) => {
    const entry: AuditEntry = {
      id: 'aud_' + uid(),
      timestamp: Date.now(),
      action,
      entityType,
      entityId,
      detail: typeof details === 'string' ? details : JSON.stringify(details),
    };
    setAuditLog(prev => [entry, ...prev].slice(0, 500));
  }, []);

  const resetAll = useCallback(async (): Promise<void> => {
    setShops(SEED_SHOPS); setP(SEED_PRODUCTS); setM(genSeededMovements());
    setOrders(SEED_ORDERS); setPurchases(SEED_PURCHASES);
    setAuditLog([]); setReceipts([]);
    setParties(SEED_PARTIES); setVehicles(SEED_VEHICLES); setJobCards(SEED_JOB_CARDS);
    setActiveShopId('s1');
    try { localStorage.removeItem('vl_shopId'); } catch {}
  }, []);

  const clearStore = useCallback(() => {
    setShops([]); setP(null); setM(null); setOrders([]); setPurchases([]);
    setAuditLog([]); setReceipts([]);
    setParties([]); setVehicles([]); setJobCards([]);
    setActiveShopId('s1');
    try { localStorage.removeItem('vl_shopId'); } catch {}
  }, []);

  return {
    shops, products, movements, orders, purchases, auditLog, receipts, parties, vehicles, jobCards,
    saveShops, saveProducts, saveMovements, saveOrders, savePurchases,
    saveAuditLog, saveReceipts, saveParties, saveVehicles, saveJobCards,
    activeShopId, setActiveShopId, persistShopId,
    logAudit, resetAll, clearStore,
    loaded, apiSynced,
  };
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}

// Force a full page reload when this module is hot-replaced in development.
// Without this, Vite re-evaluates createContext() and creates a new StoreContext
// object — the Provider in main.tsx still holds the old reference while consumers
// get the new one, so useContext returns null → "must be used within StoreProvider".
if (import.meta.hot) {
  import.meta.hot.decline();
}
