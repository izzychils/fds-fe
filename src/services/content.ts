import type { AuditEntry, Banner, PlatformSettings, Review, User } from "@/types";
import { getDb, recordAudit, update } from "@/services/repository";
import { ServiceError } from "@/services/guards";
import { summariseReviews, type RatingSummary } from "@/services/catalog";
import { uid } from "@/lib/utils";

/**
 * Content services, banners, platform settings, reviews and the audit trail.
 *
 * Backend contract mirrored by every function:
 *   banners   GET|POST|PATCH|DELETE /banners
 *   settings  GET|PATCH              /settings
 *   reviews   GET|POST|PATCH|DELETE  /reviews
 *   audit     GET                    /audit
 */

/* --------------------------------------------------------------- banners */

export const bannerService = {
  list(): Banner[] {
    return [...getDb().banners].sort((a, b) => a.priority - b.priority);
  },

  /** Only active banners reach the public carousel, in priority order. */
  listActive(): Banner[] {
    return bannerService.list().filter((b) => b.isActive);
  },

  get(id: string): Banner | null {
    return getDb().banners.find((b) => b.id === id) ?? null;
  },

  create(input: Omit<Banner, "id" | "createdAt">, actor: User): Banner {
    assertAdmin(actor, "banners");
    validateBanner(input);
    const banner: Banner = {
      ...input,
      id: uid("bnr"),
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.banners.push(banner);
      recordAudit(draft, actor, "banner.create", banner.title, "Banner added to the carousel");
    });
    return banner;
  },

  update(id: string, patch: Partial<Banner>, actor: User): Banner {
    assertAdmin(actor, "banners");
    const existing = bannerService.get(id);
    if (!existing) throw new ServiceError("Banner not found.");
    validateBanner({ ...existing, ...patch });
    update((draft) => {
      const banner = draft.banners.find((b) => b.id === id);
      if (!banner) return;
      Object.assign(banner, patch);
      recordAudit(draft, actor, "banner.update", banner.title, "Banner changed");
    });
    return { ...existing, ...patch };
  },

  remove(id: string, actor: User) {
    assertAdmin(actor, "banners");
    update((draft) => {
      const banner = draft.banners.find((b) => b.id === id);
      draft.banners = draft.banners.filter((b) => b.id !== id);
      recordAudit(draft, actor, "banner.delete", banner?.title ?? id, "Banner removed");
    });
  },

  setActive(id: string, isActive: boolean, actor: User) {
    assertAdmin(actor, "banners");
    update((draft) => {
      const banner = draft.banners.find((b) => b.id === id);
      if (banner) banner.isActive = isActive;
    });
  },

  /** Moves a banner up or down the carousel ordering. */
  move(id: string, direction: -1 | 1, actor: User) {
    assertAdmin(actor, "banners");
    const ordered = bannerService.list();
    const index = ordered.findIndex((b) => b.id === id);
    const swapIndex = index + direction;
    if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;
    const a = ordered[index];
    const b = ordered[swapIndex];
    update((draft) => {
      const first = draft.banners.find((x) => x.id === a.id);
      const second = draft.banners.find((x) => x.id === b.id);
      if (first && second) {
        const tmp = first.priority;
        first.priority = second.priority;
        second.priority = tmp;
      }
      recordAudit(draft, actor, "banner.reorder", a.title, `Moved ${direction < 0 ? "up" : "down"}`);
    });
  },
};

function validateBanner(input: Partial<Banner>) {
  if (input.title !== undefined && !input.title.trim()) throw new ServiceError("Give the banner a title.");
  if (input.buttonText !== undefined && !input.buttonText.trim()) {
    throw new ServiceError("The call-to-action needs button text.");
  }
  if (input.buttonLink !== undefined && !input.buttonLink.trim()) {
    throw new ServiceError("Add a destination for the banner button.");
  }
  if (input.buttonLink && !input.buttonLink.startsWith("/")) {
    throw new ServiceError("The button link must be an in-app path starting with '/'.");
  }
}

function assertAdmin(actor: User, resource: string) {
  if (actor.role !== "admin") throw new ServiceError(`Only a merchant admin can manage ${resource}.`);
}

/* -------------------------------------------------------------- settings */

