import { useState, useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgePercent,
  Eye,
  EyeOff,
  History,
  Image as ImageIcon,
  MessageSquareReply,
  Pencil,
  Plus,
  Search,
  Settings as SettingsIcon,
  Star,
  Trash2,
} from "lucide-react";
import type { Banner, Review } from "@/types";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  GlassCard,
  Input,
  Modal,
  Rating,
  Select,
  StatCard,
  Switch,
  Td,
  Textarea,
  Th,
  useDisclosure,
} from "@/components/ui";
import { ReviewItem } from "@/components/reviews";
import { useAsyncAction, useDb, useSession, useDbMemo } from "@/hooks";
import {
  auditService,
  bannerService,
  cuisineService,
  reviewService,
  settingsService,
  vendorService,
} from "@/services";
import { cn, formatDateTime, formatNaira, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

const BANNER_IMAGES = [
  "/foods/party-burger-platter.jpg",
  "/foods/pepperoni-pizza.jpg",
  "/foods/steak-and-eggs.jpg",
  "/foods/venue-dining.jpg",
  "/foods/venue-patio.jpg",
  "/foods/birria-tacos.jpg",
  "/foods/sandwich-platter.jpg",
  "/foods/burger-wings-fries.jpg",
];

const LINK_PRESETS = [
  { value: "/foods", label: "All dishes" },
  { value: "/foods?category=Platters", label: "Platters" },
  { value: "/foods?category=Breakfast", label: "Breakfast" },
  { value: "/foods?category=Mains", label: "Mains" },
  { value: "/foods?sort=rating", label: "Top rated" },
  { value: "/vendor-signup", label: "Become a vendor" },
];

/* --------------------------------------------------------------- banners */

export function BannersManager() {
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const dialog = useDisclosure();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const [form, setForm] = useState({
    badge: "",
    title: "",
    subtitle: "",
    image: BANNER_IMAGES[0],
    buttonText: "Order now",
    buttonLink: "/foods",
    isActive: true,
  });

  const banners = useDbMemo(() => bannerService.list(), []);

  if (!user) return null;

  const openDialog = (banner: Banner | null) => {
    setEditing(banner);
    setForm(
      banner
        ? {
            badge: banner.badge,
            title: banner.title,
            subtitle: banner.subtitle,
            image: banner.image,
            buttonText: banner.buttonText,
            buttonLink: banner.buttonLink,
            isActive: banner.isActive,
          }
        : {
            badge: "",
            title: "",
            subtitle: "",
            image: BANNER_IMAGES[0],
            buttonText: "Order now",
            buttonLink: "/foods",
            isActive: true,
          },
    );
    dialog.onOpen();
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Give the banner a title.");
      return;
    }
    if (!form.buttonText.trim() || !form.buttonLink.trim()) {
      toast.error("The banner needs button text and a destination.");
      return;
    }
    if (!form.buttonLink.startsWith("/")) {
      toast.error("The button link must be an in-app path starting with '/'.");
      return;
    }
    const result = await run(
      () =>
        editing
          ? bannerService.update(editing.id, form, user)
          : bannerService.create({ ...form, priority: banners.length + 1 }, user),
      { success: editing ? "Banner updated" : "Banner added", silentError: true },
    );
    if (result) {
      dialog.onClose();
      setEditing(null);
    }
  };

  const active = banners.filter((banner) => banner.isActive);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Banners" value={banners.length} icon={<ImageIcon className="size-4" aria-hidden />} />
        <StatCard label="Active in carousel" value={active.length} tone="success" />
        <StatCard label="Linked destinations" value={new Set(banners.map((b) => b.buttonLink)).size} tone="info" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          The public carousel renders exactly these banners, in priority order. Order matters — use the
          arrows to move a banner up or down.
        </p>
        <Button onClick={() => openDialog(null)}>
          <Plus className="size-4" aria-hidden /> Add banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="size-5" aria-hidden />}
          title="No banners configured"
          message="The customer carousel shows an empty state until you add one."
          action={
            <Button onClick={() => openDialog(null)}>
              <Plus className="size-4" aria-hidden /> Add the first banner
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {banners.map((banner, index) => (
            <Card key={banner.id} className="overflow-hidden">
              <div className="relative h-36">
                <img src={banner.image} alt="" className="img-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/85 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center gap-1 p-4 text-white">
                  {banner.badge ? (
                    <span className="w-fit rounded-full bg-brand-amber px-2 py-0.5 text-[10px] font-extrabold uppercase text-brand-amber-foreground">
                      {banner.badge}
                    </span>
                  ) : null}
                  <p className="text-sm font-extrabold">{banner.title}</p>
                  <p className="line-clamp-2 max-w-md text-xs text-white/80">{banner.subtitle}</p>
                  <span className="mt-1 w-fit rounded-full bg-white px-3 py-1 text-[11px] font-bold text-primary-deep">
                    {banner.buttonText}
                  </span>
                </div>
                <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold text-white">
                  #{index + 1}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={banner.isActive ? "success" : "muted"}>
                    {banner.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge tone="muted">{banner.buttonLink}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    aria-label="Move banner up"
                    disabled={index === 0}
                    onClick={() => void run(() => bannerService.move(banner.id, -1, user), { silentError: true })}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Move banner down"
                    disabled={index === banners.length - 1}
                    onClick={() => void run(() => bannerService.move(banner.id, 1, user), { silentError: true })}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label={banner.isActive ? "Deactivate banner" : "Activate banner"}
                    onClick={() =>
                      void run(() => bannerService.setActive(banner.id, !banner.isActive, user), {
                        silentError: true,
                      })
                    }
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                  >
                    {banner.isActive ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                  <button
                    type="button"
                    aria-label="Edit banner"
                    onClick={() => openDialog(banner)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete banner"
                    onClick={() => setDeleting(banner)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={dialog.open}
        onClose={dialog.onClose}
        title={editing ? `Edit banner` : "Add a banner"}
        description="Everything on the carousel is editable — title, subtitle, image, button text and destination."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={dialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              {editing ? "Save banner" : "Add banner"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Badge" hint="Small label above the title. Optional." htmlFor="banner-badge">
              <Input
                id="banner-badge"
                value={form.badge}
                onChange={(event) => setForm((prev) => ({ ...prev, badge: event.target.value }))}
                placeholder="Weekend only"
              />
            </Field>
            <Field label="Title" required htmlFor="banner-title">
              <Input
                id="banner-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="30% off grilled platters"
              />
            </Field>
          </div>

          <Field label="Subtitle" htmlFor="banner-subtitle">
            <Textarea
              id="banner-subtitle"
              value={form.subtitle}
              onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
              placeholder="One line of supporting copy."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button text" required htmlFor="banner-button">
              <Input
                id="banner-button"
                value={form.buttonText}
                onChange={(event) => setForm((prev) => ({ ...prev, buttonText: event.target.value }))}
                placeholder="Shop platters"
              />
            </Field>
            <Field
              label="Button destination"
              required
              hint="An in-app path starting with '/'."
              htmlFor="banner-link"
            >
              <Input
                id="banner-link"
                value={form.buttonLink}
                onChange={(event) => setForm((prev) => ({ ...prev, buttonLink: event.target.value }))}
                placeholder="/foods?category=Platters"
              />
            </Field>
          </div>

          <Field label="Quick destinations" htmlFor="banner-preset">
            <Select
              id="banner-preset"
              value=""
              onChange={(event) => {
                if (event.target.value) setForm((prev) => ({ ...prev, buttonLink: event.target.value }));
              }}
            >
              <option value="">Choose a destination…</option>
              {LINK_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label} ({preset.value})
                </option>
              ))}
            </Select>
          </Field>

          <div>
            <p className="mb-2 text-sm font-semibold">Image</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {BANNER_IMAGES.map((image) => (
                <button
                  key={image}
                  type="button"
                  aria-pressed={form.image === image}
                  onClick={() => setForm((prev) => ({ ...prev, image }))}
                  className={cn(
                    "overflow-hidden rounded-lg border-2 transition-all",
                    form.image === image ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={image} alt="" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <Switch
            checked={form.isActive}
            onChange={(next) => setForm((prev) => ({ ...prev, isActive: next }))}
            label="Active"
            description="Inactive banners are hidden from the public carousel."
          />

          <p className="text-[11px] text-muted-foreground">
            {active.length} banner{active.length === 1 ? "" : "s"} currently visible to customers ·
            banner images come from the supplied photography library.
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void run(() => bannerService.remove(deleting.id, user), { success: "Banner removed" });
          setDeleting(null);
        }}
        title={`Delete “${deleting?.title ?? ""}”?`}
        message="The banner will be removed from the carousel immediately."
        confirmLabel="Delete banner"
        pending={pending}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- reviews */

export function ReviewsManager({ scope, vendorId }: { scope: "vendor" | "platform"; vendorId?: string | null }) {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const [filter, setFilter] = useState<"all" | "unanswered" | "low" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [replying, setReplying] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirming, setConfirming] = useState<Review | null>(null);

  const scopedVendorId = scope === "vendor" ? vendorId ?? null : null;

  const reviews = useDbMemo(() => {
    let list = scopedVendorId ? reviewService.byVendor(scopedVendorId) : reviewService.visible();
    if (scope === "platform" && filter === "hidden") list = reviewService.list().filter((r) => r.isHidden);
    if (filter === "unanswered") list = list.filter((review) => !review.vendorReply);
    if (filter === "low") list = list.filter((review) => review.rating <= 3);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (review) =>
          review.comment.toLowerCase().includes(term) ||
          review.userName.toLowerCase().includes(term),
      );
    }
    return list;
  }, [scopedVendorId, scope, filter, search]);

  const stats = useDbMemo(() => {
    const all = scopedVendorId ? reviewService.byVendor(scopedVendorId) : reviewService.visible();
    const summary = scopedVendorId
      ? reviewService.summaryForVendor(scopedVendorId)
      : { rating: 0, count: 0 };
    return {
      total: all.length,
      average: all.length
        ? Math.round((all.reduce((sum, review) => sum + review.rating, 0) / all.length) * 10) / 10
        : 0,
      verified: all.filter((review) => review.isVerifiedPurchase).length,
      unanswered: all.filter((review) => !review.vendorReply).length,
      withPhotos: all.filter((review) => review.photos.length > 0).length,
      summary,
    };
  }, [scopedVendorId]);

  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Reviews" value={stats.total} icon={<Star className="size-4" aria-hidden />} />
        <StatCard label="Average rating" value={stats.average > 0 ? stats.average.toFixed(1) : "—"} tone="warning" />
        <StatCard label="Verified purchases" value={stats.verified} tone="success" />
        <StatCard label="Awaiting reply" value={stats.unanswered} tone="info" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reviews by customer or text"
            aria-label="Search reviews"
            className="pl-9"
          />
        </div>
        <Select
          value={filter}
          onChange={(event) => setFilter(event.target.value as typeof filter)}
          aria-label="Filter reviews"
          className="max-w-52"
        >
          <option value="all">All reviews</option>
          <option value="unanswered">Awaiting reply</option>
          <option value="low">3 stars and below</option>
          {scope === "platform" ? <option value="hidden">Hidden by moderator</option> : null}
        </Select>
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={<Star className="size-5" aria-hidden />}
          title="No reviews match this filter"
          message="Reviews appear here once customers rate delivered orders."
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="space-y-2">
              <ReviewItem
                review={review}
                currentUser={user}
                onReply={(target) => {
                  setReplying(target);
                  setReplyText(target.vendorReply?.text ?? "");
                }}
              />
              <div className="flex flex-wrap items-center gap-3 pl-1 text-xs text-muted-foreground">
                <span>
                  {db.foods.find((food) => food.id === review.foodId)?.name ?? "Dish"} ·{" "}
                  {vendorService.get(review.vendorId)?.name ?? "Kitchen"}
                </span>
                <span>{timeAgo(review.createdAt)}</span>
                <Rating value={review.rating} />
                {scope === "platform" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirming(review)}
                    disabled={pending}
                  >
                    {review.isHidden ? "Restore review" : "Hide review"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="Reply to this review"
        description="Your reply is public and shown under the review on the dish page."
        footer={
          <>
            <Button variant="outline" onClick={() => setReplying(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() => {
                if (!replying) return;
                void run(() => reviewService.reply(replying.id, replyText, user), {
                  success: "Reply published",
                  onSuccess: () => setReplying(null),
                });
              }}
            >
              <MessageSquareReply className="size-4" aria-hidden /> Publish reply
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {replying ? (
            <div className="rounded-xl border border-border bg-muted/50 p-3 text-sm">
              <p className="font-semibold">{replying.userName}</p>
              <p className="mt-1 text-muted-foreground">{replying.comment}</p>
            </div>
          ) : null}
          <Field label="Your reply" hint="Keep it short and constructive." htmlFor="reply-text">
            <Textarea
              id="reply-text"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              maxLength={600}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          if (!confirming) return;
          void run(() => reviewService.setHidden(confirming.id, !confirming.isHidden, user), {
            success: confirming.isHidden ? "Review restored" : "Review hidden",
          });
          setConfirming(null);
        }}
        title={confirming?.isHidden ? "Restore this review?" : "Hide this review?"}
        message="Hidden reviews are removed from public listings but kept for the audit trail."
        confirmLabel={confirming?.isHidden ? "Restore" : "Hide review"}
        destructive={!confirming?.isHidden}
        pending={pending}
      />
    </div>
  );
}

/* --------------------------------------------------------------- settings */

export function SettingsManager() {
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const settings = settingsService.get();

  const [form, setForm] = useState({
    siteName: settings.siteName,
    tagline: settings.tagline,
    logoText: settings.logoText,
    contactEmail: settings.contactEmail,
    phone: settings.phone,
    supportHours: settings.supportHours,
    address: settings.address,
    defaultDeliveryFee: settings.defaultDeliveryFee,
    defaultDeliveryMinutes: settings.defaultDeliveryMinutes,
    defaultPrepMinutes: settings.defaultPrepMinutes,
    minOrderValue: settings.minOrderValue,
    serviceEnabled: settings.serviceEnabled,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState("");
  const [promoForm, setPromoForm] = useState({ code: "", percentOff: 10, minOrder: 10000 });

  if (!user) return null;

  const save = async () => {
    const next: Record<string, string> = {};
    if (!form.siteName.trim()) next.siteName = "The site needs a name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.contactEmail)) next.contactEmail = "Enter a valid email.";
    if (form.defaultDeliveryMinutes < 5) next.defaultDeliveryMinutes = "Use at least 5 minutes.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = await run(() => settingsService.update(form, user), {
      success: "Settings saved",
      silentError: true,
    });
    if (result === null) toast.error("Those settings could not be saved.");
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <SettingsIcon className="size-4 text-primary" aria-hidden /> Brand &amp; contact
          </h2>
          {Object.keys(errors).length > 0 ? (
            <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              Some fields need attention.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Site name" required error={errors.siteName} htmlFor="set-name">
              <Input
                id="set-name"
                value={form.siteName}
                onChange={(event) => setForm((prev) => ({ ...prev, siteName: event.target.value }))}
                invalid={Boolean(errors.siteName)}
              />
            </Field>
            <Field label="Logo wordmark" hint="Shown beside the logo mark." htmlFor="set-logo">
              <Input
                id="set-logo"
                value={form.logoText}
                onChange={(event) => setForm((prev) => ({ ...prev, logoText: event.target.value }))}
              />
            </Field>
          </div>
          <Field label="Tagline" htmlFor="set-tagline">
            <Input
              id="set-tagline"
              value={form.tagline}
              onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact email" required error={errors.contactEmail} htmlFor="set-email">
              <Input
                id="set-email"
                type="email"
                value={form.contactEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                invalid={Boolean(errors.contactEmail)}
              />
            </Field>
            <Field label="Phone" htmlFor="set-phone">
              <Input
                id="set-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </Field>
          </div>
          <Field label="Support hours" htmlFor="set-hours">
            <Input
              id="set-hours"
              value={form.supportHours}
              onChange={(event) => setForm((prev) => ({ ...prev, supportHours: event.target.value }))}
            />
          </Field>
          <Field label="Head office address" htmlFor="set-address">
            <Input
              id="set-address"
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            />
          </Field>
          <Button loading={pending} onClick={() => void save()}>
            Save settings
          </Button>
        </Card>

        <div className="space-y-5">
          <Card className="space-y-4 p-5">
            <h2 className="text-sm font-bold">Delivery defaults</h2>
            <p className="text-xs text-muted-foreground">
              Platform defaults only. Each kitchen keeps its own preparation time, delivery fee and
              radius, and those always win for its orders.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Delivery fee (₦)"
                error={errors.defaultDeliveryFee}
                htmlFor="set-delivery-fee"
              >
                <Input
                  id="set-delivery-fee"
                  type="number"
                  min={0}
                  step={100}
                  value={form.defaultDeliveryFee}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, defaultDeliveryFee: Number(event.target.value) }))
                  }
                />
              </Field>
              <Field
                label="Delivery minutes"
                error={errors.defaultDeliveryMinutes}
                htmlFor="set-delivery-min"
              >
                <Input
                  id="set-delivery-min"
                  type="number"
                  min={5}
                  value={form.defaultDeliveryMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, defaultDeliveryMinutes: Number(event.target.value) }))
                  }
                  invalid={Boolean(errors.defaultDeliveryMinutes)}
                />
              </Field>
              <Field label="Prep minutes" htmlFor="set-prep">
                <Input
                  id="set-prep"
                  type="number"
                  min={5}
                  value={form.defaultPrepMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, defaultPrepMinutes: Number(event.target.value) }))
                  }
                />
              </Field>
            </div>
            <Field
              label="Minimum order value (₦)"
              hint="Checkout blocks orders below this amount."
              htmlFor="set-min-order"
            >
              <Input
                id="set-min-order"
                type="number"
                min={0}
                step={500}
                value={form.minOrderValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, minOrderValue: Number(event.target.value) }))
                }
              />
            </Field>
            <Switch
              checked={form.serviceEnabled}
              onChange={(next) => setForm((prev) => ({ ...prev, serviceEnabled: next }))}
              label="Marketplace accepting orders"
              description="Turn this off to pause new orders platform-wide."
            />
            <Button loading={pending} onClick={() => void save()}>
              Save delivery defaults
            </Button>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">Dish categories</h2>
            <p className="text-xs text-muted-foreground">
              These power the category filters across the marketplace and the dish editor.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {settings.categories.map((category) => (
                <li key={category}>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold">
                    {category}
                    <button
                      type="button"
                      aria-label={`Remove ${category}`}
                      onClick={() =>
                        void run(
                          () =>
                            settingsService.setCuisines(
                              settings.categories.filter((item) => item !== category),
                              user,
                            ),
                          { silentError: true, success: "Category removed" },
                        )
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Add a category"
                aria-label="New category name"
              />
              <Button
                variant="outline"
                onClick={() => {
                  if (!newCategory.trim()) return;
                  void run(
                    () => settingsService.setCuisines([...settings.categories, newCategory], user),
                    {
                      success: "Category added",
                      onSuccess: () => setNewCategory(""),
                      silentError: true,
                    },
                  );
                }}
              >
                Add
              </Button>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">Cuisine types</h2>
            <ul className="flex flex-wrap gap-1.5">
              {cuisineService.list().map((cuisine) => (
                <li key={cuisine.id}>
                  <Badge tone={cuisine.isActive ? "primary" : "muted"}>
                    <span aria-hidden>{cuisine.emoji} </span>
                    {cuisine.name}
                  </Badge>
                </li>
              ))}
            </ul>
            <CuisineEditor />
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-bold">Promo codes</h2>
            <ul className="space-y-2">
              {settings.promoCodes.map((promo) => (
                <li
                  key={promo.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <span>
                    <span className="font-mono text-sm font-bold">{promo.code}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {promo.percentOff}% off · min {formatNaira(promo.minOrder)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge tone={promo.isActive ? "success" : "muted"}>
                      {promo.isActive ? "Active" : "Paused"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void run(() => settingsService.togglePromo(promo.id, !promo.isActive, user), {
                          silentError: true,
                        })
                      }
                    >
                      {promo.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void run(() => settingsService.removePromo(promo.id, user), { silentError: true })
                      }
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-3">
              <Input
                value={promoForm.code}
                onChange={(event) =>
                  setPromoForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                placeholder="CODE"
                aria-label="Promo code"
              />
              <Input
                type="number"
                min={1}
                max={90}
                value={promoForm.percentOff}
                onChange={(event) =>
                  setPromoForm((prev) => ({ ...prev, percentOff: Number(event.target.value) }))
                }
                aria-label="Percentage off"
              />
              <Input
                type="number"
                min={0}
                step={500}
                value={promoForm.minOrder}
                onChange={(event) =>
                  setPromoForm((prev) => ({ ...prev, minOrder: Number(event.target.value) }))
                }
                aria-label="Minimum order"
              />
            </div>
            <Button
              variant="outline"
              onClick={() =>
                void run(() => settingsService.addPromo(promoForm, user), {
                  success: "Promo code created",
                  onSuccess: () => setPromoForm({ code: "", percentOff: 10, minOrder: 10000 }),
                  silentError: true,
                })
              }
            >
              <Plus className="size-4" aria-hidden /> Add promo code
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CuisineEditor() {
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const [form, setForm] = useState({ name: "", emoji: "🍽️" });
  const db = useDb();

  if (!user) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {db.cuisines.map((cuisine) => (
          <span key={cuisine.id} className="flex items-center gap-1.5 text-xs">
            <Input
              value={cuisine.emoji}
              aria-label={`${cuisine.name} emoji`}
              onChange={(event) =>
                void run(
                  () => cuisineService.update(cuisine.id, { emoji: event.target.value }, user),
                  { silentError: true },
                )
              }
              className="w-14 text-center"
            />
            <Input
              value={cuisine.name}
              aria-label={`Rename ${cuisine.name}`}
              onChange={(event) =>
                void run(
                  () => cuisineService.update(cuisine.id, { name: event.target.value }, user),
                  { silentError: true },
                )
              }
              className="w-40"
            />
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Delete ${cuisine.name}`}
              onClick={() =>
                void run(() => cuisineService.remove(cuisine.id, user), { silentError: true })
              }
            >
              <Trash2 className="size-3.5" aria-hidden />
            </Button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={form.emoji}
          onChange={(event) => setForm((prev) => ({ ...prev, emoji: event.target.value }))}
          className="w-16 text-center"
          aria-label="New cuisine emoji"
        />
        <Input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="New cuisine name"
          aria-label="New cuisine name"
        />
        <Button
          variant="outline"
          loading={pending}
          onClick={() =>
            void run(() => cuisineService.create(form, user), {
              success: "Cuisine added",
              onSuccess: () => setForm({ name: "", emoji: "🍽️" }),
              silentError: true,
            })
          }
        >
          Add
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Renaming a cuisine updates it everywhere it is used — dishes reference cuisines by id.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- fees */

export function FeesManager() {
  const { user } = useSession();
  const db = useDb();
  const { run, pending } = useAsyncAction();
  const settings = settingsService.get();

  const [feeType, setFeeType] = useState(settings.feeType);
  const [feeValue, setFeeValue] = useState(settings.feeValue);

  const preview = useMemo(() => {
    const sample = 10000;
    const itemCount = 3;
    const amount =
      feeType === "percentage"
        ? Math.round((sample * feeValue) / 100)
        : feeType === "fixed"
          ? Math.round(feeValue)
          : Math.round(feeValue * itemCount);
    return { sample, amount, basis: feeType === "per_item" ? `${itemCount} items` : "one order" };
  }, [feeType, feeValue]);

  if (!user) return null;

  const ordersWithFees = db.orders.filter((order) => order.platformFee > 0).length;
  const collected = db.orders.reduce((sum, order) => sum + order.platformFee, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Fee policy" value={
          settings.feeType === "percentage"
            ? `${settings.feeValue}%`
            : settings.feeType === "fixed"
              ? `${formatNaira(settings.feeValue)} flat`
              : `${formatNaira(settings.feeValue)}/item`
        } icon={<BadgePercent className="size-4" aria-hidden />} />
        <StatCard label="Orders carrying a fee" value={ordersWithFees} tone="info" />
        <StatCard label="Fees recorded" value={formatNaira(collected)} tone="success" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-bold">Platform fee policy</h2>
          <p className="text-xs text-muted-foreground">
            The basis is always stated explicitly so nobody has to guess how a fee was calculated.
          </p>

          <Field label="Calculation basis" htmlFor="fee-type">
            <Select
              id="fee-type"
              value={feeType}
              onChange={(event) => setFeeType(event.target.value as typeof feeType)}
            >
              <option value="percentage">Percentage of the food subtotal</option>
              <option value="fixed">Fixed amount per order</option>
              <option value="per_item">Amount per item ordered</option>
            </Select>
          </Field>

          <Field
            label={feeType === "percentage" ? "Percentage (%)" : "Amount (₦)"}
            hint={
              feeType === "percentage"
                ? "Applied to the food subtotal only — never to delivery fees."
                : feeType === "fixed"
                  ? "Charged once per order regardless of size."
                  : "Multiplied by the number of items in the order."
            }
            htmlFor="fee-value"
          >
            <Input
              id="fee-value"
              type="number"
              min={0}
              step={feeType === "percentage" ? 0.5 : 50}
              value={feeValue}
              onChange={(event) => setFeeValue(Number(event.target.value))}
            />
          </Field>

          <GlassCard intensity="base" className="space-y-1.5 rounded-xl p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Worked example
            </p>
            <p>
              On a {formatNaira(preview.sample)} order ({preview.basis}) the platform fee is{" "}
              <strong className="text-primary">{formatNaira(preview.amount)}</strong>.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Customer total would be {formatNaira(preview.sample + preview.amount)} before delivery.
            </p>
          </GlassCard>

          <Button
            loading={pending}
            onClick={() =>
              void run(() => settingsService.update({ feeType, feeValue }, user), {
                success: "Platform fee policy updated",
                silentError: true,
              })
            }
          >
            Save fee policy
          </Button>

          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-800">
            Changing the policy affects new orders only. Every existing order keeps the fee policy it
            was placed under — those snapshots are shown here and on each order.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <h2 className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-bold">
            Fee snapshots on recent orders
          </h2>
          {db.orders.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No orders yet" message="Fee snapshots appear here once orders exist." />
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Policy in force</Th>
                  <Th>Subtotal</Th>
                  <Th>Fee</Th>
                </tr>
              </thead>
              <tbody>
                {db.orders.slice(0, 12).map((order) => (
                  <tr key={order.id}>
                    <Td className="font-semibold">{order.id}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {order.feeSnapshot.type === "percentage"
                        ? `${order.feeSnapshot.value}% of subtotal`
                        : order.feeSnapshot.type === "fixed"
                          ? `${formatNaira(order.feeSnapshot.value)} per order`
                          : `${formatNaira(order.feeSnapshot.value)} per item`}
                    </Td>
                    <Td>{formatNaira(order.subtotal)}</Td>
                    <Td className="font-semibold">{formatNaira(order.platformFee)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- audit */

export function AuditManager() {
  const entries = useDbMemo(() => auditService.list(200), []);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Recorded actions" value={entries.length} icon={<History className="size-4" aria-hidden />} />
        <StatCard
          label="Distinct actors"
          value={new Set(entries.map((entry) => entry.actorId)).size}
          tone="info"
        />
        <StatCard
          label="Latest action"
          value={entries[0] ? timeAgo(entries[0].at) : "—"}
          tone="success"
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<History className="size-5" aria-hidden />}
          title="No activity recorded yet"
          message="Significant merchant actions — approving kitchens, editing banners, changing fees, managing riders — are logged here."
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(entry.at)}
                  </Td>
                  <Td>
                    <p className="text-sm font-semibold">{entry.actorName}</p>
                    <p className="text-xs text-muted-foreground">{entry.actorRole}</p>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs">{entry.action}</span>
                  </Td>
                  <Td className="text-sm">{entry.target}</Td>
                  <Td className="text-xs text-muted-foreground">{entry.detail}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      )}
    </div>
  );
}
