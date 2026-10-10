import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChefHat,
  Compass,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  Receipt,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import { Badge, Button, GlassCard, Modal } from "@/components/ui";
import { HeaderBrowseMenu } from "@/components/layout/nav-mega";
import { cn, formatNaira } from "@/lib/utils";
import { useCartCount, useDb, useInstallPrompt, useSession } from "@/hooks";
import { authService, cartService, settingsService } from "@/services";
import { toast } from "sonner";

/* ------------------------------------------------------------------ brand */

/**
 * The wordmark. The mark is a solid yellow tile with ink on top, which is the
 * one place the brand yellow is used at full strength on every surface.
 */
export function Logo({
  className,
  showText = true,
  onInk = false,
}: {
  className?: string;
  showText?: boolean;
  onInk?: boolean;
}) {
  const { logoUrl } = settingsService.get();
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="img-cover" />
        ) : (
          <ChefHat className="size-5" aria-hidden />
        )}
      </span>
      {showText ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "truncate text-base font-extrabold tracking-tight",
              onInk ? "text-white" : "text-foreground",
            )}
          >
            Food Delivery System
          </span>
          <span
            className={cn(
              "text-[11px] font-medium",
              onInk ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Food, delivered hot
          </span>
        </span>
      ) : null}
    </span>
  );
}

/* ----------------------------------------------------------------- search */

/**
 * Food search. Deliberately searches DISHES (name, description, category,
 * cuisine, ingredients) — never addresses. Delivery locations are handled by
 * the separate `LocationControl` beside it.
 */
