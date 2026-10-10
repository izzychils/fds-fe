/**
 * Food Delivery System — shared domain types.
 *
 * These interfaces are the single source of truth for the client-side data
 * layer AND act as the integration contract for the future backend: every
 * service in `src/services` is typed against them, so swapping the development
 * mock adapter for the real HTTP transport requires no UI changes.
 *
 * All monetary values are integers in Nigerian naira (kobo are not modelled at
 * this stage — the platform prices whole-naira items).
 */

/* ------------------------------------------------------------------ roles */

export type Role = "customer" | "vendor" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  vendor: "Vendor",
  admin: "Merchant (Admin)",
};

/* ------------------------------------------------------------------ users */

export type DietaryPreference =
  | "Vegetarian"
  | "Vegan"
  | "Halal"
  | "Gluten-free"
  | "Low-carb"
  | "High-protein"
  | "Spicy"
  | "Nut-free"
  | "Dairy-free";

export const DIETARY_PREFERENCES: DietaryPreference[] = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Gluten-free",
  "Low-carb",
  "High-protein",
  "Spicy",
  "Nut-free",
  "Dairy-free",
];

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  avatarUrl?: string;
  /** Customer preferences — also feed the recommendation engine. */
  dietaryPreferences: DietaryPreference[];
  favoriteCuisineIds: string[];
  /** Set for `role === "vendor"` — scopes every vendor-scoped request. */
  vendorId?: string | null;
  isActive: boolean;
  /** Recoverable development credential. Never a real password store. */
  password: string;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  line1: string;
  area: string;
  city: string;
  state: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
}

/* ---------------------------------------------------------------- vendors */

export type VendorStatus = "pending" | "approved" | "suspended";

export interface Vendor {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  coverImage: string;
  /** Short brand mark rendered in the glass logo tile. */
  logoText: string;
  cuisineIds: string[];
  address: string;
  area: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  status: VendorStatus;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  /** Vendor-owned delivery arrangements (see §17 of the brief). */
  prepTimeMinutes: number;
  deliveryFee: number;
  deliveryRadiusKm: number;
  deliveryNote: string;
  latitude: number;
  longitude: number;
  ownerUserId?: string | null;
  createdAt: string;
}

/* ---------------------------------------------------------------- cuisine */

export interface Cuisine {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
}

/* ------------------------------------------------------------- food items */

export interface FoodSize {
  id: string;
  label: string;
  priceDelta: number;
}

export interface FoodItem {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  cuisineId: string;
  category: string;
  ingredients: string[];
  dietary: DietaryPreference[];
  prepTimeMinutes: number;
  calories?: number;
  isAvailable: boolean;
  /** Stock control — drives the "sold out" state in the marketplace. */
  stockCount: number | null;
  lowStockThreshold: number;
  isPopular: boolean;
  isSeasonalSpecial: boolean;
  seasonalPrice?: number | null;
  specialStartDate?: string | null;
  specialEndDate?: string | null;
  sizes: FoodSize[];
  /** Meal customization (§11): required vs optional + selection limits. */
  proteinSelection: "required" | "optional" | "none";
  proteinIds: string[];
  maxProteins: number;
  extraIds: string[];
  maxExtras: number;
  createdAt: string;
  updatedAt: string;
}

export interface Protein {
  id: string;
  name: string;
  price: number;
  description: string;
  isAvailable: boolean;
  /** Optional category association, e.g. only offered on "Mains". */
  appliesToCategory: string | null;
  /** Empty array = available platform-wide. */
  vendorIds: string[];
  createdAt: string;
}

export interface Extra {
  id: string;
  name: string;
  price: number;
  description: string;
  isAvailable: boolean;
  appliesToCategory: string | null;
  vendorIds: string[];
  createdAt: string;
}

/* ------------------------------------------------------------------- cart */

export interface CartAddOn {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  /** Line id — one cart line per unique customization combination. */
  id: string;
  foodId: string;
  vendorId: string;
  name: string;
  image: string;
  unitPrice: number;
  sizeId: string | null;
  sizeLabel: string | null;
  sizePriceDelta: number;
  proteins: CartAddOn[];
  extras: CartAddOn[];
  instructions: string;
  quantity: number;
}

/* ----------------------------------------------------------------- riders */

export type Vehicle = "Bike" | "Bicycle" | "Car" | "Keke";

export interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle: Vehicle;
  plateNumber: string;
  /** `null` = platform fleet rider, otherwise owned by a single vendor. */
  vendorId: string | null;
  isActive: boolean;
  isAvailable: boolean;
  rating: number;
  deliveriesCompleted: number;
  createdAt: string;
}

