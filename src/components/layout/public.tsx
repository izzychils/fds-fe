import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Compass,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu as MenuIcon,
  Phone,
  Receipt,
  Search,
  ShoppingBag,
  Smartphone,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import { Avatar, Badge, Button, GlassCard, Modal } from "@/components/ui";
import { HeaderBrowseMenu } from "@/components/layout/nav-mega";
import { cn, formatNaira } from "@/lib/utils";
import { useCartCount, useDb, useInstallPrompt, useSession } from "@/hooks";
import { authService, cartService, settingsService } from "@/services";
import { toast } from "sonner";

/* ------------------------------------------------------------------ brand */

/**
 * The wordmark.
 *
 * The mark is the brand logo (`/logo.png`, generated from `inspo/logo.jpg`) on a
 * solid tile. On light surfaces the tile is brand yellow with the ink glyph on
 * it; on the ink footer the tile flips to white so the same black glyph still
 * reads. The written name comes from the platform settings, so a merchant can
 * rename the storefront without a code change.
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
  const { logoUrl, logoText, siteName, tagline } = settingsService.get();
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-lg",
          onInk ? "bg-white" : "bg-primary shadow-primary/25",
        )}
      >
        <img src={logoUrl ?? "/logo.png"} alt="" className="size-7 object-contain" />
      </span>
      {showText ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={cn(
              "truncate text-base font-extrabold tracking-tight",
              onInk ? "text-white" : "text-foreground",
            )}
          >
            {logoText || siteName}
          </span>
          <span
            className={cn(
              "truncate text-[11px] font-medium",
              onInk ? "text-white/55" : "text-muted-foreground",
            )}
          >
            {tagline.replace(/\.$/, "")}
          </span>
        </span>
      ) : null}
    </span>
  );
}

/* ----------------------------------------------------------------- search */

/**
 * Food search. Deliberately searches DISHES (name, description, category,
 * cuisine, ingredients), never addresses. Delivery locations are handled by
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
  { to: "/vendor-signup", label: "Sell on Chupnow" },
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
 * Guests get discovery only: brand, navigation and a single "Order now" call to
 * action which lands on sign-up, because ordering needs an account. There is no
 * search field, no cart button, no separate sign-up button and no account name
 * here: the one CTA covers account creation, and an identity belongs to the
 * console shell, not to the storefront a visitor is browsing.
 */
export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-40 w-full">
      <GlassCard intensity="cardStrong" className="flex w-full flex-col rounded-none border-x-0 border-t-0 py-3">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 sm:px-6">
          <Link to="/" aria-label="Chupnow home" className="shrink-0">
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
            {/* One call to action for a visitor, and it creates the account. */}
            <Link to="/sign-up">
              <Button size="sm">
                Order now
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </Link>

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

/* ----------------------------------------------------------------- footer */

const FOOTER_LINKS: Array<{ to: string; label: string }> = [
  { to: "/foods", label: "Browse food" },
  { to: "/#how-it-works", label: "How ordering works" },
  { to: "/app/orders", label: "Track an order" },
  { to: "/partners", label: "Partnership overview" },
  { to: "/vendor-signup", label: "Become a vendor" },
  { to: "/help#vendors", label: "Selling and approvals" },
  { to: "/about", label: "About us" },
  { to: "/contact", label: "Contact" },
  { to: "/help", label: "Help centre" },
  { to: "/help#refunds", label: "Refund policy" },
  { to: "/terms", label: "Terms and conditions" },
  { to: "/privacy", label: "Privacy policy" },
];

/**
 * The public footer.
 *
 * Set on ink instead of glass: it closes the page the way the reference design
 * does, and the near-black surface is the one place where the yellow accent can
 * be used as a link colour with full contrast. The four columns are the ones the
 * reference draws, brand, opening hours, contact details and a subscribe field,  * and the page links run underneath them so nothing became unreachable when the
 * link columns were folded into a single strip.
 */
