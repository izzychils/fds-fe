import type {
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Rider,
  Role,
  User,
  Vehicle,
} from "@/types";
import { getDb, recordAudit, update } from "@/services/repository";
import { assertOwnership, ServiceError } from "@/services/guards";
import { calcPlatformFee, canTransition, isLive, type ToneKey } from "@/lib/orders";
import { foodService, isOrderable, vendorService } from "@/services/catalog";
import { groupByVendor } from "@/lib/orders";
import { uid } from "@/lib/utils";

/**
 * Order, rider and tracking services.
 *
 * Backend contract mirrored by every function:
 *   orders   GET|POST /orders              (scoped by the caller's role)
 *            GET      /orders/:id
 *            PATCH    /orders/:id/status
 *            PATCH    /orders/:id/rider
 *            POST     /orders/:id/reorder
 *   riders   GET|POST|PATCH|DELETE /riders
 *   tracking GET /orders/:id/tracking      (poll / SSE / WebSocket)
 *
 * Order status changes flow through ONE validator (`canTransition`) shared by
 * the customer, vendor and admin dashboards, so the three views can never
 * disagree about what is allowed next.
 */

/* ------------------------------------------------------------ references */

function nextOrderId(): string {
  const used = new Set(getDb().orders.map((o) => o.id));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `NMK-${Math.floor(10000 + Math.random() * 89999)}`;
    if (!used.has(candidate)) return candidate;
  }
  return `NMK-${Date.now().toString().slice(-6)}`;
}

/* --------------------------------------------------------------- riders */

export const riderService = {
  list(): Rider[] {
    return getDb().riders;
  },

  /** Vendor-scoped fleet: the platform fleet plus the vendor's own riders. */
  listForVendor(vendorId: string | null): Rider[] {
    const riders = getDb().riders;
    if (!vendorId) return riders;
    return riders.filter((r) => r.vendorId === null || r.vendorId === vendorId);
  },

  get(id: string): Rider | null {
    return getDb().riders.find((r) => r.id === id) ?? null;
  },

  available(vendorId: string | null): Rider[] {
    return riderService.listForVendor(vendorId).filter((r) => r.isActive && r.isAvailable);
  },

  create(
    input: { name: string; phone: string; vehicle: Vehicle; plateNumber: string; vendorId: string | null },
    actor: User,
  ): Rider {
    if (actor.role === "vendor") {
      if (input.vendorId !== actor.vendorId) {
        throw new ServiceError("You can only add riders to your own kitchen.");
      }
    }
    if (!input.name.trim()) throw new ServiceError("Enter the rider's name.");
    if (!input.phone.trim()) throw new ServiceError("Enter the rider's phone number.");
    const rider: Rider = {
      id: uid("rdr"),
      name: input.name.trim(),
      phone: input.phone.trim(),
      vehicle: input.vehicle,
      plateNumber: input.plateNumber.trim() || "None",
      vendorId: input.vendorId,
      isActive: true,
      isAvailable: true,
      rating: 0,
      deliveriesCompleted: 0,
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.riders.push(rider);
      recordAudit(draft, actor, "rider.create", rider.name, `Rider added (${rider.vehicle})`);
    });
    return rider;
  },

  update(id: string, patch: Partial<Rider>, actor: User): Rider {
    const existing = riderService.get(id);
    if (!existing) throw new ServiceError("Rider not found.");
    assertOwnership(actor, existing.vendorId, "rider");
    if (patch.name !== undefined && !patch.name.trim()) throw new ServiceError("Enter the rider's name.");
    if (patch.phone !== undefined && !patch.phone.trim()) {
      throw new ServiceError("Enter the rider's phone number.");
    }
    update((draft) => {
      const rider = draft.riders.find((r) => r.id === id);
      if (!rider) return;
      Object.assign(rider, patch);
      recordAudit(draft, actor, "rider.update", rider.name, "Rider details changed");
    });
    return { ...existing, ...patch };
  },

  setActive(id: string, isActive: boolean, actor: User) {
    const existing = riderService.get(id);
    if (!existing) throw new ServiceError("Rider not found.");
    assertOwnership(actor, existing.vendorId, "rider");
    update((draft) => {
      const rider = draft.riders.find((r) => r.id === id);
      if (rider) {
        rider.isActive = isActive;
        if (!isActive) rider.isAvailable = false;
      }
    });
  },

  setAvailable(id: string, isAvailable: boolean, actor: User) {
    const existing = riderService.get(id);
    if (!existing) throw new ServiceError("Rider not found.");
    assertOwnership(actor, existing.vendorId, "rider");
    if (!existing.isActive && isAvailable) {
      throw new ServiceError("Reactivate this rider before marking them available.");
    }
    update((draft) => {
      const rider = draft.riders.find((r) => r.id === id);
      if (rider) rider.isAvailable = isAvailable;
    });
  },

  remove(id: string, actor: User) {
    const existing = riderService.get(id);
    if (!existing) throw new ServiceError("Rider not found.");
    assertOwnership(actor, existing.vendorId, "rider");
    const assigned = getDb().orders.filter((o) => o.riderId === id && isLive(o.status)).length;
    if (assigned > 0) {
      throw new ServiceError(
        `This rider has ${assigned} live order${assigned === 1 ? "" : "s"}. Reassign or deactivate them instead.`,
      );
    }
    update((draft) => {
      draft.riders = draft.riders.filter((r) => r.id !== id);
      for (const order of draft.orders) {
        if (order.riderId === id) order.riderId = null;
      }
      recordAudit(draft, actor, "rider.delete", existing.name, "Rider removed");
    });
  },
};