/* ----------------------------------------------------------------- orders */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "rider_assigned"
  | "picked_up"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note: string;
  actor: Role | "system";
}

export interface OrderItem {
  id: string;
  foodId: string;
  vendorId: string;
  vendorName: string;
  name: string;
  image: string;
  unitPrice: number;
  sizeLabel: string | null;
  sizePriceDelta: number;
  proteins: CartAddOn[];
  extras: CartAddOn[];
  instructions: string;
  quantity: number;
  lineTotal: number;
}

export type PaymentMethod = "card" | "transfer" | "cash";
export type PaymentStatus = "paid" | "pending" | "failed";

export interface Order {
  /** Human-readable reference, e.g. `NMK-48213`. */
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  /** Orders can span multiple vendors (§23). */
  vendorIds: string[];
  items: OrderItem[];
  status: OrderStatus;
  /** Per-vendor fulfilment status, keyed by vendor id. */
  vendorStatus: Record<string, OrderStatus>;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  /** Fee policy captured at checkout so history is never silently recalculated. */
  feeSnapshot: { type: FeeType; value: number };
  discount: number;
  promoCode: string | null;
  total: number;
  address: Address;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** Development payment transport — see `services/payments.ts`. */
  paymentReference: string | null;
  riderId: string | null;
  timeline: OrderEvent[];
  etaMinutes: number;
  /** Simulated courier route (dev only). Never presented as live GPS. */
  trackingPath: Array<{ latitude: number; longitude: number }>;
  trackingProgress: number;
  customerNote: string;
  vendorNote: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------------------------------------------- reviews */

export interface VendorReply {
  text: string;
  at: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  foodId: string;
  vendorId: string;
  orderId: string | null;
  rating: number;
  comment: string;
  /** Data-URLs produced by the local file picker (development only). */
  photos: string[];
  isVerifiedPurchase: boolean;
  vendorReply: VendorReply | null;
  isHidden: boolean;
  createdAt: string;
}

/* ---------------------------------------------------------------- banners */

export interface Banner {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
  buttonLink: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

/* --------------------------------------------------------------- settings */

export type FeeType = "percentage" | "fixed" | "per_item";

export interface PromoCode {
  id: string;
  code: string;
  percentOff: number;
  minOrder: number;
  isActive: boolean;
}

export interface PlatformSettings {
  siteName: string;
  tagline: string;
  logoText: string;
  logoUrl: string | null;
  contactEmail: string;
  phone: string;
  supportHours: string;
  address: string;
  defaultDeliveryFee: number;
  defaultDeliveryMinutes: number;
  defaultPrepMinutes: number;
  /** Platform-wide cuisine list — fully editable (§16, §21). */
  categories: string[];
  feeType: FeeType;
  feeValue: number;
  minOrderValue: number;
  serviceEnabled: boolean;
  promoCodes: PromoCode[];
}

/* ----------------------------------------------------------------- audit */

export interface AuditEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: string;
  target: string;
  detail: string;
  at: string;
}

/* ------------------------------------------------------- favourites/db */

export interface Favorite {
  userId: string;
  foodId: string;
  at: string;
}

/** The whole development datastore, persisted as one versioned document. */
export interface Database {
  version: number;
  users: User[];
  vendors: Vendor[];
  foods: FoodItem[];
  cuisines: Cuisine[];
  proteins: Protein[];
  extras: Extra[];
  orders: Order[];
  riders: Rider[];
  reviews: Review[];
  banners: Banner[];
  addresses: Address[];
  favorites: Favorite[];
  settings: PlatformSettings;
  audit: AuditEntry[];
  /** Session + delivery-cart metadata for the signed-in browser. */
  session: { userId: string | null };
  cart: CartItem[];
  delivery: { addressId: string | null; query: string };
}

/* ------------------------------------------------- derived/view helpers */

export interface FoodWithVendor {
  food: FoodItem;
  vendor: Vendor;
  cuisine: Cuisine | null;
  rating: number;
  ratingCount: number;
  effectivePrice: number;
}

export interface FoodSearchQuery {
  term?: string;
  cuisineId?: string | null;
  category?: string | null;
  vendorId?: string | null;
  dietary?: DietaryPreference | null;
  maxPrice?: number | null;
  minRating?: number | null;
  sort?: "relevance" | "price_asc" | "price_desc" | "rating" | "fastest";
  availableOnly?: boolean;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  discount: number;
  total: number;
}
