import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bike,
  ChefHat,
  Clock,
  Download,
  Heart,
  Leaf,
  MapPin,
  Quote,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Truck,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";
import { Avatar, Badge, Button, EmptyState, GlassCard, Rating } from "@/components/ui";
import { CategoryChips, FoodCard } from "@/components/food";
import { BannerCarousel } from "@/components/banners";
import { PageContainer } from "@/components/layout/public";
import { useDb, useDbMemo, useInstallPrompt, useSession } from "@/hooks";
import { bannerService, foodService, recommendFoods, reviewService, settingsService } from "@/services";
import { formatNaira } from "@/lib/utils";
import { RatingSummaryPanel } from "@/components/reviews";

/**
 * The four steps shown under "How ordering works".
 *
 * They mirror the real flow in the app: dishes are discovered first, customised
 * with the options the kitchen actually configured, tracked through one shared
 * status model, then reviewed by the customer who received them.
 */
const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Find a dish",
    body: "Search by name, ingredient, cuisine or category. You choose the food first, the kitchen comes second.",
  },
  {
    icon: UtensilsCrossed,
    title: "Customise it",
    body: "Pick a protein, add extras, choose the size and leave instructions for the kitchen.",
  },
  {
    icon: Bike,
    title: "Track delivery",
    body: "Follow every stage from confirmed to on the way, with one timeline shared by every role.",
  },
  {
    icon: BadgeCheck,
    title: "Rate it",
    body: "After delivery you can review the dish and attach a photo to help the next customer.",
  },
];

