import type { OrderStatus } from "@/types";

/**
 * Filter option keys for the order boards. Kept in one place so the vendor and
 * merchant consoles offer exactly the same statuses — derived from the shared
 * order status model rather than hand-written per screen.
 */
export type OrderFilterKey = OrderStatus | "all" | "live";

export const ALL_TRANSITIONS_KEYS: OrderFilterKey[] = [
  "all",
  "live",
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "rider_assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "failed",
];
