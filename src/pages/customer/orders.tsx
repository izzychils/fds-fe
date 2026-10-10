import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageSquare, Receipt, RotateCcw, Star, Store } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  GlassCard,
  SectionHeading,
  Tab,
  Tabs,
  TabsList,
  TabPanel,
  useDisclosure,
} from "@/components/ui";
import { OrderCard, StatusActions, StatusTimeline, TrackingPanel } from "@/components/orders";
import { PageContainer } from "@/components/layout/public";
import { ReviewForm } from "@/components/reviews";
import { useAsyncAction, useDb, useSession, useTrackingTicker, useDbMemo } from "@/hooks";
import { orderService, reviewService, settingsService, trackingService } from "@/services";
import { formatDateTime, formatNaira } from "@/lib/utils";
import { isLive } from "@/lib/orders";
import { toast } from "sonner";

/* ------------------------------------------------------------------ list */

export function CustomerOrdersPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const [tab, setTab] = useState("active");

  // Advance the development courier simulation while the page is open.
  useTrackingTicker(true, 8000, () => trackingService.tick());

  const orders = useDbMemo(() => (user ? orderService.listForCustomer(user.id) : []), [user]);

  const active = orders.filter((order) => isLive(order.status));
  const completed = orders.filter((order) => order.status === "delivered");
  const stopped = orders.filter((order) => order.status === "cancelled" || order.status === "failed");

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to see your orders"
          action={
            <Link to="/sign-in?next=/app/orders">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const reorder = (orderId: string) =>
    run(() => orderService.reorder(orderId, user.id), {
      success: "Items added back to your cart",
      onSuccess: () => navigate("/app/cart"),
    });

  return (
    <PageContainer className="space-y-6">
      <SectionHeading
        title="Your orders"
        subtitle="Every order keeps its full status history, including how it was prepared and delivered."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <Tab value="active">Active ({active.length})</Tab>
          <Tab value="completed">Completed ({completed.length})</Tab>
          <Tab value="stopped">Cancelled ({stopped.length})</Tab>
        </TabsList>

        {(["active", "completed", "stopped"] as const).map((key) => {
          const list = key === "active" ? active : key === "completed" ? completed : stopped;
          return (
            <TabPanel key={key} value={key}>
              {list.length === 0 ? (
                <EmptyState
                  icon={<Receipt className="size-5" aria-hidden />}
                  title={
                    key === "active"
                      ? "No active orders"
                      : key === "completed"
                        ? "No completed orders yet"
                        : "Nothing cancelled"
                  }
                  message={
                    key === "active"
                      ? "When you place an order it appears here with live tracking."
                      : "Your history will build up as you order."
                  }
                  action={
                    <Link to="/foods">
                      <Button>Browse dishes</Button>
                    </Link>
                  }
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {list.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      to={`/app/orders/${order.id}`}
                      footer={
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/app/orders/${order.id}`}>
                            <Button size="sm" variant="outline">
                              {isLive(order.status) ? "Track order" : "View details"}
                            </Button>
                          </Link>
                          {order.status === "delivered" ? (
                            <Button size="sm" variant="ghost" disabled={pending} onClick={() => void reorder(order.id)}>
                              <RotateCcw className="size-3.5" aria-hidden /> Reorder
                            </Button>
                          ) : null}
                        </div>
                      }
                    />
                  ))}
                </div>
              )}
            </TabPanel>
          );
        })}
      </Tabs>
    </PageContainer>
  );
}

/* ---------------------------------------------------------------- detail */

export function CustomerOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const db = useDb();
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const cancelDialog = useDisclosure();
  const reviewDialog = useDisclosure();

  const [reviewTarget, setReviewTarget] = useState<{ foodId: string; name: string } | null>(null);

  const order = useDbMemo(() => (orderId ? orderService.get(orderId) : null), [orderId]);
  const rider = useMemo(
    () => (order?.riderId ? db.riders.find((r) => r.id === order.riderId) ?? null : null),
    [db, order],
  );
  const settings = settingsService.get();

  // Make sure the simulated route exists so the map has something to draw.
  useEffect(() => {
    if (order && order.trackingPath.length === 0 && isLive(order.status)) {
      trackingService.ensurePath(order.id);
    }
  }, [order]);

  useTrackingTicker(Boolean(order && order.status === "out_for_delivery"), 8000, () =>
    trackingService.tick(),
  );

  const existingReviews = useDbMemo(
    () => (order && user ? reviewService.byUser(user.id).filter((r) => r.orderId === order.id) : []),
    [order, user],
  );

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to view this order"
          action={
            <Link to="/sign-in">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer>
        <EmptyState
          icon={<Receipt className="size-5" aria-hidden />}
          title="Order not found"
          message="That order reference doesn't exist, or it belongs to another account."
          action={
            <Link to="/app/orders">
              <Button>Back to my orders</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (order.customerId !== user.id && user.role === "customer") {
    return (
      <PageContainer>
        <EmptyState
          title="That isn't your order"
          message="You can only view orders placed on your own account."
          action={
            <Link to="/app/orders">
              <Button>Back to my orders</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/orders")}>
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Order {order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDateTime(order.createdAt)} · {order.items.length} item
            {order.items.length === 1 ? "" : "s"} · {order.items[0]?.vendorName}
            {order.vendorIds.length > 1 ? ` +${order.vendorIds.length - 1} more` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.status === "delivered" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void run(() => orderService.reorder(order.id, user.id), {
                  success: "Items added back to your cart",
                  onSuccess: () => navigate("/app/cart"),
                });
              }}
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reorder
            </Button>
          ) : null}
          <Link to="/help#tracking">
            <Button variant="ghost" size="sm">
              Need help?
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {isLive(order.status) ? <TrackingPanel order={order} rider={rider} /> : null}

          <Card className="p-4">
            <h2 className="mb-4 text-sm font-bold">Status history</h2>
            <StatusTimeline order={order} />
          </Card>

          <Card className="overflow-hidden">
            <h2 className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-bold">
              Items in this order
            </h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 p-4">
                  <img
                    src={item.image}
                    alt=""
                    className="size-16 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link to={`/foods/${item.foodId}`} className="text-sm font-bold hover:text-primary">
                        {item.quantity}× {item.name}
                      </Link>
                      <span className="text-sm font-extrabold">{formatNaira(item.lineTotal)}</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Store className="size-3" aria-hidden /> {item.vendorName}
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {item.sizeLabel ? <li>Size: {item.sizeLabel}</li> : null}
                      {item.proteins.length > 0 ? (
                        <li>Protein: {item.proteins.map((p) => `${p.name} (+${formatNaira(p.price)})`).join(", ")}</li>
                      ) : null}
                      {item.extras.length > 0 ? (
                        <li>Extras: {item.extras.map((e) => `${e.name} (+${formatNaira(e.price)})`).join(", ")}</li>
                      ) : null}
                      {item.instructions ? <li className="italic">“{item.instructions}”</li> : null}
                    </ul>
                    {order.status === "delivered" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                        onClick={() => {
                          setReviewTarget({ foodId: item.foodId, name: item.name });
                          reviewDialog.onOpen();
                        }}
                      >
                        <Star className="size-3.5" aria-hidden />
                        {existingReviews.some((r) => r.foodId === item.foodId)
                          ? "Reviewed"
                          : "Write a review"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {order.vendorNote ? (
            <GlassCard intensity="card" className="rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <MessageSquare className="size-3.5" aria-hidden /> Note from the kitchen
              </p>
              <p className="mt-1 text-sm">{order.vendorNote}</p>
            </GlassCard>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
            <h2 className="text-sm font-bold">Delivery</h2>
            <p className="text-xs text-muted-foreground">
              {order.address.label} · {order.address.line1}, {order.address.area}, {order.address.city}
            </p>
            {order.address.landmark ? (
              <p className="text-xs text-muted-foreground">Landmark: {order.address.landmark}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">Phone: {order.customerPhone}</p>
            {rider ? (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-xs font-bold">Rider: {rider.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rider.vehicle} · {rider.plateNumber}
                </p>
                <a href={`tel:${rider.phone.replace(/\s/g, "")}`} className="mt-1 block text-xs font-semibold text-primary">
                  {rider.phone}
                </a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No rider assigned yet.</p>
            )}
          </GlassCard>

          <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4">
            <h2 className="text-sm font-bold">Payment summary</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-semibold">{formatNaira(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-semibold">{formatNaira(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  Platform fee
                  <span className="ml-1 text-[11px]">
                    (
                    {order.feeSnapshot.type === "percentage"
                      ? `${order.feeSnapshot.value}%`
                      : order.feeSnapshot.type === "fixed"
                        ? "flat"
                        : "per item"}
                    )
                  </span>
                </dt>
                <dd className="font-semibold">{formatNaira(order.platformFee)}</dd>
              </div>
              {order.discount > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Discount {order.promoCode ?? ""}</dt>
                  <dd className="font-semibold">−{formatNaira(order.discount)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="flex items-baseline justify-between border-t border-white/50 pt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-xl font-extrabold">{formatNaira(order.total)}</span>
            </div>
            <Badge tone={order.paymentStatus === "paid" ? "success" : "warning"}>
              Payment {order.paymentStatus}
            </Badge>
            <p className="text-[11px] text-muted-foreground">
              {order.paymentStatus === "paid"
                ? "Confirmed by the payment provider."
                : "No payment provider is connected in this build, nothing has been charged."}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Platform fee policy in force:{" "}
              {order.feeSnapshot.type === "percentage"
                ? `${order.feeSnapshot.value}% of the food subtotal`
                : order.feeSnapshot.type === "fixed"
                  ? `${formatNaira(order.feeSnapshot.value)} per order`
                  : `${formatNaira(order.feeSnapshot.value)} per item`}
              . Changing the policy later does not alter this order.
            </p>
          </GlassCard>

          {isLive(order.status) ? (
            <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
              <h2 className="text-sm font-bold">Manage this order</h2>
              <StatusActions
                order={order}
                pending={pending}
                cancelLabel="Cancel order"
                onTransition={(status, allowed) => {
                  if (!allowed) {
                    toast.error("That status change isn't valid from here.");
                    return;
                  }
                  if (status === "cancelled") {
                    cancelDialog.onOpen();
                    return;
                  }
                  void run(
                    () =>
                      orderService.transition({
                        orderId: order.id,
                        to: status,
                        actor: user,
                      }),
                    { success: "Order updated" },
                  );
                }}
              />
            </GlassCard>
          ) : null}

          <p className="text-center text-[11px] text-muted-foreground">
            Minimum order {formatNaira(settings.minOrderValue)} ·{" "}
            {settings.defaultDeliveryMinutes} min average delivery
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={cancelDialog.open}
        onClose={cancelDialog.onClose}
        onConfirm={() => {
          void run(
            () =>
              orderService.transition({
                orderId: order.id,
                to: "cancelled",
                actor: user,
                note: "Cancelled by the customer",
              }),
            { success: "Order cancelled" },
          );
          cancelDialog.onClose();
        }}
        title={`Cancel order ${order.id}?`}
        message="The kitchen has been notified. Orders can only be cancelled before preparation begins."
        confirmLabel="Yes, cancel it"
        pending={pending}
      />

      {reviewTarget ? (
        <ReviewForm
          open={reviewDialog.open}
          onClose={() => {
            reviewDialog.onClose();
            setReviewTarget(null);
          }}
          dishName={reviewTarget.name}
          pending={pending}
          initial={existingReviews.find((r) => r.foodId === reviewTarget.foodId) ?? null}
          onSubmit={(input) => {
            void run(
              () => reviewService.create(user, order.id, { ...input, foodId: reviewTarget.foodId }),
              {
                success: "Review published",
                onSuccess: () => {
                  reviewDialog.onClose();
                  setReviewTarget(null);
                },
              },
            );
          }}
          onUpdate={(input) => {
            const existing = existingReviews.find((r) => r.foodId === reviewTarget.foodId);
            if (!existing) return;
            void run(() => reviewService.update(existing.id, input, user), {
              success: "Review updated",
              onSuccess: () => {
                reviewDialog.onClose();
                setReviewTarget(null);
              },
            });
          }}
        />
      ) : null}
    </PageContainer>
  );
}
