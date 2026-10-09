import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  ChefHat,
  Clock,
  Download,
  Leaf,
  MapPin,
  Search,
  Share2,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
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
  Rating,
  SectionHeading,
} from "@/components/ui";
import { CategoryChips, FoodCard } from "@/components/food";
import { BannerCarousel } from "@/components/banners";
import { LocationControl, PageContainer } from "@/components/layout/public";
import { useDb, useDbMemo, useInstallPrompt, useSession } from "@/hooks";
import { bannerService, foodService, recommendFoods, reviewService, settingsService } from "@/services";
import { distanceKm, formatNaira } from "@/lib/utils";
import { RatingSummaryPanel } from "@/components/reviews";

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Find a dish",
    body: "Search by name, ingredient, cuisine or category. You discover the food first — the kitchen comes second.",
  },
  {
    icon: Utensils,
    title: "Customise it",
    body: "Choose a protein, add extras, set the size and leave special instructions for the kitchen.",
  },
  {
    icon: ShoppingBag,
    title: "Check out",
    body: "One cart, multiple kitchens. Every fee in naira is shown before you confirm.",
  },
  {
    icon: Bike,
    title: "Track delivery",
    body: "Follow each stage — confirmed, cooking, picked up, on the way — from your phone.",
  },
  {
    icon: Leaf,
    title: "Enjoy",
    body: "Food arrives hot, then rate the kitchen and add photos to help the next customer.",
  },
];

