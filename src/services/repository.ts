import type { AuditEntry, Database, Role } from "@/types";
import { createSeedDatabase } from "@/data/seed";
import { uid } from "@/lib/utils";

/**
 * DEVELOPMENT DATA ADAPTER
 * ========================
 * A single versioned document persisted in `localStorage`, exposed through a
 * reactive subscription so every screen re-renders when anything anywhere
 * changes. Writes are copy-on-write, which keeps `getSnapshot()` referentially
 * stable between mutations (required by `useSyncExternalStore`).
 *
 * Cross-tab synchronisation is REAL for same-origin tabs in the same browser
 * via the `storage` event, open the customer and the admin dashboard side by
 * side and status changes propagate. It is NOT cross-device or multi-user
 * real-time: that must come from the backend (WebSocket/SSE/polling). See
 * `src/services/tracking.ts` for the honest wording used in the UI.
 *
 * Replace this module with the HTTP transport in `src/services/client.ts` when
 * `VITE_API_URL` is configured.
 */

export const STORAGE_KEY = "nmas-kitchen.db.v1";

let db: Database = loadInitial();
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Brand migration.
 *
 * Platform settings live inside the persisted document, so renaming the brand
 * in `seed.ts` would never reach a browser that already stored a database. This
 * rewrites the branding fields, and only when they still hold the previous
 * values, so a visitor's cart, orders and profile are left untouched.
 */
function applyBrandMigration(db: Database): { next: Database; changed: boolean } {
  // Literals rather than module constants on purpose: this runs from the
  // module initialiser, before any later `const` in this file is initialised.
  const current = db.settings;
  if (!current) return { next: db, changed: false };
  // Every name this storefront has shipped under, so a database stored under an
  // older one is caught. Matching only the most recent rename left browsers that
  // saved the original name still showing it.
  const staleNames = ["Nma's Kitchen", "Food Delivery System"];
  const staleName = staleNames.includes(current.siteName ?? "");
  const staleLogoText = staleNames.includes(current.logoText ?? "");
  const staleEmail = current.contactEmail === "support@nmaskitchen.ng";
  const missingLogo = !current.logoUrl;
  if (!staleName && !staleLogoText && !staleEmail && !missingLogo) {
    return { next: db, changed: false };
  }
  return {
    changed: true,
    next: {
      ...db,
      settings: {
        ...current,
        siteName: staleName ? "Chupnow" : current.siteName,
        logoText: staleLogoText ? "Chupnow" : current.logoText,
        logoUrl: current.logoUrl ?? "/logo.png",
        contactEmail: staleEmail ? "support@chupnow.ng" : current.contactEmail,
      },
    },
  };
}

function loadInitial(): Database {
  if (!isBrowser()) return createSeedDatabase();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedDatabase();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Database;
    if (!parsed || typeof parsed !== "object" || parsed.version !== 1) {
      const seeded = createSeedDatabase();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    // Defensive: a document persisted by an older build may miss new keys.
    const merged = { ...createSeedDatabase(), ...parsed };
    const migrated = applyBrandMigration(merged);
    if (migrated.changed) persist(migrated.next);
    return migrated.next;
  } catch {
    return createSeedDatabase();
  }
}

function persist(next: Database) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    // Quota errors are realistic once review photos are stored as data-URLs.
    console.error("[Chupnow] Could not persist the development database.", error);
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** Current immutable snapshot. */
export function getDb(): Database {
  return db;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Applies a mutation and notifies subscribers. The mutator receives a deep
 * clone, so it may be written imperatively (push/splice/assign) safely.
 */
export function update(mutator: (draft: Database) => void): Database {
  const draft = structuredClone(db) as Database;
  mutator(draft);
  db = draft;
  persist(db);
  emit();
  return db;
}

/** Re-reads from storage, used by the cross-tab `storage` listener. */
export function reloadFromStorage() {
  db = loadInitial();
  emit();
}

if (isBrowser()) {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) reloadFromStorage();
  });
}

/* ------------------------------------------------------------- utilities */

export function resetDatabase(): Database {
  const seeded = createSeedDatabase();
  db = seeded;
  persist(db);
  emit();
  return db;
}

export function exportDatabase(): string {
  return JSON.stringify(db, null, 2);
}

export function importDatabase(json: string): Database {
  const parsed = JSON.parse(json) as Database;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.foods)) {
    throw new Error("That file is not a valid Chupnow data export.");
  }
  db = { ...createSeedDatabase(), ...parsed };
  persist(db);
  emit();
  return db;
}

/** Appends an audit entry for a significant administrative change. */
export function recordAudit(
  draft: Database,
  actor: { id: string; fullName: string; role: Role } | null,
  action: string,
  target: string,
  detail: string,
): AuditEntry {
  const entry: AuditEntry = {
    id: uid("aud"),
    actorId: actor?.id ?? "system",
    actorName: actor?.fullName ?? "System",
    actorRole: actor?.role ?? "admin",
    action,
    target,
    detail,
    at: new Date().toISOString(),
  };
  draft.audit = [entry, ...draft.audit].slice(0, 300);
  return entry;
}
