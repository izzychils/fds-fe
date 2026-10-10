import type {
  CartItem,
  FeeType,
  Order,
  OrderStatus,
  OrderTotals,
  PlatformSettings,
} from "@/types";

/**
 * ONE shared order status model for customer, vendor and admin (§27).
 * Every dashboard reads this file so the three experiences can never drift
 * apart or define conflicting statuses.
 */
export const STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: ToneKey; step: number }
> = {
  pending: {
    label: "Pending confirmation",
    description: "Order received and waiting to be accepted.",
    tone: "warning",
    step: 0,
  },
  confirmed: {
    label: "Confirmed",
    description: "The kitchen accepted your order.",
    tone: "info",
    step: 1,
  },
  preparing: {
    label: "Preparing",
    description: "Your food is being cooked.",
    tone: "info",
    step: 2,
  },
  ready_for_pickup: {
    label: "Ready for pickup",
    description: "Packed and waiting for a rider.",
    tone: "info",
    step: 3,
  },
  rider_assigned: {
    label: "Rider assigned",
    description: "A rider has been assigned to the delivery.",
    tone: "primary",
    step: 4,
  },
  picked_up: {
    label: "Picked up",
    description: "The rider collected your order.",
    tone: "primary",
    step: 5,
  },
  out_for_delivery: {
    label: "Out for delivery",
    description: "On the way to your address.",
    tone: "primary",
    step: 6,
  },
  delivered: {
    label: "Delivered",
    description: "Order delivered. Enjoy your meal!",
    tone: "success",
    step: 7,
  },
  cancelled: {
    label: "Cancelled",
    description: "This order was cancelled.",
    tone: "destructive",
    step: -1,
  },
  failed: {
    label: "Failed",
    description: "Delivery could not be completed.",
    tone: "destructive",
    step: -1,
  },
};

export type ToneKey = "primary" | "success" | "warning" | "destructive" | "info" | "muted";

/** The happy path, in order. `cancelled`/`failed` are terminal side-states. */
export const FULFILMENT_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "rider_assigned",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

export const TERMINAL_STATUSES: OrderStatus[] = ["delivered", "cancelled", "failed"];

/**
 * Valid transitions. An order can never skip ahead (e.g. delivered before it
 * was dispatched) and terminal states are immutable, except that a delivered
 * order cannot be re-opened at all.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["rider_assigned", "cancelled"],
  rider_assigned: ["picked_up", "cancelled"],
  picked_up: ["out_for_delivery", "failed"],
  out_for_delivery: ["delivered", "failed"],
  delivered: [],
  cancelled: [],
  failed: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** The next forward step, or `null` for terminal / side-states. */
export function nextForwardStatus(status: OrderStatus): OrderStatus | null {
  const index = FULFILMENT_FLOW.indexOf(status);
  if (index < 0 || index === FULFILMENT_FLOW.length - 1) return null;
  return FULFILMENT_FLOW[index + 1];
}

export function isCancelable(status: OrderStatus): boolean {
  return canTransition(status, "cancelled");
}

export function isLive(status: OrderStatus): boolean {
  return !TERMINAL_STATUSES.includes(status);
}

export function progressPercent(status: OrderStatus): number {
  const step = STATUS_META[status].step;
  if (step < 0) return 100;
  return Math.round((step / (FULFILMENT_FLOW.length - 1)) * 100);
}

/* ------------------------------------------------------------------ money */

export function cartItemUnitTotal(item: CartItem): number {
  const addOns = [...item.proteins, ...item.extras].reduce((sum, a) => sum + a.price, 0);
  return item.unitPrice + item.sizePriceDelta + addOns;
}

export function cartItemLineTotal(item: CartItem): number {
  return cartItemUnitTotal(item) * item.quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + cartItemLineTotal(item), 0);
}

/**
 * Platform fee policy (§19). The basis is explicit and always reported
 * alongside the number so a fee is never a mystery to the merchant.
 */
export function calcPlatformFee(
  subtotal: number,
  itemCount: number,
  settings: Pick<PlatformSettings, "feeType" | "feeValue">,
): { amount: number; basis: string } {
  const { feeType, feeValue } = settings;
  if (feeValue <= 0) return { amount: 0, basis: "No platform fee configured" };
  switch (feeType) {
    case "percentage": {
      const amount = Math.round((subtotal * feeValue) / 100);
      return { amount, basis: `${feeValue}% of food subtotal` };
    }
    case "fixed":
      return { amount: Math.round(feeValue), basis: `Flat ₦${feeValue} per order` };
    case "per_item": {
      const amount = Math.round(feeValue * itemCount);
      return { amount, basis: `₦${feeValue} per item × ${itemCount}` };
    }
    default:
      return { amount: 0, basis: "None" };
  }
}

export function feeTypeLabel(type: FeeType): string {
  return type === "percentage" ? "Percentage" : type === "fixed" ? "Fixed per order" : "Per item";
}

export function computeTotals(args: {
  items: CartItem[];
  settings: PlatformSettings;
  deliveryFee: number;
  discount?: number;
}): OrderTotals & { feeBasis: string } {
  const subtotal = cartSubtotal(args.items);
  const itemCount = args.items.reduce((n, i) => n + i.quantity, 0);
  const fee = calcPlatformFee(subtotal, itemCount, args.settings);
  const discount = args.discount ?? 0;
  const deliveryFee = subtotal > 0 ? args.deliveryFee : 0;
  return {
    subtotal,
    deliveryFee,
    platformFee: fee.amount,
    discount,
    total: Math.max(0, subtotal + deliveryFee + fee.amount - discount),
    feeBasis: fee.basis,
  };
}

/* ------------------------------------------------- multi-vendor splitting */

export interface VendorGroup {
  vendorId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
}

/**
 * A cart may hold dishes from several kitchens. Each vendor keeps its own
 * delivery arrangements, so the group records the fee that vendor charges.
 */
export function groupByVendor(items: CartItem[], deliveryFees: Record<string, number>): VendorGroup[] {
  const groups = new Map<string, CartItem[]>();
  for (const item of items) {
    const bucket = groups.get(item.vendorId);
    if (bucket) bucket.push(item);
    else groups.set(item.vendorId, [item]);
  }
  return [...groups.entries()].map(([vendorId, groupItems]) => ({
    vendorId,
    items: groupItems,
    subtotal: cartSubtotal(groupItems),
    deliveryFee: deliveryFees[vendorId] ?? 0,
  }));
}

export function vendorStatusOf(order: Order, vendorId: string): OrderStatus {
  return order.vendorStatus[vendorId] ?? order.status;
}