/* --------------------------------------------------------------- orders */

export interface CheckoutInput {
  user: User;
  items: CartItem[];
  addressId: string;
  paymentMethod: PaymentMethod;
  promoCode: string | null;
  customerNote: string;
}

export const orderService = {
  list(): Order[] {
    return [...getDb().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  /** Customer sees only their own orders, enforced here, and by the backend. */
  listForCustomer(userId: string): Order[] {
    return orderService.list().filter((o) => o.customerId === userId);
  },

  /** Vendor sees only orders containing at least one of its dishes. */
  listForVendor(vendorId: string): Order[] {
    return orderService.list().filter((o) => o.vendorIds.includes(vendorId));
  },

  get(id: string): Order | null {
    return getDb().orders.find((o) => o.id === id) ?? null;
  },

  /** Every order touching a given set of vendors (used for "today" metrics). */
  liveForVendor(vendorId: string): Order[] {
    return orderService.listForVendor(vendorId).filter((o) => isLive(o.status));
  },

  /** Builds an order from the cart. Money is computed once, here. */
  checkout(input: CheckoutInput): Order {
    const db = getDb();
    const address = db.addresses.find((a) => a.id === input.addressId);
    if (!address) throw new ServiceError("Choose a delivery address before checking out.");
    if (address.userId !== input.user.id) throw new ServiceError("That address does not belong to you.");
    if (input.items.length === 0) throw new ServiceError("Your cart is empty.");

    const items: OrderItem[] = [];
    for (const cartItem of input.items) {
      const food = db.foods.find((f) => f.id === cartItem.foodId);
      if (!food) throw new ServiceError("A dish in your cart is no longer on the menu.");
      if (!isOrderable(food)) throw new ServiceError(`"${food.name}" is no longer available.`);
      if (food.stockCount !== null && food.stockCount < cartItem.quantity) {
        throw new ServiceError(
          `Only ${food.stockCount} left of "${food.name}". Please reduce the quantity.`,
        );
      }
      const vendor = db.vendors.find((v) => v.id === food.vendorId);
      const size = cartItem.sizeId ? food.sizes.find((s) => s.id === cartItem.sizeId) : undefined;
      if (cartItem.sizeId && !size) {
        throw new ServiceError(`That size is no longer offered for "${food.name}".`);
      }
      const addOnTotal = [...cartItem.proteins, ...cartItem.extras].reduce(
        (sum, addOn) => sum + addOn.price,
        0,
      );
      const lineTotal =
        (food.price + (size?.priceDelta ?? 0) + addOnTotal) * cartItem.quantity;
      items.push({
        id: uid("oli"),
        foodId: food.id,
        vendorId: food.vendorId,
        vendorName: vendor?.name ?? "Kitchen",
        name: food.name,
        image: food.image,
        unitPrice: food.price,
        sizeLabel: size?.label ?? null,
        sizePriceDelta: size?.priceDelta ?? 0,
        proteins: cartItem.proteins,
        extras: cartItem.extras,
        instructions: cartItem.instructions,
        quantity: cartItem.quantity,
        lineTotal,
      });
    }

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    if (subtotal < db.settings.minOrderValue) {
      throw new ServiceError(
        `Minimum order value is ₦${db.settings.minOrderValue.toLocaleString("en-NG")}.`,
      );
    }

    // Multi-vendor carts carry each kitchen's own delivery arrangements (§17).
    const groups = groupByVendor(
      input.items,
      Object.fromEntries(db.vendors.map((v) => [v.id, v.deliveryFee])),
    );
    const deliveryFee = groups.reduce((sum, group) => sum + group.deliveryFee, 0);
    const vendorIds = groups.map((g) => g.vendorId);
    const itemCount = items.reduce((n, i) => n + i.quantity, 0);
    const fee = calcPlatformFee(subtotal, itemCount, db.settings);

    let discount = 0;
    if (input.promoCode) {
      const promo = db.settings.promoCodes.find(
        (p) => p.code.toLowerCase() === input.promoCode?.trim().toLowerCase(),
      );
      if (!promo || !promo.isActive) throw new ServiceError("That promo code is not valid.");
      if (subtotal < promo.minOrder) {
        throw new ServiceError(
          `Code ${promo.code} needs a minimum order of ₦${promo.minOrder.toLocaleString("en-NG")}.`,
        );
      }
      discount = Math.round((subtotal * promo.percentOff) / 100);
    }

    const id = nextOrderId();
    const now = new Date().toISOString();
    const etaMinutes =
      Math.max(...items.map((i) => foodService.get(i.foodId)?.prepTimeMinutes ?? 25)) +
      db.settings.defaultDeliveryMinutes;

    const order: Order = {
      id,
      customerId: input.user.id,
      customerName: input.user.fullName,
      customerPhone: input.user.phone,
      vendorIds,
      items,
      status: "pending",
      vendorStatus: Object.fromEntries(vendorIds.map((vid) => [vid, "pending" as OrderStatus])),
      subtotal,
      deliveryFee,
      platformFee: fee.amount,
      feeSnapshot: { type: db.settings.feeType, value: db.settings.feeValue },
      discount,
      promoCode: input.promoCode ? input.promoCode.trim().toUpperCase() : null,
      total: Math.max(0, subtotal + deliveryFee + fee.amount - discount),
      address,
      paymentMethod: input.paymentMethod,
      // No provider has confirmed anything yet, this is deliberately honest.
      paymentStatus: input.paymentMethod === "cash" ? "pending" : "pending",
      paymentReference: null,
      riderId: null,
      timeline: [
        { status: "pending", at: now, note: "Order placed", actor: "customer" },
      ],
      etaMinutes,
      trackingPath: [],
      trackingProgress: 0,
      customerNote: input.customerNote,
      vendorNote: "",
      createdAt: now,
      updatedAt: now,
    };

    update((draft) => {
      draft.orders.unshift(order);
      // Decrement vendor stock so live inventory reflects the sale.
      for (const item of items) {
        const food = draft.foods.find((f) => f.id === item.foodId);
        if (food && food.stockCount !== null) {
          food.stockCount = Math.max(0, food.stockCount - item.quantity);
          if (food.stockCount === 0) food.isAvailable = false;
        }
      }
      draft.cart = [];
      // Consumption signal for the recommendation engine.
      const user = draft.users.find((u) => u.id === input.user.id);
      if (user) {
        user.favoriteCuisineIds = [
          ...new Set([
            ...user.favoriteCuisineIds,
            ...items
              .map((i) => draft.foods.find((f) => f.id === i.foodId)?.cuisineId)
              .filter((c): c is string => Boolean(c)),
          ]),
        ].slice(0, 6);
      }
    });

    return order;
  },

  /**
   * Single validated transition used by every dashboard.
   * `vendorId` scopes the change to one kitchen's fulfilment record.
   */
  transition(args: {
    orderId: string;
    to: OrderStatus;
    actor: User;
    vendorId?: string | null;
    note?: string;
  }): Order {
    const order = orderService.get(args.orderId);
    if (!order) throw new ServiceError("Order not found.");
    const { actor } = args;

    if (actor.role === "customer") {
      if (order.customerId !== actor.id) throw new ServiceError("That is not your order.");
      if (args.to !== "cancelled") throw new ServiceError("You cannot set that status.");
    }
    if (actor.role === "vendor") {
      const vendorId = args.vendorId ?? actor.vendorId;
      if (!vendorId || !order.vendorIds.includes(vendorId)) {
        throw new ServiceError("That order does not belong to your kitchen.");
      }
    }

    const current = args.vendorId ? order.vendorStatus[args.vendorId] ?? order.status : order.status;
    if (!canTransition(current, args.to)) {
      throw new ServiceError(`An order cannot move from "${current}" to "${args.to}".`);
    }

    const now = new Date().toISOString();
    let updated: Order = order;
    update((draft) => {
      const target = draft.orders.find((o) => o.id === args.orderId);
      if (!target) return;
      if (args.vendorId) target.vendorStatus[args.vendorId] = args.to;
      // The order-level status reflects the least advanced live vendor.
      target.status = args.vendorId ? rollUpStatus(target) : args.to;
      target.timeline = [
        ...target.timeline,
        {
          status: args.to,
          at: now,
          note: args.note ?? defaultNote(args.to),
          actor: actor.role,
        },
      ];
      target.updatedAt = now;
      // Movement starts when the rider sets off.
      if (args.to === "out_for_delivery") target.trackingProgress = Math.max(target.trackingProgress, 0.15);
      if (args.to === "picked_up") target.trackingProgress = Math.max(target.trackingProgress, 0.08);
      if (args.to === "delivered") target.trackingProgress = 1;
      updated = target;
    });
    return updated;
  },

  assignRider(orderId: string, riderId: string | null, actor: User): Order {
    const order = orderService.get(orderId);
    if (!order) throw new ServiceError("Order not found.");
    if (actor.role === "vendor") {
      const vendorId = actor.vendorId;
      if (!vendorId || !order.vendorIds.includes(vendorId)) {
        throw new ServiceError("That order does not belong to your kitchen.");
      }
    }
    if (riderId) {
      const rider = riderService.get(riderId);
      if (!rider) throw new ServiceError("Rider not found.");
      if (!rider.isActive) throw new ServiceError("That rider is deactivated.");
      if (rider.vendorId && actor.role === "vendor" && rider.vendorId !== actor.vendorId) {
        throw new ServiceError("That rider belongs to another kitchen.");
      }
      if (order.status === "pending" || order.status === "confirmed") {
        throw new ServiceError("Confirm and prepare the order before assigning a rider.");
      }
    }
    let updated: Order = order;
    update((draft) => {
      const target = draft.orders.find((o) => o.id === orderId);
      if (!target) return;
      target.riderId = riderId;
      if (riderId && canTransition(target.status, "rider_assigned")) {
        target.status = "rider_assigned";
        for (const vid of target.vendorIds) {
          if (target.vendorStatus[vid] === "ready_for_pickup") {
            target.vendorStatus[vid] = "rider_assigned";
          }
        }
        target.timeline = [
          ...target.timeline,
          {
            status: "rider_assigned",
            at: new Date().toISOString(),
            note: `Rider assigned: ${riderService.get(riderId)?.name ?? "rider"}`,
            actor: actor.role,
          },
        ];
      }
      target.updatedAt = new Date().toISOString();
      updated = target;
    });
    return updated;
  },

  updateVendorNote(orderId: string, note: string, actor: User) {
    const order = orderService.get(orderId);
    if (!order) throw new ServiceError("Order not found.");
    if (actor.role === "vendor" && (!actor.vendorId || !order.vendorIds.includes(actor.vendorId))) {
      throw new ServiceError("That order does not belong to your kitchen.");
    }
    update((draft) => {
      const target = draft.orders.find((o) => o.id === orderId);
      if (target) {
        target.vendorNote = note;
        target.updatedAt = new Date().toISOString();
      }
    });
  },

  /** True once every vendor on a multi-vendor order has marked it delivered. */
  allVendorsDelivered(order: Order): boolean {
    return order.vendorIds.every((id) => order.vendorStatus[id] === "delivered");
  },

  reorder(orderId: string, userId: string): CartItem[] {
    const order = orderService.get(orderId);
    if (!order) throw new ServiceError("Order not found.");
    if (order.customerId !== userId) throw new ServiceError("That is not your order.");
    const unavailable: string[] = [];
    const items: CartItem[] = [];
    for (const item of order.items) {
      const food = foodService.get(item.foodId);
      if (!food || !isOrderable(food)) {
        unavailable.push(item.name);
        continue;
      }
      items.push({
        id: uid("cit"),
        foodId: food.id,
        vendorId: food.vendorId,
        name: food.name,
        image: food.image,
        unitPrice: food.price,
        sizeId: null,
        sizeLabel: item.sizeLabel,
        sizePriceDelta: item.sizePriceDelta,
        proteins: item.proteins,
        extras: item.extras,
        instructions: item.instructions,
        quantity: item.quantity,
      });
    }
    if (items.length === 0) {
      throw new ServiceError("None of those dishes are available right now.");
    }
    update((draft) => {
      draft.cart = items;
    });
    if (unavailable.length > 0) {
      throw new ServiceError(
        `Added ${items.length} item(s). Not available: ${unavailable.join(", ")}.`,
      );
    }
    return items;
  },

  /** Dashboard metrics shared by the vendor and merchant overviews. */
  stats(orders: Order[]) {
    const live = orders.filter((o) => isLive(o.status));
    const revenue = orders
      .filter((o) => o.status === "delivered")
      .reduce((sum, o) => sum + o.subtotal, 0);
    const platformFees = orders.reduce((sum, o) => sum + o.platformFee, 0);
    return {
      total: orders.length,
      live: live.length,
      pending: orders.filter((o) => o.status === "pending").length,
      preparing: orders.filter((o) => o.status === "preparing").length,
      outForDelivery: orders.filter((o) => o.status === "out_for_delivery").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled" || o.status === "failed").length,
      revenue,
      platformFees,
      averageOrderValue: orders.length ? Math.round(orders.reduce((s, o) => s + o.total, 0) / orders.length) : 0,
    };
  },

  toneFor(status: OrderStatus): ToneKey {
    return STATUS_TONE[status];
  },
};

const STATUS_TONE: Record<OrderStatus, ToneKey> = {
  pending: "warning",
  confirmed: "info",
  preparing: "info",
  ready_for_pickup: "info",
  rider_assigned: "primary",
  picked_up: "primary",
  out_for_delivery: "primary",
  delivered: "success",
  cancelled: "destructive",
  failed: "destructive",
};

function defaultNote(status: OrderStatus): string {
  switch (status) {
    case "confirmed":
      return "Accepted by the kitchen";
    case "preparing":
      return "Cooking started";
    case "ready_for_pickup":
      return "Packed and waiting for a rider";
    case "rider_assigned":
      return "Rider assigned";
    case "picked_up":
      return "Collected from the kitchen";
    case "out_for_delivery":
      return "On the way to the customer";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Delivery failed";
    default:
      return "Order placed";
  }
}

/**
 * The order-level status is the least advanced live vendor status, so a
 * multi-vendor order is never reported as delivered while one kitchen is still
 * cooking. Terminal side-states win outright.
 */
function rollUpStatus(order: Order): OrderStatus {
  const statuses = order.vendorIds.map((id) => order.vendorStatus[id] ?? order.status);
  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.some((s) => s === "failed")) return "failed";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  const rank = (s: OrderStatus) =>
    ["pending", "confirmed", "preparing", "ready_for_pickup", "rider_assigned", "picked_up", "out_for_delivery", "delivered"].indexOf(s);
  const live = statuses.filter((s) => s !== "cancelled" && s !== "delivered");
  if (live.length === 0) return statuses[0] ?? order.status;
  return live.reduce((lowest, s) => (rank(s) < rank(lowest) ? s : lowest), live[0]);
}

/* ------------------------------------------------------------- tracking */

/**
 * DEVELOPMENT TRACKING SIMULATOR
 * ------------------------------
 * There is no fleet telematics provider connected. This module interpolates a
 * plausible route between the kitchen and the delivery address so the tracking
 * UI can be built and reviewed. The interface labels it "simulated" everywhere
 * it appears, it is never presented as live GPS.
 *
 * When a real provider exists, replace `buildPath`/`advance` with the backend
 * tracking endpoint (`GET /orders/:id/tracking`) and delete this simulator.
 */
export const trackingService = {
  buildPath(order: Order): Array<{ latitude: number; longitude: number }> {
    const vendor = vendorService.get(order.vendorIds[0]);
    if (!vendor) return [];
    const from = { latitude: vendor.latitude, longitude: vendor.longitude };
    const to = { latitude: order.address.latitude, longitude: order.address.longitude };
    const steps = 28;
    const points: Array<{ latitude: number; longitude: number }> = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      // A gentle arc so the route does not look like a straight ruler line.
      const arc = Math.sin(t * Math.PI) * 0.004;
      points.push({
        latitude: from.latitude + (to.latitude - from.latitude) * t + arc,
        longitude: from.longitude + (to.longitude - from.longitude) * t - arc * 0.6,
      });
    }
    return points;
  },

  ensurePath(orderId: string) {
    const order = orderService.get(orderId);
    if (!order || order.trackingPath.length > 0) return;
    update((draft) => {
      const target = draft.orders.find((o) => o.id === orderId);
      if (target) target.trackingPath = trackingService.buildPath(order);
    });
  },

  /** Percentage along the route, clamped to [0, 1]. */
  progress(order: Order): number {
    if (order.status === "delivered") return 1;
    if (order.status === "out_for_delivery") {
      return Math.min(0.95, Math.max(0.3, order.trackingProgress));
    }
    if (order.status === "picked_up") return 0.2;
    return 0;
  },

  currentPoint(order: Order): { latitude: number; longitude: number } | null {
    if (order.trackingPath.length === 0) return null;
    const index = Math.round(trackingService.progress(order) * (order.trackingPath.length - 1));
    return order.trackingPath[Math.min(order.trackingPath.length - 1, Math.max(0, index))];
  },

  /** Advances simulated courier movement for live orders. */
  tick(): number {
    const db = getDb();
    const live = db.orders.filter((o) => o.status === "out_for_delivery");
    if (live.length === 0) return 0;
    update((draft) => {
      for (const order of draft.orders) {
        if (order.status !== "out_for_delivery") continue;
        order.trackingProgress = Math.min(0.96, order.trackingProgress + 0.02);
      }
    });
    return live.length;
  },
};

/* ---------------------------------------------------- permission helpers */

export function canManageOrder(user: User | null, order: Order | null): boolean {
  if (!user || !order) return false;
  if (user.role === "admin") return true;
  if (user.role === "vendor") return Boolean(user.vendorId && order.vendorIds.includes(user.vendorId));
  return order.customerId === user.id;
}

export function actorLabel(role: Role): string {
  return role === "admin" ? "Merchant" : role === "vendor" ? "Vendor" : "Customer";
}
