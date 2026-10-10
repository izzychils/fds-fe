import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Bike, Save, Store, Truck } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  GlassCard,
  Input,
  SectionHeading,
  Switch,
  Textarea,
} from "@/components/ui";
import { DashboardHeading } from "@/components/layout/dashboard";
import { RidersManager } from "@/features/managers/logistics";
import { ReviewsManager } from "@/features/managers/content";
import { useAsyncAction, useDb, useSession } from "@/hooks";
import { cuisineService, vendorService } from "@/services";
import { cn, formatNaira } from "@/lib/utils";

/* ------------------------------------------------------------ delivery */

export function VendorDeliveryPage() {
  const { user, vendor } = useSession();
  const { run, pending } = useAsyncAction();

  const [form, setForm] = useState(() => ({
    prepTimeMinutes: vendor?.prepTimeMinutes ?? 25,
    deliveryFee: vendor?.deliveryFee ?? 1500,
    deliveryRadiusKm: vendor?.deliveryRadiusKm ?? 10,
    openTime: vendor?.openTime ?? "09:00",
    closeTime: vendor?.closeTime ?? "21:00",
    deliveryNote: vendor?.deliveryNote ?? "",
    latitude: vendor?.latitude ?? 9.08,
    longitude: vendor?.longitude ?? 7.48,
    isOpen: vendor?.isOpen ?? false,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user || !vendor) {
    return (
      <EmptyState
        title="No kitchen linked"
        message="Register a kitchen to configure delivery."
        action={
          <Link to="/vendor-signup">
            <Button>Register a kitchen</Button>
          </Link>
        }
      />
    );
  }

  const save = async () => {
    const next: Record<string, string> = {};
    if (form.prepTimeMinutes < 5) next.prepTimeMinutes = "Preparation time must be at least 5 minutes.";
    if (form.deliveryFee < 0) next.deliveryFee = "The delivery fee cannot be negative.";
    if (form.deliveryRadiusKm <= 0) next.deliveryRadiusKm = "Set a radius above 0 km.";
    if (form.openTime >= form.closeTime) next.closeTime = "Closing time must be after opening time.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await run(() => vendorService.update(vendor.id, form, user.id), {
      success: "Delivery settings saved",
      silentError: true,
    });
  };

  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Delivery settings"
        description="You control your own timeline, fee and radius. These apply to your orders on every multi-vendor basket."
        action={
          <Button loading={pending} onClick={() => void save()}>
            <Save className="size-4" aria-hidden /> Save changes
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Truck className="size-4 text-primary" aria-hidden /> Timelines &amp; fees
          </h2>
          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              Some fields need attention.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label="Preparation time (min)"
              required
              error={errors.prepTimeMinutes}
              htmlFor="vd-prep"
            >
              <Input
                id="vd-prep"
                type="number"
                min={5}
                max={180}
                value={form.prepTimeMinutes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, prepTimeMinutes: Number(event.target.value) }))
                }
                invalid={Boolean(errors.prepTimeMinutes)}
              />
            </Field>
            <Field label="Delivery fee (₦)" required error={errors.deliveryFee} htmlFor="vd-fee">
              <Input
                id="vd-fee"
                type="number"
                min={0}
                step={100}
                value={form.deliveryFee}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, deliveryFee: Number(event.target.value) }))
                }
                invalid={Boolean(errors.deliveryFee)}
              />
            </Field>
            <Field label="Delivery radius (km)" required error={errors.deliveryRadiusKm} htmlFor="vd-radius">
              <Input
                id="vd-radius"
                type="number"
                min={1}
                max={80}
                value={form.deliveryRadiusKm}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, deliveryRadiusKm: Number(event.target.value) }))
                }
                invalid={Boolean(errors.deliveryRadiusKm)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens" required htmlFor="vd-open">
              <Input
                id="vd-open"
                type="time"
                value={form.openTime}
                onChange={(event) => setForm((prev) => ({ ...prev, openTime: event.target.value }))}
              />
            </Field>
            <Field label="Closes" required error={errors.closeTime} htmlFor="vd-close">
              <Input
                id="vd-close"
                type="time"
                value={form.closeTime}
                onChange={(event) => setForm((prev) => ({ ...prev, closeTime: event.target.value }))}
                invalid={Boolean(errors.closeTime)}
              />
            </Field>
          </div>

          <Field
            label="Delivery note"
            hint="Shown to customers on your dishes."
            htmlFor="vd-note"
          >
            <Textarea
              id="vd-note"
              value={form.deliveryNote}
              onChange={(event) => setForm((prev) => ({ ...prev, deliveryNote: event.target.value }))}
              placeholder="Free delivery on orders above ₦25,000 within Wuse II."
            />
          </Field>

          <Switch
            checked={form.isOpen}
            onChange={(next) => setForm((prev) => ({ ...prev, isOpen: next }))}
            label="Accepting orders now"
            description="Also toggled from your dashboard overview."
          />

          <Button loading={pending} onClick={() => void save()}>
            <Save className="size-4" aria-hidden /> Save delivery settings
          </Button>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <h2 className="text-sm font-bold">Business location</h2>
            <p className="text-xs text-muted-foreground">
              Used to calculate whether your kitchen can reach a customer's address. No geocoding
              provider is connected, so these coordinates are entered by you rather than resolved from
              the street address.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor="vd-lat">
                <Input
                  id="vd-lat"
                  type="number"
                  step="0.0001"
                  value={form.latitude}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, latitude: Number(event.target.value) }))
                  }
                />
              </Field>
              <Field label="Longitude" htmlFor="vd-lng">
                <Input
                  id="vd-lng"
                  type="number"
                  step="0.0001"
                  value={form.longitude}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, longitude: Number(event.target.value) }))
                  }
                />
              </Field>
            </div>
            <p className="text-sm">
              <strong>{vendor.address}</strong>
              <br />
              {vendor.area}, {vendor.city}, {vendor.state}
            </p>
            <Link to="/vendor/settings">
              <Button size="sm" variant="outline">
                Edit address in kitchen profile
              </Button>
            </Link>
          </Card>

          <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4 text-sm">
            <h2 className="text-sm font-bold">How customers see this</h2>
            <p className="text-xs text-muted-foreground">
              A customer sees a {form.prepTimeMinutes} minute preparation time and a{" "}
              {formatNaira(form.deliveryFee)} delivery fee, and only sees your dishes if their address
              is within {form.deliveryRadiusKm} km.
            </p>
            <p className="text-xs text-muted-foreground">
              Orders that span several kitchens charge each kitchen's own fee separately, so your fee
              is never applied to another vendor's food.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- riders */