export function PublicFooter() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const { user } = useSession();
  const settings = settingsService.get();
  const db = useDb();
  const [email, setEmail] = useState("");

  /** The plate that peeks in from the corner, when a kitchen has published one. */
  const peek = db.foods.find((food) => food.isAvailable)?.image ?? "/foods/pepperoni-pizza.jpg";

  /**
   * There is no mailing provider in this build, so the form validates the address
   * and says plainly that nothing was sent rather than pretending to subscribe.
   */
  const subscribe = (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email address first.");
      return;
    }
    toast.info("Subscribe us is not connected to a mailing provider in this development build.");
  };

  return (
    <footer className="relative mt-16 overflow-hidden bg-primary-deep text-white/85">
      <img
        src={peek}
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute -bottom-20 -left-16 hidden size-56 rounded-full object-cover opacity-60 lg:block"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo onInk />
            <p className="mt-3 max-w-xs text-sm text-white/65">
              A marketplace of independent kitchens. Order a dish, and we will show you who is cooking
              it.
            </p>
            {/*
              Installing the app is a signed-in feature: a visitor has no account
              to install it for, so the prompt is only rendered once a session
              exists.
            */}
            {user ? (
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
                  <p className="inline-flex items-center gap-2 text-xs text-white/60">
                    <Smartphone className="size-3.5" aria-hidden />
                    This browser installs web apps from its own menu.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
              <Clock className="size-4" aria-hidden /> Opening hours
            </h2>
            <p className="mt-4 text-sm text-white/70">{settings.supportHours}</p>
            <p className="mt-2 text-xs text-white/50">
              Kitchens publish their own hours on their pages, and an order is only accepted while the
              kitchen cooking it is open.
            </p>
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
              <MapPin className="size-4" aria-hidden /> Contact us
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li>{settings.address}</li>
              <li>
                <a
                  href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Phone className="size-3.5" aria-hidden />
                  {settings.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Mail className="size-3.5" aria-hidden />
                  {settings.contactEmail}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-primary">
              <Mail className="size-4" aria-hidden /> Subscribe us
            </h2>
            <p className="mt-4 text-sm text-white/65">
              New dishes and new kitchens, at most once a month. Unsubscribe from any message.
            </p>
            <form
              onSubmit={subscribe}
              className="mt-4 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pl-4 pr-1.5 backdrop-blur-xl"
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/45 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-white"
              >
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>

        <nav
          aria-label="Footer"
          className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/15 pt-6 text-sm"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={`${link.to}-${link.label}`}
              to={link.to}
              className="text-white/65 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-2 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.siteName}. All prices in Nigerian naira.
          </p>
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
 * customer route, so showing it to a visitor would advertise a dashboard they
 * cannot open, and showing it to a signed-in vendor would offer tabs whose
 * routes reject them. Guests keep the brand, the nav and search instead.
 */
export function MobileTabBar() {
  const cartCount = useCartCount();
  const { user } = useSession();
  if (user?.role !== "customer") return null;

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

/**
 * Account dropdown.
 *
 * Styled after the glass account menu in `frontend_v0`: a translucent,
 * backdrop-blurred pill trigger that carries the avatar and first name, opening
 * a frosted panel whose items are ghost rows that brighten on hover. Only ever
 * rendered for a signed-in session, so a visitor is never shown an account, and
 * is never shown a person's name, before they authenticate.
 */
export function AccountMenu({ align = "end", className }: { align?: "start" | "end"; className?: string }) {
  const { user, vendor } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  /*
   * The panel is portalled to `document.body` on purpose. The header it opens
   * from is itself `backdrop-blur`ed, and any element with a backdrop filter
   * forms a backdrop root: a blurred panel below the header's own box would have
   * nothing behind it to blur, which is exactly why it used to read as clear
   * glass over the page text. Portalled, its backdrop is the page, so the frosted
   * blur is real and covers the panel alone, never the page behind it.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = panelRef.current?.offsetWidth ?? 256;
      const left = align === "end" ? rect.right - width : rect.left;
      setPosition({
        top: rect.bottom + 8,
        left: Math.min(Math.max(8, left), Math.max(8, window.innerWidth - width - 8)),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      // The panel lives outside `rootRef` in the DOM, so it counts as inside.
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  if (!user) return null;

  const home =
    user.role === "customer" ? "/app" : user.role === "vendor" ? "/vendor" : "/admin";
  const roleLabel =
    user.role === "customer" ? "Customer" : user.role === "vendor" ? "Vendor" : "Merchant";
  const firstName = user.fullName.split(" ")[0] || user.fullName;

  /** Menu rows: the same frosted ghost treatment for links and the sign-out button. */
  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-white/50";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/40 bg-white/25 px-2.5 py-1.5 text-sm font-semibold shadow-lg shadow-black/5 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:bg-white/45"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-24 truncate sm:inline">{firstName}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform duration-300", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={{ position: "fixed", top: position.top, left: position.left }}
              className="z-50 w-64 rounded-2xl border border-white/50 bg-white/70 p-2 text-foreground shadow-2xl shadow-black/15 backdrop-blur-2xl dark:border-white/20 dark:bg-black/60"
            >
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <Avatar name={user.fullName} src={user.avatarUrl} className="size-10" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {vendor ? vendor.name : user.email}
              </p>
            </div>
          </div>
          <p className="mx-2 mb-1 mt-1 inline-flex rounded-full bg-white/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {roleLabel}
          </p>
          <div className="my-1 h-px bg-white/50" aria-hidden />

          <Link to={home} role="menuitem" onClick={() => setOpen(false)} className={rowClass}>
            <LayoutDashboard className="size-4 shrink-0 text-primary-ink" aria-hidden /> My dashboard
          </Link>
          {user.role === "customer" ? (
            <>
              <Link
                to="/app/orders"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={rowClass}
              >
                <Receipt className="size-4 shrink-0 text-primary-ink" aria-hidden /> My orders
              </Link>
              <Link
                to="/app/favorites"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={rowClass}
              >
                <Heart className="size-4 shrink-0 text-primary-ink" aria-hidden /> Saved dishes
              </Link>
            </>
          ) : null}
          <Link
            to={user.role === "customer" ? "/app/profile" : "/vendor/settings"}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={rowClass}
          >
            <UserIcon className="size-4 shrink-0 text-primary-ink" aria-hidden /> Profile
          </Link>
          <Link to="/foods" role="menuitem" onClick={() => setOpen(false)} className={rowClass}>
            <Store className="size-4 shrink-0 text-primary-ink" aria-hidden /> Browse food
          </Link>

          <div className="my-1 h-px bg-white/50" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              authService.signOut();
              /*
               * A hard navigation on purpose. The route guard redirects to the
               * sign-in screen the instant the session clears while a guarded
               * route is still mounted, so a soft navigate cannot reliably
               * outrun it, and landing on the sign-in page after signing out
               * reads as a failure. A full load also discards in-memory state.
               */
              window.location.replace("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="size-4 shrink-0" aria-hidden /> Sign out
          </button>
            </div>,
            document.body,
          )
        : null}
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
