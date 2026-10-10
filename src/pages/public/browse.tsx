import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import type { DietaryPreference, FoodSearchQuery } from "@/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  GlassCard,
  Pagination,
  SectionHeading,
  Select,
  Skeleton,
  Switch,
} from "@/components/ui";
import { CategoryChips, FoodCard } from "@/components/food";
import { FoodSearchField, LocationControl, PageContainer } from "@/components/layout/public";
import { useDb, useDbMemo, useDebouncedValue } from "@/hooks";
import { cuisineService, foodService, isSoldOut } from "@/services";
import { DIETARY_PREFERENCES } from "@/types";
import { cn, formatNaira } from "@/lib/utils";

const PAGE_SIZE = 12;

const SORTS: Array<{ value: NonNullable<FoodSearchQuery["sort"]>; label: string }> = [
  { value: "relevance", label: "Best match" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "fastest", label: "Fastest to prepare" },
];

export default function BrowseFoodPage() {
  const db = useDb();
  const [params, setParams] = useSearchParams();

  const term = params.get("q") ?? "";
  const cuisineId = params.get("cuisine");
  const category = params.get("category");
  const dietary = params.get("dietary") as DietaryPreference | null;
  const sort = (params.get("sort") as FoodSearchQuery["sort"]) ?? "relevance";
  const availableOnly = params.get("available") !== "all";

  const [priceInput, setPriceInput] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedTerm = useDebouncedValue(term, 220);
  // Real pending state: true while the debounce is still settling.
  const searching = debouncedTerm !== term;

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setParams(next, { replace: true });
    setPage(1);
  };

  const results = useDbMemo(
    () =>
      foodService.search({
        term: debouncedTerm,
        cuisineId,
        category,
        dietary,
        sort,
        availableOnly,
        maxPrice: priceInput,
        minRating,
      }),
    [debouncedTerm, cuisineId, category, dietary, sort, availableOnly, priceInput, minRating],
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedTerm, cuisineId, category, dietary, sort, availableOnly, priceInput, minRating]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageItems = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const cuisines = cuisineService.listActive();
  const categories = useDbMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of foodService.listDecorated()) {
      counts.set(entry.food.category, (counts.get(entry.food.category) ?? 0) + 1);
    }
    return [...counts.entries()].map(([value, count]) => ({ value, label: value, count }));
  });

  const activeFilterCount = [cuisineId, category, dietary, priceInput, minRating].filter(
    (value) => value !== null && value !== undefined,
  ).length;

  const clearAll = () => {
    setParams(new URLSearchParams(), { replace: true });
    setPriceInput(null);
    setMinRating(null);
  };

  const priceCeiling = useMemo(
    () => Math.max(...db.foods.map((f) => f.price), 5000),
    [db.foods],
  );

  const filters = (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-bold">Cuisine</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => update({ cuisine: null })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              !cuisineId ? "border-primary bg-primary/12 text-primary" : "border-border hover:bg-accent",
            )}
          >
            All
          </button>
          {cuisines.map((cuisine) => (
            <button
              key={cuisine.id}
              type="button"
              onClick={() => update({ cuisine: cuisine.id })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                cuisineId === cuisine.id
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border hover:bg-accent",
              )}
            >
              <span aria-hidden>{cuisine.emoji} </span>
              {cuisine.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">Dish category</p>
        <Select
          value={category ?? ""}
          onChange={(event) => update({ category: event.target.value || null })}
          aria-label="Filter by dish category"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label} ({item.count})
            </option>
          ))}
        </Select>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">Dietary preference</p>
        <Select
          value={dietary ?? ""}
          onChange={(event) => update({ dietary: event.target.value || null })}
          aria-label="Filter by dietary preference"
        >
          <option value="">Any</option>
          {DIETARY_PREFERENCES.map((preference) => (
            <option key={preference} value={preference}>
              {preference}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="price-filter" className="mb-2 block text-sm font-bold">
          Maximum price
        </label>
        <input
          id="price-filter"
          type="range"
          min={1000}
          max={priceCeiling}
          step={500}
          value={priceInput ?? priceCeiling}
          onChange={(event) => setPriceInput(Number(event.target.value))}
          className="w-full accent-[hsl(var(--primary))]"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Up to {formatNaira(priceInput ?? priceCeiling)}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">Minimum rating</p>
        <div className="flex gap-1.5">
          {[null, 3, 4, 4.5].map((value) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setMinRating(value)}
              className={cn(
                "flex-1 rounded-full border px-2 py-1.5 text-xs font-semibold transition-colors",
                minRating === value
                  ? "border-primary bg-primary/12 text-primary"
                  : "border-border hover:bg-accent",
              )}
            >
              {value === null ? "Any" : `${value}★+`}
            </button>
          ))}
        </div>
      </div>

      <Switch
        checked={availableOnly}
        onChange={(next) => update({ available: next ? null : "all" })}
        label="Available now"
        description="Hide sold-out and unpublished dishes."
      />

      <Button variant="outline" fullWidth onClick={clearAll} disabled={activeFilterCount === 0}>
        <RotateCcw className="size-4" aria-hidden /> Clear filters
      </Button>
    </div>
  );

  return (
    <PageContainer className="space-y-6">
      <SectionHeading
        title={term ? `Results for “${term}”` : "Browse every dish"}
        subtitle="Search matches dish names, descriptions, ingredients, categories and cuisines, never addresses."
        action={<LocationControl className="hidden lg:flex" />}
      />

      <div className="lg:hidden">
        <FoodSearchField defaultValue={term} size="md" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="hidden flex-1 lg:block">
          <FoodSearchField defaultValue={term} size="md" />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            className="lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {activeFilterCount > 0 ? <Badge tone="primary">{activeFilterCount}</Badge> : null}
          </Button>
          <Select
            value={sort}
            onChange={(event) => update({ sort: event.target.value })}
            aria-label="Sort results"
            className="max-w-48"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <CategoryChips items={categories} value={category} onChange={(next) => update({ category: next })} />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className={cn("lg:block", filtersOpen ? "block" : "hidden")}>
          <GlassCard intensity="card" className="sticky top-32 rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Filter className="size-4 text-primary" aria-hidden /> Filters
              </h2>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <X className="size-3" aria-hidden /> Reset
                </button>
              ) : null}
            </div>
            {filters}
          </GlassCard>
        </aside>

        <div className="min-w-0">
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {searching ? (
              "Searching…"
            ) : (
              <>
                <strong className="text-foreground">{results.length}</strong>{" "}
                {results.length === 1 ? "dish" : "dishes"} found
                {category ? ` in ${category}` : ""}
              </>
            )}
          </p>

          {searching ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <Skeleton className="aspect-[4/3] rounded-none" />
                  <div className="space-y-2 p-3.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : pageItems.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pageItems.map((entry) => (
                  <FoodCard key={entry.food.id} entry={entry} />
                ))}
              </div>
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </>
          ) : (
            <EmptyState
              icon={<Search className="size-5" aria-hidden />}
              title={term ? `No dishes match “${term}”` : "No dishes match these filters"}
              message="Try a different search term, widen your price range, or clear the filters. Addresses are searched from the delivery-location control, not here."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={clearAll}>Clear filters</Button>
                  <Link to="/foods">
                    <Button variant="outline">See everything</Button>
                  </Link>
                </div>
              }
            />
          )}

          {!searching && pageItems.length > 0 ? (
            <p className="mt-6 text-xs text-muted-foreground">
              Showing {pageItems.length} of {results.length} dishes
              {db.foods.filter((f) => isSoldOut(f)).length > 0
                ? ` · ${db.foods.filter((f) => isSoldOut(f)).length} sold out dishes are hidden`
                : ""}
            </p>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