/** The yellow brush stroke that sits under the highlighted word in the h1. */
function BrushUnderline() {
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      aria-hidden
      className="absolute inset-x-0 -bottom-1 h-2.5 w-full text-primary"
    >
      <path
        d="M2 9c34-6 76-8 118-5 24 2 48 4 78 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  const db = useDb();
  const { user } = useSession();
  const { canInstall, installed, promptInstall, supported } = useInstallPrompt();
  const [category, setCategory] = useState<string | null>(null);

  const settings = settingsService.get();
  const banners = bannerService.listActive();

  const popular = useDbMemo(() => foodService.popular(8));
  const recent = useDbMemo(() => foodService.recent(2));

  /** The two photographs used in the hero: one large, one in the floating card. */
  const heroDishes = useDbMemo(() => {
    const available = foodService.listDecorated().filter((entry) => entry.food.isAvailable);
    const lead = popular[0] ?? available[0] ?? null;
    const second = available.find((entry) => entry.food.id !== lead?.food.id) ?? null;
    return { lead, second };
  });

  const recommendations = useDbMemo(
    () => recommendFoods({ userId: user?.id ?? null, limit: 4 }),
    [user?.id],
  );

  const verifiedReviews = useDbMemo(() =>
    reviewService.visible().filter((review) => review.isVerifiedPurchase).slice(0, 3),
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
        ? Math.round((visible.reduce((sum, review) => sum + review.rating, 0) / visible.length) * 10) /
          10
        : 0,
      count: visible.length,
      distribution,
    };
  });

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

  const featuredCategory = useDbMemo(() => {
    const all = foodService.listDecorated().filter((entry) => entry.food.isAvailable);
    if (!category) return all.slice(0, 4);
    return all.filter((entry) => entry.food.category === category).slice(0, 4);
  }, [category]);

  const kitchenCount = useDbMemo(() => db.vendors.filter((vendor) => vendor.status === "approved").length);
  const dishCount = useDbMemo(() => db.foods.filter((food) => food.isAvailable).length);

  const hero = heroDishes.lead;
  const secondary = heroDishes.second;

  return (
    <div className="pb-4">
      {/* --------------------------------------------------------------- hero */}
      <section className="relative">
        <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:pt-14">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div className="reveal-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-foreground backdrop-blur-xl">
                <Heart className="size-3.5 text-foreground" aria-hidden />
                Recommended kitchens near you
              </span>

              <h1 className="mt-6 text-[2.7rem] font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.15rem]">
                We serve delicious{" "}
                <span className="relative inline-block whitespace-nowrap">
                  food
                  <BrushUnderline />
                </span>{" "}
                delivered hot
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {settings.tagline} Search any dish, customise it with your own protein and extras, then
                follow your delivery through every stage. Prices in naira, nothing added at checkout.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/foods">
                  <Button size="lg" className="text-base">
                    Order now
                    <ArrowRight className="size-5" aria-hidden />
                  </Button>
                </Link>
                <Link to="/#how-it-works">
                  <Button size="lg" variant="glass" className="text-base">
                    How it works
                  </Button>
                </Link>
              </div>

              {/* Trust strip: kept directly under the actions so it reads as part
                  of the hero rather than a separate, low band. */}
              <dl className="mt-9 grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Average delivery",
                    value: `${settings.defaultDeliveryMinutes} min`,
                    icon: Clock,
                  },
                  {
                    label: "Customer rating",
                    value: overallSummary.rating ? `${overallSummary.rating}/5` : "New",
                    icon: Star,
                  },
                  { label: "Kitchens live", value: String(kitchenCount), icon: Store },
                ].map((stat) => (
                  <GlassCard
                    key={stat.label}
                    intensity="card"
                    className="flex flex-col gap-1 rounded-2xl p-3.5"
                  >
                    <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <stat.icon className="size-3.5 text-primary" aria-hidden />
                      <span className="truncate">{stat.label}</span>
                    </dt>
                    <dd className="text-2xl font-extrabold tracking-tight">{stat.value}</dd>
                  </GlassCard>
                ))}
              </dl>
            </div>

            {/* Two photographs only: the hero plate and the floating dish card. */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <span
                className="blob blob-hero absolute -right-3 top-6 h-[74%] w-[80%] bg-primary"
                aria-hidden
              />
              {hero ? (
                <Link
                  to={`/foods/${hero.food.id}`}
                  className="group relative z-10 block overflow-hidden rounded-[2.5rem] border-4 border-white/70 shadow-2xl shadow-primary-deep/25"
                >
                  <img
                    src={hero.food.image}
                    alt={hero.food.name}
                    loading="eager"
                    className="img-cover aspect-[4/5] transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute inset-x-5 bottom-5 flex items-baseline justify-between gap-3 text-white">
                    <span className="text-lg font-extrabold">{hero.food.name}</span>
                    <span className="text-lg font-extrabold">
                      {formatNaira(hero.effectivePrice)}
                    </span>
                  </span>
                </Link>
              ) : (
                <div className="relative z-10 aspect-[4/5] w-full rounded-[2.5rem] border-4 border-white/70 bg-muted" />
              )}

              {/* Anchored above the hero's own price label so the two never
                  stack on top of each other. */}
              <GlassCard
                intensity="cardStrong"
                className="animate-float absolute -left-4 top-14 z-20 w-[15rem] rounded-3xl p-3"
              >
                {secondary ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={secondary.food.image}
                      alt={secondary.food.name}
                      loading="lazy"
                      className="size-14 shrink-0 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{secondary.food.name}</p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">
                          {formatNaira(secondary.effectivePrice)}
                        </span>
                        <Rating value={secondary.rating} />
                      </p>
                    </div>
                  </div>
                ) : null}
              </GlassCard>

              <GlassCard
                intensity="cardStrong"
                className="animate-float absolute -top-4 right-4 z-20 flex items-center gap-2 rounded-full px-4 py-2.5"
              >
                <Star className="size-4 fill-primary text-primary" aria-hidden />
                <span className="text-sm font-extrabold">
                  {overallSummary.rating || "New"}
                  {overallSummary.count > 0 ? ` from ${overallSummary.count} reviews` : ""}
                </span>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- highlights */}
      {banners.length > 0 ? (
        <PageContainer className="py-10">
          <BannerCarousel banners={banners} />
        </PageContainer>
      ) : null}

      {/* ---------------------------------------------------- most popular */}
      <PageContainer className="pt-4">
        <div className="mx-auto mb-7 max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
            <Utensils className="size-3.5" aria-hidden /> Most popular food
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Dishes people are ordering right now
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Marked popular by their own kitchens, never a paid placement. {dishCount} dishes across{" "}
            {kitchenCount} kitchens.
          </p>
        </div>

        <CategoryChips
          items={categories}
          value={category}
          onChange={setCategory}
          allLabel="Everything"
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCategory.map((entry) => (
            <FoodCard key={entry.food.id} entry={entry} />
          ))}
        </div>

        {featuredCategory.length === 0 ? (
          <EmptyState
            title="Nothing in this category yet"
            message="Kitchens publish dishes continuously. Try another category or browse everything."
            action={
              <Link to="/foods">
                <Button>Browse all dishes</Button>
              </Link>
            }
          />
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular
            .filter(
              (entry) => !featuredCategory.some((shown) => shown.food.id === entry.food.id),
            )
            .slice(0, 4)
            .map((entry) => (
              <FoodCard key={entry.food.id} entry={entry} compact />
            ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link to="/foods">
            <Button size="lg" variant="glass">
              See the full menu
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </PageContainer>

      {/* ----------------------------------------------------- personalised */}
      <PageContainer className="py-10">
        <GlassCard intensity="cardStrong" className="overflow-hidden rounded-[2rem] p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <Badge tone="primary">
                <ShieldCheck className="size-3" aria-hidden />
                {user ? "Picked for you" : "Your account"}
              </Badge>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {user
                  ? `Welcome back, ${user.fullName.split(" ")[0]}`
                  : "Sign in and the menu follows your taste"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {user
                  ? "These suggestions come from your order history, favourites and dietary preferences. Every card states why it was chosen."
                  : "Create an account to get suggestions from your order history, save favourites, track deliveries live and review what you ate. Ordering, customisation and tracking all live behind that sign in."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <Link to="/app">
                    <Button>
                      Open my dashboard
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/sign-up">
                      <Button>
                        Create a free account
                        <ArrowRight className="size-4" aria-hidden />
                      </Button>
                    </Link>
                    <Link to="/sign-in">
                      <Button variant="glass">Sign in</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {(user && recommendations.length > 0
                ? recommendations.map((recommendation) => recommendation.entry)
                : recent.length > 0
                  ? recent.map((entry) => entry)
                  : popular.slice(0, 2)
              )
                .slice(0, 4)
                .map((entry) => (
                  <FoodCard key={entry.food.id} entry={entry} compact />
                ))}
            </div>
          </div>
        </GlassCard>
      </PageContainer>

      {/* ------------------------------------------------------ how it works */}
      <PageContainer id="how-it-works" className="scroll-mt-28">
        <div className="mx-auto mb-8 max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
            <Bike className="size-3.5" aria-hidden /> Why order here
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Fresh food in four simple steps
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <GlassCard
              key={step.title}
              intensity="card"
              className="group rounded-3xl p-6 text-center transition-transform duration-300 hover:-translate-y-1"
            >
              <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 group-hover:scale-105">
                <step.icon className="size-7" aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-extrabold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </GlassCard>
          ))}
        </div>
      </PageContainer>

      {/* ---------------------------------------------------------- about us */}
      <PageContainer className="py-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <span
              className="blob blob-card absolute -left-4 top-8 h-[70%] w-[74%] bg-primary"
              aria-hidden
            />
            {hero ? (
              <img
                src={hero.food.image}
                alt=""
                loading="lazy"
                className="relative z-10 aspect-[5/4] w-full rounded-[2.5rem] border-4 border-white/70 object-cover shadow-2xl shadow-primary-deep/20"
              />
            ) : null}
            <GlassCard
              intensity="cardStrong"
              className="animate-float absolute -bottom-6 right-2 z-20 flex items-center gap-3 rounded-3xl px-4 py-3"
            >
              <Truck className="size-5 text-primary" aria-hidden />
              <span className="text-sm font-extrabold">
                {kitchenCount} kitchens live, {dishCount} dishes
              </span>
            </GlassCard>
          </div>

          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
              <ChefHat className="size-3.5" aria-hidden /> About us
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              A marketplace of independent kitchens
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Food Delivery System connects you with local food businesses. Every kitchen sets its own
              menu, its own proteins and extras, its own delivery fee and radius, and its own hours. The
              platform keeps the rules identical for everyone: one fee model, one order status model, one
              review standard.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Leaf, title: "Dietary filters", body: "Vegetarian, halal, gluten free and more." },
                { icon: MapPin, title: "Delivery zones", body: "Each kitchen sets its own radius and fee." },
                { icon: ShoppingBag, title: "One cart", body: "Order from several kitchens in one checkout." },
                { icon: Clock, title: "Honest timing", body: "Preparation time is published by the kitchen." },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-2xl bg-white/50 p-3.5 backdrop-blur-xl">
                  <item.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <span className="block text-sm font-bold">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageContainer>

      {/* ------------------------------------------------------- customers */}
      <PageContainer>
        <div className="mx-auto mb-8 max-w-xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]">
            <Quote className="size-3.5" aria-hidden /> Customers say
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Verified reviews, photos included
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Only reviews attached to a delivered order carry the verified badge.
          </p>
        </div>

        {verifiedReviews.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {verifiedReviews.map((review) => (
              <GlassCard key={review.id} intensity="card" className="flex flex-col rounded-3xl p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={review.userName} className="size-11" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{review.userName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {db.foods.find((food) => food.id === review.foodId)?.name ?? "Dish"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex gap-0.5" aria-hidden>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={
                          star <= review.rating
                            ? "size-4 fill-primary text-primary"
                            : "size-4 text-muted-foreground/30"
                        }
                      />
                    ))}
                  </span>
                  <Badge tone="success">
                    <BadgeCheck className="size-3" aria-hidden /> Verified
                  </Badge>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed">{review.comment}</p>
                {review.photos.length > 0 ? (
                  <img
                    src={review.photos[0]}
                    alt="Photo attached to a customer review"
                    loading="lazy"
                    className="mt-4 h-40 w-full rounded-2xl object-cover"
                  />
                ) : null}
                <p className="mt-4 flex items-center gap-1.5 border-t border-white/50 pt-3 text-xs text-muted-foreground">
                  <Store className="size-3.5" aria-hidden />
                  {db.vendors.find((vendor) => vendor.id === review.vendorId)?.name}
                </p>
              </GlassCard>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No verified reviews yet"
            message="Once orders are delivered, verified reviews with photos will appear here."
          />
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <RatingSummaryPanel summary={overallSummary} />
          <GlassCard intensity="card" className="rounded-3xl p-5 lg:col-span-2">
            <h3 className="flex items-center gap-2 text-base font-extrabold">
              <ShieldCheck className="size-5 text-primary" aria-hidden /> How reviews stay honest
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <li>Only a delivered order can leave a review.</li>
              <li>One review per dish per order, editable later.</li>
              <li>Kitchens reply in public, the merchant can hide abuse.</li>
            </ul>
          </GlassCard>
        </div>
      </PageContainer>

      {/* --------------------------------------------------------- partners */}
      <PageContainer className="py-12">
        <div className="overflow-hidden rounded-[2rem] bg-primary-deep text-white/85">
          <div className="grid gap-8 p-6 lg:grid-cols-2 lg:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary-foreground">
                <Store className="size-3.5" aria-hidden /> For business owners
              </span>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Sell on Food Delivery System
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70">
                Register your food business, publish dishes with photos, configure proteins and extras,
                manage live inventory and seasonal specials, set your own delivery fee and radius, assign
                your own riders and answer customer feedback. The merchant approves each kitchen before
                it goes live and monitors orders, platform fees and vendors from one console.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/vendor-signup">
                  <Button size="lg">
                    <ChefHat className="size-4" aria-hidden /> Become a vendor
                  </Button>
                </Link>
                <Link to="/partners">
                  <Button size="lg" variant="glass">
                    How partnering works
                  </Button>
                </Link>
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Store, title: "Live inventory", body: "Sold out dishes leave the marketplace instantly." },
                { icon: Truck, title: "Your delivery terms", body: "Set your own timeline, fee and radius." },
                { icon: Bike, title: "Rider management", body: "Add, edit, activate and assign your riders." },
                { icon: Star, title: "Seasonal specials", body: "Publish promotional pricing with dates." },
              ].map((item) => (
                <li key={item.title} className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
                  <item.icon className="size-5 text-primary" aria-hidden />
                  <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-white/60">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PageContainer>

      {/* ---------------------------------------------------------- install */}
      <PageContainer id="install" className="scroll-mt-28 pb-4">
        <GlassCard intensity="cardStrong" className="rounded-[2rem] p-6 lg:p-8">
          <div className="grid items-center gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <Badge tone="primary">
                <Smartphone className="size-3" aria-hidden /> Progressive web app
              </Badge>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Install Food Delivery System on your phone
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                Installing adds a home screen icon, opens full screen without browser chrome and keeps
                the app shell cached so it loads instantly. There is no app store listing for this
                project, installation is handled entirely by your browser.
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
                  <div className="rounded-2xl border border-white/50 bg-white/55 p-4 backdrop-blur-xl">
                    <p className="text-sm font-bold">
                      {supported
                        ? "Use your browser's install option"
                        : "This browser cannot install web apps"}
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>
                        <strong>Chrome or Edge (desktop):</strong> the install icon in the address bar,
                        or the menu then "Install Food Delivery System".
                      </li>
                      <li>
                        <strong>Android:</strong> menu then "Add to Home screen".
                      </li>
                      <li>
                        <strong>iPhone or iPad (Safari):</strong> Share then "Add to Home Screen".
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
                { label: "Install prompt", value: "Browser native" },
                { label: "Full screen", value: "Standalone" },
                { label: "Home screen icon", value: "192 and 512px" },
              ].map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/55 px-4 py-3 backdrop-blur-xl"
                >
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-xs font-bold text-foreground">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </PageContainer>
    </div>
  );
}
