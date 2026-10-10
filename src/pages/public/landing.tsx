import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bike,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Plus,
  Quote,
  Star,
  UtensilsCrossed,
} from "lucide-react";
import { Avatar, Button, GlassCard } from "@/components/ui";
import { PageContainer } from "@/components/layout/public";
import { useDbMemo } from "@/hooks";
import { cuisineService, foodService, reviewService, settingsService } from "@/services";
import { cn } from "@/lib/utils";

/**
 * The public landing page.
 *
 * This is deliberately a storefront, not a dashboard: it sells the service and
 * hands the reader off to the menu. Nothing that a signed-in account owns
 * belongs here, no prices, no per-dish records, no live account figures, so
 * the page reads as the same brand as `inspo/landing page.jpeg` rather than as
 * a screen of the app. The one rule that shapes every block below: photographs
 * are shown as photographs, and any number that appears is real and explained.
 */

/** The three promises under "Why choose our food", one line each, as in the reference. */
const PROMISES = [
  {
    icon: ChefHat,
    title: "Quality food",
    body: "Only kitchens approved by the platform cook here, and every dish lists its own ingredients.",
  },
  {
    icon: UtensilsCrossed,
    title: "Super taste",
    body: "Make a dish yours with the proteins and extras its kitchen actually offers.",
  },
  {
    icon: Bike,
    title: "Fast delivery",
    body: "Follow your order from confirmed to your door, stage by stage.",
  },
];

/** Cuisines shown per page in the popular-foods rail. */
const PAGE_SIZE = 3;

/** Photographs used when the catalogue is still empty (first run, cleared data). */
const FALLBACK_PHOTOS = [
  "/foods/steak-and-eggs.jpg",
  "/foods/pepperoni-pizza.jpg",
  "/foods/burger-wings-fries.jpg",
  "/foods/birria-tacos.jpg",
  "/foods/steak-shawarma.jpg",
  "/foods/party-burger-platter.jpg",
  "/foods/sandwich-platter.jpg",
  "/foods/bacon-cheeseburger.jpg",
];

/** The yellow brush stroke the reference design draws under a heading word. */
function Brush({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 14"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("absolute inset-x-0 -bottom-1.5 h-2.5 w-full text-primary", className)}
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

/** Centred section heading with one brush-underlined word. */
function SectionTitle({
  lead,
  highlight,
  id,
  align = "center",
}: {
  lead: string;
  highlight: string;
  id?: string;
  align?: "center" | "start";
}) {
  return (
    <h2
      id={id}
      className={cn(
        "scroll-mt-28 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl",
        align === "center" ? "text-center" : "text-left",
      )}
    >
      {lead}{" "}
      <span className="relative inline-block">
        {highlight}
        <Brush />
      </span>
    </h2>
  );
}

/**
 * A circular rating row.
 *
 * A dish is only rated once somebody has reviewed it, so an unrated dish shows
 * its review count instead of a fabricated star score.
 */
function Stars({
  value,
  count,
  showValue = true,
  className,
}: {
  value: number;
  count: number;
  showValue?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "size-3 sm:size-3.5",
              star <= Math.round(value)
                ? "fill-primary text-primary"
                : "text-muted-foreground/35",
            )}
          />
        ))}
      </span>
      {showValue ? (
        <span className="text-[11px] font-semibold text-muted-foreground">
          {count > 0 ? `${value.toFixed(1)} (${count})` : value > 0 ? value.toFixed(1) : "New"}
        </span>
      ) : null}
      <span className="sr-only">
        {count > 0
          ? `Rated ${value.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`
          : "Not yet rated"}
      </span>
    </span>
  );
}

