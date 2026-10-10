import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CreditCard,
  Landmark,
  MapPin,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import type { PaymentMethod } from "@/types";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  GlassCard,
  Input,
  SectionHeading,
  Textarea,
  useDisclosure,
} from "@/components/ui";
import { PageContainer } from "@/components/layout/public";
import { useAsyncAction, useDb, useSession, useDbMemo } from "@/hooks";
import {
  addressService,
  cartLineUnitPrice,
  cartService,
  createDevelopmentPaymentIntent,
  orderService,
  settingsService,
} from "@/services";
import { cn, distanceKm, formatNaira } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------------------------------------------ cart */

export function CartPage() {
  const db = useDb();
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const confirmClear = useDisclosure();

  const settings = settingsService.get();
  const items = db.cart;

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + cartLineUnitPrice(item) * item.quantity, 0);
    const groups = cartService.vendorGroups();
    const deliveryFee = groups.reduce((sum, group) => sum + group.deliveryFee, 0);
    const promo = appliedPromo
      ? settings.promoCodes.find((code) => code.code === appliedPromo)
      : undefined;
    const discount =
      promo && subtotal >= promo.minOrder ? Math.round((subtotal * promo.percentOff) / 100) : 0;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const platformFee =
      settings.feeType === "percentage"
        ? Math.round((subtotal * settings.feeValue) / 100)
        : settings.feeType === "fixed"
          ? Math.round(settings.feeValue)
          : Math.round(settings.feeValue * itemCount);
    return {
      subtotal,
      deliveryFee,
      platformFee,
      discount,
      total: Math.max(0, subtotal + deliveryFee + platformFee - discount),
    };
  }, [items, appliedPromo, settings]);

  const groups = cartService.vendorGroups();

  useEffect(() => {
    cartService.preview(settings);
  }, [db, settings]);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const promo = settings.promoCodes.find((entry) => entry.code === code);
    if (!promo || !promo.isActive) {
      setPromoError("That promo code is not valid.");
      return;
    }
    if (preview.subtotal < promo.minOrder) {
      setPromoError(`Code ${promo.code} needs a minimum order of ${formatNaira(promo.minOrder)}.`);
      return;
    }
    setPromoError(null);
    setAppliedPromo(promo.code);
    toast.success(`${promo.code} applied, ${promo.percentOff}% off`);
  };

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to see your cart"
          action={
            <Link to="/sign-in?next=/app/cart">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={<ShoppingBag className="size-5" aria-hidden />}
          title="Your cart is empty"
          message="Browse dishes and add something, you can customise proteins and extras before checking out."
          action={
            <Link to="/foods">
              <Button>Browse dishes</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <SectionHeading
        title="Your cart"
        subtitle={
          groups.length > 1
            ? `${groups.length} kitchens in this order. Each keeps its own delivery fee.`
            : "Review your items before checking out."
        }
        action={
          <Button variant="outline" size="sm" onClick={confirmClear.onOpen}>
            Empty cart
          </Button>
        }
      />

      {groups.length > 1 ? (
        <div className="rounded-2xl border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          This order spans <strong className="text-foreground">{groups.length} kitchens</strong>. They
          will be prepared and tracked separately, and each kitchen's delivery fee is charged
          individually, the total below reflects that.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.vendorId} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Store className="size-4 text-primary" aria-hidden />
                  <span className="text-sm font-bold">{group.vendor?.name ?? "Kitchen"}</span>
                  {group.vendor ? (
                    <Badge tone={group.vendor.isOpen ? "success" : "muted"}>
                      {group.vendor.isOpen ? "Open" : "Closed"}
                    </Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  <Truck className="mr-1 inline size-3.5" aria-hidden />
                  {formatNaira(group.deliveryFee)} delivery
                </span>
              </div>

              <ul className="divide-y divide-border">
                {group.items.map((item) => (
                  <li key={item.id} className="flex gap-3 p-4">
                    <img
                      src={item.image}
                      alt=""
                      className="size-20 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/foods/${item.foodId}`} className="text-sm font-bold hover:text-primary-ink">
                          {item.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            cartService.remove(item.id);
                            toast.success("Item removed");
                          }}
                          aria-label={`Remove ${item.name}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>

                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {item.sizeLabel ? <li>Size: {item.sizeLabel}</li> : null}
                        {item.proteins.length > 0 ? (
                          <li>
                            Protein: {item.proteins.map((p) => p.name).join(", ")}
                          </li>
                        ) : null}
                        {item.extras.length > 0 ? (
                          <li>Extras: {item.extras.map((e) => e.name).join(", ")}</li>
                        ) : null}
                        {item.instructions ? <li className="italic">“{item.instructions}”</li> : null}
                      </ul>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold">
                          {formatNaira(cartLineUnitPrice(item))} each
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Decrease quantity of ${item.name}`}
                            onClick={() =>
                              run(() => cartService.setQuantity(item.id, item.quantity - 1), {
                                silentError: true,
                              })
                            }
                          >
                            −
                          </Button>
                          <span className="min-w-6 text-center text-sm font-bold" aria-live="polite">
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Increase quantity of ${item.name}`}
                            onClick={() =>
                              run(() => cartService.setQuantity(item.id, item.quantity + 1), {
                                silentError: true,
                              })
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        {/* summary */}
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <GlassCard intensity="card" className="space-y-4 rounded-2xl p-4">
            <h2 className="text-sm font-bold">Order summary</h2>

            <div>
              <label htmlFor="promo" className="mb-1.5 block text-xs font-semibold">
                Promo code
              </label>
              <div className="flex gap-2">
                <Input
                  id="promo"
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                  placeholder="NMA10"
                  invalid={Boolean(promoError)}
                />
                <Button variant="outline" onClick={applyPromo}>
                  Apply
                </Button>
              </div>
              {promoError ? (
                <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
                  {promoError}
                </p>
              ) : appliedPromo ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary-ink">
                  <BadgeCheck className="size-3.5" aria-hidden /> {appliedPromo} applied
                </p>
              ) : null}
            </div>

            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatNaira(preview.subtotal)} />
              <Row
                label={`Delivery (${groups.length} ${groups.length === 1 ? "kitchen" : "kitchens"})`}
                value={formatNaira(preview.deliveryFee)}
              />
              <Row
                label="Platform fee"
                value={formatNaira(preview.platformFee)}
                hint={
                  settings.feeType === "percentage"
                    ? `${settings.feeValue}%`
                    : settings.feeType === "fixed"
                      ? "flat"
                      : "per item"
                }
              />
              {preview.discount > 0 ? (
                <Row label="Discount" value={`−${formatNaira(preview.discount)}`} />
              ) : null}
            </dl>

            <div className="flex items-baseline justify-between border-t border-white/50 pt-3">
              <span className="text-sm font-bold">Total</span>
              <span className="text-2xl font-extrabold">{formatNaira(preview.total)}</span>
            </div>

            {preview.subtotal < settings.minOrderValue ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800">
                Minimum order is {formatNaira(settings.minOrderValue)}. Add{" "}
                {formatNaira(settings.minOrderValue - preview.subtotal)} more to check out.
              </p>
            ) : null}

            <Button
              fullWidth
              size="lg"
              disabled={preview.subtotal < settings.minOrderValue}
              onClick={() => navigate(`/app/checkout${appliedPromo ? `?promo=${appliedPromo}` : ""}`)}
            >
              Continue to checkout
            </Button>
            <Link to="/foods">
              <Button fullWidth variant="ghost" size="sm">
                Add more dishes
              </Button>
            </Link>
          </GlassCard>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear.open}
        onClose={confirmClear.onClose}
        onConfirm={() => {
          cartService.clear();
          confirmClear.onClose();
          toast.success("Cart emptied");
        }}
        title="Empty your cart?"
        message="Every item will be removed. This cannot be undone."
        confirmLabel="Empty cart"
        pending={pending}
      />
    </PageContainer>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 text-[11px]">({hint})</span> : null}
      </dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------- checkout */

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof CreditCard;
}> = [
  { value: "card", label: "Card", description: "Debit or credit card", icon: CreditCard },
  { value: "transfer", label: "Bank transfer", description: "Transfer to the platform account", icon: Landmark },
  { value: "cash", label: "Cash on delivery", description: "Pay the rider when it arrives", icon: Wallet },
];

export function CheckoutPage() {
  const db = useDb();
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const settings = settingsService.get();

  const params = new URLSearchParams(window.location.search);
  const initialPromo = params.get("promo");

  const [addressId, setAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [promo] = useState<string | null>(initialPromo);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addresses = useDbMemo(() => (user ? addressService.list(user.id) : []), [user]);

  // Land on the address the customer already selected in the header.
  useEffect(() => {
    if (addressId) return;
    const fromCart = db.delivery.addressId;
    const fallback = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
    setAddressId(fromCart ?? fallback?.id ?? null);
  }, [addresses, addressId, db.delivery.addressId]);

  const items = db.cart;
  const groups = cartService.vendorGroups();

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + cartLineUnitPrice(item) * item.quantity, 0);
    const deliveryFee = groups.reduce((sum, group) => sum + group.deliveryFee, 0);
    const promoRecord = promo ? settings.promoCodes.find((entry) => entry.code === promo) : undefined;
    const discount =
      promoRecord && subtotal >= promoRecord.minOrder
        ? Math.round((subtotal * promoRecord.percentOff) / 100)
        : 0;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const platformFee =
      settings.feeType === "percentage"
        ? Math.round((subtotal * settings.feeValue) / 100)
        : settings.feeType === "fixed"
          ? Math.round(settings.feeValue)
          : Math.round(settings.feeValue * itemCount);
    return {
      subtotal,
      deliveryFee,
      platformFee,
      discount,
      total: Math.max(0, subtotal + deliveryFee + platformFee - discount),
    };
  }, [items, groups, promo, settings]);

  /** Warn when a kitchen cannot reach the chosen address. */
  const outOfRange = useMemo(() => {
    const address = addresses.find((entry) => entry.id === addressId);
    if (!address) return [];
    return groups
      .filter((group) => group.vendor && distanceKm(address, group.vendor) > group.vendor.deliveryRadiusKm)
      .map((group) => group.vendor?.name ?? "A kitchen");
  }, [addresses, addressId, groups]);

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to check out"
          action={
            <Link to="/sign-in?next=/app/checkout">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          title="Nothing to check out"
          message="Your cart is empty."
          action={
            <Link to="/foods">
              <Button>Browse dishes</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const placeOrder = async () => {
    setError(null);
    if (!addressId) {
      setError("Choose a delivery address.");
      return;
    }
    if (outOfRange.length > 0) {
      setError(
        `${outOfRange.join(", ")} cannot deliver to that address. Choose another address or remove those items.`,
      );
      return;
    }

    const order = await run(
      () =>
        orderService.checkout({
          user,
          items,
          addressId,
          paymentMethod,
          promoCode: promo,
          customerNote: note,
        }),
      { silentError: true },
    );

    if (!order) {
      setError("We couldn't place that order. Check your cart and try again.");
      return;
    }

    // Development payment transport — nothing is charged and the status stays
    // "pending" until a real provider confirms it server-side.
    const intent = await createDevelopmentPaymentIntent({ amount: order.total, orderId: order.id });
    toast.warning("Order placed, payment not yet confirmed", {
      description: `${intent.message} (${intent.provider})`,
      duration: 7000,
    });
    navigate(`/app/orders/${order.id}`, { replace: true });
  };

  return (
    <PageContainer className="space-y-6">
      <SectionHeading
        title="Checkout"
        subtitle="Confirm where it's going and how you'd like to pay."
        action={
          <Link to="/app/cart">
            <Button variant="outline" size="sm">
              Back to cart
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          {/* address */}
          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="size-4 text-primary" aria-hidden /> Delivery address
            </h2>
            {addresses.length === 0 ? (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">
                  You have no saved addresses yet.
                </p>
                <Link to="/app/profile" className="mt-2 inline-block">
                  <Button size="sm">Add an address</Button>
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {addresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    aria-pressed={addressId === address.id}
                    onClick={() => {
                      setAddressId(address.id);
                      cartService.setDelivery(address.id, "");
                    }}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      addressId === address.id
                        ? "border-primary bg-primary/8"
                        : "border-border hover:bg-accent/60",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold">{address.label}</span>
                      {address.isDefault ? <Badge tone="primary">Default</Badge> : null}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {address.line1}, {address.area}, {address.city}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <Link to="/app/profile" className="mt-3 inline-block text-xs font-semibold text-primary hover:underline">
              Manage addresses
            </Link>
          </Card>

          {/* payment */}
          <Card className="p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <CreditCard className="size-4 text-primary" aria-hidden /> Payment method
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  aria-pressed={paymentMethod === method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={cn(
                    "flex flex-col gap-1 rounded-2xl border p-3 text-left transition-colors",
                    paymentMethod === method.value
                      ? "border-primary bg-primary/8"
                      : "border-border hover:bg-accent/60",
                  )}
                >
                  <method.icon className="size-4 text-primary" aria-hidden />
                  <span className="text-sm font-bold">{method.label}</span>
                  <span className="text-[11px] text-muted-foreground">{method.description}</span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" aria-hidden />
              <p className="text-[11px] font-medium text-amber-800">
                No payment provider is connected in this build. Placing the order records it as{" "}
                <strong>payment pending</strong>, no card is charged and no transfer is verified. A
                production build must confirm payment server-side before treating an order as paid.
              </p>
            </div>
          </Card>

          {/* note */}
          <Card className="p-4">
            <Field
              label="Note for the kitchen"
              hint="Anything that applies to the whole order."
              htmlFor="checkout-note"
            >
              <Textarea
                id="checkout-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={240}
                placeholder="e.g. please knock rather than ring the bell"
              />
            </Field>
          </Card>
        </div>

        {/* summary */}
        <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
          <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
            <h2 className="text-sm font-bold">Order summary</h2>
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <img src={item.image} alt="" className="size-9 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 truncate">
                    {item.quantity}× {item.name}
                  </span>
                  <span className="font-semibold">
                    {formatNaira(cartLineUnitPrice(item) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-white/50 pt-3 text-sm">
              <Row label="Subtotal" value={formatNaira(totals.subtotal)} />
              <Row
                label={`Delivery (${groups.length})`}
                value={formatNaira(totals.deliveryFee)}
              />
              <Row label="Platform fee" value={formatNaira(totals.platformFee)} />
              {totals.discount > 0 ? (
                <Row label={`Discount ${promo ?? ""}`} value={`−${formatNaira(totals.discount)}`} />
              ) : null}
            </dl>
            <div className="flex items-baseline justify-between border-t border-white/50 pt-3">
              <span className="text-sm font-bold">Total</span>
              <span className="text-2xl font-extrabold">{formatNaira(totals.total)}</span>
            </div>

            {promo ? (
              <p className="flex items-center gap-1.5 text-xs text-primary">
                <Check className="size-3.5" aria-hidden /> {promo} applied
              </p>
            ) : null}

            {error ? (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}

            {outOfRange.length > 0 ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {outOfRange.join(", ")} cannot deliver to the selected address.
              </p>
            ) : null}

            <Button
              fullWidth
              size="lg"
              loading={pending}
              onClick={() => void placeOrder()}
              disabled={!addressId || outOfRange.length > 0}
            >
              Place order · {formatNaira(totals.total)}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              You can cancel while the order is pending or confirmed.
            </p>
          </GlassCard>
        </aside>
      </div>
    </PageContainer>
  );
}