export default function LandingPage() {
  const db = useDb();
  const { user } = useSession();
  const { canInstall, installed, promptInstall, supported } = useInstallPrompt();
  const [category, setCategory] = useState<string | null>(null);

  const settings = settingsService.get();
  const banners = bannerService.listActive();

  const popular = useDbMemo(() => foodService.popular(8));
  const seasonal = useDbMemo(() => foodService.seasonal(4));
  const recent = useDbMemo(() => foodService.recent(4));

  const recommendations = useDbMemo(
    () => recommendFoods({ userId: user?.id ?? null, limit: 4 }),
    [user?.id],
  );

  const deliveryAddress = useMemo(() => {
    if (!user) return null;
    return (
      db.addresses.find((a) => a.id === db.delivery.addressId) ??
      db.addresses.find((a) => a.userId === user.id && a.isDefault) ??
      db.addresses.find((a) => a.userId === user.id) ??
      null
    );
  }, [db, user]);

  /** Dishes a vendor can actually deliver to the selected address. */
  const nearYou = useDbMemo(() => {
    const all = foodService.listDecorated().filter((entry) => entry.food.isAvailable);
    if (!deliveryAddress) return all.slice(0, 4);
    return all
      .filter((entry) => {
        const km = distanceKm(deliveryAddress, entry.vendor);
        return km <= entry.vendor.deliveryRadiusKm;
      })
      .slice(0, 4);
  }, [deliveryAddress]);

  const featuredCategory = useDbMemo(() => {
    const all = foodService.listDecorated().filter((e) => e.food.isAvailable);
    if (!category) return all.slice(0, 4);
    return all.filter((e) => e.food.category === category).slice(0, 4);
  }, [category]);

  const verifiedReviews = useDbMemo(() =>
    reviewService.visible().filter((r) => r.isVerifiedPurchase).slice(0, 3),
  );

  const overallSummary = useDbMemo(() => {
    const visible = reviewService.visible();
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
    for (const review of visible) {
      const key = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      distribution[key] = (distribution[key] ?? 0) + 1;
    }
    return {
      rating: visible.length
        ? Math.round((visible.reduce((sum, r) => sum + r.rating, 0) / visible.length) * 10) / 10
        : 0,
      count: visible.length,
      distribution,
    };
  });
  const overallRating = overallSummary.rating;

  const categories = useDbMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of foodService.listDecorated()) {
      if (!entry.food.isAvailable) continue;
      counts.set(entry.food.category, (counts.get(entry.food.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: value, count }));
  });

  const heroImages = useDbMemo(() => {
    const images = foodService
      .listDecorated()
      .filter((e) => e.food.isAvailable)
      .slice(0, 2)
      .map((e) => e.food);
    return images;
  });

  return (
    <div className="space-y-14 pb-4">
      {/* ------------------------------------------------------------ hero */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:pt-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Fresh food from kitchens near you,{" "}
              <span className="text-primary">delivered hot.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              {settings.tagline} Search any dish, customise it with your own protein and extras, then
              watch your delivery move through every stage. Prices in naira, no surprises at checkout.
            </p>

            <div className="mt-6 space-y-3">
              {user && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <LocationControl className="sm:min-w-56" />
                </div>
              )}
              <div className="flex flex-1 flex-wrap gap-2">
                <Link to="/foods" className="flex-1 sm:flex-none">
                  <Button size="lg" fullWidth>
                    Order now
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                </Link>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById("how-it-works");
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="flex-1 sm:flex-none"
                >
                  <Button size="lg" variant="outline" fullWidth>
                    How it works
                  </Button>
                </a>
              </div>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3 text-center sm:max-w-md">
              {[
                { label: "Average delivery", value: `${settings.defaultDeliveryMinutes} min`, icon: Clock },
                { label: "Customer rating", value: overallRating ? `${overallRating}/5` : "New", icon: Star },
                { label: "Tracked orders", value: String(db.orders.length), icon: Truck },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <stat.icon className="size-3" aria-hidden /> {stat.label}
                  </dt>
                  <dd className="mt-1 text-lg font-extrabold">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* food photography collage */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {heroImages.map((food) => (
                <Link
                  key={food.id}
                  to={`/foods/${food.id}`}
                  className="group relative aspect-square overflow-hidden rounded-3xl border border-white/50 shadow-xl shadow-primary-deep/10"
                >
                  <img
                    src={food.image}
                    alt={food.name}
                    loading="eager"
                    className="img-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-2 bottom-2 rounded-2xl bg-white/80 px-3 py-2 backdrop-blur-xl">
                    <span className="block truncate text-xs font-bold">{food.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {formatNaira(food.price)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            <GlassCard
              intensity="cardStrong"
              className="absolute -bottom-4 left-4 hidden items-center gap-2 rounded-2xl px-3 py-2 sm:flex"
            >
              <TrendingUp className="size-4 text-primary" aria-hidden />
              <span className="text-xs font-bold">
                {db.vendors.filter((v) => v.status === "approved").length} kitchens live, {db.foods.filter((f) => f.isAvailable).length} dishes
              </span>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- banners */}
      <PageContainer className="py-0">
        <BannerCarousel banners={banners} />
      </PageContainer>

      {/* ------------------------------------------------- categories strip */}
      <PageContainer className="py-0">
        <SectionHeading
          title="What are you in the mood for?"
          subtitle="Every category is managed by the platform — merchants can add and rename them."
          action={
            <Link to="/foods">
              <Button variant="outline" size="sm">
                Browse all dishes <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          }
        />
        <CategoryChips items={categories} value={category} onChange={setCategory} allLabel="Everything" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCategory.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} />
          ))}
        </div>
        {featuredCategory.length === 0 ? (
          <EmptyState
            title="Nothing in this category yet"
            message="Merchants publish dishes continuously. Try another category or browse everything."
            action={
              <Link to="/foods">
                <Button>Browse all dishes</Button>
              </Link>
            }
          />
        ) : null}
      </PageContainer>

      {/* ---------------------------------------------------------- popular */}
      <PageContainer className="py-0">
        <SectionHeading
          title="Popular right now"
          subtitle="Marked as popular by their own kitchens — not a paid placement."
          action={
            <Link to="/foods?sort=rating">
              <Button variant="outline" size="sm">
                See top rated <ArrowRight className="size-4" aria-hidden />
              </Button>
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} />
          ))}
        </div>
      </PageContainer>

      {/* --------------------------------------------------- recommendations */}
      <PageContainer className="py-0">
        <SectionHeading
          title={user ? `Picked for you, ${user.fullName.split(" ")[0]}` : "Recommended dishes"}
          subtitle={
            user
              ? "Rule-based suggestions from your order history, favourites and dietary preferences."
              : "Sign in to get suggestions based on your order history and dietary preferences."
          }
          action={
            !user ? (
              <Link to="/sign-up">
                <Button size="sm">Create an account</Button>
              </Link>
            ) : null
          }
        />
        {recommendations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendations.map((recommendation) => (
              <div key={recommendation.entry.food.id} className="flex flex-col gap-2">
                <FoodCard entry={recommendation.entry} compact />
                <p className="flex items-start gap-1.5 px-1 text-[11px] font-medium text-muted-foreground">
                  <TrendingUp className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden />
                  {recommendation.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.slice(0, 4).map((entry) => (
              <FoodCard key={entry.food.id} entry={entry} compact />
            ))}
          </div>
        )}
      </PageContainer>

      {/* ------------------------------------------------------- near you */}
      <PageContainer className="py-0">
        <SectionHeading
          title="Available near you"
          subtitle={
            deliveryAddress
              ? `Showing dishes that can reach ${deliveryAddress.label} · ${deliveryAddress.area}, based on each kitchen's own delivery radius.`
              : "Set a delivery address and we'll only show kitchens that can actually reach you."
          }
          action={!deliveryAddress ? <LocationControl className="hidden sm:flex" /> : null}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {nearYou.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} />
          ))}
        </div>
      </PageContainer>

      {/* -------------------------------------------------------- seasonal */}
      {seasonal.length > 0 ? (
        <PageContainer className="py-0">
          <SectionHeading
            title="Seasonal specials"
            subtitle="Limited-time pricing published by each kitchen. The discount is applied at checkout."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {seasonal.map((entry) => (
              <FoodCard key={entry.food.id} entry={entry} />
            ))}
          </div>
        </PageContainer>
      ) : null}

      {/* --------------------------------------------------- just added */}
      <PageContainer className="py-0">
        <SectionHeading title="Just added to the menu" subtitle="The newest dishes across every kitchen." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} compact />
          ))}
        </div>
      </PageContainer>

      {/* ---------------------------------------------------- how it works */}
      <PageContainer id="how-it-works" className="py-0">
        <SectionHeading
          title="How ordering works"
          subtitle="Five steps from discovery to dinner."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_IT_WORKS.map((step, index) => (
            <GlassCard key={step.title} intensity="card" className="rounded-2xl p-4">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <step.icon className="size-5" aria-hidden />
              </span>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Step {index + 1}
              </p>
              <h3 className="text-sm font-extrabold">{step.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
            </GlassCard>
          ))}
        </div>
      </PageContainer>

      {/* -------------------------------------------------------- reviews */}
      <PageContainer className="py-0">
        <SectionHeading
          title="Verified customer reviews"
          subtitle="Only reviews attached to a delivered order carry the verified badge. Photos come from customers."
          action={
            <Link to="/foods">
              <Button variant="outline" size="sm">
                Browse and review
              </Button>
            </Link>
          }
        />
        {verifiedReviews.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {verifiedReviews.map((review) => (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{review.userName}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="flex gap-0.5" aria-hidden>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={
                                star <= review.rating
                                  ? "size-3.5 fill-amber-400 text-amber-400"
                                  : "size-3.5 text-muted-foreground/30"
                              }
                            />
                          ))}
                        </span>
                        <Badge tone="success">
                          <BadgeCheck className="size-3" aria-hidden /> Verified purchase
                        </Badge>
                      </div>
                    </div>
                    <Rating value={review.rating} />
                  </div>
                  <p className="mt-2 text-sm">{review.comment}</p>
                  {review.photos.length > 0 ? (
                    <img
                      src={review.photos[0]}
                      alt="Customer photo"
                      className="mt-3 h-32 w-full rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Store className="size-3" aria-hidden />
                    {db.vendors.find((v) => v.id === review.vendorId)?.name} ·{" "}
                    {db.foods.find((f) => f.id === review.foodId)?.name}
                  </p>
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              <RatingSummaryPanel summary={overallSummary} />
              <GlassCard intensity="card" className="rounded-2xl p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <Share2 className="size-4 text-primary" aria-hidden /> How reviews work
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li>• Only customers with a delivered order can leave a verified review.</li>
                  <li>• Each customer can review a dish once per order and edit it later.</li>
                  <li>• Kitchens can reply publicly; the merchant can hide abusive reviews.</li>
                </ul>
              </GlassCard>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No verified reviews yet"
            message="Once orders are delivered, verified reviews with photos will appear here."
          />
        )}
      </PageContainer>

      {/* ------------------------------------------------------- vendors */}
      <PageContainer className="py-0">
        <GlassCard intensity="cardStrong" className="overflow-hidden rounded-3xl">
          <div className="grid gap-6 p-6 lg:grid-cols-2 lg:p-8">
            <div>
              <Badge tone="primary" className="mb-3">
                <Store className="size-3" aria-hidden /> For business owners
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Run your kitchen from one dashboard
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Register your food business, publish dishes with photos, set your own proteins and
                extras, manage live inventory and seasonal specials, control your delivery fee and
                radius, assign riders and answer customer feedback — all from the vendor console.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  "Publish and edit dishes with a full preview before going live",
                  "Configure proteins, extras, serving sizes and selection limits",
                  "Track every order through to delivery with a shared status model",
                  "Reply to reviews and manage your own rider fleet",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/vendor-signup">
                  <Button size="lg">
                    <ChefHat className="size-4" aria-hidden /> Become a vendor
                  </Button>
                </Link>
                <Link to="/sign-in">
                  <Button size="lg" variant="outline">
                    Vendor sign in
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Store, title: "Live inventory", body: "Sold-out dishes drop off the marketplace instantly." },
                { icon: Clock, title: "Your delivery terms", body: "Set your own timeline, fee and delivery radius." },
                { icon: Bike, title: "Rider management", body: "Add, edit, activate and assign your own riders." },
                { icon: TrendingUp, title: "Seasonal specials", body: "Publish promotional pricing with a start and end date." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/50 bg-white/60 p-4">
                  <item.icon className="size-5 text-primary" aria-hidden />
                  <p className="mt-2 text-sm font-bold">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </PageContainer>

      {/* --------------------------------------------------------- install */}
      <PageContainer className="py-0" id="install">
        <GlassCard intensity="cardStrong" className="rounded-3xl p-6 lg:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <Badge tone="primary" className="mb-3">
                <Smartphone className="size-3" aria-hidden /> Progressive web app
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Install Food Delivery System on your phone
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Installing adds a home-screen icon, opens full-screen without browser chrome and keeps
                the app shell cached so it loads instantly. There are no app-store listings for this
                project — installation is handled entirely by your browser.
              </p>

              <div className="mt-5">
                {installed ? (
                  <Badge tone="success">
                    <BadgeCheck className="size-3" aria-hidden /> Already installed on this device
                  </Badge>
                ) : canInstall ? (
                  <Button size="lg" onClick={() => void promptInstall()}>
                    <Download className="size-4" aria-hidden /> Install the app
                  </Button>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-sm font-bold">
                      {supported
                        ? "Use your browser's install option"
                        : "This browser cannot install web apps"}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>
                        <strong>Chrome / Edge (desktop):</strong> the install icon in the address bar,
                        or ⋮ menu → “Install Nma's Kitchen”.
                      </li>
                      <li>
                        <strong>Android:</strong> ⋮ menu → “Add to Home screen”.
                      </li>
                      <li>
                        <strong>iPhone / iPad (Safari):</strong> Share → “Add to Home Screen”.
                      </li>
                    </ul>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      The app works fully in a normal browser even when installation is unavailable.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { label: "Offline app shell", value: "Cached" },
                { label: "Install prompt", value: "Browser-native" },
                { label: "Full screen", value: "Standalone" },
                { label: "Home screen icon", value: "192 & 512px" },
              ].map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 px-4 py-3"
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-xs font-bold text-primary">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </PageContainer>

      {/* ------------------------------------------------------ trust strip */}
      <PageContainer className="py-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MapPin, title: "Delivery zones", body: "Each kitchen sets its own radius and fee." },
            { icon: Truck, title: "Live status history", body: "Every status change is timestamped and kept." },
            { icon: Star, title: "Honest reviews", body: "Verified badges only for real purchases." },
            { icon: Leaf, title: "Dietary filters", body: "Vegetarian, halal, gluten-free and more." },
          ].map((item) => (
            <Card key={item.title} className="flex items-start gap-3 p-4">
              <item.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-bold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
