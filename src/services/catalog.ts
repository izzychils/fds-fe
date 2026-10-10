import type {
  Cuisine,
  DietaryPreference,
  Extra,
  FoodItem,
  FoodSearchQuery,
  FoodWithVendor,
  Protein,
  Review,
  Vendor,
  VendorStatus,
} from "@/types";
import { getDb, recordAudit, update } from "@/services/repository";
import { ServiceError, type Actor } from "@/services/guards";
import { slugify, uid } from "@/lib/utils";

export { ServiceError };

/**
 * Catalog services, foods, vendors, cuisines, proteins and extras.
 *
 * Backend contract mirrored by every function:
 *   foods     GET|POST|PATCH|DELETE  /foods
 *   vendors   GET|POST|PATCH|DELETE  /vendors
 *   cuisines  GET|POST|PATCH|DELETE  /cuisines
 *   proteins  GET|POST|PATCH|DELETE  /proteins
 *   extras    GET|POST|PATCH|DELETE  /extras
 *
 * In mock mode these read and write the reactive development repository.
 * When `VITE_API_URL` is set, the same signatures should delegate to
 * `api.get("/foods")` etc., the transport already exists in client.ts.
 *
 * NOTE ON AUTHORIZATION: the ownership assertions below are defence-in-depth
 * for the UI. The real backend MUST independently enforce that a vendor can
 * only mutate its own records (see §34 of the brief).
 */

/* ----------------------------------------------------------------- vendor */

export const vendorService = {
  list(): Vendor[] {
    return getDb().vendors;
  },

  listApproved(): Vendor[] {
    return getDb().vendors.filter((v) => v.status === "approved");
  },

  get(id: string): Vendor | null {
    return getDb().vendors.find((v) => v.id === id) ?? null;
  },

  byOwner(userId: string): Vendor | null {
    return getDb().vendors.find((v) => v.ownerUserId === userId) ?? null;
  },

  bySlug(slug: string): Vendor | null {
    return getDb().vendors.find((v) => v.slug === slug) ?? null;
  },

  /** Public vendor registration (§16). New vendors start `pending`. */
  register(input: {
    name: string;
    tagline: string;
    description: string;
    address: string;
    area: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    logoText: string;
    prepTimeMinutes: number;
    deliveryFee: number;
    deliveryRadiusKm: number;
    coverImage: string;
    ownerUserId: string;
  }): Vendor {
    const db = getDb();
    if (db.vendors.some((v) => v.slug === slugify(input.name))) {
      throw new ServiceError("A kitchen with that name is already registered.");
    }
    const vendor: Vendor = {
      id: uid("vnd"),
      name: input.name,
      slug: slugify(input.name),
      tagline: input.tagline,
      description: input.description,
      coverImage: input.coverImage,
      logoText: input.logoText || input.name.slice(0, 2).toUpperCase(),
      cuisineIds: [],
      address: input.address,
      area: input.area,
      city: input.city,
      state: input.state,
      phone: input.phone,
      email: input.email,
      status: "pending",
      isOpen: false,
      openTime: "09:00",
      closeTime: "21:00",
      prepTimeMinutes: input.prepTimeMinutes,
      deliveryFee: input.deliveryFee,
      deliveryRadiusKm: input.deliveryRadiusKm,
      deliveryNote: "",
      latitude: 9.08,
      longitude: 7.48,
      ownerUserId: input.ownerUserId,
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.vendors.push(vendor);
      const owner = draft.users.find((u) => u.id === input.ownerUserId);
      if (owner) {
        owner.vendorId = vendor.id;
        owner.role = "vendor";
      }
    });
    return vendor;
  },

  /** Vendor edits its own business profile and delivery arrangements. */
  update(id: string, patch: Partial<Vendor>, actorId?: string): Vendor {
    const db = getDb();
    const existing = db.vendors.find((v) => v.id === id);
    if (!existing) throw new ServiceError("Kitchen not found.");
    assertVendorOwnership(existing, actorId);
    if (patch.name && patch.name !== existing.name) {
      const clash = db.vendors.some(
        (v) => v.id !== id && v.slug === slugify(patch.name as string),
      );
      if (clash) throw new ServiceError("Another kitchen already uses that name.");
    }
    let next: Vendor = existing;
    update((draft) => {
      const target = draft.vendors.find((v) => v.id === id);
      if (!target) return;
      Object.assign(target, patch);
      if (patch.name) target.slug = slugify(patch.name);
      next = target;
    });
    return next;
  },

  /** Merchant/admin moderation of vendor applications. */
  setStatus(id: string, status: VendorStatus, actor: Actor) {
    update((draft) => {
      const vendor = draft.vendors.find((v) => v.id === id);
      if (!vendor) throw new ServiceError("Kitchen not found.");
      vendor.status = status;
      if (status !== "approved") vendor.isOpen = false;
      recordAudit(draft, actor, `vendor.${status}`, vendor.name, `Kitchen marked ${status}`);
    });
  },

  setOpen(id: string, isOpen: boolean, actorId?: string) {
    const vendor = getDb().vendors.find((v) => v.id === id);
    if (!vendor) throw new ServiceError("Kitchen not found.");
    assertVendorOwnership(vendor, actorId);
    if (vendor.status !== "approved" && isOpen) {
      throw new ServiceError("This kitchen is not approved yet, so it cannot go live.");
    }
    update((draft) => {
      const target = draft.vendors.find((v) => v.id === id);
      if (target) target.isOpen = isOpen;
    });
  },
};

