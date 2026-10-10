import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BadgePercent,
  Bike,
  ClipboardList,
  Compass,
  Drumstick,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  UserCog,
  Users,
  Utensils,
  X,
} from "lucide-react";
import type { Role } from "@/types";
import { Avatar, Badge, Button, GlassCard } from "@/components/ui";
import { AccountMenu, Logo } from "@/components/layout/public";
import { cn } from "@/lib/utils";
import { useCartCount, useSession } from "@/hooks";
import { authService } from "@/services";
import { homeRouteFor } from "@/services/guards";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * The customer console.
 *
 * Same shell as the kitchen console, reduced to what a customer owns: their
 * cart, their orders, their saved dishes and their own account. Nothing here
 * can reach another person's data, which is exactly why the two consoles look
 * alike while offering different powers.
 */
const CUSTOMER_NAV: NavSection[] = [
  {
    title: "Order",
    items: [
      { to: "/app", label: "Home", icon: LayoutDashboard, end: true },
      { to: "/app/cart", label: "Cart", icon: ShoppingBag },
      { to: "/app/orders", label: "My orders", icon: ClipboardList },
      { to: "/app/favorites", label: "Saved dishes", icon: Heart },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/app/reviews", label: "My reviews", icon: MessageSquare },
      { to: "/app/profile", label: "Profile and addresses", icon: UserCog },
    ],
  },
  {
    title: "Discover",
    items: [{ to: "/foods", label: "All dishes", icon: Compass }],
  },
];

