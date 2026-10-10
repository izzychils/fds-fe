import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Clock,
  Flame,
  Heart,
  Plus,
  ShoppingBag,
  Star,
  Store,
  Utensils,
} from "lucide-react";
import type { FoodWithVendor } from "@/types";
import {
  Badge,
  Button,
  Checkbox,
  Field,
  Modal,
  Rating,
  Stepper,
  Textarea,
} from "@/components/ui";
import { cn, formatNaira } from "@/lib/utils";
import { cuisineIcon } from "@/lib/cuisine-icons";
import { useDb, useSession } from "@/hooks";
import { cartService, favoriteService, isSoldOut } from "@/services";
import { toast } from "sonner";

/* -------------------------------------------------------------- price tag */

export function PriceTag({
  entry,
  className,
  size = "md",
}: {
  entry: FoodWithVendor;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { food, effectivePrice } = entry;
  const onSpecial = effectivePrice < food.price;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "font-extrabold tracking-tight text-foreground",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base",
        )}
      >
        {formatNaira(effectivePrice)}
      </span>
      {onSpecial ? (
        <span className="text-xs font-medium text-muted-foreground line-through">
          {formatNaira(food.price)}
        </span>
      ) : null}
      {onSpecial ? <Badge tone="warning">Special</Badge> : null}
    </span>
  );
}

/* --------------------------------------------------------------- food card */

