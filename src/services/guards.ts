import type { Role, User } from "@/types";

/**
 * Authorization helpers shared by every service.
 *
 * These guards are DEFENCE-IN-DEPTH for the UI, not the security boundary.
 * Hiding a button proves nothing, the backend must independently authenticate
 * the caller and check ownership on every request (§34 of the brief).
 */

export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

/**
 * The acting account for an audited write. `User` satisfies this shape, so
 * services can accept either a full user record or a minimal actor.
 */
export type Actor = { id: string; fullName: string; role: Role };

/** Merchant admins may act on anything; everyone else only on their own. */
export function assertOwnership(actor: User, ownerVendorId: string | null, resource: string) {
  if (actor.role === "admin") return;
  if (actor.role === "vendor" && ownerVendorId !== null && actor.vendorId === ownerVendorId) return;
  throw new ServiceError(`You do not have permission to modify this ${resource}.`);
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function hasRole(user: User | null, ...roles: Role[]): boolean {
  return Boolean(user && roles.includes(user.role));
}

/**
 * Where each role lands after signing in. Admin has no customer storefront and
 * customers have no dashboard, so a single "home" route would be wrong.
 */
export function homeRouteFor(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "vendor":
      return "/vendor";
    default:
      return "/app";
  }
}