export function VendorRidersPage() {
  const { vendor } = useSession();
  if (!vendor) {
    return <EmptyState title="No kitchen linked" message="Register a kitchen to manage riders." />;
  }
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Riders"
        description="Add, edit, activate and assign your own riders. Platform-fleet riders can also be assigned to your orders."
        action={
          <Badge tone="info">
            <Bike className="size-3" aria-hidden /> {vendor.name} fleet + platform fleet
          </Badge>
        }
      />
      <RidersManager scope="vendor" />
    </div>
  );
}

/* ------------------------------------------------------------- reviews */

export function VendorReviewsPage() {
  const { vendor } = useSession();
  if (!vendor) {
    return <EmptyState title="No kitchen linked" message="Register a kitchen to see reviews." />;
  }
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Customer reviews"
        description="Reviews on your dishes only. Reply publicly, your response appears under the review for everyone."
      />
      <ReviewsManager scope="vendor" vendorId={vendor.id} />
    </div>
  );
}

/* ----------------------------------------------------- kitchen profile */

export function VendorSettingsPage() {
  const db = useDb();
  const { user, vendor } = useSession();
  const { run, pending } = useAsyncAction();

  const [form, setForm] = useState(() => ({
    name: vendor?.name ?? "",
    tagline: vendor?.tagline ?? "",
    description: vendor?.description ?? "",
    address: vendor?.address ?? "",
    area: vendor?.area ?? "",
    city: vendor?.city ?? "",
    state: vendor?.state ?? "",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    logoText: vendor?.logoText ?? "",
    coverImage: vendor?.coverImage ?? "/foods/venue-dining.jpg",
    cuisineIds: vendor?.cuisineIds ?? [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!user || !vendor) {
    return (
      <EmptyState
        title="No kitchen linked"
        message="Register a kitchen to edit its profile."
        action={
          <Link to="/vendor-signup">
            <Button>Register a kitchen</Button>
          </Link>
        }
      />
    );
  }

  const coverOptions = [
    vendor.coverImage,
    "/foods/venue-dining.jpg",
    "/foods/venue-patio.jpg",
    "/foods/party-burger-platter.jpg",
    "/foods/burger-wings-fries.jpg",
    "/foods/sandwich-platter.jpg",
    "/foods/pepperoni-pizza.jpg",
    "/foods/birria-tacos.jpg",
  ].filter((value, index, array) => array.indexOf(value) === index);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Your kitchen needs a name.";
    if (!form.tagline.trim()) next.tagline = "Add a tagline customers will see.";
    if (form.description.trim().length < 20) next.description = "Write at least 20 characters.";
    if (!form.address.trim()) next.address = "Enter the street address.";
    if (!form.area.trim()) next.area = "Enter the area.";
    if (!form.city.trim()) next.city = "Enter the city.";
    if (!form.state.trim()) next.state = "Enter the state.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await run(() => vendorService.update(vendor.id, form, user.id), {
      success: "Kitchen profile saved",
      silentError: true,
    });
  };

  const dishCount = db.foods.filter((food) => food.vendorId === vendor.id).length;

  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Kitchen profile"
        description="This is what customers see on your dishes. Changes save immediately and appear on the marketplace."
        action={
          <Button loading={pending} onClick={() => void save()}>
            <Save className="size-4" aria-hidden /> Save profile
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Store className="size-4 text-primary" aria-hidden /> Business details
          </h2>
          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              Some fields need attention.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kitchen name" required error={errors.name} htmlFor="vp-name">
              <Input
                id="vp-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                invalid={Boolean(errors.name)}
              />
            </Field>
            <Field label="Logo initials" hint="Two or three characters." htmlFor="vp-logo">
              <Input
                id="vp-logo"
                value={form.logoText}
                maxLength={4}
                onChange={(event) => setForm((prev) => ({ ...prev, logoText: event.target.value }))}
              />
            </Field>
          </div>

          <Field label="Tagline" required error={errors.tagline} htmlFor="vp-tagline">
            <Input
              id="vp-tagline"
              value={form.tagline}
              onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
              invalid={Boolean(errors.tagline)}
            />
          </Field>

          <Field label="About your kitchen" required error={errors.description} htmlFor="vp-desc">
            <Textarea
              id="vp-desc"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              invalid={Boolean(errors.description)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="vp-phone">
              <Input
                id="vp-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </Field>
            <Field label="Email" required error={errors.email} htmlFor="vp-email">
              <Input
                id="vp-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                invalid={Boolean(errors.email)}
              />
            </Field>
          </div>

          <Field label="Street address" required error={errors.address} htmlFor="vp-address">
            <Input
              id="vp-address"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              invalid={Boolean(errors.address)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Area" required error={errors.area} htmlFor="vp-area">
              <Input
                id="vp-area"
                value={form.area}
                onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                invalid={Boolean(errors.area)}
              />
            </Field>
            <Field label="City" required error={errors.city} htmlFor="vp-city">
              <Input
                id="vp-city"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                invalid={Boolean(errors.city)}
              />
            </Field>
            <Field label="State" required error={errors.state} htmlFor="vp-state">
              <Input
                id="vp-state"
                value={form.state}
                onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
                invalid={Boolean(errors.state)}
              />
            </Field>
          </div>

          <Button loading={pending} onClick={() => void save()}>
            <Save className="size-4" aria-hidden /> Save kitchen profile
          </Button>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">Cover photo</h2>
            <div className="grid grid-cols-4 gap-2">
              {coverOptions.map((image) => (
                <button
                  key={image}
                  type="button"
                  aria-pressed={form.coverImage === image}
                  onClick={() => setForm((prev) => ({ ...prev, coverImage: image }))}
                  className={cn(
                    "overflow-hidden rounded-xl border-2 transition-all",
                    form.coverImage === image ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={image} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">Cuisines you cook</h2>
            <p className="text-xs text-muted-foreground">
              Selecting a cuisine makes your dishes appear under that filter on the marketplace.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cuisineService.listActive().map((cuisine) => {
                const active = form.cuisineIds.includes(cuisine.id);
                return (
                  <button
                    key={cuisine.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        cuisineIds: active
                          ? prev.cuisineIds.filter((id) => id !== cuisine.id)
                          : [...prev.cuisineIds, cuisine.id],
                      }))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      active ? "border-primary bg-primary/12 text-primary" : "border-border hover:bg-accent",
                    )}
                  >
                    <span aria-hidden>{cuisine.emoji} </span>
                    {cuisine.name}
                  </button>
                );
              })}
            </div>
            <Button
              size="sm"
              variant="outline"
              loading={pending}
              onClick={() => void run(() => vendorService.update(vendor.id, { cuisineIds: form.cuisineIds }, user.id), { success: "Cuisines saved", silentError: true })}
            >
              Save cuisines
            </Button>
          </Card>

          <GlassCard intensity="base" className="space-y-2 rounded-2xl p-4 text-sm">
            <h2 className="text-sm font-bold">Status</h2>
            <p className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <BadgeCheck className="size-3.5" aria-hidden /> Approval
              </span>
              <Badge tone={vendor.status === "approved" ? "success" : "warning"}>{vendor.status}</Badge>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Dishes published</span>
              <strong>{dishCount}</strong>
            </p>
            <p className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Slug</span>
              <strong className="font-mono text-xs">/{vendor.slug}</strong>
            </p>
            <SectionHeading
              title=""
              subtitle="Approval status can only be changed by a platform merchant admin."
              className="mb-0"
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
