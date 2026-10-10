import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Banner } from "@/types";
import { Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Public banner carousel.
 *
 * Content comes entirely from the banner records the merchant edits, nothing
 * is hardcoded here. Supports autoplay (pausable), keyboard navigation, touch
 * swiping, and an empty state when every banner is deactivated.
 */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const touchStart = useRef<number | null>(null);

  const count = banners.length;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!playing || count <= 1) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [playing, count]);

  if (count === 0) {
    return (
      <EmptyState
        title="No active banners"
        message="Every banner is switched off. A merchant admin can activate one from the Banners screen."
      />
    );
  }

  const banner = banners[safeIndex];

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="relative overflow-hidden rounded-3xl border border-white/40 shadow-xl shadow-primary-deep/10"
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
      onFocusCapture={() => setPlaying(false)}
      onBlurCapture={() => setPlaying(true)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(safeIndex - 1);
        if (event.key === "ArrowRight") go(safeIndex + 1);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
        if (Math.abs(delta) > 40) go(safeIndex + (delta < 0 ? 1 : -1));
        touchStart.current = null;
      }}
      tabIndex={0}
    >
      <div className="relative h-64 w-full sm:h-80 lg:h-96">
        {banners.map((item, itemIndex) => (
          <img
            key={item.id}
            src={item.image}
            alt=""
            loading={itemIndex === 0 ? "eager" : "lazy"}
            aria-hidden={itemIndex !== safeIndex}
            className={cn(
              "img-cover absolute inset-0 transition-opacity duration-700",
              itemIndex === safeIndex ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/88 via-primary-deep/55 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-center gap-3 p-5 sm:p-8 lg:max-w-[62%]">
          {banner.badge ? (
            <span className="w-fit rounded-full bg-brand-amber px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-brand-amber-foreground">
              {banner.badge}
            </span>
          ) : null}
          <h3 className="text-2xl font-extrabold leading-tight text-white drop-shadow sm:text-3xl lg:text-4xl">
            {banner.title}
          </h3>
          <p className="max-w-xl text-sm text-white/85 sm:text-base">{banner.subtitle}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link to={banner.buttonLink}>
              <Button size="lg" className="bg-white text-primary-deep hover:bg-white/90">
                {banner.buttonText}
              </Button>
            </Link>
            <Link to="/foods">
              <Button size="lg" variant="glass" className="text-white">
                Browse everything
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/30 bg-white/55 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label="Previous offer"
            onClick={() => go(safeIndex - 1)}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Next offer"
            onClick={() => go(safeIndex + 1)}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          {count > 1 ? (
            <Button
              size="icon"
              variant="ghost"
              aria-label={playing ? "Pause automatic rotation" : "Resume automatic rotation"}
              aria-pressed={!playing}
              onClick={() => setPlaying((prev) => !prev)}
            >
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            </Button>
          ) : null}
        </div>

        <ul className="flex items-center gap-1.5">
          {banners.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                aria-label={`Show offer ${itemIndex + 1}: ${item.title}`}
                aria-current={itemIndex === safeIndex}
                onClick={() => go(itemIndex)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  itemIndex === safeIndex ? "w-6 bg-primary" : "w-2 bg-foreground/25 hover:bg-foreground/40",
                )}
              />
            </li>
          ))}
        </ul>

        <p className="text-xs font-semibold text-muted-foreground">
          {safeIndex + 1} / {count}
        </p>
      </div>
    </section>
  );
}
