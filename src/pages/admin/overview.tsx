import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BadgePercent,
  Bike,
  ClipboardList,
  DollarSign,
  History,
  Image as ImageIcon,
  Star,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  GlassCard,
  SectionHeading,
  StatCard,
} from "@/components/ui";
import { DashboardHeading, DevNotice } from "@/components/layout/dashboard";
import { StatusBadge } from "@/components/orders";
import { useDb, useTrackingTicker, useDbMemo } from "@/hooks";
import {
  auditService,
  bannerService,
  orderService,
  reviewService,
  riderService,
  trackingService,
  vendorService,
} from "@/services";
import { isSameDay, formatNaira, timeAgo } from "@/lib/utils";
import { isLive } from "@/lib/orders";

export default function AdminOverviewPage() {
  const db = useDb();

  useTrackingTicker(true, 15000, () => trackingService.tick());

  const orders = useDbMemo(() => orderService.list(), []);
  const stats = useMemo(() => orderService.stats(orders), [orders]);
  const vendors = useDbMemo(() => vendorService.list(), []);
  const riders = useDbMemo(() => riderService.list(), []);
  const reviews = useDbMemo(() => reviewService.list(), []);
  const banners = useDbMemo(() => bannerService.list(), []);
  const audit = useDbMemo(() => auditService.list(6), []);

  const pendingVendors = vendors.filter((vendor) => vendor.status === "pending");
  const customers = db.users.filter((user) => user.role === "customer");
  const todayOrders = orders.filter((order) => isSameDay(order.createdAt));
  const todayRevenue = todayOrders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + order.subtotal, 0);
  const grossFoodValue = orders
    .filter((order) => order.status === "delivered")
    .reduce((sum, order) => sum + order.subtotal, 0);
  const platformEarnings = orders.reduce((sum, order) => sum + order.platformFee, 0);

  const averageRating = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const topVendors = vendors
    .map((vendor) => {
      const vendorOrders = orders.filter((order) => order.vendorIds.includes(vendor.id));
      const revenue = vendorOrders
        .filter((order) => order.status === "delivered")
        .reduce((sum, order) => sum + order.subtotal, 0);
      return { vendor, orderCount: vendorOrders.length, revenue };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const liveOrders = orders.filter((order) => isLive(order.status)).slice(0, 6);

  return (
    <div className="space-y-6">
      <DashboardHeading
        title="Merchant console"
        description="Platform-wide oversight of kitchens, orders, riders, content and fees. Dishes, proteins, extras and riders can be managed for any kitchen from this console."
        action={
          <>
            <Link to="/admin/orders">
              <Button>
                <ClipboardList className="size-4" aria-hidden /> All orders
              </Button>
            </Link>
            <Link to="/admin/vendors">
              <Button variant="outline">
                <Store className="size-4" aria-hidden /> Kitchens
              </Button>
            </Link>
          </>
        }
      />

      {pendingVendors.length > 0 ? (
        <DevNotice>
          <strong>
            {pendingVendors.length} kitchen application{pendingVendors.length === 1 ? "" : "s"}
          </strong>{" "}
          awaiting review. Approve them from the Kitchens screen before they can sell.
        </DevNotice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live orders"
          value={stats.live}
          hint={`${todayOrders.length} placed today`}
          icon={<ClipboardList className="size-4" aria-hidden />}
        />
        <StatCard
          label="Food value delivered"
          value={formatNaira(grossFoodValue)}
          hint={`${formatNaira(todayRevenue)} today`}
          tone="success"
          icon={<DollarSign className="size-4" aria-hidden />}
        />
        <StatCard
          label="Platform fees"
          value={formatNaira(platformEarnings)}
          hint={`${stats.total} orders with a recorded policy`}
          tone="primary"
          icon={<BadgePercent className="size-4" aria-hidden />}
        />
        <StatCard
          label="Average rating"
          value={averageRating > 0 ? averageRating.toFixed(1) : "—"}
          hint={`${reviews.length} reviews across the platform`}
          tone="warning"
          icon={<Star className="size-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section>
            <SectionHeading
              title="Orders in progress across every kitchen"
              subtitle="The shared status model means what you see here is exactly what the customer and vendor see."
              action={
                <Link to="/admin/orders">
                  <Button size="sm" variant="outline">
                    Manage all orders
                  </Button>
                </Link>
              }
            />
            {liveOrders.length === 0 ? (
              <EmptyState title="No live orders" message="Orders appear here as soon as customers check out." />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {liveOrders.map((order) => (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold">{order.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.customerName} · {order.vendorIds.length} kitchen
                          {order.vendorIds.length === 1 ? "" : "s"} · {timeAgo(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={order.status} />
                        <span className="text-sm font-bold">{formatNaira(order.total)}</span>
                        <Link to={`/admin/orders/${order.id}`}>
                          <Button size="sm" variant="outline">
                            Open
                          </Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <SectionHeading title="Kitchen performance" subtitle="By delivered food value." />
            {topVendors.length === 0 ? (
              <EmptyState title="No kitchens yet" />
            ) : (
              <Card className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {topVendors.map(({ vendor, orderCount, revenue }) => (
                    <li key={vendor.id} className="flex flex-wrap items-center gap-3 p-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xs font-extrabold text-primary">
                        {vendor.logoText}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendor.area}, {vendor.city} · {orderCount} orders
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            vendor.status === "approved"
                              ? "success"
                              : vendor.status === "pending"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {vendor.status}
                        </Badge>
                        <span className="text-sm font-bold">{formatNaira(revenue)}</span>
                        <Link to="/admin/vendors">
                          <Button size="sm" variant="ghost">
                            Review
                          </Button>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section>
            <SectionHeading
              title="Recent merchant activity"
              subtitle="Administrative changes are logged with the actor and time."
              action={
                <Link to="/admin/audit">
                  <Button size="sm" variant="outline">
                    Full log
                  </Button>
                </Link>
              }
            />
            {audit.length === 0 ? (
              <EmptyState
                icon={<History className="size-5" aria-hidden />}
                title="Nothing logged yet"
                message="Approvals, banner edits, rider changes and fee updates are recorded here."
              />
            ) : (
              <Card className="divide-y divide-border">
                {audit.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{entry.target}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{entry.action}</span> · {entry.actorName} ·{" "}
                        {timeAgo(entry.at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{entry.detail}</span>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section>
            <SectionHeading title="Platform snapshot" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <StatCard
                label="Kitchens"
                value={`${vendors.filter((v) => v.status === "approved").length} live`}
                hint={`${vendors.length} registered · ${pendingVendors.length} pending`}
                icon={<Store className="size-4" aria-hidden />}
              />
              <StatCard
                label="Customers"
                value={customers.length}
                hint={`${db.users.length} total accounts`}
                tone="info"
                icon={<Users className="size-4" aria-hidden />}
              />
              <StatCard
                label="Riders"
                value={riders.filter((rider) => rider.isActive).length}
                hint={`${riders.filter((r) => r.vendorId === null).length} platform fleet`}
                tone="warning"
                icon={<Bike className="size-4" aria-hidden />}
              />
              <StatCard
                label="Carousel banners"
                value={banners.filter((banner) => banner.isActive).length}
                hint={`${banners.length} configured`}
                tone="primary"
                icon={<ImageIcon className="size-4" aria-hidden />}
              />
            </div>
          </section>

          <section>
            <SectionHeading title="Revenue split" />
            <GlassCard intensity="card" className="space-y-2 rounded-2xl p-4 text-sm">
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Food subtotal</span>
                <strong>{formatNaira(grossFoodValue)}</strong>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Platform fees collected</span>
                <strong className="text-primary">{formatNaira(platformEarnings)}</strong>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Delivery fees charged</span>
                <strong>
                  {formatNaira(orders.reduce((sum, order) => sum + order.deliveryFee, 0))}
                </strong>
              </p>
              <p className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Discounts given</span>
                <strong>−{formatNaira(orders.reduce((sum, order) => sum + order.discount, 0))}</strong>
              </p>
              <p className="flex items-center justify-between gap-2 border-t border-white/50 pt-2">
                <span className="font-semibold">Gross order value</span>
                <strong className="text-lg">{formatNaira(orders.reduce((sum, order) => sum + order.total, 0))}</strong>
              </p>
              <p className="text-[11px] text-muted-foreground">
                No payment provider is connected: these figures describe orders recorded in the local
                development datastore, not settled money.
              </p>
            </GlassCard>
          </section>

          <section>
            <SectionHeading title="Needs your attention" />
            <div className="space-y-3">
              {pendingVendors.length > 0 ? (
                <GlassCard intensity="card" className="space-y-2 rounded-2xl p-4">
                  <p className="text-sm font-bold">
                    {pendingVendors.length} kitchen application
                    {pendingVendors.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pendingVendors.map((vendor) => vendor.name).join(", ")}
                  </p>
                  <Link to="/admin/vendors">
                    <Button size="sm" fullWidth>
                      Review applications
                    </Button>
                  </Link>
                </GlassCard>
              ) : null}
              {stats.pending > 0 ? (
                <GlassCard intensity="card" className="space-y-2 rounded-2xl p-4">
                  <p className="text-sm font-bold">{stats.pending} order(s) awaiting confirmation</p>
                  <p className="text-xs text-muted-foreground">
                    Kitchens have not accepted these yet.
                  </p>
                  <Link to="/admin/orders">
                    <Button size="sm" variant="outline" fullWidth>
                      Open order board
                    </Button>
                  </Link>
                </GlassCard>
              ) : null}
              {reviews.filter((review) => review.isHidden).length > 0 ? (
                <GlassCard intensity="card" className="space-y-2 rounded-2xl p-4">
                  <p className="text-sm font-bold">
                    {reviews.filter((review) => review.isHidden).length} hidden review
                    {reviews.filter((review) => review.isHidden).length === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hidden reviews are excluded from public ratings.
                  </p>
                  <Link to="/admin/reviews">
                    <Button size="sm" variant="outline" fullWidth>
                      Review moderation
                    </Button>
                  </Link>
                </GlassCard>
              ) : null}
              <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <TrendingUp className="size-4 text-primary" aria-hidden /> Tip
                </p>
                <p className="text-xs text-muted-foreground">
                  Open the storefront in a second browser tab while you operate this console — status
                  changes propagate between same-origin tabs in real time.
                </p>
              </GlassCard>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
