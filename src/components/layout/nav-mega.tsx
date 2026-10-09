import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  Flame,
  TrendingUp,
  Star,
  Store,
  Utensils,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn, formatNaira } from "@/lib/utils";
import { glassMorphism } from "@/lib/glass-morphism";
import { useDb } from "@/hooks";
import { cuisineService, foodService, settingsService } from "@/services";

/**
 * The mega-menu behind the desktop header nav. Two panels:
 *  - "Browse food": live cuisines, live categories and the current top-rated
 *    dishes, all read from the same store the marketplace uses.
 *  - "Partners": the three journeys (customer, vendor, merchant).
 *
 * Every link is a react-router `Link`, so nothing here triggers a page reload.
 */

const TRIGGER_CLASS = cn(
  glassMorphism.tab,
  glassMorphism.hover,
  "h-auto rounded-full px-4 py-2.5 text-[15px] font-semibold text-foreground/80",
  "hover:text-foreground data-[state=open]:bg-primary/12 data-[state=open]:text-primary",
);

function PanelLink({
  to,
  title,
  description,
  icon,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex select-none items-start gap-3 rounded-xl p-3 transition-colors hover:bg-accent/70"
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      </span>
    </Link>
  );
}

export function HeaderBrowseMenu() {
  const db = useDb();
  const cuisines = cuisineService.listActive();
  const categories = settingsService.get().categories;
  const popular = foodService.popular(6);

  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className={TRIGGER_CLASS}>Browse food</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div
              className={cn(
                glassMorphism.cardStrong,
                "grid w-[min(88vw,760px)] gap-4 rounded-2xl p-4 md:grid-cols-[1fr_1fr]",
              )}
            >
              <div className="space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Cuisines
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {cuisines.slice(0, 8).map((cuisine) => (
                    <li key={cuisine.id}>
                      <Link
                        to={`/foods?cuisine=${cuisine.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/60 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <Utensils className="size-3" aria-hidden />
                        {cuisine.name}
                      </Link>
                    </li>
                  ))}
                </ul>

                <p className="pt-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Categories
                </p>
                <ul className="grid grid-cols-2 gap-1">
                  {categories.slice(0, 8).map((category) => (
                    <li key={category}>
                      <Link
                        to={`/foods?category=${encodeURIComponent(category)}`}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-accent/70 hover:text-foreground"
                      >
                        {category}
                        <ArrowRight className="size-3.5 opacity-40" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Top rated right now
                </p>
                <ul className="space-y-1">
                  {popular.slice(0, 5).map((entry) => (
                    <li key={entry.food.id}>
                      <Link
                        to={`/foods/${entry.food.id}`}
                        className="flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-accent/70"
                      >
                        <img
                          src={entry.food.image}
                          alt=""
                          loading="lazy"
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {entry.food.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {formatNaira(entry.effectivePrice)} · {entry.vendor.name}
                          </span>
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold">
                          <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                          {entry.rating > 0 ? entry.rating.toFixed(1) : "New"}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {popular.length === 0 ? (
                    <li className="px-2 py-6 text-sm text-muted-foreground">
                      No dishes published yet.
                    </li>
                  ) : null}
                </ul>
                <Link
                  to="/foods"
                  className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/15"
                >
                  See the full menu
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <p className="px-1 text-[11px] text-muted-foreground">
                  {db.foods.filter((food) => food.isAvailable).length} dishes live across{" "}
                  {db.vendors.filter((vendor) => vendor.status === "approved").length} kitchens
                </p>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={TRIGGER_CLASS}>Partners</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div
              className={cn(
                glassMorphism.cardStrong,
                "grid w-[min(88vw,520px)] gap-1 rounded-2xl p-3 md:grid-cols-2",
              )}
            >
              <PanelLink
                to="/vendor-signup"
                title="Sell on Food Delivery System"
                description="Register your kitchen, publish a menu and take orders."
                icon={<Store className="size-4" aria-hidden />}
              />
              <PanelLink
                to="/vendor"
                title="Vendor dashboard"
                description="Run your menu, stock, specials and orders."
                icon={<Flame className="size-4" aria-hidden />}
              />
              <PanelLink
                to="/admin"
                title="Merchant console"
                description="Platform fees, banners, riders, reviews and vendors."
                icon={<TrendingUp className="size-4" aria-hidden />}
              />
              <PanelLink
                to="/help"
                title="Rider & delivery help"
                description="How delivery fees, timelines and tracking work."
                icon={<Bike className="size-4" aria-hidden />}
              />
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