export function FoodCard({ entry, compact = false }: { entry: FoodWithVendor; compact?: boolean }) {
  const { food, vendor, cuisine, rating, ratingCount } = entry;
  const { user } = useSession();
  const db = useDb();
  const navigate = useNavigate();
  const [customizing, setCustomizing] = useState(false);

  const soldOut = isSoldOut(food);
  const unavailable = !food.isAvailable || soldOut || vendor?.status !== "approved";
  const isFavorite = user
    ? db.favorites.some((f) => f.userId === user.id && f.foodId === food.id)
    : false;
  const needsChoices =
    food.sizes.length > 0 ||
    food.proteinIds.length > 0 ||
    food.extraIds.length > 0 ||
    food.proteinSelection === "required";

  const quickAdd = () => {
    if (!user) {
      navigate(`/sign-in?next=/foods/${food.id}`);
      return;
    }
    if (needsChoices) {
      setCustomizing(true);
      return;
    }
    try {
      cartService.add({
        foodId: food.id,
        quantity: 1,
        sizeId: null,
        proteinIds: [],
        extraIds: [],
        instructions: "",
      });
      toast.success(`${food.name} added to your cart`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that dish.");
    }
  };

  const toggleFavorite = () => {
    if (!user) {
      navigate(`/sign-in?next=/foods/${food.id}`);
      return;
    }
    const added = favoriteService.toggle(user.id, food.id);
    toast.success(added ? "Saved to favourites" : "Removed from favourites");
  };

  const CuisineIcon = cuisine ? cuisineIcon(cuisine.name) : Utensils;

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary-deep/10",
          unavailable && "opacity-70",
        )}
      >
        <div className="relative aspect-[5/4] overflow-hidden bg-muted">
          <Link to={`/foods/${food.id}`} aria-label={food.name}>
            <img
              src={food.image}
              alt={food.name}
              loading="lazy"
              decoding="async"
              className="img-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>

          <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
            <div className="pointer-events-auto flex flex-wrap gap-1.5">
              {food.isSeasonalSpecial ? (
                <span className="rounded-full bg-brand-amber px-2 py-0.5 text-[11px] font-bold text-brand-amber-foreground shadow">
                  Seasonal
                </span>
              ) : null}
              {food.isPopular ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[11px] font-bold text-primary shadow backdrop-blur">
                  <Flame className="size-3" aria-hidden /> Popular
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              aria-label={isFavorite ? `Remove ${food.name} from favourites` : `Save ${food.name} to favourites`}
              aria-pressed={isFavorite}
              className="pointer-events-auto inline-flex size-8 items-center justify-center rounded-full bg-white/85 shadow backdrop-blur transition-colors hover:bg-white"
            >
              <Heart
                className={cn("size-4", isFavorite ? "fill-red-500 text-red-500" : "text-foreground/70")}
                aria-hidden
              />
            </button>
          </div>

          {unavailable ? (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-deep/55 backdrop-blur-[2px]">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wide text-foreground">
                {soldOut ? "Sold out" : "Unavailable"}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-3.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 text-sm font-bold leading-snug">
              <Link to={`/foods/${food.id}`} className="hover:text-primary">
                {food.name}
              </Link>
            </h3>
            <Rating value={rating} className="shrink-0" />
          </div>

          {!compact ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{food.description}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden /> {food.prepTimeMinutes} min
            </span>
            {cuisine ? (
              <span className="inline-flex items-center gap-1">
                <CuisineIcon className="size-3" aria-hidden /> {cuisine.name}
              </span>
            ) : null}
            {food.calories ? <span>{food.calories} kcal</span> : null}
            {ratingCount > 0 ? <span>{ratingCount} reviews</span> : null}
          </div>

          {food.dietary.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {food.dietary.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary-ink"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-end justify-between gap-2 pt-1">
            <PriceTag entry={entry} />
            <Button
              size="icon"
              onClick={quickAdd}
              disabled={unavailable}
              aria-label={`Add ${food.name} to cart`}
              className="size-9 shrink-0"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </article>

      <DishCustomizerModal
        entry={entry}
        open={customizing}
        onClose={() => setCustomizing(false)}
      />
    </>
  );
}

/* ----------------------------------------------------------- category chips */

export function CategoryChips({
  items,
  value,
  onChange,
  allLabel = "All",
  ariaLabel = "Filter by category",
}: {
  items: Array<{ value: string; label: string; count?: number }>;
  value: string | null;
  onChange: (next: string | null) => void;
  allLabel?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={cn(
          "shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all",
          value === null
            ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
            : "border-white/60 bg-white/60 backdrop-blur hover:bg-white/85",
        )}
      >
        {allLabel}
      </button>
      {items.map((item) => {
        const Icon = cuisineIcon(item.label);
        const active = value === item.value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : item.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                : "border-white/60 bg-white/60 backdrop-blur hover:bg-white/85",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
            {item.count !== undefined ? (
              <span className="text-xs font-medium opacity-70">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------- dish customizer */

/**
 * Protein & extras customizer (§11).
 *
 * This is the single implementation used by the food card's quick-add, the food
 * detail page and the vendor's "preview dish" flow, so a customer sees exactly
 * the options the kitchen configured.
 */
export function DishCustomizerModal({
  entry,
  open,
  onClose,
}: {
  entry: FoodWithVendor;
  open: boolean;
  onClose: () => void;
}) {
  const { food } = entry;
  const db = useDb();
  const navigate = useNavigate();
  const { user } = useSession();

  const [sizeId, setSizeId] = useState<string | null>(food.sizes[0]?.id ?? null);
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the sheet is opened for a different dish.
  const [lastFoodId, setLastFoodId] = useState(food.id);
  if (lastFoodId !== food.id) {
    setLastFoodId(food.id);
    setSizeId(food.sizes[0]?.id ?? null);
    setProteinIds([]);
    setExtraIds([]);
    setQuantity(1);
    setInstructions("");
    setError(null);
  }

  const proteins = useMemo(
    () =>
      food.proteinIds
        .map((id) => db.proteins.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [db.proteins, food.proteinIds],
  );
  const extras = useMemo(
    () =>
      food.extraIds
        .map((id) => db.extras.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [db.extras, food.extraIds],
  );

  const size = food.sizes.find((s) => s.id === sizeId);
  const addOnTotal = [
    ...proteins.filter((p) => proteinIds.includes(p.id)),
    ...extras.filter((e) => extraIds.includes(e.id)),
  ].reduce((sum, item) => sum + item.price, 0);
  const unitPrice = food.price + (size?.priceDelta ?? 0) + addOnTotal;
  const total = unitPrice * quantity;

  const toggleProtein = (id: string, next: boolean) => {
    setError(null);
    setProteinIds((prev) => {
      if (next) {
        if (prev.length >= food.maxProteins) {
          setError(`You can choose up to ${food.maxProteins} protein option(s).`);
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const toggleExtra = (id: string, next: boolean) => {
    setError(null);
    setExtraIds((prev) => {
      if (next) {
        if (prev.length >= food.maxExtras) {
          setError(`You can choose up to ${food.maxExtras} extra(s).`);
          return prev;
        }
        return [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const submit = () => {
    if (!user) {
      onClose();
      navigate(`/sign-in?next=/foods/${food.id}`);
      return;
    }
    try {
      cartService.add({
        foodId: food.id,
        quantity,
        sizeId: food.sizes.length > 0 ? sizeId : null,
        proteinIds,
        extraIds,
        instructions,
      });
      toast.success(`${quantity} × ${food.name} added to your cart`);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that dish.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={food.name}
      description={`${entry.vendor?.name ?? "Kitchen"} · ${formatNaira(food.price)} base`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <ShoppingBag className="size-4" aria-hidden />
            Add {quantity} · {formatNaira(total)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-3">
          <img
            src={food.image}
            alt={food.name}
            className="size-24 shrink-0 rounded-2xl object-cover"
          />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{food.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {food.ingredients.slice(0, 4).map((ingredient) => (
                <span key={ingredient} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {ingredient}
                </span>
              ))}
            </div>
          </div>
        </div>

        {food.sizes.length > 0 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Serving size</legend>
            <div className="flex flex-wrap gap-2">
              {food.sizes.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={sizeId === option.id}
                  onClick={() => setSizeId(option.id)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-sm font-semibold transition-all",
                    sizeId === option.id
                      ? "border-primary bg-primary/12 text-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {option.label}
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                    {option.priceDelta === 0
                      ? "included"
                      : `${option.priceDelta > 0 ? "+" : "−"}${formatNaira(Math.abs(option.priceDelta))}`}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {proteins.length > 0 ? (
          <fieldset>
            <legend className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold">
              Choose your protein
              <Badge tone={food.proteinSelection === "required" ? "destructive" : "muted"}>
                {food.proteinSelection === "required" ? "Required" : "Optional"}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                up to {food.maxProteins}
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {proteins.map((protein) => (
                <Checkbox
                  key={protein.id}
                  checked={proteinIds.includes(protein.id)}
                  disabled={!protein.isAvailable}
                  onChange={(next) => toggleProtein(protein.id, next)}
                  label={protein.name}
                  description={protein.isAvailable ? protein.description : "Temporarily unavailable"}
                  price={protein.price === 0 ? "Included" : `+${formatNaira(protein.price)}`}
                />
              ))}
            </div>
          </fieldset>
        ) : null}

        {extras.length > 0 ? (
          <fieldset>
            <legend className="mb-2 flex flex-wrap items-center gap-2 text-sm font-bold">
              Add extras
              <Badge tone="muted">Optional</Badge>
              <span className="text-xs font-medium text-muted-foreground">
                up to {food.maxExtras}
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {extras.map((extra) => (
                <Checkbox
                  key={extra.id}
                  checked={extraIds.includes(extra.id)}
                  disabled={!extra.isAvailable}
                  onChange={(next) => toggleExtra(extra.id, next)}
                  label={extra.name}
                  description={extra.isAvailable ? extra.description : "Temporarily unavailable"}
                  price={`+${formatNaira(extra.price)}`}
                />
              ))}
            </div>
          </fieldset>
        ) : null}

        <Field
          label="Special instructions"
          hint="Allergies, spice level, or anything the kitchen should know."
          error={error}
        >
          <Textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            maxLength={240}
            placeholder="e.g. extra pepper sauce on the side"
          />
        </Field>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-3">
          <div>
            <p className="text-sm font-bold">Quantity</p>
            <p className="text-xs text-muted-foreground">
              {formatNaira(unitPrice)} each
            </p>
          </div>
          <Stepper value={quantity} onChange={setQuantity} max={Math.max(1, food.stockCount ?? 20)} />
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-primary/8 px-4 py-3">
          <span className="text-sm font-semibold">Item total</span>
          <span className="text-lg font-extrabold">{formatNaira(total)}</span>
        </div>
      </div>
    </Modal>
  );
}

/* --------------------------------------------------------- vendor labelling */

export function VendorLine({
  entry,
  className,
}: {
  entry: FoodWithVendor;
  className?: string;
}) {
  if (!entry.vendor) return null;
  return (
    <p className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Store className="size-3.5" aria-hidden />
      <span className="font-semibold text-foreground/80">{entry.vendor.name}</span>
      <span aria-hidden>·</span>
      <span>{entry.vendor.area}</span>
    </p>
  );
}

export function DietaryBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <Badge key={tag} tone="primary">
          <BadgeCheck className="size-3" aria-hidden /> {tag}
        </Badge>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- list row */

export function MenuListRow({
  entry,
  fallback,
}: {
  entry: FoodWithVendor;
  fallback?: (foodId: string) => void;
}) {
  const { food, rating } = entry;
  const soldOut = isSoldOut(food);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      <img src={food.image} alt="" className="size-12 shrink-0 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{food.name}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatNaira(food.price)}</span>
          {rating > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden /> {rating.toFixed(1)}
            </span>
          ) : null}
          {soldOut ? <Badge tone="destructive">Sold out</Badge> : null}
        </p>
      </div>
      {fallback ? (
        <Button size="sm" variant="outline" onClick={() => fallback(food.id)}>
          Open
        </Button>
      ) : null}
    </div>
  );
}