export function FoodSearchField({
  className,
  size = "md",
  autoFocus,
  defaultValue = "",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  autoFocus?: boolean;
  defaultValue?: string;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const db = useDb();

  const suggestions = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (query.length < 2) return [];
    return db.foods
      .filter(
        (food) =>
          food.name.toLowerCase().includes(query) ||
          food.category.toLowerCase().includes(query) ||
          food.ingredients.join(" ").toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [db.foods, term]);

  const [open, setOpen] = useState(false);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const value = term.trim();
    setOpen(false);
    navigate(value ? `/foods?q=${encodeURIComponent(value)}` : "/foods");
  };

  return (
    <div className={cn("relative", className)}>
      <form role="search" onSubmit={submit} className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          value={term}
          autoFocus={autoFocus}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search dishes, ingredients or cuisine"
          aria-label="Search for food"
          className={cn(
            "w-full rounded-full border-2 border-white/60 bg-white/55 pl-10 pr-24 text-sm shadow-lg shadow-primary-deep/5 backdrop-blur-xl transition-colors",
            "placeholder:text-muted-foreground hover:border-white/80 focus:border-primary focus:outline-none",
            size === "lg" ? "h-14" : size === "sm" ? "h-10" : "h-12",
          )}
        />
        <Button
          type="submit"
          size="sm"
          className={cn("absolute right-1.5 top-1/2 -translate-y-1/2", size === "lg" && "h-11")}
        >
          Search
        </Button>
      </form>

      {open && suggestions.length > 0 ? (
        <GlassCard
          intensity="cardStrong"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl p-1.5"
        >
          <ul>
            {suggestions.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/foods/${food.id}`);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/60"
                >
                  <img
                    src={food.image}
                    alt=""
                    loading="lazy"
                    className="size-10 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{food.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {food.category} · {formatNaira(food.price)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </GlassCard>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- location */

/**
 * Delivery-location control. There is NO geocoding provider connected, so this
 * never pretends to return live address suggestions: the customer picks one of
 * their saved delivery addresses, or types a new one which is validated and
 * stored. Coordinates for manually typed addresses are not invented.
 */
export function LocationControl({ className }: { className?: string }) {
  const { user } = useSession();
  const db = useDb();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const addresses = user ? db.addresses.filter((a) => a.userId === user.id) : [];
  const selected =
    addresses.find((a) => a.id === db.delivery.addressId) ??
    addresses.find((a) => a.isDefault) ??
    addresses[0] ??
    null;

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : navigate("/sign-in?next=/app"))}
        className={cn(
          "flex h-12 min-w-0 items-center gap-2 rounded-full border border-white/50 bg-white/55 px-4 text-left shadow-lg shadow-primary-deep/5 backdrop-blur-xl transition-colors hover:bg-white/75",
          className,
        )}
        aria-label="Choose your delivery location"
      >
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Deliver to
          </span>
          <span className="block truncate text-sm font-semibold">
            {selected ? `${selected.label} · ${selected.area}` : "Set your address"}
          </span>
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Deliver to"
        description="Pick a saved address, or add a new one from your profile."
        footer={
          <Button variant="outline" onClick={() => navigate("/app/profile")}>
            Manage addresses
          </Button>
        }
      >
        {addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no saved addresses yet. Add one in your profile to choose a delivery location.
          </p>
        ) : (
          <ul className="space-y-2">
            {addresses.map((address) => (
              <li key={address.id}>
                <button
                  type="button"
                  onClick={() => {
                    cartService.setDelivery(address.id, "");
                    setOpen(false);
                    toast.success(`Delivering to ${address.label}`);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    selected?.id === address.id
                      ? "border-primary/50 bg-primary/8"
                      : "border-border hover:bg-accent/60",
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{address.label}</span>
                      {address.isDefault ? <Badge tone="primary">Default</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {address.line1}, {address.area}, {address.city}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}

/* ----------------------------------------------------------------- header */

const PUBLIC_LINKS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: "/", label: "Home", end: true },
  { to: "/foods", label: "Browse food" },
  { to: "/partners", label: "Partners" },
  { to: "/#how-it-works", label: "How it works" },
  { to: "/vendor-signup", label: "Sell on Food Delivery System" },
];

/**
 * Desktop header routes. `/foods` and `/partners` are dropped here because the
 * mega-menu already renders both as its two triggers, and repeating one of them
 * as a plain link beside it would read as a duplicate destination.
 */
const DESKTOP_LINKS = PUBLIC_LINKS.filter(
  (link) => link.to !== "/foods" && link.to !== "/partners",
);

/**
 * The public header.
 *
 * Guests get discovery only: brand, navigation, search and a single "Order now"
 * call to action. Anything that belongs behind an account (the dashboard, the
 * cart, the delivery address) is rendered only once a session exists, so the
 * landing page never advertises a dashboard the visitor cannot open yet.
 */
export function PublicHeader() {
  const { user } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <GlassCard intensity="cardStrong" className="flex w-full flex-col rounded-none border-x-0 border-t-0 py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" aria-label="Food Delivery System home" className="shrink-0">
            <Logo showText={false} className="sm:hidden" />
            <Logo className="hidden sm:flex" />
          </Link>

          {/* Every destination sits on the logo's line, never underneath it. The
              mega-menu takes the slot directly after Home. */}
          <nav aria-label="Primary" className="hidden flex-1 items-center gap-0.5 xl:flex">
            {DESKTOP_LINKS.map((link, index) => (
              <Fragment key={link.to}>
                {index === 1 ? <HeaderBrowseMenu /> : null}
                <NavLink to={link.to} end={link.end} className={navLinkClass(link.to)}>
                  {link.label}
                </NavLink>
              </Fragment>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label={searchOpen ? "Close search" : "Search dishes"}
              aria-expanded={searchOpen}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/50 bg-white/55 text-foreground backdrop-blur-xl transition-colors hover:bg-white/80"
            >
              {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>

            <Link to="/foods" className="hidden sm:block">
              <Button size="sm">
                Order now
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </Link>

            {user ? (
              <>
                <Link
                  to="/app/cart"
                  aria-label="Your cart"
                  className="relative inline-flex size-10 items-center justify-center rounded-full border border-white/50 bg-white/55 backdrop-blur-xl transition-colors hover:bg-white/80"
                >
                  <ShoppingBag className="size-4" aria-hidden />
                  <CartBadge />
                </Link>
                <AccountMenu />
              </>
            ) : (
              <Link to="/sign-in" className="hidden sm:block">
                <Button size="sm" variant="glass">
                  Sign in
                </Button>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              className="inline-flex size-10 items-center justify-center rounded-full border border-white/50 bg-white/55 backdrop-blur-xl transition-colors hover:bg-white/80 xl:hidden"
            >
              {menuOpen ? <X className="size-4" /> : <MenuIcon className="size-4" />}
            </button>
          </div>
        </div>

        {searchOpen ? (
          <div className="mx-auto mt-3 w-full max-w-7xl px-4 sm:px-6">
            <FoodSearchField size="sm" autoFocus />
            {user ? (
              <div className="mt-2">
                <LocationControl className="w-full" />
              </div>
            ) : null}
          </div>
        ) : null}

        {menuOpen ? (
          <nav
            aria-label="Mobile"
            className="mx-auto mt-3 grid w-full max-w-7xl gap-1 border-t border-white/40 px-4 pt-3 sm:px-6 xl:hidden"
          >
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-white/60"
              >
                {link.label}
              </Link>
            ))}
            {!user ? (
              <Link
                to="/sign-in"
                className="rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-white/60 sm:hidden"
              >
                Sign in
              </Link>
            ) : null}
          </nav>
        ) : null}
      </GlassCard>
    </header>
  );
}

/** Shared header-link treatment: yellow pill when active, glass on hover. */
function navLinkClass(to: string) {
  const isSection = to.includes("#");
  return ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
      isActive && !isSection
        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
        : "text-foreground/75 hover:bg-white/70 hover:text-foreground",
    );
}

/** Cart counter used by the header bag button. */
function CartBadge() {
  const count = useCartCount();
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
      {count}
    </span>
  );
}

/* ----------------------------------------------------------------- footer */

const FOOTER_LINKS: Array<{ title: string; links: Array<{ to: string; label: string }> }> = [
  {
    title: "Food Delivery System",
    links: [
      { to: "/about", label: "About us" },
      { to: "/contact", label: "Contact" },
      { to: "/help", label: "Help centre" },
      { to: "/#how-it-works", label: "How ordering works" },
    ],
  },
  {
    title: "Order",
    links: [
      { to: "/foods", label: "Browse food" },
      { to: "/app/orders", label: "Track an order" },
      { to: "/app/favorites", label: "Saved dishes" },
    ],
  },
  {
    title: "Partners",
    links: [
      { to: "/partners", label: "Partnership overview" },
      { to: "/vendor-signup", label: "Become a vendor" },
      { to: "/help#vendors", label: "Selling and approvals" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/terms", label: "Terms of service" },
      { to: "/privacy", label: "Privacy policy" },
      { to: "/help#refunds", label: "Refund policy" },
    ],
  },
];

/**
 * The public footer.
 *
 * Set on ink instead of glass: it closes the page the way the reference design
 * does, and the near-black surface is the one place where the yellow accent can
 * be used as a link colour with full contrast.
 */
export function PublicFooter() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  return (
    <footer className="mt-16 bg-primary-deep text-white/85">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo onInk />
            <p className="mt-3 max-w-xs text-sm text-white/65">
              A marketplace of independent kitchens. Order a dish, and we will show you who is cooking
              it.
            </p>
            <div className="mt-4">
              {installed ? (
                <Badge tone="primary">
                  <Smartphone className="size-3" aria-hidden /> App installed
                </Badge>
              ) : canInstall ? (
                <Button size="sm" onClick={() => void promptInstall()}>
                  <Smartphone className="size-4" aria-hidden />
                  Install the app
                </Button>
              ) : (
                <Link to="/#install">
                  <Button size="sm" variant="glass">
                    <Smartphone className="size-4" aria-hidden />
                    Install the app
                  </Button>
                </Link>
              )}
            </div>
          </div>
          {FOOTER_LINKS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary">
                {group.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.to}-${link.label}`}>
                    <Link
                      to={link.to}
                      className="text-sm text-white/70 transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Food Delivery System. All prices in Nigerian naira.</p>
          <p>
            Development build: payments, GPS tracking and authentication are served by local mock
            adapters, not live services.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ---------------------------------------------------------- mobile tab bar */

/**
 * Mobile quick navigation.
 *
 * Only rendered for a signed-in customer: every tab points at an authenticated
 * route, so showing it to a visitor would advertise a dashboard they cannot
 * open. Guests keep the brand, the nav and search instead.
 */
export function MobileTabBar() {
  const cartCount = useCartCount();
  const { user } = useSession();
  if (!user) return null;

  const tabs = [
    { to: "/app", label: "Home", icon: Home },
    { to: "/foods", label: "Discover", icon: Compass },
    { to: "/app/orders", label: "Orders", icon: Receipt },
    { to: "/app/favorites", label: "Saved", icon: Heart },
  ];
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/50 bg-white/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.to === "/app"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                    )}
                  >
                    <tab.icon className="size-4.5" aria-hidden />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink
            to="/app/cart"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "relative flex size-8 items-center justify-center rounded-full transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                  )}
                >
                  <ShoppingBag className="size-4.5" aria-hidden />
                  {cartCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1 flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background">
                      {cartCount}
                    </span>
                  ) : null}
                </span>
                Cart
              </>
            )}
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------- account nav */