export const settingsService = {
  get(): PlatformSettings {
    return getDb().settings;
  },

  /** Vendor-scoped defaults are never stored here, this is platform config. */
  update(patch: Partial<PlatformSettings>, actor: User): PlatformSettings {
    assertAdmin(actor, "platform settings");
    validateSettings(patch);
    let next = getDb().settings;
    update((draft) => {
      Object.assign(draft.settings, patch);
      recordAudit(draft, actor, "settings.update", "Platform settings", summarise(patch));
      next = draft.settings;
    });
    return next;
  },

  /** Cuisine types are part of platform settings and fully editable (§21). */
  setCuisines(cuisines: string[], actor: User) {
    assertAdmin(actor, "cuisine list");
    const cleaned = [...new Set(cuisines.map((c) => c.trim()).filter(Boolean))];
    if (cleaned.length === 0) throw new ServiceError("Keep at least one dish category.");
    update((draft) => {
      draft.settings.categories = cleaned;
      recordAudit(draft, actor, "settings.categories", "Dish categories", `${cleaned.length} categories`);
    });
  },

  addPromo(input: { code: string; percentOff: number; minOrder: number }, actor: User) {
    assertAdmin(actor, "promo codes");
    const code = input.code.trim().toUpperCase();
    if (!code) throw new ServiceError("Enter a promo code.");
    if (getDb().settings.promoCodes.some((p) => p.code === code)) {
      throw new ServiceError("That promo code already exists.");
    }
    if (input.percentOff <= 0 || input.percentOff > 90) {
      throw new ServiceError("Discount must be between 1% and 90%.");
    }
    update((draft) => {
      draft.settings.promoCodes.push({
        id: uid("prm"),
        code,
        percentOff: Math.round(input.percentOff),
        minOrder: Math.max(0, Math.round(input.minOrder)),
        isActive: true,
      });
      recordAudit(draft, actor, "promo.create", code, `${input.percentOff}% off`);
    });
  },

  togglePromo(id: string, isActive: boolean, actor: User) {
    assertAdmin(actor, "promo codes");
    update((draft) => {
      const promo = draft.settings.promoCodes.find((p) => p.id === id);
      if (promo) promo.isActive = isActive;
    });
  },

  removePromo(id: string, actor: User) {
    assertAdmin(actor, "promo codes");
    update((draft) => {
      draft.settings.promoCodes = draft.settings.promoCodes.filter((p) => p.id !== id);
    });
  },
};

function validateSettings(patch: Partial<PlatformSettings>) {
  if (patch.siteName !== undefined && !patch.siteName.trim()) throw new ServiceError("The site needs a name.");
  if (patch.contactEmail !== undefined && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(patch.contactEmail)) {
    throw new ServiceError("Enter a valid contact email.");
  }
  if (patch.feeValue !== undefined && patch.feeValue < 0) {
    throw new ServiceError("The platform fee cannot be negative.");
  }
  if (patch.feeType === "percentage" && patch.feeValue !== undefined && patch.feeValue > 40) {
    throw new ServiceError("A percentage platform fee above 40% is almost certainly a mistake.");
  }
  if (patch.defaultDeliveryFee !== undefined && patch.defaultDeliveryFee < 0) {
    throw new ServiceError("The delivery fee cannot be negative.");
  }
  if (patch.defaultDeliveryMinutes !== undefined && patch.defaultDeliveryMinutes < 5) {
    throw new ServiceError("Delivery estimates under 5 minutes are not credible.");
  }
}

function summarise(patch: Partial<PlatformSettings>): string {
  const keys = Object.keys(patch);
  if (keys.length === 1) return `${keys[0]} changed`;
  return `${keys.length} settings changed`;
}

/* --------------------------------------------------------------- reviews */

export interface ReviewInput {
  foodId: string;
  rating: number;
  comment: string;
  photos: string[];
}

