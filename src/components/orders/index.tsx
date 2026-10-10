import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bike,
  Check,
  ChefHat,
  CircleSlash,
  Clock,
  MapPin,
  Navigation,
  Package,
  Phone,
  Receipt,
  Store,
  Truck,
  User,
} from "lucide-react";
import type { Order, OrderStatus, Rider } from "@/types";
import { Badge, Button, Card, GlassCard, type Tone } from "@/components/ui";
import { cn, formatDateTime, formatNaira } from "@/lib/utils";
import {
  FULFILMENT_FLOW,
  STATUS_META,
  canTransition,
  isCancelable,
  isLive,
  progressPercent,
} from "@/lib/orders";
import { MAP_PROVIDER, MAP_PROVIDER_LABEL } from "@/services/map";
import { trackingService } from "@/services/orders";

/* ------------------------------------------------------------------ badge */

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone as Tone} className={className}>
      {status === "delivered" ? <Check className="size-3" aria-hidden /> : null}
      {status === "cancelled" || status === "failed" ? (
        <CircleSlash className="size-3" aria-hidden />
      ) : null}
      {meta.label}
    </Badge>
  );
}

/* --------------------------------------------------------------- progress */

export function StatusProgress({ status }: { status: OrderStatus }) {
  const percent = progressPercent(status);
  const failed = status === "cancelled" || status === "failed";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>{STATUS_META[status].label}</span>
        <span className="text-muted-foreground">{failed ? "Stopped" : `${percent}%`}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Order progress"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            failed ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- timeline */

export function StatusTimeline({ order }: { order: Order }) {
  const reached = new Map(order.timeline.map((event) => [event.status, event]));
  const stopped = order.status === "cancelled" || order.status === "failed";

  return (
    <ol className="relative space-y-0">
      {FULFILMENT_FLOW.map((status, index) => {
        const event = reached.get(status);
        const meta = STATUS_META[status];
        const isCurrent = order.status === status;
        const done = Boolean(event);
        const upcoming = !done && !stopped;
        return (
          <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
            {index < FULFILMENT_FLOW.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[13px] top-7 h-full w-0.5",
                  done ? "bg-primary/40" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px]",
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                    ? "border-primary/40 bg-primary/12 text-primary"
                    : "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-bold",
                  upcoming && "text-muted-foreground",
                  isCurrent && "text-primary",
                )}
              >
                {meta.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {event ? `${formatDateTime(event.at)} · ${event.note}` : meta.description}
              </p>
            </div>
          </li>
        );
      })}

      {stopped ? (
        <li className="flex gap-3 pt-1">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-destructive bg-destructive text-destructive-foreground">
            <CircleSlash className="size-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-bold text-destructive">{STATUS_META[order.status].label}</p>
            <p className="text-xs text-muted-foreground">
              {order.timeline.filter((e) => e.status === order.status).slice(-1)[0]?.note ??
                STATUS_META[order.status].description}
            </p>
          </div>
        </li>
      ) : null}
    </ol>
  );
}

