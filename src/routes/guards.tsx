import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import type { Role } from "@/types";
import { Button, GlassCard } from "@/components/ui";
import { useSession } from "@/hooks";
import { homeRouteFor } from "@/services/guards";

/**
 * Route guards keep each role inside its own experience.
 *
 * This is UX-level protection, not a security boundary: the same rules MUST be
 * enforced by the backend on every request (§34). A determined user can always
 * edit client state, which is exactly why nothing sensitive is decided here.
 */
export function RequireAuth({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/sign-in?next=${next}`} replace />;
  }

  // A merchant admin is allowed into vendor screens for oversight purposes.
  const allowed = roles.includes(user.role) || user.role === "admin";
  if (!allowed) {
    return <RoleBlocked role={user.role} required={roles} />;
  }

  return <>{children}</>;
}

function RoleBlocked({ role, required }: { role: Role; required: Role[] }) {
  return (
    <div className="app-ambient flex min-h-dvh items-center justify-center p-6">
      <GlassCard intensity="cardStrong" className="max-w-md p-6 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
          <ShieldAlert className="size-6" aria-hidden />
        </span>
        <h1 className="text-lg font-extrabold">You do not have access to this area</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in as a <strong>{role}</strong> account. This section is restricted to{" "}
          <strong>{required.join(" or ")}</strong> accounts.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to={homeRouteFor(role)}>
            <Button>Go to my dashboard</Button>
          </Link>
          <Link to="/foods">
            <Button variant="outline">Browse food</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

/** Redirects signed-in users away from the auth screens. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = params.get("next");

  if (user) return <Navigate to={next ?? homeRouteFor(user.role)} replace />;
  return <>{children}</>;
}
