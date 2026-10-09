/**
 * Service layer barrel.
 *
 * UI code imports ONLY from here. Every service hides whether it is talking to
 * the development repository or a live backend, so no component ever calls
 * `fetch` or reaches into localStorage directly (§25 of the brief).
 *
 *   UI component → hook → service → (repository | api client) → backend
 */

export {
  cuisineService,
  extraService,
  foodService,
  effectiveFoodPrice,
  isOrderable,
  isSoldOut,
  proteinService,
  summariseReviews,
  vendorService,
} from "@/services/catalog";
export type { RatingSummary } from "@/services/catalog";

export { addressService, authService, favoriteService, validateAddress } from "@/services/people";

export { canManageOrder, orderService, riderService, trackingService } from "@/services/orders";
export type { CheckoutInput } from "@/services/orders";

export { auditService, bannerService, reviewService, settingsService } from "@/services/content";
export type { ReviewInput } from "@/services/content";

export { cartAddOnTotal, cartLineUnitPrice, cartService } from "@/services/cart";
export type { AddToCartInput } from "@/services/cart";

export { cuisineAffinity, recommendFoods } from "@/services/recommendations";
export type { Recommendation } from "@/services/recommendations";

export { ServiceError, assertOwnership, hasRole, homeRouteFor, isAdmin } from "@/services/guards";

export {
  API_URL,
  ApiError,
  IS_MOCK_MODE,
  api,
  createDevelopmentPaymentIntent,
} from "@/services/client";
export type { PaymentIntent } from "@/services/client";

export {
  exportDatabase,
  getDb,
  importDatabase,
  reloadFromStorage,
  resetDatabase,
  subscribe,
  update,
} from "@/services/repository";
