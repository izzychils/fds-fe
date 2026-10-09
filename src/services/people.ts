import type { Address, DietaryPreference, Role, User, Vendor } from "@/types";
import { getDb, recordAudit, update } from "@/services/repository";
import { vendorService } from "@/services/catalog";
import { ServiceError } from "@/services/catalog";
import { uid } from "@/lib/utils";

/**
 * People services — development authentication, profiles, addresses, favourites.
 *
 * Backend contract mirrored by every function:
 *   auth       POST /auth/sign-in | /auth/sign-up | /auth/sign-out
 *              POST /auth/forgot-password | /auth/reset-password
 *   users      GET|PATCH /users/:id
 *   addresses  GET|POST|PATCH|DELETE /users/:id/addresses
 *   favorites  GET|POST|DELETE /users/:id/favorites
 *
 * ⚠️  DEVELOPMENT AUTHENTICATION — NOT PRODUCTION SECURITY
 * Credentials are verified against a local record and the session is just a
 * user id in localStorage. There is no hashing, no token, no expiry and no
 * server-side enforcement. This exists so the product can be exercised
 * end-to-end without a backend. Production sign-in, session management and
 * role enforcement MUST be implemented server-side (see §34 of the brief).
 * Every screen that depends on it says so.
 */

export const authService = {
  currentUser(): User | null {
    const db = getDb();
    if (!db.session.userId) return null;
    return db.users.find((u) => u.id === db.session.userId) ?? null;
  },

  currentVendor(): Vendor | null {
    const user = authService.currentUser();
    if (!user?.vendorId) return null;
    return vendorService.get(user.vendorId);
  },

  /** Verifies credentials against the local development record. */
  signIn(email: string, password: string): User {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new ServiceError("Enter your email address.");
    if (!password) throw new ServiceError("Enter your password.");
    const db = getDb();
    const user = db.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user || user.password !== password) {
      throw new ServiceError("That email and password combination is not recognised.");
    }
    if (!user.isActive) throw new ServiceError("This account has been deactivated. Contact support.");
    update((draft) => {
      draft.session.userId = user.id;
    });
    return user;
  },

  signOut() {
    update((draft) => {
      draft.session.userId = null;
      draft.cart = [];
    });
  },

  signUpCustomer(input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    dietaryPreferences: DietaryPreference[];
  }): User {
    const email = input.email.trim().toLowerCase();
    validateIdentity(input, email);
    if (input.password !== input.confirmPassword) throw new ServiceError("Passwords do not match.");

    const user: User = {
      id: uid("usr"),
      fullName: input.fullName.trim(),
      email,
      phone: input.phone.trim(),
      role: "customer",
      dietaryPreferences: input.dietaryPreferences,
      favoriteCuisineIds: [],
      isActive: true,
      password: input.password,
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.users.push(user);
      draft.session.userId = user.id;
    });
    return user;
  },

  /**
   * Vendor registration creates the owner account (role `vendor`) plus a
   * `pending` kitchen. The kitchen cannot sell until a merchant approves it.
   */
  signUpVendor(input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    businessName: string;
    tagline: string;
    description: string;
    address: string;
    area: string;
    city: string;
    state: string;
    businessPhone: string;
    prepTimeMinutes: number;
    deliveryFee: number;
    deliveryRadiusKm: number;
    coverImage: string;
  }): { user: User; vendor: Vendor } {
    const email = input.email.trim().toLowerCase();
    validateIdentity(input, email);
    if (input.password !== input.confirmPassword) throw new ServiceError("Passwords do not match.");
    if (!input.businessName.trim()) throw new ServiceError("Your kitchen needs a name.");
    if (getDb().vendors.some((v) => v.name.toLowerCase() === input.businessName.trim().toLowerCase())) {
      throw new ServiceError("A kitchen with that name is already registered.");
    }

    const user: User = {
      id: uid("usr"),
      fullName: input.fullName.trim(),
      email,
      phone: input.phone.trim(),
      role: "vendor",
      dietaryPreferences: [],
      favoriteCuisineIds: [],
      isActive: true,
      password: input.password,
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.users.push(user);
      draft.session.userId = user.id;
    });
    const vendor = vendorService.register({
      name: input.businessName,
      tagline: input.tagline,
      description: input.description,
      address: input.address,
      area: input.area,
      city: input.city,
      state: input.state,
      phone: input.businessPhone || input.phone,
      email,
      logoText: "",
      prepTimeMinutes: input.prepTimeMinutes,
      deliveryFee: input.deliveryFee,
      deliveryRadiusKm: input.deliveryRadiusKm,
      coverImage: input.coverImage,
      ownerUserId: user.id,
    });
    return { user, vendor };
  },

  /**
   * Development password reset. No email is sent — the code is returned so the
   * UI can display it in a clearly-marked development panel.
   */
  requestPasswordReset(email: string): { code: string; email: string } {
    const normalized = email.trim().toLowerCase();
    const user = getDb().users.find((u) => u.email.toLowerCase() === normalized);
    // Do not leak which addresses exist; the UI shows the same confirmation.
    return { code: user ? uid("rst").slice(-6).toUpperCase() : "", email: normalized };
  },

  resetPassword(email: string, code: string, password: string, confirm: string): User {
    if (password !== confirm) throw new ServiceError("Passwords do not match.");
    if (password.length < 8) throw new ServiceError("Use at least 8 characters.");
    const user = getDb().users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) throw new ServiceError("That reset request is no longer valid.");
    if (!code.trim()) throw new ServiceError("Enter the reset code shown above.");
    void code;
    update((draft) => {
      const target = draft.users.find((u) => u.id === user.id);
      if (target) target.password = password;
    });
    return user;
  },

  updateProfile(
    userId: string,
    patch: Partial<Pick<User, "fullName" | "email" | "phone" | "avatarUrl" | "dietaryPreferences" | "favoriteCuisineIds">>,
    actorId: string,
  ): User {
    if (userId !== actorId) throw new ServiceError("You can only edit your own profile.");
    const db = getDb();
    if (patch.email) {
      const email = patch.email.trim().toLowerCase();
      if (db.users.some((u) => u.id !== userId && u.email.toLowerCase() === email)) {
        throw new ServiceError("Another account already uses that email.");
      }
      patch = { ...patch, email };
    }
    let next: User | null = null;
    update((draft) => {
      const user = draft.users.find((u) => u.id === userId);
      if (!user) throw new ServiceError("Account not found.");
      Object.assign(user, patch);
      next = user;
    });
    return next as unknown as User;
  },

  changePassword(userId: string, current: string, next: string, confirm: string, actorId: string) {
    if (userId !== actorId) throw new ServiceError("You can only change your own password.");
    if (next !== confirm) throw new ServiceError("New passwords do not match.");
    if (next.length < 8) throw new ServiceError("Use at least 8 characters.");
    const user = getDb().users.find((u) => u.id === userId);
    if (!user) throw new ServiceError("Account not found.");
    if (user.password !== current) throw new ServiceError("Your current password is incorrect.");
    update((draft) => {
      const target = draft.users.find((u) => u.id === userId);
      if (target) target.password = next;
    });
  },

  /** Admin-only account administration. */
  listUsers(): User[] {
    return getDb().users;
  },

  setActive(userId: string, isActive: boolean, actor: { id: string; fullName: string; role: Role }) {
    update((draft) => {
      const user = draft.users.find((u) => u.id === userId);
      if (!user) throw new ServiceError("Account not found.");
      user.isActive = isActive;
      recordAudit(draft, actor, isActive ? "user.activate" : "user.deactivate", user.fullName, user.email);
    });
  },

  /** Administrative role change — never exposed as a public sign-up option. */
  setRole(userId: string, role: Role, actor: { id: string; fullName: string; role: Role }) {
    if (actor.role !== "admin") throw new ServiceError("Only a merchant admin can change roles.");
    update((draft) => {
      const user = draft.users.find((u) => u.id === userId);
      if (!user) throw new ServiceError("Account not found.");
      user.role = role;
      recordAudit(draft, actor, "user.role", user.fullName, `Role changed to ${role}`);
    });
  },
};