export function AccountMenu() {
  const { user, vendor } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const home =
    user.role === "customer" ? "/app" : user.role === "vendor" ? "/vendor" : "/admin";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold"
      >
        <UserIcon className="size-4" aria-hidden />
        <span className="max-w-28 truncate">{user.fullName}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-bold">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {vendor ? vendor.name : user.email}
            </p>
          </div>
          <Link
            to={home}
            role="menuitem"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <LayoutDashboard className="size-4" aria-hidden /> Dashboard
          </Link>
          <Link
            to="/app/profile"
            role="menuitem"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <UserIcon className="size-4" aria-hidden /> Profile
          </Link>
          <Link
            to="/foods"
            role="menuitem"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Store className="size-4" aria-hidden /> Browse food
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              authService.signOut();
              setOpen(false);
              toast.success("Signed out");
              navigate("/");
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Wraps every public page with the ambient background and mobile spacing.
 *
 * A hash in the URL (for example `/#how-it-works` from the header, or `/help#refunds`)
 * is scrolled to once the destination page has rendered. The element may not
 * exist on the first frame after navigation, so the lookup is retried across a
 * couple of animation frames before giving up.
 */
export function PublicLayout() {
  const location = useLocation();
  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (id) {
      let frames = 0;
      let raf = 0;
      const attempt = () => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (frames++ < 12) raf = requestAnimationFrame(attempt);
      };
      raf = requestAnimationFrame(attempt);
      return () => cancelAnimationFrame(raf);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname, location.hash]);

  return (
    <div className="app-ambient flex min-h-dvh flex-col">
      <PublicHeader />
      <main id="main" className="flex-1 pb-24 lg:pb-8">
        <Outlet />
      </main>
      <PublicFooter />
      <MobileTabBar />
    </div>
  );
}

/** Shared page container so every screen lines up on the same grid. */
export function PageContainer({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cn("mx-auto w-full max-w-7xl scroll-mt-32 px-4 py-6 sm:px-6 lg:py-8", className)}
    >
      {children}
    </div>
  );
}