function assertVendorOwnership(vendor: Vendor, actorId?: string) {
  if (!actorId) return; // admin/moderator path
  const user = getDb().users.find((u) => u.id === actorId);
  if (!user) throw new ServiceError("Unknown user.");
  if (user.role === "admin") return;
  if (user.role === "vendor" && user.vendorId === vendor.id) return;
  throw new ServiceError("You cannot modify another kitchen's records.");
}

/* ---------------------------------------------------------------- cuisine */

export const cuisineService = {
  list(): Cuisine[] {
    return getDb().cuisines;
  },
  listActive(): Cuisine[] {
    return getDb().cuisines.filter((c) => c.isActive);
  },
  get(id: string): Cuisine | null {
    return getDb().cuisines.find((c) => c.id === id) ?? null;
  },
  name(id: string): string {
    return getDb().cuisines.find((c) => c.id === id)?.name ?? "Uncategorised";
  },
  /** Cuisine names are fully editable by authorized users (§16). */
  create(input: { name: string; emoji: string }, actor: Actor) {
    const name = input.name.trim();
    if (!name) throw new ServiceError("Cuisine needs a name.");
    if (getDb().cuisines.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new ServiceError("That cuisine already exists.");
    }
    const cuisine: Cuisine = { id: uid("cui"), name, emoji: input.emoji || "🍽️", isActive: true };
    update((draft) => {
      draft.cuisines.push(cuisine);
      recordAudit(draft, actor, "cuisine.create", name, "Cuisine added to the platform list");
    });
    return cuisine;
  },
  update(id: string, patch: Partial<Cuisine>, actor: Actor) {
    let name = "";
    update((draft) => {
      const cuisine = draft.cuisines.find((c) => c.id === id);
      if (!cuisine) throw new ServiceError("Cuisine not found.");
      Object.assign(cuisine, patch);
      name = cuisine.name;
      recordAudit(draft, actor, "cuisine.update", cuisine.name, "Cuisine details changed");
    });
    return name;
  },
  remove(id: string, actor: Actor) {
    const db = getDb();
    const inUse = db.foods.filter((f) => f.cuisineId === id).length;
    if (inUse > 0) {
      throw new ServiceError(
        `${inUse} dish${inUse === 1 ? " is" : "es are"} still using this cuisine. Reassign them first.`,
      );
    }
    update((draft) => {
      const cuisine = draft.cuisines.find((c) => c.id === id);
      draft.cuisines = draft.cuisines.filter((c) => c.id !== id);
      recordAudit(draft, actor, "cuisine.delete", cuisine?.name ?? id, "Cuisine removed");
    });
  },
};

/* --------------------------------------------------------------- proteins */