export const reviewService = {
  list(): Review[] {
    return [...getDb().reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  visible(): Review[] {
    return reviewService.list().filter((r) => !r.isHidden);
  },

  byFood(foodId: string): Review[] {
    return reviewService.visible().filter((r) => r.foodId === foodId);
  },

  byVendor(vendorId: string): Review[] {
    return reviewService.visible().filter((r) => r.vendorId === vendorId);
  },

  byUser(userId: string): Review[] {
    return reviewService.list().filter((r) => r.userId === userId);
  },

  summaryForFood(foodId: string): RatingSummary {
    return summariseReviews(getDb().reviews.filter((r) => r.foodId === foodId));
  },

  summaryForVendor(vendorId: string): RatingSummary {
    return summariseReviews(getDb().reviews.filter((r) => r.vendorId === vendorId));
  },

  /** Reviews a customer is still eligible to write, based on delivered orders. */
  reviewableOrders(userId: string) {
    const db = getDb();
    const written = new Set(
      db.reviews.filter((r) => r.userId === userId).map((r) => `${r.foodId}:${r.orderId ?? "none"}`),
    );
    return db.orders
      .filter((o) => o.customerId === userId && o.status === "delivered")
      .flatMap((order) =>
        order.items
          .filter((item) => !written.has(`${item.foodId}:${order.id}`))
          .map((item) => ({ order, item })),
      );
  },

  /**
   * A review is only badged "verified purchase" when that customer actually
   * has a delivered order containing the dish. No review is ever invented.
   */
  create(user: User, orderId: string | null, input: ReviewInput): Review {
    const db = getDb();
    const food = db.foods.find((f) => f.id === input.foodId);
    if (!food) throw new ServiceError("Dish not found.");
    if (input.rating < 1 || input.rating > 5) throw new ServiceError("Choose a rating from 1 to 5 stars.");
    if (input.comment.trim().length < 4) throw new ServiceError("Tell us a little more about the meal.");
    if (input.comment.length > 1200) throw new ServiceError("Keep your review under 1200 characters.");
    if (input.photos.length > 3) throw new ServiceError("You can attach up to 3 photos.");

    const duplicate = db.reviews.find(
      (r) => r.userId === user.id && r.foodId === input.foodId && r.orderId === orderId,
    );
    if (duplicate) {
      throw new ServiceError("You have already reviewed this dish for that order. Edit it instead.");
    }

    const verified = Boolean(
      orderId &&
        db.orders.some(
          (o) =>
            o.id === orderId &&
            o.customerId === user.id &&
            o.status === "delivered" &&
            o.items.some((i) => i.foodId === input.foodId),
        ),
    );

    const review: Review = {
      id: uid("rev"),
      userId: user.id,
      userName: user.fullName,
      userAvatar: user.avatarUrl,
      foodId: food.id,
      vendorId: food.vendorId,
      orderId,
      rating: Math.round(input.rating),
      comment: input.comment.trim(),
      photos: input.photos,
      isVerifiedPurchase: verified,
      vendorReply: null,
      isHidden: false,
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.reviews.unshift(review);
    });
    return review;
  },

  update(reviewId: string, patch: Partial<ReviewInput>, actor: User): Review {
    const existing = getDb().reviews.find((r) => r.id === reviewId);
    if (!existing) throw new ServiceError("Review not found.");
    if (existing.userId !== actor.id && actor.role !== "admin") {
      throw new ServiceError("You can only edit your own review.");
    }
    if (patch.rating !== undefined && (patch.rating < 1 || patch.rating > 5)) {
      throw new ServiceError("Choose a rating from 1 to 5 stars.");
    }
    if (patch.comment !== undefined && patch.comment.trim().length < 4) {
      throw new ServiceError("Tell us a little more about the meal.");
    }
    update((draft) => {
      const review = draft.reviews.find((r) => r.id === reviewId);
      if (review) Object.assign(review, patch);
    });
    return { ...existing, ...patch };
  },

  remove(reviewId: string, actor: User) {
    const existing = getDb().reviews.find((r) => r.id === reviewId);
    if (!existing) throw new ServiceError("Review not found.");
    if (existing.userId !== actor.id && actor.role !== "admin") {
      throw new ServiceError("You can only delete your own review.");
    }
    update((draft) => {
      draft.reviews = draft.reviews.filter((r) => r.id !== reviewId);
      recordAudit(draft, actor, "review.delete", existing.userName, "Review removed");
    });
  },

  /** A vendor may reply only to feedback on its own dishes. */
  reply(reviewId: string, text: string, actor: User): Review {
    const existing = getDb().reviews.find((r) => r.id === reviewId);
    if (!existing) throw new ServiceError("Review not found.");
    if (actor.role === "vendor" && actor.vendorId !== existing.vendorId) {
      throw new ServiceError("That review is for another kitchen.");
    }
    if (actor.role === "customer") throw new ServiceError("Only the kitchen can reply to a review.");
    if (!text.trim()) throw new ServiceError("Write a reply before saving.");
    if (text.length > 600) throw new ServiceError("Keep replies under 600 characters.");
    const reply = { text: text.trim(), at: new Date().toISOString() };
    update((draft) => {
      const review = draft.reviews.find((r) => r.id === reviewId);
      if (review) review.vendorReply = reply;
    });
    return { ...existing, vendorReply: reply };
  },

  setHidden(reviewId: string, isHidden: boolean, actor: User) {
    assertAdmin(actor, "review moderation");
    update((draft) => {
      const review = draft.reviews.find((r) => r.id === reviewId);
      if (review) {
        review.isHidden = isHidden;
        recordAudit(
          draft,
          actor,
          isHidden ? "review.hide" : "review.restore",
          review.userName,
          "Moderation action",
        );
      }
    });
  },
};

/* ----------------------------------------------------------------- audit */

export const auditService = {
  list(limit = 100): AuditEntry[] {
    return getDb().audit.slice(0, limit);
  },
};