export function StatusStrip({ status }: { status: OrderStatus }) {
  const activeIndex = FULFILMENT_FLOW.indexOf(status);
  return (
    <ol className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1" aria-label="Order stages">
      {FULFILMENT_FLOW.map((step, index) => (
        <li
          key={step}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            index <= activeIndex
              ? "border-primary/30 bg-primary/12 text-primary"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {STATUS_META[step].label}
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------- order card */

export function OrderCard({
  order,
  to,
  footer,
  showVendor = true,
}: {
  order: Order;
  to?: string;
  footer?: React.ReactNode;
  showVendor?: boolean;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold">{order.id}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="space-y-3 p-4">
        <ul className="flex flex-wrap gap-2">
          {order.items.slice(0, 4).map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <img
                src={item.image}
                alt=""
                className="size-10 rounded-lg object-cover"
                loading="lazy"
              />
              <span className="text-xs">
                <span className="block font-semibold">
                  {item.quantity}× {item.name}
                </span>
                {showVendor ? (
                  <span className="block text-muted-foreground">{item.vendorName}</span>
                ) : null}
              </span>
            </li>
          ))}
          {order.items.length > 4 ? (
            <li className="self-center text-xs font-semibold text-muted-foreground">
              +{order.items.length - 4} more
            </li>
          ) : null}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {order.address.label} · {order.address.area}
          </span>
          <span className="font-extrabold">{formatNaira(order.total)}</span>
        </div>

        {isLive(order.status) ? <StatusProgress status={order.status} /> : null}
      </div>
    </>
  );

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      {/*
        The summary is one link; the footer is rendered OUTSIDE it. The footer
        carries its own links and buttons: an anchor inside an anchor is invalid
        DOM (React reports it) and breaks the keyboard tab order.
      */}
      {to ? (
        <Link
          to={to}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </Link>
      ) : (
        content
      )}
      {footer ? (
        <div className="border-t border-border bg-muted/20 px-4 py-3">{footer}</div>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------- money panel */

export function OrderTotals({ order, feeBasis }: { order: Order; feeBasis?: string }) {
  const rows: Array<[string, string, string?]> = [
    ["Subtotal", formatNaira(order.subtotal)],
    ["Delivery fees", formatNaira(order.deliveryFee)],
    [
      "Platform fee",
      formatNaira(order.platformFee),
      feeBasis ?? `${order.feeSnapshot.type === "percentage" ? `${order.feeSnapshot.value}%` : order.feeSnapshot.type === "fixed" ? `₦${order.feeSnapshot.value} flat` : `₦${order.feeSnapshot.value} per item`}`,
    ],
  ];
  if (order.discount > 0) {
    rows.push([`Promo ${order.promoCode ?? ""}`.trim(), `−${formatNaira(order.discount)}`]);
  }
  return (
    <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4">
      <h3 className="text-sm font-bold">Payment summary</h3>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, value, hint]) => (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">
              {label}
              {hint ? <span className="ml-1 text-[11px]">({hint})</span> : null}
            </dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-baseline justify-between border-t border-white/50 pt-2">
        <span className="text-sm font-bold">Total</span>
        <span className="text-xl font-extrabold">{formatNaira(order.total)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Payment status: <strong>{order.paymentStatus}</strong>
        {order.paymentReference ? ` · ref ${order.paymentReference}` : ""}
        {order.paymentStatus !== "paid"
          ? ", no payment provider is connected in this build, so nothing has been charged."
          : ""}
      </p>
    </GlassCard>
  );
}

/* --------------------------------------------------------------- tracking */

/**
 * Delivery tracking.
 *
 * When a tile provider is configured (default: OpenStreetMap's keyless embed)
 * a REAL map is rendered inside the panel. The courier's position, however, is
 * produced by the development simulator, so the panel always labels it as
 * simulated and never presents it as live GPS. If the map cannot load, the
 * fallback progress strip still communicates the delivery stage.
 */
export function TrackingPanel({ order, rider }: { order: Order; rider: Rider | null }) {
  const [showMap, setShowMap] = useState(true);
  const vendor = order.items[0];
  const percent = Math.round(trackingService.progress(order) * 100);
  const point = trackingService.currentPoint(order);
  const mapReady = MAP_PROVIDER !== "none" && point !== null;

  const src =
    mapReady && point
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${point.longitude - 0.02}%2C${point.latitude - 0.015}%2C${point.longitude + 0.02}%2C${point.latitude + 0.015}&layer=mapnik&marker=${point.latitude}%2C${point.longitude}`
      : "";

  return (
    <GlassCard intensity="card" className="overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Navigation className="size-4 text-primary" aria-hidden />
          <h3 className="text-sm font-bold">Delivery tracking</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={mapReady ? "info" : "muted"}>{mapReady ? MAP_PROVIDER_LABEL : "No map provider"}</Badge>
          <Badge tone="warning">Position simulated</Badge>
          {mapReady ? (
            <Button size="sm" variant="ghost" onClick={() => setShowMap((prev) => !prev)}>
              {showMap ? "Hide map" : "Show map"}
            </Button>
          ) : null}
        </div>
      </div>

      {mapReady && showMap ? (
        <div className="relative h-56 w-full bg-muted sm:h-72">
          <iframe
            title={`Map of the delivery route for order ${order.id}`}
            src={src}
            loading="lazy"
            className="h-full w-full border-0"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-xl bg-white/85 px-3 py-2 text-[11px] font-medium backdrop-blur">
            The map tiles are real. The courier marker is a development simulation, no GPS
            provider is connected to this build.
          </div>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            {mapReady
              ? "Map hidden. Use “Show map” to reopen it."
              : "No map tile provider is configured, so a status view is shown instead."}
          </p>
        </div>
      )}

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span>{STATUS_META[order.status].label}</span>
            <span className="text-muted-foreground">{percent}% of the route</span>
          </div>
          <div className="relative">
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${Math.max(3, percent)}%` }}
              />
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <li className="flex flex-col items-center gap-1 text-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Store className="size-3.5" aria-hidden />
                </span>
                <span className="font-semibold">{vendor?.vendorName ?? "Kitchen"}</span>
                <span className="text-muted-foreground">Picked up</span>
              </li>
              <li className="flex flex-col items-center gap-1 text-center">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full",
                    rider ? "tracker-pulse bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Bike className="size-3.5" aria-hidden />
                </span>
                <span className="font-semibold">{rider ? rider.name : "Rider pending"}</span>
                <span className="text-muted-foreground">On the move</span>
              </li>
              <li className="flex flex-col items-center gap-1 text-center">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <MapPin className="size-3.5" aria-hidden />
                </span>
                <span className="font-semibold">{order.address.label}</span>
                <span className="text-muted-foreground">{order.address.area}</span>
              </li>
            </ul>
          </div>
        </div>

        <dl className="grid gap-2 sm:grid-cols-2">
          <Detail icon={<Clock className="size-3.5" aria-hidden />} label="Estimated arrival">
            {isLive(order.status) ? `${order.etaMinutes} minutes` : "Completed"}
          </Detail>
          <Detail icon={<Package className="size-3.5" aria-hidden />} label="Deliver to">
            {order.address.line1}, {order.address.area}
          </Detail>
          <Detail icon={<Truck className="size-3.5" aria-hidden />} label="Delivery fee">
            {formatNaira(order.deliveryFee)}
          </Detail>
          <Detail icon={<Receipt className="size-3.5" aria-hidden />} label="Last update">
            {formatDateTime(order.updatedAt)}
          </Detail>
        </dl>

        {rider ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                <User className="size-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold">{rider.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rider.vehicle} · {rider.plateNumber} · {rider.deliveriesCompleted} deliveries
                </p>
              </div>
            </div>
            <a href={`tel:${rider.phone.replace(/\s/g, "")}`}>
              <Button size="sm" variant="outline">
                <Phone className="size-3.5" aria-hidden /> Call rider
              </Button>
            </a>
          </div>
        ) : null}
      </div>
    </GlassCard>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold">{children}</dd>
    </div>
  );
}

/* ----------------------------------------------------------- status actions */

/**
 * Advance/stop controls. The buttons offered are derived from the SAME
 * transition table the service validates against, so the UI can never offer an
 * illegal jump, and the service rejects one anyway if it is called directly.
 */
export function StatusActions({
  order,
  vendorId,
  pending,
  onTransition,
  cancelLabel = "Cancel order",
}: {
  order: Order;
  vendorId?: string | null;
  pending?: boolean;
  onTransition: (status: OrderStatus, allowed: boolean) => void;
  cancelLabel?: string;
}) {
  const current = vendorId ? order.vendorStatus[vendorId] ?? order.status : order.status;
  const next = FULFILMENT_FLOW[FULFILMENT_FLOW.indexOf(current) + 1];
  const canAdvance = next ? canTransition(current, next) : false;

  if (!isLive(current)) {
    return (
      <p className="text-xs text-muted-foreground">
        This order has reached a final state and can no longer be changed.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canAdvance ? (
        <Button
          size="sm"
          loading={pending}
          onClick={() => onTransition(next, canTransition(current, next))}
        >
          {next === "confirmed" ? <ChefHat className="size-4" aria-hidden /> : null}
          Mark as {STATUS_META[next].label.toLowerCase()}
        </Button>
      ) : null}
      {isCancelable(current) ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => onTransition("cancelled", canTransition(current, "cancelled"))}
        >
          <CircleSlash className="size-4" aria-hidden />
          {cancelLabel}
        </Button>
      ) : null}
      {!canAdvance && !isCancelable(current) ? (
        <p className="text-xs text-muted-foreground">
          No further status changes are available from “{STATUS_META[current].label}”.
        </p>
      ) : null}
    </div>
  );
}