export const proteinService = {
  list(): Protein[] {
    return getDb().proteins;
  },
  /** Proteins offered to a dish: platform-wide, vendor-scoped, available. */
  forVendor(vendorId: string): Protein[] {
    return getDb().proteins.filter(
      (p) => p.vendorIds.length === 0 || p.vendorIds.includes(vendorId),
    );
  },
  get(id: string): Protein | null {
    return getDb().proteins.find((p) => p.id === id) ?? null;
  },
  create(
    input: Omit<Protein, "id" | "createdAt">,
    actor: Actor,
  ) {
    if (!input.name.trim()) throw new ServiceError("A protein needs a name.");
    const protein: Protein = {
      ...input,
      name: input.name.trim(),
      id: uid("pro"),
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.proteins.push(protein);
      recordAudit(draft, actor, "protein.create", protein.name, "Protein option added");
    });
    return protein;
  },
  update(id: string, patch: Partial<Protein>, actor: Actor) {
    let name = "";
    update((draft) => {
      const protein = draft.proteins.find((p) => p.id === id);
      if (!protein) throw new ServiceError("Protein not found.");
      Object.assign(protein, patch);
      name = protein.name;
      recordAudit(draft, actor, "protein.update", protein.name, "Protein option changed");
    });
    return name;
  },
  remove(id: string, actor: Actor) {
    const db = getDb();
    const linked = db.foods.filter((f) => f.proteinIds.includes(id)).length;
    update((draft) => {
      const protein = draft.proteins.find((p) => p.id === id);
      draft.proteins = draft.proteins.filter((p) => p.id !== id);
      // Detach from every dish so no dish can offer a deleted option.
      for (const food of draft.foods) {
        food.proteinIds = food.proteinIds.filter((pid) => pid !== id);
      }
      recordAudit(
        draft,
        actor,
        "protein.delete",
        protein?.name ?? id,
        linked > 0 ? `Removed and detached from ${linked} dish(es)` : "Removed",
      );
    });
  },
};

/* ----------------------------------------------------------------- extras */

export const extraService = {
  list(): Extra[] {
    return getDb().extras;
  },
  forVendor(vendorId: string): Extra[] {
    return getDb().extras.filter((e) => e.vendorIds.length === 0 || e.vendorIds.includes(vendorId));
  },
  get(id: string): Extra | null {
    return getDb().extras.find((e) => e.id === id) ?? null;
  },
  create(
    input: Omit<Extra, "id" | "createdAt">,
    actor: Actor,
  ) {
    if (!input.name.trim()) throw new ServiceError("An extra needs a name.");
    const extra: Extra = {
      ...input,
      name: input.name.trim(),
      id: uid("ext"),
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.extras.push(extra);
      recordAudit(draft, actor, "extra.create", extra.name, "Extra option added");
    });
    return extra;
  },
  update(id: string, patch: Partial<Extra>, actor: Actor) {
    let name = "";
    update((draft) => {
      const extra = draft.extras.find((e) => e.id === id);
      if (!extra) throw new ServiceError("Extra not found.");
      Object.assign(extra, patch);
      name = extra.name;
      recordAudit(draft, actor, "extra.update", extra.name, "Extra option changed");
    });
    return name;
  },
  remove(id: string, actor: Actor) {
    update((draft) => {
      const extra = draft.extras.find((e) => e.id === id);
      draft.extras = draft.extras.filter((e) => e.id !== id);
      for (const food of draft.foods) {
        food.extraIds = food.extraIds.filter((eid) => eid !== id);
      }
      recordAudit(draft, actor, "extra.delete", extra?.name ?? id, "Removed and detached from dishes");
    });
  },
};

/* ------------------------------------------------------------------ foods */

function decorateFood(food: FoodItem): FoodWithVendor {
  const db = getDb();
  const vendor = db.vendors.find((v) => v.id === food.vendorId);
  const cuisine = db.cuisines.find((c) => c.id === food.cuisineId) ?? null;
  const reviews = db.reviews.filter((r) => r.foodId === food.id && !r.isHidden);
  const ratingCount = reviews.length;
  const rating = ratingCount
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
    : 0;
  return {
    food,
    vendor: vendor as Vendor,
    cuisine,
    rating,
    ratingCount,
    effectivePrice: effectiveFoodPrice(food),
  };
}

/** Seasonal special pricing wins while the promotion window is open. */
export function effectiveFoodPrice(food: FoodItem): number {
  if (!food.isSeasonalSpecial || typeof food.seasonalPrice !== "number") return food.price;
  const now = Date.now();
  if (food.specialStartDate && new Date(food.specialStartDate).getTime() > now) return food.price;
  if (food.specialEndDate && new Date(food.specialEndDate).getTime() < now) return food.price;
  return food.seasonalPrice;
}

export function isSoldOut(food: FoodItem): boolean {
  return food.stockCount !== null && food.stockCount <= 0;
}

/** A dish is orderable only if the vendor published it and it is in stock. */
export function isOrderable(food: FoodItem): boolean {
  if (!food.isAvailable || isSoldOut(food)) return false;
  const vendor = getDb().vendors.find((v) => v.id === food.vendorId);
  return vendor?.status === "approved";
}

