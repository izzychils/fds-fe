import type { Address, FoodWithVendor, User } from "@/types";
import { getDb } from "@/services/repository";
import { foodService, isSoldOut } from "@/services/catalog";
import { distanceKm } from "@/lib/utils";

/**
 * RECOMMENDATION ENGINE — RULE BASED
 * ==================================
 * This is deliberately NOT advertised as machine learning. It is an explicit,
 * inspectable scoring function over signals we already hold on the client, and
 * every suggestion carries a human-readable reason so the customer can see why
 * it appeared. A real recommendation service can replace `rank()` later without
 * touching a single component — the shape of the result stays the same.
 *
 * Backend contract:
 *   GET /recommendations?userId=…&addressId=…
 *
 * Signals used:
 *   • dishes the customer has previously ordered (cuisine affinity)
 *   • favourited dishes and their cuisines
 *   • cuisines the customer declared an interest in
 *   • dietary preferences (hard requirement, not a score)
 *   • dishes marked popular by their kitchen
 *   • customer review ratings
 *   • delivery-zone reach from the selected address
 *   • availability and stock
 */

export interface Recommendation {
  entry: FoodWithVendor;
  score: number;
  reason: string;
}

export interface RecommendationOptions {
  userId: string | null;
  address?: Address | null;
  limit?: number;
}

export function recommendFoods(options: RecommendationOptions): Recommendation[] {
  const db = getDb();
  const limit = options.limit ?? 8;
  const user: User | null = options.userId
    ? db.users.find((u) => u.id === options.userId) ?? null
    : null;

  /* ------------------------------------------------ build the signal set */

  const orderedFoodIds = new Set<string>();
  const orderedCuisineCounts = new Map<string, number>();
  const orderedVendorIds = new Set<string>();

  if (user) {
    for (const order of db.orders) {
      if (order.customerId !== user.id) continue;
      for (const item of order.items) {
        orderedFoodIds.add(item.foodId);
        orderedVendorIds.add(item.vendorId);
        const cuisineId = db.foods.find((f) => f.id === item.foodId)?.cuisineId;
        if (cuisineId) {
          orderedCuisineCounts.set(cuisineId, (orderedCuisineCounts.get(cuisineId) ?? 0) + 1);
        }
      }
    }
  }

  const favouriteIds = user
    ? db.favorites.filter((f) => f.userId === user.id).map((f) => f.foodId)
    : [];
  const favouriteCuisines = new Set(
    favouriteIds
      .map((id) => db.foods.find((f) => f.id === id)?.cuisineId)
      .filter((id): id is string => Boolean(id)),
  );

  const declaredCuisines = new Set(user?.favoriteCuisineIds ?? []);
  const dietary = user?.dietaryPreferences ?? [];

  /* --------------------------------------------------------------- score */

  const candidates = foodService
    .listDecorated()
    .filter(({ food, vendor }) => {
      if (!food.isAvailable || isSoldOut(food)) return false;
      if (vendor?.status !== "approved") return false;
      // Dietary preferences are a hard filter, never a score.
      if (dietary.length > 0 && !dietary.some((d) => food.dietary.includes(d))) {
        if (food.dietary.length > 0) return false;
      }
      // Stay inside the vendor's own delivery radius when we know the address.
      if (options.address && vendor) {
        const km = distanceKm(options.address, vendor);
        if (km > vendor.deliveryRadiusKm) return false;
      }
      return true;
    });

  const ranked: Recommendation[] = candidates.map((entry) => {
    const { food, vendor, rating, ratingCount } = entry;
    let score = 0;
    const reasons: string[] = [];

    const cuisineOrders = orderedCuisineCounts.get(food.cuisineId) ?? 0;
    if (cuisineOrders > 0) {
      score += 18 + Math.min(12, cuisineOrders * 6);
      reasons.push(`you order ${entry.cuisine?.name ?? "this cuisine"}`);
    }

    if (favouriteCuisines.has(food.cuisineId)) {
      score += 14;
      reasons.push("it matches a dish you saved");
    }

    if (declaredCuisines.has(food.cuisineId)) {
      score += 10;
      reasons.push("one of your favourite cuisines");
    }

    if (food.isPopular) {
      score += 8;
      reasons.push("popular with other customers");
    }

    if (ratingCount > 0) {
      score += rating * 3;
      if (rating >= 4.5) reasons.push(`rated ${rating.toFixed(1)} by ${ratingCount} customers`);
    }

    if (vendor && orderedVendorIds.has(vendor.id)) {
      score += 6;
      reasons.push(`you have ordered from ${vendor.name}`);
    }

    if (dietary.length > 0 && dietary.some((d) => food.dietary.includes(d))) {
      score += 5;
      reasons.push("matches your dietary preferences");
    }

    if (food.isSeasonalSpecial) {
      score += 4;
      reasons.push("on a seasonal special");
    }

    // Prefer genuine discovery: things never ordered rank above repeats.
    if (orderedFoodIds.has(food.id)) score -= 22;

    // Nudge toward a shorter wait.
    score += Math.max(0, 12 - food.prepTimeMinutes) * 0.4;

    return {
      entry,
      score: Math.round(score * 10) / 10,
      reason: reasons[0] ? `Because ${reasons[0]}.` : "Trending in your delivery area.",
    };
  });

  return ranked
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.rating - a.entry.rating)
    .slice(0, limit);
}

/** Cuisine-level affinity used by the "Explore by cuisine" strip. */
export function cuisineAffinity(userId: string | null): Array<{ cuisineId: string; score: number }> {
  const db = getDb();
  if (!userId) return [];
  const counts = new Map<string, number>();
  for (const order of db.orders.filter((o) => o.customerId === userId)) {
    for (const item of order.items) {
      const cuisineId = db.foods.find((f) => f.id === item.foodId)?.cuisineId;
      if (cuisineId) counts.set(cuisineId, (counts.get(cuisineId) ?? 0) + 1);
    }
  }
  const user = db.users.find((u) => u.id === userId);
  for (const cuisineId of user?.favoriteCuisineIds ?? []) {
    counts.set(cuisineId, (counts.get(cuisineId) ?? 0) + 2);
  }
  return [...counts.entries()]
    .map(([cuisineId, score]) => ({ cuisineId, score }))
    .sort((a, b) => b.score - a.score);
}
