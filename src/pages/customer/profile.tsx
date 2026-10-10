import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Heart,
  KeyRound,
  Leaf,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import type { Address, DietaryPreference, Review } from "@/types";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  GlassCard,
  Input,
  Modal,
  SectionHeading,
  Tab,
  Tabs,
  TabsList,
  TabPanel,
  useDisclosure,
} from "@/components/ui";
import { UserProfileSidebar } from "@/components/ui/menu";
import { FoodCard } from "@/components/food";
import { PageContainer } from "@/components/layout/public";
import { ReviewForm, ReviewItem } from "@/components/reviews";
import { useAsyncAction, useDb, useSession, useDbMemo } from "@/hooks";
import {
  addressService,
  authService,
  cuisineService,
  favoriteService,
  foodService,
  reviewService,
} from "@/services";
import { DIETARY_PREFERENCES } from "@/types";
import { cn, formatDate, initialsAvatar } from "@/lib/utils";
import { toast } from "sonner";

/* --------------------------------------------------------------- profile */

/** The profile sections. They double as URL hashes so the sidebar can link to them. */
const PROFILE_TABS = ["details", "addresses", "preferences", "reviews", "security"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function tabFromHash(): ProfileTab {
  const hash = window.location.hash.replace("#", "");
  return (PROFILE_TABS as readonly string[]).includes(hash) ? (hash as ProfileTab) : "details";
}

export function CustomerProfilePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();
  const [tab, setTab] = useState<ProfileTab>(() => tabFromHash());

  // The account sidebar navigates with in-page hashes (#addresses, #security…),
  // so keep the open section in step with the URL.
  useEffect(() => {
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const selectTab = (next: ProfileTab) => {
    setTab(next);
    // Replace instead of push so switching sections does not stack history.
    window.history.replaceState(null, "", `#${next}`);
  };

  const [form, setForm] = useState(() => ({
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const addressDialog = useDisclosure();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "Home",
    line1: "",
    area: "",
    city: "",
    state: "",
    landmark: "",
    latitude: "",
    longitude: "",
  });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});

  const addresses = useDbMemo(() => (user ? addressService.list(user.id) : []), [user]);
  const myReviews = useDbMemo(() => (user ? reviewService.byUser(user.id) : []), [user]);

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to view your profile"
          action={
            <Link to="/sign-in?next=/app/profile">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const saveProfile = async () => {
    setFormError(null);
    if (!form.fullName.trim()) {
      setFormError("Enter your full name.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    const updated = await run(() => authService.updateProfile(user.id, form, user.id), {
      success: "Profile updated",
      silentError: true,
    });
    if (updated) setSavedAt(new Date().toISOString());
    else setFormError("We couldn't save those details. Another account may use that email.");
  };

  const changePassword = async () => {
    const errors: Record<string, string> = {};
    if (passwordForm.next.length < 8) errors.next = "Use at least 8 characters.";
    if (passwordForm.next !== passwordForm.confirm) errors.confirm = "Passwords do not match.";
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const result = await run(
      () =>
        authService.changePassword(
          user.id,
          passwordForm.current,
          passwordForm.next,
          passwordForm.confirm,
          user.id,
        ),
      { success: "Password changed", silentError: true },
    );
    if (result !== null) setPasswordForm({ current: "", next: "", confirm: "" });
    else setPasswordErrors({ current: "Your current password is incorrect." });
  };

  const openAddressDialog = (address: Address | null) => {
    setEditingAddress(address);
    setAddressErrors({});
    setAddressForm(
      address
        ? {
            label: address.label,
            line1: address.line1,
            area: address.area,
            city: address.city,
            state: address.state,
            landmark: address.landmark ?? "",
            latitude: String(address.latitude),
            longitude: String(address.longitude),
          }
        : { label: "Home", line1: "", area: "", city: "", state: "", landmark: "", latitude: "", longitude: "" },
    );
    addressDialog.onOpen();
  };

  const saveAddress = async () => {
    const errors: Record<string, string> = {};
    if (!addressForm.line1.trim()) errors.line1 = "Enter the street address.";
    if (!addressForm.area.trim()) errors.area = "Enter the area.";
    if (!addressForm.city.trim()) errors.city = "Enter the city.";
    if (!addressForm.state.trim()) errors.state = "Enter the state.";
    setAddressErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Coordinates are only recorded when the customer actually supplies them.
    const latitude = addressForm.latitude ? Number(addressForm.latitude) : 9.082;
    const longitude = addressForm.longitude ? Number(addressForm.longitude) : 7.475;

    const result = await run(
      () =>
        editingAddress
          ? addressService.update(
              editingAddress.id,
              {
                label: addressForm.label,
                line1: addressForm.line1,
                area: addressForm.area,
                city: addressForm.city,
                state: addressForm.state,
                landmark: addressForm.landmark,
                latitude,
                longitude,
              },
              user.id,
            )
          : addressService.create(user.id, {
              label: addressForm.label,
              line1: addressForm.line1,
              area: addressForm.area,
              city: addressForm.city,
              state: addressForm.state,
              landmark: addressForm.landmark,
              latitude,
              longitude,
            }),
      { success: editingAddress ? "Address updated" : "Address added", silentError: true },
    );
    if (result) {
      addressDialog.onClose();
      setEditingAddress(null);
    } else {
      setAddressErrors({ line1: "We couldn't save that address. Check the fields and try again." });
    }
  };

  return (
    <PageContainer className="space-y-6">
      <SectionHeading
        title="Your profile"
        subtitle="Everything here is editable and reflected across the app immediately."
      />

      <GlassCard intensity="card" className="flex flex-wrap items-center gap-4 rounded-2xl p-4">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
          {user.fullName
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold">{user.fullName}</p>
          <p className="text-sm text-muted-foreground">
            {user.email} · {user.phone}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Member since {formatDate(user.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">
            <UserIcon className="size-3" aria-hidden /> Customer
          </Badge>
          {savedAt ? (
            <Badge tone="success">
              <BadgeCheck className="size-3" aria-hidden /> Saved
            </Badge>
          ) : null}
        </div>
      </GlassCard>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        {/* Desktop account nav, the same sections as the tab strip below,
            presented as a sidebar with animated entry. */}
        <UserProfileSidebar
          className="sticky top-24 hidden lg:flex"
          user={{
            name: user.fullName,
            email: user.email,
            avatarUrl: initialsAvatar(user.fullName),
          }}
          navItems={[
            { label: "Your details", href: "#details", icon: <UserIcon className="h-full w-full" /> },
            { label: "Delivery addresses", href: "#addresses", icon: <MapPin className="h-full w-full" /> },
            { label: "Food preferences", href: "#preferences", icon: <Leaf className="h-full w-full" /> },
            { label: "My reviews", href: "#reviews", icon: <Star className="h-full w-full" /> },
            { label: "Security", href: "#security", icon: <ShieldCheck className="h-full w-full" />, isSeparator: true },
          ]}
          logoutItem={{
            label: "Sign out",
            icon: <LogOut className="h-full w-full" />,
            onClick: () => {
              authService.signOut();
              toast.success("Signed out");
              navigate("/");
            },
          }}
        />

        <Tabs value={tab} onValueChange={(next) => selectTab(next as ProfileTab)}>
        <TabsList>
          <Tab value="details">Details</Tab>
          <Tab value="addresses">Addresses ({addresses.length})</Tab>
          <Tab value="preferences">Preferences</Tab>
          <Tab value="reviews">My reviews ({myReviews.length})</Tab>
          <Tab value="security">Security</Tab>
        </TabsList>

        <TabPanel value="details">
          <Card className="max-w-2xl space-y-4 p-5">
            {formError ? (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {formError}
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required htmlFor="profile-name">
                <Input
                  id="profile-name"
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
              </Field>
              <Field
                label="Phone number"
                required
                hint="Your rider uses this to reach you."
                htmlFor="profile-phone"
              >
                <Input
                  id="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </Field>
            </div>
            <Field label="Email address" required htmlFor="profile-email">
              <Input
                id="profile-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button loading={pending} onClick={() => void saveProfile()}>
                Save changes
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setForm({ fullName: user.fullName, email: user.email, phone: user.phone })
                }
              >
                Reset
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Profile photographs are not supported in this build, no media storage provider is
              connected.
            </p>
          </Card>
        </TabPanel>

        <TabPanel value="addresses">
          <div className="space-y-4">
            <Button onClick={() => openAddressDialog(null)}>
              <Plus className="size-4" aria-hidden /> Add address
            </Button>

            {addresses.length === 0 ? (
              <EmptyState
                icon={<MapPin className="size-5" aria-hidden />}
                title="No saved addresses"
                message="Add one so we can match you with kitchens that can actually deliver to you."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => (
                  <Card key={address.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-bold">
                          {address.label}
                          {address.isDefault ? <Badge tone="primary">Default</Badge> : null}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {address.line1}
                          <br />
                          {address.area}, {address.city}, {address.state}
                        </p>
                        {address.landmark ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Landmark: {address.landmark}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openAddressDialog(address)}
                          aria-label={`Edit ${address.label}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingAddress(address)}
                          aria-label={`Delete ${address.label}`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!address.isDefault ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void run(() => addressService.setDefault(address.id, user.id), {
                              success: "Default address updated",
                            })
                          }
                        >
                          Make default
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          addressService.setDefault(address.id, user.id);
                          toast.success(`Delivering to ${address.label}`);
                          navigate("/foods");
                        }}
                      >
                        Deliver here
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabPanel>

        <TabPanel value="preferences">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-bold">Dietary preferences</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Used as a hard filter by the recommendation engine and shown on dish cards.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_PREFERENCES.map((preference) => {
                  const active = user.dietaryPreferences.includes(preference);
                  return (
                    <button
                      key={preference}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        void run(
                          () =>
                            authService.updateProfile(
                              user.id,
                              {
                                dietaryPreferences: active
                                  ? user.dietaryPreferences.filter((p) => p !== preference)
                                  : ([...user.dietaryPreferences, preference] as DietaryPreference[]),
                              },
                              user.id,
                            ),
                          { success: "Preferences updated", silentError: true },
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        active ? "border-primary bg-primary/12 text-primary" : "border-border hover:bg-accent",
                      )}
                    >
                      {preference}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div>
                <h2 className="text-sm font-bold">Favourite cuisines</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Boosted in recommendations. Your order history adds to these automatically.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {cuisineService.listActive().map((cuisine) => {
                  const active = user.favoriteCuisineIds.includes(cuisine.id);
                  return (
                    <button
                      key={cuisine.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        void run(
                          () =>
                            authService.updateProfile(
                              user.id,
                              {
                                favoriteCuisineIds: active
                                  ? user.favoriteCuisineIds.filter((id) => id !== cuisine.id)
                                  : [...user.favoriteCuisineIds, cuisine.id],
                              },
                              user.id,
                            ),
                          { success: "Preferences updated", silentError: true },
                        )
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
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="reviews">
          <ReviewsTab reviews={myReviews} />
        </TabPanel>

        <TabPanel value="security">
          <Card className="max-w-lg space-y-4 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-primary" aria-hidden />
              <div>
                <h2 className="text-sm font-bold">Change password</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Development credentials are stored in your browser only and are not suitable for
                  production.
                </p>
              </div>
            </div>
            <Field label="Current password" required error={passwordErrors.current} htmlFor="pw-current">
              <Input
                id="pw-current"
                type="password"
                value={passwordForm.current}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, current: event.target.value }))
                }
                invalid={Boolean(passwordErrors.current)}
              />
            </Field>
            <Field label="New password" required error={passwordErrors.next} htmlFor="pw-next">
              <Input
                id="pw-next"
                type="password"
                value={passwordForm.next}
                onChange={(event) => setPasswordForm((prev) => ({ ...prev, next: event.target.value }))}
                invalid={Boolean(passwordErrors.next)}
              />
            </Field>
            <Field label="Confirm new password" required error={passwordErrors.confirm} htmlFor="pw-confirm">
              <Input
                id="pw-confirm"
                type="password"
                value={passwordForm.confirm}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))
                }
                invalid={Boolean(passwordErrors.confirm)}
              />
            </Field>
            <Button loading={pending} onClick={() => void changePassword()}>
              <KeyRound className="size-4" aria-hidden /> Update password
            </Button>
          </Card>
        </TabPanel>
        </Tabs>
      </div>

      {/* address dialog */}
      <Modal
        open={addressDialog.open}
        onClose={addressDialog.onClose}
        title={editingAddress ? "Edit address" : "Add a delivery address"}
        description="Used to match you with kitchens inside their delivery radius."
        footer={
          <>
            <Button variant="outline" onClick={addressDialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void saveAddress()}>
              {editingAddress ? "Save address" : "Add address"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Label" hint="For example Home, Work or Mum's place." htmlFor="addr-label">
            <Input
              id="addr-label"
              value={addressForm.label}
              onChange={(event) => setAddressForm((prev) => ({ ...prev, label: event.target.value }))}
            />
          </Field>
          <Field label="Street address" required error={addressErrors.line1} htmlFor="addr-line1">
            <Input
              id="addr-line1"
              value={addressForm.line1}
              onChange={(event) => setAddressForm((prev) => ({ ...prev, line1: event.target.value }))}
              invalid={Boolean(addressErrors.line1)}
              placeholder="12B Kumasi Crescent"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Area" required error={addressErrors.area} htmlFor="addr-area">
              <Input
                id="addr-area"
                value={addressForm.area}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, area: event.target.value }))}
                invalid={Boolean(addressErrors.area)}
                placeholder="Wuse II"
              />
            </Field>
            <Field label="City" required error={addressErrors.city} htmlFor="addr-city">
              <Input
                id="addr-city"
                value={addressForm.city}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))}
                invalid={Boolean(addressErrors.city)}
              />
            </Field>
            <Field label="State" required error={addressErrors.state} htmlFor="addr-state">
              <Input
                id="addr-state"
                value={addressForm.state}
                onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value }))}
                invalid={Boolean(addressErrors.state)}
              />
            </Field>
          </div>
          <Field label="Landmark" hint="Optional, helps the rider find you." htmlFor="addr-landmark">
            <Input
              id="addr-landmark"
              value={addressForm.landmark}
              onChange={(event) => setAddressForm((prev) => ({ ...prev, landmark: event.target.value }))}
              placeholder="Opposite Sahad Stores"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Latitude"
              hint="Optional. No geocoding provider is connected, so we never guess coordinates."
              htmlFor="addr-lat"
            >
              <Input
                id="addr-lat"
                type="number"
                step="0.0001"
                value={addressForm.latitude}
                onChange={(event) =>
                  setAddressForm((prev) => ({ ...prev, latitude: event.target.value }))
                }
                placeholder="9.0801"
              />
            </Field>
            <Field label="Longitude" hint="Optional." htmlFor="addr-lng">
              <Input
                id="addr-lng"
                type="number"
                step="0.0001"
                value={addressForm.longitude}
                onChange={(event) =>
                  setAddressForm((prev) => ({ ...prev, longitude: event.target.value }))
                }
                placeholder="7.4788"
              />
            </Field>
          </div>
          {!addressForm.latitude || !addressForm.longitude ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-800">
              Without coordinates we use the city centre for distance estimates. Set{" "}
              <code className="font-mono">VITE_GEOCODING_URL</code> and connect a provider for real
              address lookup.
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAddress)}
        onClose={() => setDeletingAddress(null)}
        onConfirm={() => {
          if (!deletingAddress) return;
          void run(() => addressService.remove(deletingAddress.id, user.id), {
            success: "Address removed",
          });
          setDeletingAddress(null);
        }}
        title={`Delete “${deletingAddress?.label ?? ""}”?`}
        message="This address will be removed from your saved list. Orders already placed keep their original address."
        confirmLabel="Delete address"
        pending={pending}
      />
    </PageContainer>
  );
}

/* ---------------------------------------------------------- reviews tab */

function ReviewsTab({ reviews }: { reviews: Review[] }) {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<Star className="size-5" aria-hidden />}
        title="You haven't written any reviews"
        message="Once an order is delivered you can rate the dish and attach photos."
        action={
          <Link to="/app/orders">
            <Button>View my orders</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <ReviewItem
          key={review.id}
          review={review}
          currentUser={user}
          onEdit={(target) => setEditing(target)}
          onDelete={(target) => setDeleting(target)}
        />
      ))}

      {editing && user ? (
        <ReviewForm
          open
          onClose={() => setEditing(null)}
          dishName={db.foods.find((food) => food.id === editing.foodId)?.name ?? "dish"}
          initial={editing}
          pending={pending}
          onUpdate={(input) => {
            void run(() => reviewService.update(editing.id, input, user), {
              success: "Review updated",
              onSuccess: () => setEditing(null),
            });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting || !user) return;
          void run(() => reviewService.remove(deleting.id, user), { success: "Review deleted" });
          setDeleting(null);
        }}
        title="Delete this review?"
        message="Your rating and any attached photos will be removed permanently."
        confirmLabel="Delete review"
        pending={pending}
      />
    </div>
  );
}

/* ------------------------------------------------------------ favourites */

export function FavoritesPage() {
  const { user } = useSession();
  const navigate = useNavigate();

  const favorites = useDbMemo(() => {
    if (!user) return [];
    const ids = favoriteService.list(user.id);
    return ids
      .map((id) => foodService.decorated(id))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [user]);

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to see your saved dishes"
          action={
            <Link to="/sign-in?next=/app/favorites">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <SectionHeading
        title="Saved dishes"
        subtitle="Your favourites also feed the recommendation engine."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate("/foods")}>
            Find more
          </Button>
        }
      />
      {favorites.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-5" aria-hidden />}
          title="Nothing saved yet"
          message="Tap the heart on any dish to save it here."
          action={
            <Link to="/foods">
              <Button>Browse dishes</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {favorites.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

/* --------------------------------------------------------------- reviews */

export function CustomerReviewsPage() {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [reviewing, setReviewing] = useState<{ foodId: string; name: string; orderId: string } | null>(
    null,
  );

  const myReviews = useDbMemo(() => (user ? reviewService.byUser(user.id) : []), [user]);
  const reviewable = useDbMemo(() => (user ? reviewService.reviewableOrders(user.id) : []), [user]);

  if (!user) {
    return (
      <PageContainer>
        <EmptyState
          title="Sign in to manage your reviews"
          action={
            <Link to="/sign-in?next=/app/reviews">
              <Button>Sign in</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8">
      <SectionHeading
        title="Your reviews"
        subtitle="Reviews are tied to delivered orders. Verified badges appear only on genuine purchases."
      />

      {reviewable.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-bold">Waiting for your review</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviewable.slice(0, 6).map(({ order, item }) => (
              <Card key={`${order.id}-${item.foodId}`} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <img src={item.image} alt="" className="size-12 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.id} · delivered
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  fullWidth
                  onClick={() => setReviewing({ foodId: item.foodId, name: item.name, orderId: order.id })}
                >
                  <Star className="size-3.5" aria-hidden /> Write a review
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-bold">Published ({myReviews.length})</h2>
        {myReviews.length === 0 ? (
          <EmptyState
            icon={<Star className="size-5" aria-hidden />}
            title="No published reviews"
            message="Reviews you write will appear here, and on the dish page for everyone else."
          />
        ) : (
          <div className="space-y-3">
            {myReviews.map((review) => (
              <ReviewItem
                key={review.id}
                review={review}
                currentUser={user}
                onEdit={(target) => setEditing(target)}
                onDelete={(target) => setDeleting(target)}
              />
            ))}
          </div>
        )}
      </section>

      {reviewing ? (
        <ReviewForm
          open
          onClose={() => setReviewing(null)}
          dishName={reviewing.name}
          pending={pending}
          onSubmit={(input) => {
            void run(
              () =>
                reviewService.create(user, reviewing.orderId, {
                  ...input,
                  foodId: reviewing.foodId,
                }),
              { success: "Review published", onSuccess: () => setReviewing(null) },
            );
          }}
        />
      ) : null}

      {editing ? (
        <ReviewForm
          open
          onClose={() => setEditing(null)}
          dishName={db.foods.find((food) => food.id === editing.foodId)?.name ?? "dish"}
          initial={editing}
          pending={pending}
          onUpdate={(input) => {
            void run(() => reviewService.update(editing.id, input, user), {
              success: "Review updated",
              onSuccess: () => setEditing(null),
            });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void run(() => reviewService.remove(deleting.id, user), { success: "Review deleted" });
          setDeleting(null);
        }}
        title="Delete this review?"
        message="Your rating and attached photos will be removed permanently."
        confirmLabel="Delete review"
        pending={pending}
      />
    </PageContainer>
  );
}
