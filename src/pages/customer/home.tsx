import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bike, Clock, Flame, MapPin, TrendingUp, Truck, Utensils } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  GlassCard,
  SectionHeading,
  StatCard,
} from "@/components/ui";
import { CategoryChips, FoodCard } from "@/components/food";
import { BannerCarousel } from "@/components/banners";
import { StatusProgress } from "@/components/orders";
import { FoodSearchField, LocationControl } from "@/components/layout/public";
import { DashboardContainer } from "@/components/layout/dashboard";
import { useDb, useSession, useDbMemo } from "@/hooks";
import {
  bannerService,
  cuisineAffinity,
  cuisineService,
  foodService,
  orderService,
  recommendFoods,
  settingsService,
} from "@/services";
import { cn, distanceKm, formatNaira } from "@/lib/utils";
import { cuisineIcon } from "@/lib/cuisine-icons";

export default function CustomerHomePage() {
  const db = useDb();
  const { user } = useSession();
  const [category, setCategory] = useState<string | null>(null);

  const settings = settingsService.get();
  const banners = bannerService.listActive();

  const deliveryAddress = useDbMemo(() => {
    if (!user) return null;
    return (
      db.addresses.find((a) => a.id === db.delivery.addressId) ??
      db.addresses.find((a) => a.userId === user.id && a.isDefault) ??
      null
    );
  }, [user]);

  const orders = useDbMemo(() => (user ? orderService.listForCustomer(user.id) : []), [user]);
  const liveOrders = useMemo(() => orders.filter((order) => order.status !== "delivered" && order.status !== "cancelled" && order.status !== "failed"), [orders]);

  const recommendations = useDbMemo(
    () =>
      recommendFoods({
        userId: user?.id ?? null,
        address: deliveryAddress,
        limit: 8,
      }),
    [user?.id, deliveryAddress],
  );

  const affinity = useDbMemo(() => cuisineAffinity(user?.id ?? null), [user?.id]);
  const affinityCuisines = useDbMemo(
    () =>
      affinity
        .map((item) => cuisineService.get(item.cuisineId))
        .filter((cuisine): cuisine is NonNullable<typeof cuisine> => Boolean(cuisine))
        .slice(0, 4),
    [affinity],
  );

  const nearYou = useDbMemo(() => {
    const all = foodService.listDecorated().filter((entry) => entry.food.isAvailable);
    if (!deliveryAddress) return all.slice(0, 8);
    return all
      .filter((entry) => distanceKm(deliveryAddress, entry.vendor) <= entry.vendor.deliveryRadiusKm)
      .slice(0, 8);
  }, [deliveryAddress]);

  const popular = useDbMemo(() => foodService.popular(8), []);
  const seasonal = useDbMemo(() => foodService.seasonal(4), []);

  const categories = useDbMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of foodService.listDecorated()) {
      if (!entry.food.isAvailable) continue;
      counts.set(entry.food.category, (counts.get(entry.food.category) ?? 0) + 1);
    }
    return [...counts.entries()].map(([value, count]) => ({ value, label: value, count }));
  }, []);

  const inCategory = useDbMemo(() => {
    const all = foodService.listDecorated().filter((e) => e.food.isAvailable);
    if (!category) return all.slice(0, 8);
    return all.filter((e) => e.food.category === category).slice(0, 8);
  }, [category]);

  const lifetimeSpend = orders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <DashboardContainer className="space-y-8">      {/* greeting: identity, address and the categories people pick most often,
          grouped into one panel so the top of the dashboard reads as a summary
          rather than a heading floating above a search box. */}
      <GlassCard intensity="cardStrong" className="rounded-[2rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={user?.fullName ?? "Guest"} src={user?.avatarUrl} className="size-14" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Hello
              </p>
              <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
                {user ? user.fullName.split(" ")[0] : "there"}
              </h1>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary-ink" aria-hidden />
                {deliveryAddress
                  ? `Delivering to ${deliveryAddress.label} · ${deliveryAddress.area}, ${deliveryAddress.city}`
                  : "Set a delivery address to see everything that can reach you."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LocationControl />
            <Link to="/foods">
              <Button size="md">
                Order food
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="no-scrollbar mt-5 flex gap-2.5 overflow-x-auto pb-1">
            {categories.slice(0, 7).map((item) => {
              const Icon = cuisineIcon(item.label);
              const active = category === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(active ? null : item.value)}
                  className={cn(
                    "flex w-[5.5rem] shrink-0 flex-col items-center gap-2 rounded-3xl border p-3 text-center transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "border-white/60 bg-white/60 backdrop-blur-xl hover:-translate-y-0.5 hover:bg-white/85",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-2xl",
                      active ? "bg-white/25" : "bg-primary/20 text-primary-ink",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="truncate text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] font-semibold opacity-70">
                    {item.count} {item.count === 1 ? "dish" : "dishes"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </GlassCard>

      <FoodSearchField />

      {/* live orders */}
      {liveOrders.length > 0 ? (
        <section>
          <SectionHeading
            title="On the way"
            subtitle="Track every stage from the kitchen to your door."
            action={
              <Link to="/app/orders">
                <Button size="sm" variant="outline">
                  All orders
                </Button>
              </Link>
            }
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {liveOrders.slice(0, 2).map((order) => (
              <GlassCard key={order.id} intensity="card" className="rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold">{order.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.items.length} item{order.items.length === 1 ? "" : "s"} ·{" "}
                      {formatNaira(order.total)}
                    </p>
                  </div>
                  <Badge tone="primary">
                    <Clock className="size-3" aria-hidden /> {order.etaMinutes} min
                  </Badge>
                </div>
                <div className="mt-3">
                  <StatusProgress status={order.status} />
                </div>
                <Link to={`/app/orders/${order.id}`} className="mt-3 inline-block">
                  <Button size="sm">
                    <Bike className="size-4" aria-hidden /> Track order
                  </Button>
                </Link>
              </GlassCard>
            ))}
          </div>
        </section>
      ) : null}

      {/* banners */}
      <BannerCarousel banners={banners} />

      {/* stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders placed" value={orders.length} icon={<Utensils className="size-4" aria-hidden />} />
        <StatCard
          label="Delivered"
          value={orders.filter((order) => order.status === "delivered").length}
          tone="success"
          icon={<Truck className="size-4" aria-hidden />}
        />
        <StatCard label="Lifetime spend" value={formatNaira(lifetimeSpend)} tone="primary" />
        <StatCard
          label="Saved dishes"
          value={db.favorites.filter((favorite) => favorite.userId === user?.id).length}
          tone="warning"
        />
      </div>

      {/* recommendations */}
      <section>
        <SectionHeading
          title="Recommended for you"
          subtitle="Built from your order history, favourites and dietary preferences. Each suggestion shows its reason."
          action={
            <Link to="/foods?sort=rating">
              <Button size="sm" variant="outline">
                Top rated <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          }
        />
        {recommendations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.slice(0, 4).map((recommendation) => (
              <div key={recommendation.entry.food.id} className="flex flex-col gap-2">
                <FoodCard entry={recommendation.entry} compact />
                <p className="flex items-start gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                  <TrendingUp className="mt-0.5 size-3 shrink-0 text-primary-ink" aria-hidden />
                  {recommendation.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing to recommend yet"
            message="Place your first order and recommendations will start to reflect your taste."
            action={
              <Link to="/foods">
                <Button>Browse dishes</Button>
              </Link>
            }
          />
        )}
      </section>

      {/* cuisine affinity */}
      {affinityCuisines.length > 0 ? (
        <section>
          <SectionHeading title="Your usual cuisines" subtitle="Based on what you have ordered before." />
          <div className="flex flex-wrap gap-2">
            {affinityCuisines.map((cuisine, index) => {
              const Icon = cuisineIcon(cuisine.name);
              return (
                <Link key={cuisine.id} to={`/foods?cuisine=${cuisine.id}`}>
                  <span className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/60 px-4 py-3 backdrop-blur transition-colors hover:bg-white/90">
                    <span
                      className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
                      aria-hidden
                    >
                      <Icon className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{cuisine.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        #{index + 1} most ordered
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* categories */}
      <section>
        <SectionHeading title="Browse by category" subtitle="Every category is managed by the merchant." />
        <CategoryChips items={categories} value={category} onChange={setCategory} allLabel="All dishes" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {inCategory.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} />
          ))}
        </div>
      </section>

      {/* near you */}
      <section>
        <SectionHeading
          title="Can reach you"
          subtitle={
            deliveryAddress
              ? `Within each kitchen's own delivery radius from ${deliveryAddress.area}.`
              : "Add a delivery address and we'll filter by each kitchen's delivery radius."
          }
        />
        {nearYou.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nearYou.slice(0, 4).map((entry) => (
              <FoodCard key={entry.food.id} entry={entry} compact />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<MapPin className="size-5" aria-hidden />}
            title="Nothing delivers to that address yet"
            message="No approved kitchen covers your selected location. Try another saved address."
          />
        )}
      </section>

      {/* popular */}
      <section>
        <SectionHeading title="Popular right now" subtitle="Marked popular by their own kitchens." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.slice(0, 4).map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} compact />
          ))}
        </div>
      </section>

      {/* seasonal */}
      {seasonal.length > 0 ? (
        <section>
          <SectionHeading
            title="Seasonal specials"
            subtitle="Promotional pricing published by the kitchens themselves."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {seasonal.map((entry) => (
              <FoodCard key={entry.food.id} entry={entry} />
            ))}
          </div>
        </section>
      ) : null}

      {/* footer note */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <Flame className="mt-0.5 size-5 shrink-0 text-brand-amber" aria-hidden />
          <div>
            <p className="text-sm font-bold">Good to know</p>
            <p className="text-xs text-muted-foreground">
              Minimum order {formatNaira(settings.minOrderValue)} · Platform fee{" "}
              {settings.feeType === "percentage"
                ? `${settings.feeValue}% of the food subtotal`
                : settings.feeType === "fixed"
                  ? `${formatNaira(settings.feeValue)} per order`
                  : `${formatNaira(settings.feeValue)} per item`}
              . Orders from more than one kitchen carry each kitchen's own delivery fee.
            </p>
          </div>
        </div>
        <Link to="/help#fees">
          <Button size="sm" variant="outline">
            How fees work
          </Button>
        </Link>
      </Card>
    </DashboardContainer>
  );
}
