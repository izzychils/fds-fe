import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Bike,
  Clock,
  DollarSign,
  Flame,
  ListChecks,
  Package,
  PlusCircle,
  Star,
  TrendingUp,
  Truck,
  Utensils,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  GlassCard,
  SectionHeading,
  StatCard,
  Switch,
} from "@/components/ui";
import { DashboardHeading, DevNotice } from "@/components/layout/dashboard";
import { StatusProgress } from "@/components/orders";
import { useAsyncAction, useSession, useTrackingTicker, useDbMemo } from "@/hooks";
import { foodService, isSoldOut, orderService, reviewService, riderService, trackingService, vendorService } from "@/services";
import { STATUS_META, isLive } from "@/lib/orders";
import { formatNaira, isSameDay, timeAgo } from "@/lib/utils";

export default function VendorOverviewPage() {
  const { user, vendor } = useSession();
  const { run, pending } = useAsyncAction();

  useTrackingTicker(true, 15000, () => trackingService.tick());

  const vendorId = vendor?.id ?? null;

  const orders = useDbMemo(
    () => (vendorId ? orderService.listForVendor(vendorId) : []),
    [vendorId],
  );
  const stats = useMemo(() => orderService.stats(orders), [orders]);

  const dishes = useDbMemo(() => (vendorId ? foodService.byVendor(vendorId) : []), [vendorId]);
  const riders = useDbMemo(() => (vendorId ? riderService.listForVendor(vendorId) : []), [vendorId]);
  const reviews = useDbMemo(() => (vendorId ? reviewService.byVendor(vendorId) : []), [vendorId]);
  const rating = useDbMemo(
    () => (vendorId ? reviewService.summaryForVendor(vendorId) : { rating: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }),
    [vendorId],
  );

  if (!user) return null;

  if (!vendor) {
    return (
      <EmptyState
        title="No kitchen linked to this account"
        message="Your account is not attached to a kitchen yet. Register a business to start selling."
        action={
          <Link to="/vendor-signup">
            <Button>Register a kitchen</Button>
          </Link>
        }
      />
    );
  }

  const todayOrders = orders.filter((order) => isSameDay(order.createdAt));
  const todayRevenue = todayOrders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + order.subtotal, 0);

  const liveOrders = orders.filter((order) => isLive(order.status));
  const lowStock = dishes.filter(
    (food) => food.stockCount !== null && food.stockCount <= food.lowStockThreshold,
  );
  const unanswered = reviews.filter((review) => !review.vendorReply);
  const unavailableDishes = dishes.filter((food) => !food.isAvailable || isSoldOut(food));

  return (
    <div className="space-y-6">
      <DashboardHeading
        title={`${vendor.name} dashboard`}
        description="Your kitchen only, you cannot see or modify another vendor's dishes, orders, riders or settings."
        action={
          <>
            <Link to="/vendor/menu/new">
              <Button>
                <PlusCircle className="size-4" aria-hidden /> Add a dish
              </Button>
            </Link>
            <Link to="/vendor/orders">
              <Button variant="outline">
                <Clock className="size-4" aria-hidden /> Manage orders
              </Button>
            </Link>
          </>
        }
      />

      {vendor.status !== "approved" ? (
        <DevNotice>
          <strong>Your kitchen is {vendor.status}.</strong>{" "}
          {vendor.status === "pending"
            ? "A merchant admin must approve it before your dishes appear on the marketplace. You can still build your menu in the meantime."
            : "Your kitchen has been suspended by the platform merchant. Contact support for details."}
        </DevNotice>
      ) : null}

      <GlassCard intensity="card" className="rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">
              {vendor.logoText}
            </span>
            <div>
              <p className="text-sm font-extrabold">{vendor.name}</p>
              <p className="text-xs text-muted-foreground">
                {vendor.area}, {vendor.city} · opens {vendor.openTime}–{vendor.closeTime}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Badge tone={vendor.status === "approved" ? "success" : "warning"}>{vendor.status}</Badge>
            <div className="min-w-52">
              <Switch
                checked={vendor.isOpen}
                disabled={pending}
                onChange={(next) =>
                  void run(() => vendorService.setOpen(vendor.id, next, user.id), {
                    success: next ? "Kitchen is now open" : "Kitchen is now closed",
                    silentError: true,
                  })
                }
                label="Accepting orders"
                description="Closing stops new orders but keeps your menu visible."
              />
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live orders"
          value={stats.live}
          hint={`${stats.pending} awaiting confirmation`}
          icon={<Clock className="size-4" aria-hidden />}
        />
        <StatCard
          label="Today's orders"
          value={todayOrders.length}
          hint={`${formatNaira(todayRevenue)} delivered today`}
          tone="info"
          icon={<TrendingUp className="size-4" aria-hidden />}
        />
        <StatCard
          label="Food revenue"
          value={formatNaira(stats.revenue)}
          hint={`${stats.delivered} delivered orders`}
          tone="success"
          icon={<DollarSign className="size-4" aria-hidden />}
        />
        <StatCard
          label="Rating"
          value={rating.count > 0 ? rating.rating.toFixed(1) : "None"}
          hint={`${rating.count} review${rating.count === 1 ? "" : "s"}`}
          tone="warning"
          icon={<Star className="size-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section>
            <SectionHeading
              title="Orders needing attention"
              subtitle="Every status change you make is visible to the customer immediately."
              action={
                <Link to="/vendor/orders">
                  <Button size="sm" variant="outline">
                    All orders
                  </Button>
                </Link>
              }
            />
            {liveOrders.length === 0 ? (
              <EmptyState
                title="No live orders right now"
                message="New orders appear here the moment a customer checks out."
              />
            ) : (
              <div className="space-y-3">
                {liveOrders.slice(0, 5).map((order) => (
                  <Card key={order.id} className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold">{order.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerName} · {timeAgo(order.createdAt)} ·{" "}
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="muted">{formatNaira(order.subtotal)}</Badge>
                        <Link to={`/vendor/orders/${order.id}`}>
                          <Button size="sm">Manage</Button>
                        </Link>
                      </div>
                    </div>
                    <StatusProgress status={order.vendorStatus[vendor.id] ?? order.status} />
                    <p className="text-xs text-muted-foreground">
                      {STATUS_META[order.vendorStatus[vendor.id] ?? order.status].description}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              title="Your best performing dishes"
              subtitle="Ordered most often across your history."
            />
            {dishes.length === 0 ? (
              <EmptyState
                title="No dishes yet"
                message="Publish your first dish to start receiving orders."
                action={
                  <Link to="/vendor/menu/new">
                    <Button>Add a dish</Button>
                  </Link>
                }
              />
            ) : (
              <Card className="divide-y divide-border">
                {dishes
                  .map((food) => {
                    const count = orders.reduce(
                      (sum, order) =>
                        sum + order.items.filter((item) => item.foodId === food.id).reduce((n, item) => n + item.quantity, 0),
                      0,
                    );
                    return { food, count };
                  })
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map(({ food, count }) => (
                    <div key={food.id} className="flex items-center gap-3 p-3">
                      <img src={food.image} alt="" className="size-11 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatNaira(food.price)} · {count} sold
                        </p>
                      </div>
                      {food.isPopular ? (
                        <Badge tone="primary">
                          <Flame className="size-3" aria-hidden /> popular
                        </Badge>
                      ) : null}
                      <Link to={`/vendor/menu/${food.id}/edit`}>
                        <Button size="sm" variant="ghost">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  ))}
              </Card>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section>
            <SectionHeading title="Inventory alerts" />
            {lowStock.length === 0 ? (
              <GlassCard intensity="base" className="rounded-2xl p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <BadgeCheck className="size-4" aria-hidden /> Stock levels look healthy
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dishes.filter((food) => food.stockCount !== null).length} dishes are tracked.
                </p>
              </GlassCard>
            ) : (
              <Card className="divide-y divide-border">
                {lowStock.map((food) => (
                  <div key={food.id} className="flex items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        threshold {food.lowStockThreshold}
                      </p>
                    </div>
                    <Badge tone={isSoldOut(food) ? "destructive" : "warning"}>
                      {food.stockCount} left
                    </Badge>
                  </div>
                ))}
              </Card>
            )}
            <Link to="/vendor/inventory" className="mt-2 inline-block">
              <Button size="sm" variant="outline">
                <Package className="size-3.5" aria-hidden /> Manage inventory
              </Button>
            </Link>
          </section>

          <section>
            <SectionHeading title="Riders" />
            <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4">
              <p className="text-sm">
                <strong>{riders.length}</strong> rider{riders.length === 1 ? "" : "s"} available to
                you
              </p>
              <p className="text-xs text-muted-foreground">
                {riders.filter((rider) => rider.vendorId === vendor.id).length} belong to your
                kitchen · {riders.filter((rider) => rider.vendorId === null).length} from the
                platform fleet
              </p>
              <Link to="/vendor/riders">
                <Button size="sm" variant="outline" fullWidth>
                  <Bike className="size-3.5" aria-hidden /> Manage riders
                </Button>
              </Link>
            </GlassCard>
          </section>

          <section>
            <SectionHeading title="Customer feedback" />
            {unanswered.length > 0 ? (
              <GlassCard intensity="card" className="space-y-2 rounded-2xl p-4">
                <p className="text-sm font-semibold">
                  {unanswered.length} review{unanswered.length === 1 ? "" : "s"} awaiting your reply
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  “{unanswered[0].comment}”
                </p>
                <Link to="/vendor/reviews">
                  <Button size="sm" fullWidth>
                    Reply now
                  </Button>
                </Link>
              </GlassCard>
            ) : (
              <GlassCard intensity="base" className="rounded-2xl p-4">
                <p className="text-sm font-semibold text-primary">
                  <BadgeCheck className="size-4 inline" aria-hidden /> Every review has a reply
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"} on your dishes.
                </p>
              </GlassCard>
            )}
          </section>

          <section>
            <SectionHeading title="Menu health" />
            <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4 text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Utensils className="size-3.5" aria-hidden /> Total dishes
                </span>
                <strong>{dishes.length}</strong>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Package className="size-3.5" aria-hidden /> Hidden or sold out
                </span>
                <strong>{unavailableDishes.length}</strong>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="size-3.5" aria-hidden /> On seasonal special
                </span>
                <strong>{dishes.filter((food) => food.isSeasonalSpecial).length}</strong>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="size-3.5" aria-hidden /> Delivery fee
                </span>
                <strong>{formatNaira(vendor.deliveryFee)}</strong>
              </p>
              <Link to="/vendor/delivery" className="block pt-1">
                <Button size="sm" variant="outline" fullWidth>
                  Delivery settings
                </Button>
              </Link>
            </GlassCard>
          </section>
        </div>
      </div>
    </div>
  );
}