export const foodService = {
  list(): FoodItem[] {
    return getDb().foods;
  },

  get(id: string): FoodItem | null {
    return getDb().foods.find((f) => f.id === id) ?? null;
  },

  decorated(id: string): FoodWithVendor | null {
    const food = getDb().foods.find((f) => f.id === id);
    return food ? decorateFood(food) : null;
  },

  byVendor(vendorId: string): FoodItem[] {
    return getDb().foods.filter((f) => f.vendorId === vendorId);
  },

  listDecorated(): FoodWithVendor[] {
    return getDb()
      .foods.map(decorateFood)
      .filter((entry) => Boolean(entry.vendor));
  },

  /**
   * Food-first search (§22). The term matches name, description, category,
   * cuisine and ingredient text, never addresses; those are handled by the
   * separate location control.
   */
  search(query: FoodSearchQuery): FoodWithVendor[] {
    const term = (query.term ?? "").trim().toLowerCase();
    const db = getDb();
    let results = foodService.listDecorated();

    if (term) {
      results = results.filter(({ food, cuisine, vendor }) => {
        const haystack = [
          food.name,
          food.description,
          food.category,
          cuisine?.name ?? "",
          vendor?.name ?? "",
          ...food.ingredients,
          ...food.dietary,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    if (query.cuisineId) results = results.filter((r) => r.food.cuisineId === query.cuisineId);
    if (query.category) results = results.filter((r) => r.food.category === query.category);
    if (query.vendorId) results = results.filter((r) => r.food.vendorId === query.vendorId);
    if (query.dietary) results = results.filter((r) => r.food.dietary.includes(query.dietary as DietaryPreference));
    if (query.maxPrice !== null) results = results.filter((r) => r.effectivePrice <= (query.maxPrice as number));
    if (query.minRating !== null) results = results.filter((r) => r.rating >= (query.minRating as number));
    if (query.availableOnly !== false) {
      results = results.filter((r) => r.food.isAvailable && !isSoldOut(r.food));
    }

    switch (query.sort) {
      case "price_asc":
        results.sort((a, b) => a.effectivePrice - b.effectivePrice);
        break;
      case "price_desc":
        results.sort((a, b) => b.effectivePrice - a.effectivePrice);
        break;
      case "rating":
        results.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
        break;
      case "fastest":
        results.sort((a, b) => a.food.prepTimeMinutes - b.food.prepTimeMinutes);
        break;
      default:
        // Relevance: name matches first, then popularity, then rating.
        results.sort((a, b) => {
          if (term) {
            const aName = a.food.name.toLowerCase().includes(term) ? 0 : 1;
            const bName = b.food.name.toLowerCase().includes(term) ? 0 : 1;
            if (aName !== bName) return aName - bName;
          }
          return (
            Number(b.food.isPopular) - Number(a.food.isPopular) ||
            b.rating - a.rating ||
            a.food.name.localeCompare(b.food.name)
          );
        });
    }
    void db;
    return results;
  },

  popular(limit = 8): FoodWithVendor[] {
    return foodService
      .listDecorated()
      .filter((r) => r.food.isPopular && r.food.isAvailable)
      .slice(0, limit);
  },

  seasonal(limit = 8): FoodWithVendor[] {
    return foodService
      .listDecorated()
      .filter((r) => r.food.isSeasonalSpecial && r.food.isAvailable)
      .slice(0, limit);
  },

  recent(limit = 8): FoodWithVendor[] {
    return foodService
      .listDecorated()
      .sort((a, b) => b.food.createdAt.localeCompare(a.food.createdAt))
      .slice(0, limit);
  },

  /** Vendor-scoped create, enforced, not merely hidden in the UI. */
  create(input: Omit<FoodItem, "id" | "createdAt" | "updatedAt">, actorId?: string): FoodItem {
    const vendor = getDb().vendors.find((v) => v.id === input.vendorId);
    if (!vendor) throw new ServiceError("Select the kitchen this dish belongs to.");
    assertVendorOwnership(vendor, actorId);
    assertFoodPayload(input);
    const now = new Date().toISOString();
    const food: FoodItem = { ...input, id: uid("fd"), createdAt: now, updatedAt: now };
    update((draft) => {
      draft.foods.push(food);
    });
    return food;
  },

  update(id: string, patch: Partial<FoodItem>, actorId?: string): FoodItem {
    const existing = getDb().foods.find((f) => f.id === id);
    if (!existing) throw new ServiceError("Dish not found.");
    const vendor = getDb().vendors.find((v) => v.id === existing.vendorId);
    if (vendor) assertVendorOwnership(vendor, actorId);
    const merged = { ...existing, ...patch };
    assertFoodPayload(merged);
    update((draft) => {
      const food = draft.foods.find((f) => f.id === id);
      if (!food) return;
      Object.assign(food, patch, { updatedAt: new Date().toISOString() });
    });
    return merged;
  },

  remove(id: string, actorId?: string) {
    const existing = getDb().foods.find((f) => f.id === id);
    if (!existing) throw new ServiceError("Dish not found.");
    const vendor = getDb().vendors.find((v) => v.id === existing.vendorId);
    if (vendor) assertVendorOwnership(vendor, actorId);
    update((draft) => {
      draft.foods = draft.foods.filter((f) => f.id !== id);
    });
  },

  toggleAvailability(id: string, actorId?: string): boolean {
    const existing = getDb().foods.find((f) => f.id === id);
    if (!existing) throw new ServiceError("Dish not found.");
    const vendor = getDb().vendors.find((v) => v.id === existing.vendorId);
    if (vendor) assertVendorOwnership(vendor, actorId);
    const next = !existing.isAvailable;
    update((draft) => {
      const food = draft.foods.find((f) => f.id === id);
      if (food) {
        food.isAvailable = next;
        food.updatedAt = new Date().toISOString();
      }
    });
    return next;
  },

  /** Popular status persists through the data layer, not just a visual flag. */
  togglePopular(id: string, actorId?: string): boolean {
    const existing = getDb().foods.find((f) => f.id === id);
    if (!existing) throw new ServiceError("Dish not found.");
    const vendor = getDb().vendors.find((v) => v.id === existing.vendorId);
    if (vendor) assertVendorOwnership(vendor, actorId);
    const next = !existing.isPopular;
    update((draft) => {
      const food = draft.foods.find((f) => f.id === id);
      if (food) {
        food.isPopular = next;
        food.updatedAt = new Date().toISOString();
      }
    });
    return next;
  },

  setStock(id: string, stockCount: number | null, actorId?: string) {
    const existing = getDb().foods.find((f) => f.id === id);
    if (!existing) throw new ServiceError("Dish not found.");
    if (stockCount !== null && stockCount < 0) throw new ServiceError("Stock cannot be negative.");
    const vendor = getDb().vendors.find((v) => v.id === existing.vendorId);
    if (vendor) assertVendorOwnership(vendor, actorId);
    update((draft) => {
      const food = draft.foods.find((f) => f.id === id);
      if (food) {
        food.stockCount = stockCount;
        if (stockCount !== null && stockCount <= 0) food.isAvailable = false;
        food.updatedAt = new Date().toISOString();
      }
    });
  },
};

function assertFoodPayload(food: Partial<FoodItem>) {
  if (food.name !== undefined && !food.name.trim()) throw new ServiceError("Give the dish a name.");
  if (food.price !== undefined && food.price < 0) throw new ServiceError("Price cannot be negative.");
  if (
    typeof food.seasonalPrice === "number" &&
    typeof food.price === "number" &&
    food.seasonalPrice >= food.price
  ) {
    throw new ServiceError("The seasonal price must be lower than the regular price.");
  }
  if (food.specialStartDate && food.specialEndDate) {
    if (new Date(food.specialStartDate) > new Date(food.specialEndDate)) {
      throw new ServiceError("The special's start date must come before its end date.");
    }
  }
  if (food.proteinSelection === "required" && (food.proteinIds?.length ?? 0) === 0) {
    throw new ServiceError("A dish requiring a protein must offer at least one option.");
  }
  if (food.maxProteins !== undefined && food.maxProteins < 1) {
    throw new ServiceError("Selection limit must be at least 1.");
  }
  if (food.sizes && food.sizes.some((s) => !s.label.trim())) {
    throw new ServiceError("Every serving size needs a label.");
  }
}

/* ----------------------------------------------------------------- ratings */

export interface RatingSummary {
  rating: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summariseReviews(reviews: Review[]): RatingSummary {
  const visible = reviews.filter((r) => !r.isHidden);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["distribution"];
  for (const review of visible) {
    const key = Math.round(Math.min(5, Math.max(1, review.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[key] += 1;
  }
  const count = visible.length;
  const rating = count
    ? Math.round((visible.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;
  return { rating, count, distribution };
}
