import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { Database, User, Vendor } from "@/types";
import { getDb, subscribe } from "@/services/repository";
import { ServiceError, authService } from "@/services";
import { cartService } from "@/services/cart";

/**
 * The reactive store hook. Every component that reads data subscribes here, so
 * ANY change anywhere in the application re-renders the affected screens,  * which is why a dish added on the vendor dashboard appears on the marketplace
 * immediately, and why opening the customer and admin views in two tabs keeps
 * them in step (same-origin `storage` events).
 */
export function useDb(): Database {
  return useSyncExternalStore(subscribe, getDb, getDb);
}

/**
 * Memoise a value derived from the shared store.
 *
 * The service layer already reads the current snapshot from the repository, so
 * a selector body rarely mentions `db` itself. Passing the snapshot in anyway
 * keeps the derived value correct, it is recomputed whenever ANY part of the
 * store changes, exactly like `useMemo(..., [db])`, while making the
 * dependency real rather than merely declared.
 *
 * `deps` carries the caller's own inputs (a route param, a filter, the session
 * user) so the value is also recomputed when those change.
 */
export function useDbMemo<T>(factory: (db: Database) => T, deps: readonly unknown[] = []): T {
  const db = useDb();
  const factoryRef = useRef(factory);
  factoryRef.current = factory;
  // `deps` is forwarded verbatim from the caller; the linter cannot see through
  // the spread, but `db` plus the caller's inputs fully describe the value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factoryRef.current(db), [db, ...deps]);
}

export function useSession(): { user: User | null; vendor: Vendor | null } {
  const db = useDb();
  return useMemo(() => {
    const user = db.session.userId
      ? db.users.find((u) => u.id === db.session.userId) ?? null
      : null;
    const vendor = user?.vendorId ? db.vendors.find((v) => v.id === user.vendorId) ?? null : null;
    return { user, vendor };
  }, [db]);
}

/** Cart count for the header badge. */
export function useCartCount(): number {
  const db = useDb();
  return db.cart.reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * Wraps a service call with pending state and consistent error feedback.
 * Returns `null` when the call failed so callers can branch on success.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async <T,>(
      action: () => T | Promise<T>,
      options?: { success?: string; onSuccess?: (result: T) => void; silentError?: boolean },
    ): Promise<T | null> => {
      setPending(true);
      try {
        const result = await action();
        if (options?.success) toast.success(options.success);
        options?.onSuccess?.(result);
        return result;
      } catch (error) {
        if (!options?.silentError) toast.error(errorMessage(error));
        return null;
      } finally {
        if (mounted.current) setPending(false);
      }
    },
    [],
  );

  return { run, pending };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ServiceError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/* ------------------------------------------------------------------- PWA */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Uses the browser's real installation event. When the browser cannot install
 * (unsupported engine, already installed, criteria unmet) `canInstall` is false
 * and the UI shows instructions instead of a fake button.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) setInstalled(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (!("serviceWorker" in navigator) || !("BeforeInstallPromptEvent" in window)) {
      // Chrome/Edge/Android support it; Firefox and older Safari do not.
      setSupported("serviceWorker" in navigator);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferred(null);
      return true;
    }
    return false;
  }, [deferred]);

  return { canInstall: Boolean(deferred) && !installed, installed, supported, promptInstall };
}

/* ------------------------------------------------------------------ misc */

/** Locks body scroll while a modal or drawer is open. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/** Development courier-position ticker. Purely visual; see trackingService. */
export function useTrackingTicker(enabled: boolean, intervalMs = 8000, onTick?: () => void) {
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => onTick?.(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, onTick]);
}

/** Cart + delivery helpers surfaced together for checkout screens. */
export function useCart() {
  const db = useDb();
  return {
    items: db.cart,
    count: db.cart.reduce((sum, item) => sum + item.quantity, 0),
    clear: () => cartService.clear(),
  };
}

export function useCurrentUser(): User | null {
  const db = useDb();
  void authService;
  return db.session.userId ? db.users.find((u) => u.id === db.session.userId) ?? null : null;
}