export default function LandingPage() {
  const settings = settingsService.get();
  const [page, setPage] = useState(0);
  const [quote, setQuote] = useState(0);

  /** Every distinct photograph on sale, in popularity order. */
  const photos = useDbMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const entry of foodService.popular(24)) {
      if (seen.has(entry.food.image)) continue;
      seen.add(entry.food.image);
      list.push(entry.food.image);
    }
    return list;
  });
  const shot = (index: number) => photos[index] ?? FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];

  /**
   * The cuisine cards in the popular rail: a cuisine only appears once it has a
   * dish on sale, and it carries the rating of its best-reviewed dish so the
   * stars always describe something real.
   */
  const cuisines = useDbMemo(() => {
    const decorated = foodService.listDecorated().filter((entry) => entry.food.isAvailable);
    return cuisineService
      .listActive()
      .map((cuisine) => {
        const dishes = decorated.filter((entry) => entry.food.cuisineId === cuisine.id);
        const lead = [...dishes].sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount)[0];
        return { cuisine, count: dishes.length, lead };
      })
      .filter((group) => group.count > 0 && group.lead)
      .sort((a, b) => b.count - a.count);
  });

  /** Customer quotes: verified purchases first, since those are the defensible ones. */
  const quotes = useDbMemo(() => {
    const visible = reviewService.visible();
    const verified = visible.filter((review) => review.isVerifiedPurchase);
    return verified.length > 0 ? verified : visible;
  });

  const pageCount = Math.max(1, Math.ceil(cuisines.length / PAGE_SIZE));
  const shelf = cuisines.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const active = quotes.length > 0 ? quotes[quote % quotes.length] : null;

  return (
    <div className="overflow-hidden">
      {/* ------------------------------------------------------------- hero */}
      <section className="relative">
        <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:pt-12">
          <div className="grid items-center gap-4 lg:grid-cols-2 lg:gap-12">
            <div className="reveal-up">
              <h1 className="text-[1.6rem] font-extrabold leading-[1.06] tracking-tight sm:text-4xl lg:text-[3.5rem]">
                We serve delicious{" "}
                <span className="relative inline-block text-primary-ink">
                  food
                  <Brush />
                </span>
              </h1>

              <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground sm:mt-5 sm:text-base">
                {settings.tagline} Search a dish, make it yours, and follow it until it reaches your
                door.
              </p>

              {/* Ordering needs an account, so the call to action creates one. */}
              <Link to="/sign-up" className="mt-4 inline-flex sm:mt-7">
                <Button size="lg" className="rounded-full px-6 text-sm sm:px-8 sm:text-base">
                  Order now
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
              </Link>
            </div>

            {/* One plate: the arc runs off the right edge, thumbnails sit on it. */}
            <div className="relative mx-auto w-full max-w-[15rem] sm:max-w-sm lg:max-w-lg">
              <span
                aria-hidden
                className="pointer-events-none absolute -right-[18%] -top-[14%] h-[122%] w-[124%] rounded-full bg-primary/85"
              />
              <div className="relative z-10 aspect-square overflow-hidden rounded-full border-[5px] border-white/85 shadow-2xl shadow-primary-deep/25">
                <img src={shot(0)} alt="" loading="eager" className="img-cover" />
              </div>
              <ul className="absolute right-0 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:gap-3">
                {[1, 2, 3].map((index, position) => (
                  <li
                    key={index}
                    className={cn(
                      "size-9 overflow-hidden rounded-full border-2 border-white/90 shadow-lg sm:size-12",
                      position === 1 && "-ml-4 sm:-ml-6",
                    )}
                  >
                    <img src={shot(index)} alt="" loading="lazy" className="img-cover" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- about */}
      <PageContainer className="py-12 lg:py-20">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <span
              aria-hidden
              className="blob blob-hero absolute -left-3 top-6 h-[86%] w-[76%] bg-primary/90"
            />
            <img
              src={shot(4)}
              alt=""
              loading="lazy"
              className="relative z-10 ml-auto aspect-[4/3] w-[86%] rounded-[2rem] border-4 border-white/85 object-cover shadow-2xl shadow-primary-deep/20"
            />
            <img
              src={shot(5)}
              alt=""
              loading="lazy"
              className="absolute -bottom-4 left-0 z-20 aspect-square w-[42%] rounded-[1.5rem] border-4 border-white/85 object-cover shadow-xl shadow-primary-deep/20"
            />
          </div>

          <div>
            <SectionTitle lead="About" highlight="us" align="start" />
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {settings.siteName} is a marketplace of independent kitchens, and every kitchen cooks
              its own menu. You choose what you want to eat first; we show you who is cooking it and
              when it will reach you. Local dishes, fast food and everything between, ordered in a
              few taps.
            </p>
            <div className="mt-6 flex">
              <Link to="/about">
                <Button
                  variant="outline"
                  className="rounded-full border-primary px-6 text-primary-ink hover:bg-primary/15"
                >
                  See more
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* ----------------------------------------------------- popular foods */}
      <section className="pb-12 lg:pb-20">
        <PageContainer>
          <SectionTitle lead="Most" highlight="popular food" />

          {shelf.length > 0 ? (
            <>
              <div className="mt-10 grid grid-cols-3 items-center gap-2 sm:gap-5 lg:gap-7">
                {shelf.map((group, index) => (
                  <Link
                    key={group.cuisine.id}
                    to={`/foods?cuisine=${group.cuisine.id}`}
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-2xl bg-card p-2 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-3",
                      // The middle card is the one the reference design lifts.
                      index === 1 && "z-10 shadow-xl sm:-translate-y-5 sm:scale-[1.04]",
                    )}
                  >
                    <span className="relative block overflow-hidden rounded-xl">
                      <img
                        src={group.lead ? group.lead.food.image : shot(index + 1)}
                        alt=""
                        loading="lazy"
                        className="img-cover aspect-[4/3] transition-transform duration-500 group-hover:scale-105"
                      />
                    </span>
                    <span className="mt-2 truncate text-[11px] font-extrabold sm:text-sm">
                      {group.cuisine.name}
                    </span>
                    <span className="mt-1 flex justify-center">
                      <Stars
                        showValue={false}
                        value={group.lead?.rating ?? 0}
                        count={group.lead?.ratingCount ?? 0}
                      />
                    </span>
                    <span className="mx-auto mt-2 inline-block rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold text-primary-foreground transition-colors group-hover:bg-primary-deep group-hover:text-white sm:px-3 sm:text-[11px]">
                      See menu
                    </span>
                  </Link>
                ))}
              </div>

              {pageCount > 1 ? (
                <div className="mt-6 flex justify-center gap-2 lg:mt-10">
                  {Array.from({ length: pageCount }).map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPage(index)}
                      aria-label={`Show cuisines ${index * PAGE_SIZE + 1} to ${Math.min(
                        (index + 1) * PAGE_SIZE,
                        cuisines.length,
                      )}`}
                      aria-current={index === page}
                      className={cn(
                        "size-2.5 rounded-full transition-all",
                        index === page ? "w-6 bg-primary" : "bg-foreground/20 hover:bg-foreground/40",
                      )}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              No kitchens have published dishes yet. Approved kitchens appear here as soon as they
              go live.
            </p>
          )}
        </PageContainer>
      </section>

      {/* ------------------------------------------------------ why choose us */}
      <section className="pb-12 lg:pb-20">
        <PageContainer>
          <SectionTitle id="how-it-works" lead="Why choose our" highlight="food" />

          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {PROMISES.map((promise, index) => (
              <div
                key={promise.title}
                className={cn(
                  "rounded-3xl px-4 py-6 text-center transition-transform duration-300",
                  index === 1
                    ? "bg-white/80 shadow-xl shadow-primary-deep/10 backdrop-blur-xl sm:-translate-y-4"
                    : "bg-transparent",
                )}
              >
                <span className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-primary text-primary-ink sm:size-14">
                  <promise.icon className="size-5 sm:size-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-sm font-extrabold sm:text-lg">{promise.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{promise.body}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* --------------------------------------------------------- customers */}
      <PageContainer className="pb-16 lg:pb-20">
        <SectionTitle lead="Customers" highlight="say" />

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div>
            {active ? (
              <GlassCard
                key={active.id}
                intensity="card"
                className="animate-stagger-fade-in rounded-3xl p-5 sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={active.userName} className="size-12" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{active.userName}</p>
                    <Stars className="mt-0.5" value={active.rating} count={0} />
                  </div>
                </div>
                <Quote className="mt-4 size-6 text-primary" aria-hidden />
                <p className="mt-2 text-sm leading-relaxed sm:text-base">{active.comment}</p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {active.isVerifiedPurchase ? "Verified order review" : "Customer review"}
                </p>
              </GlassCard>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Reviews are written by customers after a delivery is completed, so nothing here is
                commissioned. The first ones will appear the moment an order is delivered.
              </p>
            )}

            {quotes.length > 1 ? (
              <div className="mt-6 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {quotes.slice(0, 3).map((review, index) => (
                    <button
                      key={review.id}
                      type="button"
                      onClick={() => setQuote(index)}
                      aria-label={`Read the review from ${review.userName}`}
                      className={cn(
                        "rounded-full border-2 border-white/85 transition-transform",
                        index === quote ? "scale-110" : "opacity-70 hover:opacity-100",
                      )}
                    >
                      <Avatar name={review.userName} className="size-9" />
                    </button>
                  ))}
                  {quotes.length > 3 ? (
                    <span className="flex size-9 items-center justify-center rounded-full border-2 border-white/85 bg-primary text-xs font-extrabold text-primary-foreground">
                      <Plus className="size-3" aria-hidden />
                      {quotes.length - 3}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    aria-label="Previous review"
                    onClick={() => setQuote((current) => (current - 1 + quotes.length) % quotes.length)}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    aria-label="Next review"
                    onClick={() => setQuote((current) => (current + 1) % quotes.length)}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
            <span
              aria-hidden
              className="blob blob-card absolute -right-2 top-4 h-[88%] w-[74%] bg-primary/90"
            />
            <img
              src={shot(6)}
              alt=""
              loading="lazy"
              className="relative z-10 aspect-[4/3] w-[88%] rounded-[2rem] border-4 border-white/85 object-cover shadow-2xl shadow-primary-deep/20"
            />
            <img
              src={shot(7)}
              alt=""
              loading="lazy"
              className="absolute -bottom-5 right-0 z-20 aspect-square w-[40%] rounded-full border-4 border-white/85 object-cover shadow-xl shadow-primary-deep/20"
            />
          </div>
        </div>
      </PageContainer>

    </div>
  );
}