const VENDOR_NAV: NavSection[] = [
  {
    title: "Operations",
    items: [
      { to: "/vendor", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/vendor/orders", label: "Orders", icon: ClipboardList },
      { to: "/vendor/riders", label: "Riders", icon: Bike },
      { to: "/vendor/reviews", label: "Reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Menu",
    items: [
      { to: "/vendor/menu", label: "Dishes", icon: Utensils },
      { to: "/vendor/menu/new", label: "Add a dish", icon: PlusCircle },
      { to: "/vendor/inventory", label: "Inventory", icon: Package },
      { to: "/vendor/proteins", label: "Proteins", icon: Drumstick },
      { to: "/vendor/extras", label: "Extras", icon: ListChecks },
    ],
  },
  {
    title: "Business",
    items: [
      { to: "/vendor/delivery", label: "Delivery settings", icon: Truck },
      { to: "/vendor/settings", label: "Kitchen profile", icon: Settings },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
  {
    title: "Platform",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/orders", label: "All orders", icon: ClipboardList },
      { to: "/admin/vendors", label: "Kitchens", icon: Store },
      { to: "/admin/customers", label: "Customers", icon: Users },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { to: "/admin/menu", label: "All dishes", icon: Utensils },
      { to: "/admin/proteins", label: "Proteins", icon: Drumstick },
      { to: "/admin/extras", label: "Extras", icon: ListChecks },
    ],
  },
  {
    title: "Content & logistics",
    items: [
      { to: "/admin/banners", label: "Banners", icon: ImageIcon },
      { to: "/admin/riders", label: "Riders", icon: Bike },
      { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/admin/settings", label: "Site settings", icon: Settings },
      { to: "/admin/fees", label: "Platform fees", icon: BadgePercent },
      { to: "/admin/audit", label: "Activity log", icon: UserCog },
    ],
  },
];

function navFor(role: Role): NavSection[] {
  if (role === "admin") return ADMIN_NAV;
  return role === "customer" ? CUSTOMER_NAV : VENDOR_NAV;
}

/** What the account is allowed to do, spelled out in the console header. */
const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  vendor: "Vendor console",
  admin: "Merchant console",
};

export function DashboardLayout({ role }: { role: Role }) {
  const { user, vendor } = useSession();
  const cartCount = useCartCount();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    const main = document.getElementById("dashboard-main");
    main?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  if (!user) {
    return (
      <div className="app-ambient flex min-h-dvh items-center justify-center p-6">
        <GlassCard className="max-w-sm p-6 text-center">
          <h1 className="text-lg font-bold">Please sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This dashboard is only available to signed-in accounts.
          </p>
          <Button className="mt-4" onClick={() => navigate("/sign-in")}>
            Go to sign in
          </Button>
        </GlassCard>
      </div>
    );
  }

  if (user.role !== role && user.role !== "admin") {
    return (
      <div className="app-ambient flex min-h-dvh items-center justify-center p-6">
        <GlassCard className="max-w-md p-6 text-center">
          <h1 className="text-lg font-bold">Not your dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user.fullName} ({user.role}). This area belongs to {role} accounts.
          </p>
          <Button className="mt-4" onClick={() => navigate(homeRouteFor(user.role))}>
            Go to my dashboard
          </Button>
        </GlassCard>
      </div>
    );
  }

  const sections = navFor(user.role);

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Link to="/" className="shrink-0 px-1" aria-label="Back to the storefront">
        <Logo />
      </Link>

      <GlassCard intensity="base" className="rounded-2xl p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} src={user.avatarUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {vendor ? vendor.name : user.role === "admin" ? "Platform merchant" : user.email}
            </p>
          </div>
        </div>
        {vendor ? (
          <div className="mt-3 flex items-center gap-2">
            <Badge tone={vendor.isOpen ? "success" : "muted"}>
              {vendor.isOpen ? "Open" : "Closed"}
            </Badge>
            <Badge tone={vendor.status === "approved" ? "primary" : "warning"}>
              {vendor.status}
            </Badge>
          </div>
        ) : null}
      </GlassCard>

      <nav aria-label="Dashboard" className="custom-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {sections.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                          : "text-foreground/75 hover:bg-white/60 hover:text-foreground",
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-white/50 pt-3">
        <Link
          to="/foods"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/75 transition-colors hover:bg-white/60"
        >
          <ExternalLink className="size-4" aria-hidden /> View storefront
        </Link>
        {user.role === "customer" ? (
          <Link
            to="/app/cart"
            className="flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/75 transition-colors hover:bg-white/60"
          >
            <span className="flex items-center gap-2.5">
              <ShoppingBag className="size-4" aria-hidden /> Your cart
            </span>
            {cartCount > 0 ? (
              <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => {
            authService.signOut();
            // Hard navigation: the route guard redirects to the sign-in screen
            // as soon as the session clears inside a guarded route, so a soft
            // navigate cannot outrun it. See AccountMenu for the same rule.
            window.location.replace("/");
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-ambient min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-white/40 bg-white/35 p-4 backdrop-blur-xl lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-primary-deep/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 h-full w-[84%] max-w-xs overflow-y-auto border-r border-white/40 bg-card p-4 custom-scrollbar">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="rounded-full p-2 hover:bg-accent"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/40 bg-white/45 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              className="rounded-full border border-white/50 bg-white/55 p-2 backdrop-blur-xl lg:hidden"
            >
              <MenuIcon className="size-5" aria-hidden />
            </button>

            {/* Greeting first, the way the reference dashboard screens open. */}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Hello
              </p>
              <p className="truncate text-base font-extrabold tracking-tight">{user.fullName}</p>
            </div>

            <Badge tone={user.role === "admin" ? "primary" : "info"} className="hidden sm:inline-flex">
              {ROLE_LABEL[user.role]}
            </Badge>

            {user.role === "customer" ? (
              <Link
                to="/app/cart"
                aria-label="Your cart"
                className="relative inline-flex size-10 items-center justify-center rounded-full border border-white/50 bg-white/40 backdrop-blur-xl transition-colors hover:bg-white/70"
              >
                <ShoppingBag className="size-4" aria-hidden />
                {cartCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <Link to="/foods" className="hidden sm:block">
              <Button size="sm" variant="glass">
                <ExternalLink className="size-4" aria-hidden /> Storefront
              </Button>
            </Link>

            <AccountMenu align="end" />
          </div>
        </header>

        <main id="dashboard-main" className="min-w-0 flex-1 p-4 pb-12 sm:p-6">
          {/* Content fades in with each route so navigation feels continuous. */}
          <div key={location.pathname} className="animate-stagger-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Page container for console screens.
 *
 * The console shell already pads its main region, so this only caps the width
 * and spaces the blocks. It is the console counterpart of the storefront's
 * `PageContainer`, which keeps the two surfaces reading as different places.
 */
export function DashboardContainer({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div id={id} className={cn("mx-auto w-full max-w-6xl space-y-6", className)}>
      {children}
    </div>
  );
}

/** Consistent page heading for every dashboard screen. */
export function DashboardHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

/** Marks a development-only surface so it can never be mistaken for live. */
export function DevNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800">
      {children}
    </div>
  );
}