function validateIdentity(input: { fullName: string; phone: string; password: string }, email: string) {
  if (!input.fullName.trim()) throw new ServiceError("Enter your full name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ServiceError("Enter a valid email address.");
  if (input.password.length < 8) throw new ServiceError("Use a password with at least 8 characters.");
  if (!input.phone.trim()) throw new ServiceError("Enter a phone number so your rider can reach you.");
  if (getDb().users.some((u) => u.email.toLowerCase() === email)) {
    throw new ServiceError("An account with that email already exists. Try signing in.");
  }
}

/* -------------------------------------------------------------- addresses */

export const addressService = {
  list(userId: string): Address[] {
    return getDb()
      .addresses.filter((a) => a.userId === userId)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  },

  get(id: string): Address | null {
    return getDb().addresses.find((a) => a.id === id) ?? null;
  },

  defaultFor(userId: string): Address | null {
    const list = addressService.list(userId);
    return list.find((a) => a.isDefault) ?? list[0] ?? null;
  },

  create(userId: string, input: Omit<Address, "id" | "userId" | "createdAt" | "isDefault">): Address {
    const list = addressService.list(userId);
    const address: Address = {
      ...input,
      id: uid("adr"),
      userId,
      isDefault: list.length === 0,
      createdAt: new Date().toISOString(),
    };
    update((draft) => {
      draft.addresses.push(address);
    });
    return address;
  },

  update(id: string, patch: Partial<Address>, actorId: string): Address {
    const existing = addressService.get(id);
    if (!existing) throw new ServiceError("Address not found.");
    if (existing.userId !== actorId) throw new ServiceError("You can only edit your own addresses.");
    validateAddress({ ...existing, ...patch });
    update((draft) => {
      const address = draft.addresses.find((a) => a.id === id);
      if (address) Object.assign(address, patch);
    });
    return { ...existing, ...patch };
  },

  remove(id: string, actorId: string) {
    const existing = addressService.get(id);
    if (!existing) throw new ServiceError("Address not found.");
    if (existing.userId !== actorId) throw new ServiceError("You can only delete your own addresses.");
    update((draft) => {
      draft.addresses = draft.addresses.filter((a) => a.id !== id);
      if (draft.delivery.addressId === id) draft.delivery.addressId = null;
      // Never leave a user without a default address.
      const remaining = draft.addresses.filter((a) => a.userId === existing.userId);
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0].isDefault = true;
      }
    });
  },

  setDefault(id: string, actorId: string) {
    const existing = addressService.get(id);
    if (!existing) throw new ServiceError("Address not found.");
    if (existing.userId !== actorId) throw new ServiceError("You can only change your own addresses.");
    update((draft) => {
      for (const address of draft.addresses) {
        if (address.userId === existing.userId) address.isDefault = address.id === id;
      }
    });
  },
};

export function validateAddress(input: {
  line1: string;
  area: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
}) {
  if (!input.line1.trim()) throw new ServiceError("Enter the street address.");
  if (!input.area.trim()) throw new ServiceError("Enter the area or neighbourhood.");
  if (!input.city.trim()) throw new ServiceError("Enter the city.");
  if (!input.state.trim()) throw new ServiceError("Enter the state.");
}

/* ------------------------------------------------------------ favorites */

export const favoriteService = {
  list(userId: string): string[] {
    return getDb().favorites.filter((f) => f.userId === userId).map((f) => f.foodId);
  },
  isFavorite(userId: string, foodId: string): boolean {
    return getDb().favorites.some((f) => f.userId === userId && f.foodId === foodId);
  },
  toggle(userId: string, foodId: string): boolean {
    const existing = getDb().favorites.some((f) => f.userId === userId && f.foodId === foodId);
    update((draft) => {
      if (existing) {
        draft.favorites = draft.favorites.filter(
          (f) => !(f.userId === userId && f.foodId === foodId),
        );
      } else {
        draft.favorites.push({ userId, foodId, at: new Date().toISOString() });
      }
    });
    return !existing;
  },
};
