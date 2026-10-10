import type { CartItem, FoodItem, OrderTotals, PlatformSettings } from "@/types";
import { getDb, update } from "@/services/repository";
import { ServiceError } from "@/services/guards";
import { effectiveFoodPrice, isOrderable } from "@/services/catalog";
import { computeTotals, groupByVendor } from "@/lib/orders";
import { uid } from "@/lib/utils";

/**
 * Cart service.
 *
 * Backend contract mirrored by every function:
 *   cart  GET|POST|PATCH|DELETE /cart           (server-side cart per user)
 *         POST /cart/validate                   (re-price & re-check stock)
 *
 * The cart lives in the development repository so it survives navigation and a
 * page reload, never in component state.
 */

export interface AddToCartInput {
  foodId: string;
  quantity: number;
  sizeId: string | null;
  proteinIds: string[];
  extraIds: string[];
  instructions: string;
}

export const cartService = {
  list(): CartItem[] {
    return getDb().cart;
  },

  count(): number {
    return getDb().cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  delivery(): { addressId: string | null; query: string } {
    return getDb().delivery;
  },

  setDelivery(addressId: string | null, query: string) {
    update((draft) => {
      draft.delivery.addressId = addressId;
      draft.delivery.query = query;
    });
  },

  /**
   * Validates a customization against the dish's own configuration before the
   * line is created: required proteins, selection limits, availability, stock.
   */
  add(input: AddToCartInput): CartItem {
    const db = getDb();
    const food = db.foods.find((f) => f.id === input.foodId);
    if (!food) throw new ServiceError("Dish not found.");
    if (!isOrderable(food)) throw new ServiceError(`"${food.name}" is not available right now.`);
    if (input.quantity < 1) throw new ServiceError("Choose a quantity of at least 1.");
    if (food.stockCount !== null && input.quantity > food.stockCount) {
      throw new ServiceError(`Only ${food.stockCount} left of "${food.name}".`);
    }

    const offeredProteins = new Set(food.proteinIds);
    const proteinIds = input.proteinIds.filter((id) => offeredProteins.has(id));
    const offeredExtras = new Set(food.extraIds);
    const extraIds = input.extraIds.filter((id) => offeredExtras.has(id));

    if (food.proteinSelection === "required" && proteinIds.length === 0) {
      throw new ServiceError(`Choose a protein for "${food.name}".`);
    }
    if (food.proteinSelection === "none" && proteinIds.length > 0) {
      throw new ServiceError(`"${food.name}" does not offer protein choices.`);
    }
    if (proteinIds.length > food.maxProteins) {
      throw new ServiceError(`You can pick up to ${food.maxProteins} protein(s) for "${food.name}".`);
    }
    if (extraIds.length > food.maxExtras) {
      throw new ServiceError(`You can pick up to ${food.maxExtras} extra(s) for "${food.name}".`);
    }

    const size = input.sizeId ? food.sizes.find((s) => s.id === input.sizeId) : undefined;
    if (input.sizeId && !size) throw new ServiceError("That serving size is no longer offered.");

    const proteins = proteinIds
      .map((id) => db.proteins.find((p) => p.id === id))
      .flatMap((p) => (p ? [{ id: p.id, name: p.name, price: p.price, available: p.isAvailable }] : []))
      .filter((p) => {
        if (!p.available) throw new ServiceError(`"${p.name}" is temporarily unavailable.`);
        return true;
      })
      .map(({ id, name, price }) => ({ id, name, price }));

    const extras = extraIds
      .map((id) => db.extras.find((e) => e.id === id))
      .flatMap((e) => (e ? [{ id: e.id, name: e.name, price: e.price, available: e.isAvailable }] : []))
      .filter((e) => {
        if (!e.available) throw new ServiceError(`"${e.name}" is temporarily unavailable.`);
        return true;
      })
      .map(({ id, name, price }) => ({ id, name, price }));

    const instructions = input.instructions.trim();

    const addOnPrices = [...proteins, ...extras].reduce((sum, a) => sum + a.price, 0);

    // Merge an identical customization into the existing line rather than
    // stacking duplicate rows in the cart.
    const existing = db.cart.find(
      (item) =>
        item.foodId === food.id &&
        item.sizeId === (size?.id ?? null) &&
        sameSet(item.proteins.map((p) => p.id), proteinIds) &&
        sameSet(item.extras.map((e) => e.id), extraIds) &&
        item.instructions.toLowerCase() === instructions.toLowerCase(),
    );
    void addOnPrices;

    if (existing) {
      const merged = existing.quantity + input.quantity;
      if (food.stockCount !== null && merged > food.stockCount) {
        throw new ServiceError(`Only ${food.stockCount} left of "${food.name}".`);
      }
      update((draft) => {
        const line = draft.cart.find((item) => item.id === existing.id);
        if (line) line.quantity = merged;
      });
      return { ...existing, quantity: merged };
    }

    const line: CartItem = {
      id: uid("cit"),
      foodId: food.id,
      vendorId: food.vendorId,
      name: food.name,
      image: food.image,
      unitPrice: effectiveFoodPrice(food),
      sizeId: size?.id ?? null,
      sizeLabel: size?.label ?? null,
      sizePriceDelta: size?.priceDelta ?? 0,
      proteins,
      extras,
      instructions,
      quantity: input.quantity,
    };
    update((draft) => {
      draft.cart.push(line);
    });
    return line;
  },

  setQuantity(lineId: string, quantity: number) {
    if (quantity < 1) {
      cartService.remove(lineId);
      return;
    }
    const line = getDb().cart.find((item) => item.id === lineId);
    if (!line) throw new ServiceError("That cart item no longer exists.");
    const food = getDb().foods.find((f) => f.id === line.foodId);
    if (food && food.stockCount !== null && quantity > food.stockCount) {
      throw new ServiceError(`Only ${food.stockCount} left of "${food.name}".`);
    }
    update((draft) => {
      const item = draft.cart.find((c) => c.id === lineId);
      if (item) item.quantity = quantity;
    });
  },

  remove(lineId: string) {
    update((draft) => {
      draft.cart = draft.cart.filter((item) => item.id !== lineId);
    });
  },

  clear() {
    update((draft) => {
      draft.cart = [];
    });
  },

  /**
   * Money preview for the cart and checkout. Uses the exact same
   * `computeTotals` the order service writes into the order, so the figure the
   * customer sees here is the figure they are charged.
   */
  preview(settings: PlatformSettings, discount = 0): OrderTotals & { feeBasis: string } {
    const db = getDb();
    const groups = groupByVendor(
      db.cart,
      Object.fromEntries(db.vendors.map((v) => [v.id, v.deliveryFee])),
    );
    const deliveryFee = groups.reduce((sum, group) => sum + group.deliveryFee, 0);
    return computeTotals({ items: db.cart, settings, deliveryFee, discount });
  },

  /** Vendors represented in the cart, each with its own delivery terms. */
  vendorGroups() {
    const db = getDb();
    return groupByVendor(
      db.cart,
      Object.fromEntries(db.vendors.map((v) => [v.id, v.deliveryFee])),
    ).map((group) => ({
      ...group,
      vendor: db.vendors.find((v) => v.id === group.vendorId) ?? null,
    }));
  },
};

export function cartAddOnTotal(item: CartItem): number {
  return [...item.proteins, ...item.extras].reduce((sum, addOn) => sum + addOn.price, 0);
}

export function cartLineUnitPrice(item: CartItem): number {
  return item.unitPrice + item.sizePriceDelta + cartAddOnTotal(item);
}

export function foodCategoryOptions(foods: FoodItem[]): string[] {
  return [...new Set(foods.map((f) => f.category))].sort();
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}
