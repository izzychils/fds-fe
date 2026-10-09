import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  Clock,
  Flame,
  Heart,
  MapPin,
  ShoppingBag,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  GlassCard,
  Rating,
  SectionHeading,
  Stepper,
  Textarea,
} from "@/components/ui";
import { PriceTag } from "@/components/food";
import { FoodCard } from "@/components/food";
import { PageContainer } from "@/components/layout/public";
import { RatingSummaryPanel, ReviewItem } from "@/components/reviews";
import { useDb, useDbMemo, useSession } from "@/hooks";
import {
  cartService,
  favoriteService,
  foodService,
  isSoldOut,
  reviewService,
} from "@/services";
import { distanceKm, formatNaira } from "@/lib/utils";
import { toast } from "sonner";

export default function FoodDetailPage() {
  const { foodId } = useParams<{ foodId: string }>();
  const db = useDb();
  const { user } = useSession();
  const navigate = useNavigate();

  const entry = useDbMemo(() => (foodId ? foodService.decorated(foodId) : null), [foodId]);

  const [sizeId, setSizeId] = useState<string | null>(null);
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const food = entry?.food;

  // Initialise the size selector once the dish is known.
  const [initialisedFor, setInitialisedFor] = useState<string | null>(null);
  if (food && initialisedFor !== food.id) {
    setInitialisedFor(food.id);
    setSizeId(food.sizes[0]?.id ?? null);
    setProteinIds([]);
    setExtraIds([]);
    setQuantity(1);
    setInstructions("");
    setError(null);
  }

  const proteins = useMemo(
    () =>
      (food?.proteinIds ?? [])
        .map((id) => db.proteins.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [db.proteins, food?.proteinIds],
  );
  const extras = useMemo(
    () =>
      (food?.extraIds ?? [])
        .map((id) => db.extras.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e)),
    [db.extras, food?.extraIds],
  );

  const reviews = useDbMemo(() => (foodId ? reviewService.byFood(foodId) : []), [foodId]);
  const summary = useDbMemo(
    () => (foodId ? reviewService.summaryForFood(foodId) : { rating: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }),
    [foodId],
  );

  const moreFromKitchen = useDbMemo(() => {
    if (!entry) return [];
    return foodService
      .listDecorated()
      .filter((item) => item.food.vendorId === entry.vendor.id && item.food.id !== entry.food.id && item.food.isAvailable)
      .slice(0, 4);
  }, [entry]);

  const similar = useMemo(() => {
    if (!entry) return [];
    return foodService
      .listDecorated()
      .filter(
        (item) =>
          item.food.id !== entry.food.id &&
          item.food.isAvailable &&
          (item.food.cuisineId === entry.food.cuisineId ||
            item.food.ingredients.some((ingredient) => entry.food.ingredients.includes(ingredient))),
      )
      .slice(0, 4);
  }, [entry]);

  if (!entry || !food) {
    return (
      <PageContainer>
        <EmptyState
          icon={<Utensils className="size-5" aria-hidden />}
          title="We couldn't find that dish"
          message="It may have been removed from the menu by its kitchen."
          action={
            <Link to="/foods">
              <Button>Browse all dishes</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const { vendor, cuisine, rating, ratingCount } = entry;
  const soldOut = isSoldOut(food);
  const unavailable = !food.isAvailable || soldOut || vendor.status !== "approved";
  const isFavorite = user
    ? db.favorites.some((f) => f.userId === user.id && f.foodId === food.id)
    : false;

  const size = food.sizes.find((s) => s.id === sizeId);
  const addOnTotal = [
    ...proteins.filter((p) => proteinIds.includes(p.id)),
    ...extras.filter((e) => extraIds.includes(e.id)),
  ].reduce((sum, item) => sum + item.price, 0);
  const unitPrice = entry.effectivePrice + (size?.priceDelta ?? 0) + addOnTotal;
  const total = unitPrice * quantity;

  const deliveryAddress = user
    ? db.addresses.find((a) => a.id === db.delivery.addressId) ??
      db.addresses.find((a) => a.userId === user.id && a.isDefault) ??
      null
    : null;
  const distance = deliveryAddress ? distanceKm(deliveryAddress, vendor) : null;
  const canDeliver = distance !== null ? distance <= vendor.deliveryRadiusKm : null;

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

  const addToCart = () => {
    if (!user) {
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
      toast.success(`${quantity} × ${food.name} added to your cart`, {
        action: { label: "View cart", onClick: () => navigate("/app/cart") },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add that dish.");
    }
  };

  return (
    <PageContainer className="space-y-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Button>

      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">
          Home
        </Link>
        <span aria-hidden> / </span>
        <Link to="/foods" className="hover:text-primary">
          Dishes
        </Link>
        {cuisine ? (
          <>
            <span aria-hidden> / </span>
            <Link to={`/foods?cuisine=${cuisine.id}`} className="hover:text-primary">
              {cuisine.name}
            </Link>
          </>
        ) : null}
        <span aria-hidden> / </span>
        <span className="text-foreground">{food.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/50 shadow-xl shadow-primary-deep/10">
            <img src={food.image} alt={food.name} className="aspect-[4/3] w-full object-cover" />
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {food.isSeasonalSpecial ? <Badge tone="warning">Seasonal special</Badge> : null}
              {food.isPopular ? (
                <Badge tone="primary">
                  <Flame className="size-3" aria-hidden /> Popular
                </Badge>
              ) : null}
              {soldOut ? <Badge tone="destructive">Sold out</Badge> : null}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  navigate(`/sign-in?next=/foods/${food.id}`);
                  return;
                }
                const added = favoriteService.toggle(user.id, food.id);
                toast.success(added ? "Saved to favourites" : "Removed from favourites");
              }}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remove from favourites" : "Save to favourites"}
              className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-full bg-white/85 shadow backdrop-blur"
            >
              <Heart
                className={isFavorite ? "size-5 fill-red-500 text-red-500" : "size-5 text-foreground/70"}
                aria-hidden
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden /> {food.prepTimeMinutes} min prep
            </span>
            {food.calories ? (
              <span className="inline-flex items-center gap-1.5">
                <Utensils className="size-3.5" aria-hidden /> {food.calories} kcal
              </span>
            ) : null}
            {vendor ? (
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-3.5" aria-hidden /> {formatNaira(vendor.deliveryFee)} delivery
              </span>
            ) : null}
            {food.stockCount !== null ? (
              <span className="inline-flex items-center gap-1.5">
                <Store className="size-3.5" aria-hidden />
                {food.stockCount > 0 ? `${food.stockCount} left today` : "Out of stock"}
              </span>
            ) : null}
          </div>
        </div>

        {/* ------------------------------------------------- ordering panel */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{food.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Rating value={rating} count={ratingCount} size="md" />
              <PriceTag entry={entry} size="lg" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{food.description}</p>
          </div>

          {/* The vendor is revealed only here, after the customer picks a dish. */}
          <GlassCard intensity="card" className="rounded-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Cooked by
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">
                  {vendor.logoText}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{vendor.name}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3" aria-hidden /> {vendor.area}, {vendor.city}
                  </p>
                </div>
              </div>
              <Badge tone={vendor.isOpen ? "success" : "muted"}>
                {vendor.isOpen ? "Open now" : "Closed"}
              </Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                <dt className="text-muted-foreground">Prep time</dt>
                <dd className="font-bold">{vendor.prepTimeMinutes} minutes</dd>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd className="font-bold">{formatNaira(vendor.deliveryFee)}</dd>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                <dt className="text-muted-foreground">Delivery radius</dt>
                <dd className="font-bold">{vendor.deliveryRadiusKm} km</dd>
              </div>
              <div className="rounded-xl border border-border bg-card px-3 py-2">
                <dt className="text-muted-foreground">Kitchen hours</dt>
                <dd className="font-bold">
                  {vendor.openTime}–{vendor.closeTime}
                </dd>
              </div>
            </dl>
            {vendor.deliveryNote ? (
              <p className="mt-2 text-xs text-muted-foreground">{vendor.deliveryNote}</p>
            ) : null}
            {distance !== null ? (
              <p
                className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                  canDeliver ? "text-primary" : "text-destructive"
                }`}
              >
                <Truck className="size-3.5" aria-hidden />
                {canDeliver
                  ? `Delivers to your selected address (${distance.toFixed(1)} km away)`
                  : `This kitchen does not deliver to your selected address (${distance.toFixed(1)} km, limit ${vendor.deliveryRadiusKm} km)`}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Set a delivery address to confirm this kitchen can reach you.
              </p>
            )}
          </GlassCard>

          {food.dietary.length > 0 || food.ingredients.length > 0 ? (
            <Card className="space-y-3 p-4">
              {food.ingredients.length > 0 ? (
                <div>
                  <p className="text-sm font-bold">Ingredients</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {food.ingredients.map((ingredient) => (
                      <span
                        key={ingredient}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {food.dietary.length > 0 ? (
                <div>
                  <p className="text-sm font-bold">Good to know</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {food.dietary.map((tag) => (
                      <Badge key={tag} tone="primary">
                        <BadgeCheck className="size-3" aria-hidden /> {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {cuisine ? (
                <p className="text-xs text-muted-foreground">
                  Cuisine: <strong className="text-foreground">{cuisine.name}</strong> · Category:{" "}
                  <strong className="text-foreground">{food.category}</strong>
                </p>
              ) : null}
            </Card>
          ) : null}

          {/* ------------------------------------------- customization */}
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
                    className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${
                      sizeId === option.id
                        ? "border-primary bg-primary/12 text-primary"
                        : "border-border hover:bg-accent"
                    }`}
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
                  choose up to {food.maxProteins}
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
                Add extras <Badge tone="muted">Optional</Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  choose up to {food.maxExtras}
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
              placeholder="e.g. no onions, extra pepper sauce on the side"
            />
          </Field>

          <GlassCard intensity="cardStrong" className="sticky bottom-20 space-y-3 rounded-2xl p-4 lg:bottom-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold">Quantity</p>
                <p className="text-xs text-muted-foreground">{formatNaira(unitPrice)} each</p>
              </div>
              <Stepper value={quantity} onChange={setQuantity} max={Math.max(1, food.stockCount ?? 20)} />
            </div>
            <div className="flex items-center justify-between border-t border-white/50 pt-3">
              <span className="text-sm font-semibold">Item total</span>
              <span className="text-xl font-extrabold">{formatNaira(total)}</span>
            </div>
            <Button fullWidth size="lg" disabled={unavailable || canDeliver === false} onClick={addToCart}>
              <ShoppingBag className="size-4" aria-hidden />
              {soldOut
                ? "Sold out"
                : unavailable
                  ? "Currently unavailable"
                  : canDeliver === false
                    ? "Not deliverable to your address"
                    : `Add to cart · ${formatNaira(total)}`}
            </Button>
            {food.proteinSelection === "required" && proteinIds.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                A protein choice is required for this dish.
              </p>
            ) : null}
          </GlassCard>
        </div>
      </div>

      {/* --------------------------------------------------------- reviews */}
      <section className="space-y-4">
        <SectionHeading
          title="Customer reviews"
          subtitle="Ratings and photos from customers. Verified badges only appear on genuine purchases."
        />
        {summary.count > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
            <RatingSummaryPanel summary={summary} />
            <div className="space-y-3">
              {reviews.slice(0, 5).map((review) => (
                <ReviewItem key={review.id} review={review} currentUser={user} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No reviews yet"
            message="Order this dish and you'll be able to leave the first review, with photos."
          />
        )}
      </section>

      {/* ------------------------------------------------- more from vendor */}
      {moreFromKitchen.length > 0 ? (
        <section>
          <SectionHeading
            title={`More from ${vendor.name}`}
            subtitle="Same kitchen, same delivery terms."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moreFromKitchen.map((item) => (
              <FoodCard key={item.food.id} entry={item} compact />
            ))}
          </div>
        </section>
      ) : null}

      {similar.length > 0 ? (
        <section>
          <SectionHeading
            title="You might also like"
            subtitle="Similar cuisine or shared ingredients."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <FoodCard key={item.food.id} entry={item} compact />
            ))}
          </div>
        </section>
      ) : null}
    </PageContainer>
  );
}
