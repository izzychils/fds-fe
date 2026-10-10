import { useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BadgePercent,
  Clock,
  Copy,
  Drumstick,
  Eye,
  Flame,
  ListChecks,
  MessageSquare,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Utensils,
} from "lucide-react";
import type { DietaryPreference, Extra, FoodItem, Protein } from "@/types";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  EmptyState,
  Field,
  GlassCard,
  Input,
  Modal,
  Select,
  StatCard,
  Switch,
  Tab,
  Tabs,
  TabsList,
  TabPanel,
  Td,
  Textarea,
  Th,
  useDisclosure,
} from "@/components/ui";
import { PriceTag } from "@/components/food";
import { useAsyncAction, useDb, useSession, useDbMemo } from "@/hooks";
import {
  cuisineService,
  extraService,
  foodService,
  isSoldOut,
  proteinService,
  settingsService,
  vendorService,
} from "@/services";
import { DIETARY_PREFERENCES } from "@/types";
import { cn, formatNaira, slugify, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

/* -------------------------------------------------------------- proteins */

export function ProteinsManager({ scope, vendorId }: { scope: "vendor" | "platform"; vendorId?: string | null }) {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const dialog = useDisclosure();
  const [editing, setEditing] = useState<Protein | null>(null);
  const [deleting, setDeleting] = useState<Protein | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: 0,
    description: "",
    appliesToCategory: "",
    isAvailable: true,
  });

  const categories = settingsService.get().categories;

  const proteins = useDbMemo(() => {
    const base = scope === "vendor" && vendorId ? proteinService.forVendor(vendorId) : proteinService.list();
    const term = search.trim().toLowerCase();
    return term ? base.filter((p) => p.name.toLowerCase().includes(term)) : base;
  }, [scope, vendorId, search]);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const food of db.foods) {
      for (const id of food.proteinIds) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [db.foods]);

  if (!user) return null;

  const openDialog = (protein: Protein | null) => {
    setEditing(protein);
    setForm(
      protein
        ? {
            name: protein.name,
            price: protein.price,
            description: protein.description,
            appliesToCategory: protein.appliesToCategory ?? "",
            isAvailable: protein.isAvailable,
          }
        : { name: "", price: 0, description: "", appliesToCategory: "", isAvailable: true },
    );
    dialog.onOpen();
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Give the protein a name.");
      return;
    }
    const payload = {
      name: form.name,
      price: Number(form.price) || 0,
      description: form.description,
      appliesToCategory: form.appliesToCategory || null,
      isAvailable: form.isAvailable,
      vendorIds: scope === "vendor" && vendorId ? [vendorId] : [],
    };
    const result = await run(
      () =>
        editing
          ? proteinService.update(editing.id, payload, user)
          : proteinService.create(payload, user),
      { success: editing ? "Protein updated" : "Protein added", silentError: true },
    );
    if (result !== null) {
      dialog.onClose();
      setEditing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Protein options" value={proteins.length} icon={<Drumstick className="size-4" aria-hidden />} />
        <StatCard label="Available" value={proteins.filter((p) => p.isAvailable).length} tone="success" />
        <StatCard
          label="Attached to dishes"
          value={proteins.reduce((sum, protein) => sum + (usage.get(protein.id) ?? 0), 0)}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search protein options"
            aria-label="Search proteins"
            className="pl-9"
          />
        </div>
        <Button onClick={() => openDialog(null)}>
          <Plus className="size-4" aria-hidden /> Add protein
        </Button>
      </div>

      {proteins.length === 0 ? (
        <EmptyState
          icon={<Drumstick className="size-5" aria-hidden />}
          title="No protein options yet"
          message="Proteins are the choices a customer makes when customizing a dish, chicken, beef, fish and so on."
          action={
            <Button onClick={() => openDialog(null)}>
              <Plus className="size-4" aria-hidden /> Add the first protein
            </Button>
          }
        />
      ) : (
        <Card className="hidden overflow-hidden lg:block">
          <DataTable>
            <thead>
              <tr>
                <Th>Protein</Th>
                <Th>Price</Th>
                <Th>Applies to</Th>
                <Th>Dishes</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {proteins.map((protein) => (
                <tr key={protein.id}>
                  <Td>
                    <p className="font-semibold">{protein.name}</p>
                    <p className="text-xs text-muted-foreground">{protein.description}</p>
                  </Td>
                  <Td className="font-semibold">
                    {protein.price === 0 ? "Included" : `+${formatNaira(protein.price)}`}
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {protein.appliesToCategory ?? "All categories"}
                  </Td>
                  <Td>{usage.get(protein.id) ?? 0}</Td>
                  <Td>
                    <Badge tone={protein.isAvailable ? "success" : "muted"}>
                      {protein.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${protein.name}`}
                        onClick={() => openDialog(protein)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`${protein.isAvailable ? "Disable" : "Enable"} ${protein.name}`}
                        onClick={() =>
                          void run(
                            () => proteinService.update(protein.id, { isAvailable: !protein.isAvailable }, user),
                            { silentError: true },
                          )
                        }
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                      >
                        <Eye className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${protein.name}`}
                        onClick={() => setDeleting(protein)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      )}

      <div className="grid gap-3 lg:hidden">
        {proteins.map((protein) => (
          <Card key={protein.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{protein.name}</p>
                <p className="text-xs text-muted-foreground">{protein.description}</p>
              </div>
              <span className="text-sm font-bold">
                {protein.price === 0 ? "Included" : `+${formatNaira(protein.price)}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={protein.isAvailable ? "success" : "muted"}>
                {protein.isAvailable ? "Available" : "Unavailable"}
              </Badge>
              <Badge tone="muted">{usage.get(protein.id) ?? 0} dishes</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => openDialog(protein)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleting(protein)}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={dialog.open}
        onClose={dialog.onClose}
        title={editing ? `Edit ${editing.name}` : "Add a protein option"}
        description="Prices are added to the dish price when a customer selects this option."
        footer={
          <>
            <Button variant="outline" onClick={dialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              {editing ? "Save protein" : "Add protein"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required htmlFor="protein-name">
              <Input
                id="protein-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Grilled chicken breast"
              />
            </Field>
            <Field label="Additional price (₦)" hint="Use 0 if it is included in the base price." htmlFor="protein-price">
              <Input
                id="protein-price"
                type="number"
                min={0}
                step={50}
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="protein-desc">
            <Input
              id="protein-desc"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Char-grilled, lightly peppered"
            />
          </Field>
          <Field
            label="Only offer with this category"
            hint="Leave as “All categories” to make it available everywhere."
            htmlFor="protein-category"
          >
            <Select
              id="protein-category"
              value={form.appliesToCategory}
              onChange={(event) => setForm((prev) => ({ ...prev, appliesToCategory: event.target.value }))}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Switch
            checked={form.isAvailable}
            onChange={(next) => setForm((prev) => ({ ...prev, isAvailable: next }))}
            label="Available"
            description="Unavailable options are shown greyed out and cannot be selected."
          />
          {scope === "vendor" ? (
            <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              This option is scoped to your kitchen. Platform-wide options added by the merchant are
              also available to you.
            </p>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          const attached = usage.get(deleting.id) ?? 0;
          void run(() => proteinService.remove(deleting.id, user), {
            success:
              attached > 0
                ? `Removed and detached from ${attached} dish(es)`
                : "Protein removed",
          });
          setDeleting(null);
        }}
        title={`Delete “${deleting?.name ?? ""}”?`}
        message={
          (usage.get(deleting?.id ?? "") ?? 0) > 0
            ? `This option is attached to ${usage.get(deleting?.id ?? "")} dish(es). It will be removed from all of them.`
            : "This protein option will be permanently removed."
        }
        confirmLabel="Delete protein"
        pending={pending}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- extras */

export function ExtrasManager({ scope, vendorId }: { scope: "vendor" | "platform"; vendorId?: string | null }) {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const dialog = useDisclosure();
  const [editing, setEditing] = useState<Extra | null>(null);
  const [deleting, setDeleting] = useState<Extra | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    price: 0,
    description: "",
    appliesToCategory: "",
    isAvailable: true,
  });

  const categories = settingsService.get().categories;

  const extras = useDbMemo(() => {
    const base = scope === "vendor" && vendorId ? extraService.forVendor(vendorId) : extraService.list();
    const term = search.trim().toLowerCase();
    return term ? base.filter((e) => e.name.toLowerCase().includes(term)) : base;
  }, [scope, vendorId, search]);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const food of db.foods) {
      for (const id of food.extraIds) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [db.foods]);

  if (!user) return null;

  const openDialog = (extra: Extra | null) => {
    setEditing(extra);
    setForm(
      extra
        ? {
            name: extra.name,
            price: extra.price,
            description: extra.description,
            appliesToCategory: extra.appliesToCategory ?? "",
            isAvailable: extra.isAvailable,
          }
        : { name: "", price: 0, description: "", appliesToCategory: "", isAvailable: true },
    );
    dialog.onOpen();
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Give the extra a name.");
      return;
    }
    const payload = {
      name: form.name,
      price: Number(form.price) || 0,
      description: form.description,
      appliesToCategory: form.appliesToCategory || null,
      isAvailable: form.isAvailable,
      vendorIds: scope === "vendor" && vendorId ? [vendorId] : [],
    };
    const result = await run(
      () => (editing ? extraService.update(editing.id, payload, user) : extraService.create(payload, user)),
      { success: editing ? "Extra updated" : "Extra added", silentError: true },
    );
    if (result !== null) {
      dialog.onClose();
      setEditing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Extras" value={extras.length} icon={<ListChecks className="size-4" aria-hidden />} />
        <StatCard label="Available" value={extras.filter((e) => e.isAvailable).length} tone="success" />
        <StatCard
          label="Attached to dishes"
          value={extras.reduce((sum, extra) => sum + (usage.get(extra.id) ?? 0), 0)}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search extras"
            aria-label="Search extras"
            className="pl-9"
          />
        </div>
        <Button onClick={() => openDialog(null)}>
          <Plus className="size-4" aria-hidden /> Add extra
        </Button>
      </div>

      {extras.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-5" aria-hidden />}
          title="No extras yet"
          message="Extras are optional paid add-ons such as extra cheese, bacon or loaded fries."
          action={
            <Button onClick={() => openDialog(null)}>
              <Plus className="size-4" aria-hidden /> Add the first extra
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {extras.map((extra) => (
            <Card key={extra.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{extra.name}</p>
                  <p className="text-xs text-muted-foreground">{extra.description}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-primary-ink">+{formatNaira(extra.price)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={extra.isAvailable ? "success" : "muted"}>
                  {extra.isAvailable ? "Available" : "Unavailable"}
                </Badge>
                <Badge tone="muted">{usage.get(extra.id) ?? 0} dishes</Badge>
                {extra.appliesToCategory ? <Badge tone="info">{extra.appliesToCategory}</Badge> : null}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openDialog(extra)}>
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleting(extra)}>
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={dialog.open}
        onClose={dialog.onClose}
        title={editing ? `Edit ${editing.name}` : "Add an extra"}
        description="Extras are optional and are charged on top of the dish price."
        footer={
          <>
            <Button variant="outline" onClick={dialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              {editing ? "Save extra" : "Add extra"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required htmlFor="extra-name">
              <Input
                id="extra-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Extra melted cheese"
              />
            </Field>
            <Field label="Price (₦)" required htmlFor="extra-price">
              <Input
                id="extra-price"
                type="number"
                min={0}
                step={50}
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="extra-desc">
            <Input
              id="extra-desc"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Aged cheddar"
            />
          </Field>
          <Field label="Only offer with this category" htmlFor="extra-category">
            <Select
              id="extra-category"
              value={form.appliesToCategory}
              onChange={(event) => setForm((prev) => ({ ...prev, appliesToCategory: event.target.value }))}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Switch
            checked={form.isAvailable}
            onChange={(next) => setForm((prev) => ({ ...prev, isAvailable: next }))}
            label="Available"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void run(() => extraService.remove(deleting.id, user), {
            success: "Extra removed",
          });
          setDeleting(null);
        }}
        title={`Delete “${deleting?.name ?? ""}”?`}
        message="This extra will be detached from every dish that offers it."
        confirmLabel="Delete extra"
        pending={pending}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ menu */

export function MenuManager({
  scope,
  vendorId,
  basePath,
}: {
  scope: "vendor" | "platform";
  vendorId?: string | null;
  basePath: string;
}) {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [preview, setPreview] = useState<FoodItem | null>(null);
  const [deleting, setDeleting] = useState<FoodItem | null>(null);

  const categories = settingsService.get().categories;

  const foods = useDbMemo(() => {
    let list = scope === "vendor" && vendorId ? foodService.byVendor(vendorId) : foodService.list();
    if (vendorFilter) list = list.filter((food) => food.vendorId === vendorFilter);
    if (categoryFilter) list = list.filter((food) => food.category === categoryFilter);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (food) =>
          food.name.toLowerCase().includes(term) ||
          food.ingredients.join(" ").toLowerCase().includes(term),
      );
    }
    return list;
  }, [scope, vendorId, vendorFilter, categoryFilter, search]);

  if (!user) return null;

  const decorated = (food: FoodItem) => foodService.decorated(food.id);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dishes" value={foods.length} icon={<Utensils className="size-4" aria-hidden />} />
        <StatCard label="Published" value={foods.filter((food) => food.isAvailable).length} tone="success" />
        <StatCard label="Marked popular" value={foods.filter((food) => food.isPopular).length} tone="warning" />
        <StatCard
          label="On special"
          value={foods.filter((food) => food.isSeasonalSpecial).length}
          tone="info"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes or ingredients"
            aria-label="Search dishes"
            className="pl-9"
          />
        </div>
        {scope === "platform" ? (
          <Select
            value={vendorFilter}
            onChange={(event) => setVendorFilter(event.target.value)}
            aria-label="Filter by kitchen"
            className="max-w-52"
          >
            <option value="">All kitchens</option>
            {db.vendors.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
          className="max-w-44"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        <Link to={`${basePath}/new`}>
          <Button>
            <Plus className="size-4" aria-hidden /> Add a dish
          </Button>
        </Link>
      </div>

      {foods.length === 0 ? (
        <EmptyState
          icon={<Utensils className="size-5" aria-hidden />}
          title="No dishes yet"
          message="Create your first dish with a photo, price, protein options and extras."
          action={
            <Link to={`${basePath}/new`}>
              <Button>
                <Plus className="size-4" aria-hidden /> Add a dish
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <thead>
              <tr>
                <Th>Dish</Th>
                {scope === "platform" ? <Th>Kitchen</Th> : null}
                <Th>Price</Th>
                <Th>Options</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {foods.map((food) => {
                const entry = decorated(food);
                return (
                  <tr key={food.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <img src={food.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{food.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {food.category} · {food.ingredients.slice(0, 3).join(", ")}
                          </p>
                        </div>
                      </div>
                    </Td>
                    {scope === "platform" ? (
                      <Td className="text-xs">{vendorService.get(food.vendorId)?.name ?? "None"}</Td>
                    ) : null}
                    <Td>
                      {entry ? <PriceTag entry={entry} size="sm" /> : formatNaira(food.price)}
                      {food.isSeasonalSpecial ? (
                        <Badge tone="warning" className="ml-1">
                          <BadgePercent className="size-3" aria-hidden /> special
                        </Badge>
                      ) : null}
                    </Td>
                    <Td>
                      <span className="text-xs text-muted-foreground">
                        {food.proteinIds.length} protein
                        {food.proteinIds.length === 1 ? "" : "s"} · {food.extraIds.length} extra
                        {food.extraIds.length === 1 ? "" : "s"}
                      </span>
                    </Td>
                    <Td>
                      {food.stockCount === null ? (
                        <span className="text-xs text-muted-foreground">Untracked</span>
                      ) : (
                        <Badge tone={isSoldOut(food) ? "destructive" : food.stockCount <= food.lowStockThreshold ? "warning" : "muted"}>
                          {food.stockCount} left
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={food.isAvailable ? "success" : "muted"}>
                          {food.isAvailable ? "Live" : "Hidden"}
                        </Badge>
                        {food.isPopular ? (
                          <Badge tone="primary">
                            <Flame className="size-3" aria-hidden /> popular
                          </Badge>
                        ) : null}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Preview ${food.name}`}
                          onClick={() => setPreview(food)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                        >
                          <Eye className="size-4" aria-hidden />
                        </button>
                        <Link
                          to={`${basePath}/${food.id}/edit`}
                          aria-label={`Edit ${food.name}`}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                        <button
                          type="button"
                          aria-label={`${food.isPopular ? "Unmark" : "Mark"} ${food.name} as popular`}
                          onClick={() =>
                            void run(() => foodService.togglePopular(food.id, vendorId ?? undefined), {
                              success: food.isPopular ? "Removed from popular" : "Marked as popular",
                              silentError: true,
                            })
                          }
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                        >
                          <Flame className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${food.name}`}
                          onClick={() => setDeleting(food)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </Card>
      )}

      {/* preview */}
      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "Dish preview"}
        description="Exactly what a customer sees on the marketplace."
        size="lg"
        footer={
          preview ? (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Close
              </Button>
              <Link to={`${basePath}/${preview.id}/edit`}>
                <Button>Edit dish</Button>
              </Link>
            </>
          ) : null
        }
      >
        {preview ? (
          <div className="space-y-4">
            <img src={preview.image} alt={preview.name} className="aspect-[4/3] w-full rounded-2xl object-cover" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xl font-extrabold">{formatNaira(preview.price)}</span>
              <div className="flex flex-wrap gap-1.5">
                {preview.isPopular ? <Badge tone="primary">Popular</Badge> : null}
                {preview.isSeasonalSpecial ? <Badge tone="warning">Seasonal special</Badge> : null}
                <Badge tone={preview.isAvailable ? "success" : "muted"}>
                  {preview.isAvailable ? "Live" : "Hidden"}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{preview.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Proteins ({preview.proteinSelection})
                </p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {preview.proteinIds.length === 0 ? (
                    <li className="text-muted-foreground">None offered</li>
                  ) : (
                    preview.proteinIds.map((id) => (
                      <li key={id}>
                        {proteinService.get(id)?.name} ·{" "}
                        {formatNaira(proteinService.get(id)?.price ?? 0)}
                      </li>
                    ))
                  )}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer may pick up to {preview.maxProteins}
                </p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Extras
                </p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {preview.extraIds.length === 0 ? (
                    <li className="text-muted-foreground">None offered</li>
                  ) : (
                    preview.extraIds.map((id) => (
                      <li key={id}>
                        {extraService.get(id)?.name} · {formatNaira(extraService.get(id)?.price ?? 0)}
                      </li>
                    ))
                  )}
                </ul>
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer may pick up to {preview.maxExtras}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preview.dietary.map((tag) => (
                <Badge key={tag} tone="primary">
                  <BadgeCheck className="size-3" aria-hidden /> {tag}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void run(() => foodService.remove(deleting.id, vendorId ?? undefined), {
            success: "Dish deleted",
          });
          setDeleting(null);
        }}
        title={`Delete “${deleting?.name ?? ""}”?`}
        message="The dish will be removed from the marketplace. Existing orders keep their record of it."
        confirmLabel="Delete dish"
        pending={pending}
      />
    </div>
  );
}

/* ------------------------------------------------------------- inventory */

export function InventoryManager({
  vendorId,
  basePath,
}: {
  vendorId: string | null;
  basePath: string;
}) {
  const { run, pending } = useAsyncAction();
  const [editingStock, setEditingStock] = useState<FoodItem | null>(null);
  const [stockValue, setStockValue] = useState("");

  const foods = useDbMemo(
    () => (vendorId ? foodService.byVendor(vendorId) : []),
    [vendorId],
  );

  const lowStock = foods.filter(
    (food) => food.stockCount !== null && food.stockCount <= food.lowStockThreshold,
  );
  const soldOut = foods.filter((food) => isSoldOut(food));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Tracked dishes" value={foods.filter((f) => f.stockCount !== null).length} icon={<Package className="size-4" aria-hidden />} />
        <StatCard label="Low stock" value={lowStock.length} tone="warning" />
        <StatCard label="Sold out" value={soldOut.length} tone="destructive" />
      </div>

      {lowStock.length > 0 ? (
        <GlassCard intensity="card" className="rounded-2xl p-4">
          <h2 className="text-sm font-bold">Needs attention</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {lowStock.map((food) => (
              <li key={food.id} className="flex items-center justify-between gap-2">
                <span>{food.name}</span>
                <Badge tone={isSoldOut(food) ? "destructive" : "warning"}>
                  {food.stockCount} left
                </Badge>
              </li>
            ))}
          </ul>
        </GlassCard>
      ) : null}

      {foods.length === 0 ? (
        <EmptyState
          icon={<Package className="size-5" aria-hidden />}
          title="No dishes to manage"
          message="Add dishes first, then you can track their stock here."
          action={
            <Link to={`${basePath}/new`}>
              <Button>Add a dish</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <thead>
              <tr>
                <Th>Dish</Th>
                <Th>Stock</Th>
                <Th>Threshold</Th>
                <Th>Availability</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {foods.map((food) => (
                <tr key={food.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <img src={food.image} alt="" className="size-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold">{food.name}</p>
                        <p className="text-xs text-muted-foreground">{food.category}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {food.stockCount === null ? (
                      <span className="text-xs text-muted-foreground">Not tracked</span>
                    ) : (
                      <span className="font-semibold">{food.stockCount}</span>
                    )}
                  </Td>
                  <Td className="text-sm text-muted-foreground">{food.lowStockThreshold}</Td>
                  <Td>
                    <Badge tone={isSoldOut(food) ? "destructive" : food.isAvailable ? "success" : "muted"}>
                      {isSoldOut(food) ? "Sold out" : food.isAvailable ? "Orderable" : "Hidden"}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingStock(food);
                          setStockValue(food.stockCount === null ? "" : String(food.stockCount));
                        }}
                      >
                        Set stock
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          void run(() => foodService.toggleAvailability(food.id, vendorId ?? undefined), {
                            success: food.isAvailable ? "Dish hidden" : "Dish published",
                            silentError: true,
                          })
                        }
                      >
                        {food.isAvailable ? "Hide" : "Publish"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          void run(() => foodService.setStock(food.id, 0, vendorId ?? undefined), {
                            success: "Marked sold out",
                            silentError: true,
                          })
                        }
                      >
                        Sold out
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </Card>
      )}

      <Modal
        open={Boolean(editingStock)}
        onClose={() => setEditingStock(null)}
        title={editingStock ? `Stock for ${editingStock.name}` : "Stock"}
        description="Leave the field empty to stop tracking stock for this dish."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingStock(null)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() => {
                if (!editingStock) return;
                const value = stockValue.trim() === "" ? null : Math.max(0, Number(stockValue));
                void run(() => foodService.setStock(editingStock.id, value, vendorId ?? undefined), {
                  success: value === null ? "Stock tracking disabled" : "Stock updated",
                  onSuccess: () => setEditingStock(null),
                });
              }}
            >
              Save stock
            </Button>
          </>
        }
      >
        <Field label="Units available" hint="Setting this to 0 marks the dish sold out automatically.">
          <Input
            type="number"
            min={0}
            value={stockValue}
            onChange={(event) => setStockValue(event.target.value)}
            placeholder="e.g. 20"
          />
        </Field>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------ dish editor */

interface DishFormState {
  name: string;
  description: string;
  price: number;
  image: string;
  cuisineId: string;
  category: string;
  ingredients: string;
  dietary: DietaryPreference[];
  prepTimeMinutes: number;
  calories: string;
  isAvailable: boolean;
  stockCount: string;
  lowStockThreshold: number;
  isPopular: boolean;
  isSeasonalSpecial: boolean;
  seasonalPrice: string;
  specialStartDate: string;
  specialEndDate: string;
  sizes: Array<{ id: string; label: string; priceDelta: number }>;
  proteinSelection: "required" | "optional" | "none";
  proteinIds: string[];
  maxProteins: number;
  extraIds: string[];
  maxExtras: number;
}

const IMAGE_OPTIONS = [
  "/foods/steak-and-eggs.jpg",
  "/foods/bacon-cheeseburger.jpg",
  "/foods/pepperoni-pizza.jpg",
  "/foods/birria-tacos.jpg",
  "/foods/party-burger-platter.jpg",
  "/foods/burger-wings-fries.jpg",
  "/foods/steak-shawarma.jpg",
  "/foods/sandwich-platter.jpg",
  "/foods/venue-dining.jpg",
  "/foods/venue-patio.jpg",
];

export function DishEditor({
  scope,
  vendorId,
  basePath,
}: {
  scope: "vendor" | "platform";
  vendorId?: string | null;
  basePath: string;
}) {
  const { foodId } = useParams<{ foodId: string }>();
  const db = useDb();
  const { user } = useSession();
  const navigate = useNavigate();
  const { run, pending } = useAsyncAction();

  const existing = foodId ? foodService.get(foodId) : null;
  const isEdit = Boolean(existing);
  const settings = settingsService.get();

  const [vendorForDish, setVendorForDish] = useState(existing?.vendorId ?? vendorId ?? "");
  const [tab, setTab] = useState("basics");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<DishFormState>(() => ({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    price: existing?.price ?? 0,
    image: existing?.image ?? IMAGE_OPTIONS[0],
    cuisineId: existing?.cuisineId ?? cuisineService.listActive()[0]?.id ?? "",
    category: existing?.category ?? settings.categories[2] ?? "Mains",
    ingredients: existing?.ingredients.join(", ") ?? "",
    dietary: existing?.dietary ?? [],
    prepTimeMinutes: existing?.prepTimeMinutes ?? 25,
    calories: existing?.calories ? String(existing.calories) : "",
    isAvailable: existing?.isAvailable ?? true,
    stockCount: existing?.stockCount === null || existing?.stockCount === undefined ? "" : String(existing.stockCount),
    lowStockThreshold: existing?.lowStockThreshold ?? 3,
    isPopular: existing?.isPopular ?? false,
    isSeasonalSpecial: existing?.isSeasonalSpecial ?? false,
    seasonalPrice: existing?.seasonalPrice ? String(existing.seasonalPrice) : "",
    specialStartDate: existing?.specialStartDate ? existing.specialStartDate.slice(0, 10) : "",
    specialEndDate: existing?.specialEndDate ? existing.specialEndDate.slice(0, 10) : "",
    sizes: existing?.sizes ?? [],
    proteinSelection: existing?.proteinSelection ?? "optional",
    proteinIds: existing?.proteinIds ?? [],
    maxProteins: existing?.maxProteins ?? 1,
    extraIds: existing?.extraIds ?? [],
    maxExtras: existing?.maxExtras ?? 2,
  }));

  const set = <K extends keyof DishFormState>(key: K, value: DishFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const scopedVendorId = scope === "vendor" ? vendorId ?? "" : vendorForDish;
  const proteins = useDbMemo(
    () => (scopedVendorId ? proteinService.forVendor(scopedVendorId) : []),
    [scopedVendorId],
  );
  const extras = useDbMemo(
    () => (scopedVendorId ? extraService.forVendor(scopedVendorId) : []),
    [scopedVendorId],
  );

  // Inline creation so a merchant never has to leave the dish form.
  const [newProtein, setNewProtein] = useState({ name: "", price: 0 });
  const [newExtra, setNewExtra] = useState({ name: "", price: 0 });
  const proteinDialog = useDisclosure();
  const extraDialog = useDisclosure();

  if (!user) return null;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Give the dish a name.";
    if (form.description.trim().length < 15) next.description = "Write at least 15 characters.";
    if (form.price <= 0) next.price = "Set a price above zero.";
    if (!scopedVendorId) next.vendorId = "Choose which kitchen publishes this dish.";
    if (!form.cuisineId) next.cuisineId = "Choose a cuisine.";
    if (!form.category.trim()) next.category = "Choose a category.";
    if (form.prepTimeMinutes < 5) next.prepTimeMinutes = "Preparation time must be at least 5 minutes.";
    if (form.isSeasonalSpecial) {
      if (!form.seasonalPrice) next.seasonalPrice = "Set a promotional price.";
      else if (Number(form.seasonalPrice) >= form.price) {
        next.seasonalPrice = "The promotional price must be lower than the regular price.";
      }
      if (!form.specialStartDate) next.specialStartDate = "Set a start date.";
      if (!form.specialEndDate) next.specialEndDate = "Set an end date.";
      if (form.specialStartDate && form.specialEndDate && form.specialStartDate > form.specialEndDate) {
        next.specialEndDate = "The end date must come after the start date.";
      }
    }
    if (form.proteinSelection === "required" && form.proteinIds.length === 0) {
      next.proteinIds = "A dish requiring a protein must offer at least one option.";
    }
    if (form.sizes.some((size) => !size.label.trim())) {
      next.sizes = "Every serving size needs a label.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      toast.error("Some fields need attention, see the highlighted errors.");
      if (errors.name || errors.price || errors.description) setTab("basics");
      return;
    }
    const payload: Omit<FoodItem, "id" | "createdAt" | "updatedAt"> = {
      vendorId: scopedVendorId,
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      image: form.image,
      cuisineId: form.cuisineId,
      category: form.category,
      ingredients: form.ingredients
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      dietary: form.dietary,
      prepTimeMinutes: Number(form.prepTimeMinutes),
      calories: form.calories ? Number(form.calories) : undefined,
      isAvailable: form.isAvailable,
      stockCount: form.stockCount.trim() === "" ? null : Number(form.stockCount),
      lowStockThreshold: Number(form.lowStockThreshold) || 3,
      isPopular: form.isPopular,
      isSeasonalSpecial: form.isSeasonalSpecial,
      seasonalPrice: form.isSeasonalSpecial ? Number(form.seasonalPrice) : null,
      specialStartDate: form.isSeasonalSpecial && form.specialStartDate
        ? new Date(form.specialStartDate).toISOString()
        : null,
      specialEndDate: form.isSeasonalSpecial && form.specialEndDate
        ? new Date(form.specialEndDate).toISOString()
        : null,
      sizes: form.sizes,
      proteinSelection: form.proteinSelection,
      proteinIds: form.proteinIds,
      maxProteins: Number(form.maxProteins) || 1,
      extraIds: form.extraIds,
      maxExtras: Number(form.maxExtras) || 0,
    };

    const result = await run(
      () =>
        isEdit && existing
          ? foodService.update(existing.id, payload, vendorId ?? undefined)
          : foodService.create(payload, vendorId ?? undefined),
      { success: isEdit ? "Dish updated" : "Dish published", silentError: true },
    );
    if (result) navigate(basePath);
    else toast.error("We couldn't save that dish. Check the fields and try again.");
  };

  const createProteinInline = async () => {
    if (!scopedVendorId) {
      toast.error("Choose a kitchen first.");
      return;
    }
    if (!newProtein.name.trim()) {
      toast.error("Give the protein a name.");
      return;
    }
    const created = await run(
      () =>
        proteinService.create(
          {
            name: newProtein.name,
            price: Number(newProtein.price) || 0,
            description: "",
            isAvailable: true,
            appliesToCategory: null,
            vendorIds: [scopedVendorId],
          },
          user,
        ),
      { success: "Protein created and attached", silentError: true },
    );
    if (created) {
      setForm((prev) => ({ ...prev, proteinIds: [...prev.proteinIds, created.id] }));
      setNewProtein({ name: "", price: 0 });
      proteinDialog.onClose();
    }
  };

  const createExtraInline = async () => {
    if (!scopedVendorId) {
      toast.error("Choose a kitchen first.");
      return;
    }
    if (!newExtra.name.trim()) {
      toast.error("Give the extra a name.");
      return;
    }
    const created = await run(
      () =>
        extraService.create(
          {
            name: newExtra.name,
            price: Number(newExtra.price) || 0,
            description: "",
            isAvailable: true,
            appliesToCategory: null,
            vendorIds: [scopedVendorId],
          },
          user,
        ),
      { success: "Extra created and attached", silentError: true },
    );
    if (created) {
      setForm((prev) => ({ ...prev, extraIds: [...prev.extraIds, created.id] }));
      setNewExtra({ name: "", price: 0 });
      extraDialog.onClose();
    }
  };

  if (isEdit && !existing) {
    return (
      <EmptyState
        title="Dish not found"
        action={
          <Link to={basePath}>
            <Button>Back to dishes</Button>
          </Link>
        }
      />
    );
  }

  /* live preview */
  const previewEntry = existing ? foodService.decorated(existing.id) : null;
  const previewPrice = form.isSeasonalSpecial && Number(form.seasonalPrice) > 0
    ? Number(form.seasonalPrice)
    : Number(form.price);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(basePath)}>
            <ArrowLeft className="size-4" aria-hidden /> Back to dishes
          </Button>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
            {isEdit ? `Edit ${existing?.name}` : "Create a dish"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything here is editable and takes effect immediately once saved.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(basePath)}>
            Cancel
          </Button>
          <Button loading={pending} onClick={() => void save()}>
            {isEdit ? "Save changes" : "Publish dish"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <Tab value="basics">Basics</Tab>
            <Tab value="proteins">Proteins ({form.proteinIds.length})</Tab>
            <Tab value="extras">Extras ({form.extraIds.length})</Tab>
            <Tab value="stock">Stock &amp; specials</Tab>
          </TabsList>

          <TabPanel value="basics">
            <Card className="space-y-4 p-5">
              {scope === "platform" ? (
                <Field label="Kitchen" required error={errors.vendorId} htmlFor="dish-vendor">
                  <Select
                    id="dish-vendor"
                    value={vendorForDish}
                    onChange={(event) => setVendorForDish(event.target.value)}
                    invalid={Boolean(errors.vendorId)}
                  >
                    <option value="">Choose a kitchen…</option>
                    {db.vendors.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field label="Dish name" required error={errors.name} htmlFor="dish-name">
                <Input
                  id="dish-name"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  invalid={Boolean(errors.name)}
                  placeholder="Nma's Signature Steak & Eggs"
                />
              </Field>

              <Field
                label="Description"
                required
                error={errors.description}
                hint="Shown on the dish card and detail page."
                htmlFor="dish-desc"
              >
                <Textarea
                  id="dish-desc"
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                  invalid={Boolean(errors.description)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Base price (₦)" required error={errors.price} htmlFor="dish-price">
                  <Input
                    id="dish-price"
                    type="number"
                    min={0}
                    step={100}
                    value={form.price}
                    onChange={(event) => set("price", Number(event.target.value))}
                    invalid={Boolean(errors.price)}
                  />
                </Field>
                <Field label="Preparation time (min)" required error={errors.prepTimeMinutes} htmlFor="dish-prep">
                  <Input
                    id="dish-prep"
                    type="number"
                    min={5}
                    max={180}
                    value={form.prepTimeMinutes}
                    onChange={(event) => set("prepTimeMinutes", Number(event.target.value))}
                    invalid={Boolean(errors.prepTimeMinutes)}
                  />
                </Field>
                <Field label="Calories" hint="Optional" htmlFor="dish-calories">
                  <Input
                    id="dish-calories"
                    type="number"
                    min={0}
                    value={form.calories}
                    onChange={(event) => set("calories", event.target.value)}
                    placeholder="620"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cuisine" required error={errors.cuisineId} htmlFor="dish-cuisine">
                  <Select
                    id="dish-cuisine"
                    value={form.cuisineId}
                    onChange={(event) => set("cuisineId", event.target.value)}
                    invalid={Boolean(errors.cuisineId)}
                  >
                    <option value="">Choose a cuisine…</option>
                    {cuisineService.listActive().map((cuisine) => (
                      <option key={cuisine.id} value={cuisine.id}>
                        {cuisine.emoji} {cuisine.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Category" required error={errors.category} htmlFor="dish-category">
                  <Select
                    id="dish-category"
                    value={form.category}
                    onChange={(event) => set("category", event.target.value)}
                    invalid={Boolean(errors.category)}
                  >
                    {settings.categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                label="Ingredients"
                hint="Comma separated. These are searchable, so keep them accurate."
                htmlFor="dish-ingredients"
              >
                <Input
                  id="dish-ingredients"
                  value={form.ingredients}
                  onChange={(event) => set("ingredients", event.target.value)}
                  placeholder="Sirloin steak, Free-range eggs, Cherry tomatoes"
                />
              </Field>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Dietary information</legend>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_PREFERENCES.map((preference) => {
                    const active = form.dietary.includes(preference);
                    return (
                      <button
                        key={preference}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          set(
                            "dietary",
                            active
                              ? form.dietary.filter((item) => item !== preference)
                              : [...form.dietary, preference],
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
              </fieldset>

              <div>
                <p className="mb-2 text-sm font-semibold">Photo</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {IMAGE_OPTIONS.map((image) => (
                    <button
                      key={image}
                      type="button"
                      aria-pressed={form.image === image}
                      onClick={() => set("image", image)}
                      className={cn(
                        "overflow-hidden rounded-xl border-2 transition-all",
                        form.image === image ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                      )}
                    >
                      <img src={image} alt="" className="aspect-square w-full object-cover" />
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Choose from the supplied food photography. Uploading new images needs a media
                  storage provider, which is not connected in this build.
                </p>
              </div>

              <Switch
                checked={form.isAvailable}
                onChange={(next) => set("isAvailable", next)}
                label="Published on the marketplace"
                description="Hidden dishes stay in your menu but cannot be ordered."
              />
              <Switch
                checked={form.isPopular}
                onChange={(next) => set("isPopular", next)}
                label="Mark as a popular dish"
                description="Popular dishes appear in the marketplace's popular sections."
              />
            </Card>
          </TabPanel>

          <TabPanel value="proteins">
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <Drumstick className="size-4 text-primary" aria-hidden /> Protein options for this dish
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Customers choose from exactly these options when ordering. Nothing is required
                    unless you set it below.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={proteinDialog.onOpen}>
                  <Plus className="size-4" aria-hidden /> New protein
                </Button>
              </div>

              {errors.proteinIds ? (
                <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                  {errors.proteinIds}
                </p>
              ) : null}

              <Field label="Selection rule" htmlFor="dish-protein-rule">
                <Select
                  id="dish-protein-rule"
                  value={form.proteinSelection}
                  onChange={(event) =>
                    set("proteinSelection", event.target.value as DishFormState["proteinSelection"])
                  }
                >
                  <option value="optional">Optional, customer may skip</option>
                  <option value="required">Required, customer must choose one</option>
                  <option value="none">Not offered, this dish has no protein choice</option>
                </Select>
              </Field>

              <Field
                label="Maximum selections"
                hint="How many protein options a customer may pick at once."
                htmlFor="dish-protein-max"
              >
                <Input
                  id="dish-protein-max"
                  type="number"
                  min={1}
                  max={6}
                  value={form.maxProteins}
                  onChange={(event) => set("maxProteins", Number(event.target.value))}
                />
              </Field>

              {proteins.length === 0 ? (
                <EmptyState
                  title="No protein options available"
                  message="Create one here and it will be attached to this dish immediately."
                  action={
                    <Button onClick={proteinDialog.onOpen}>
                      <Plus className="size-4" aria-hidden /> Create a protein
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {proteins.map((protein) => (
                    <Checkbox
                      key={protein.id}
                      checked={form.proteinIds.includes(protein.id)}
                      onChange={(next) =>
                        set(
                          "proteinIds",
                          next
                            ? [...form.proteinIds, protein.id]
                            : form.proteinIds.filter((id) => id !== protein.id),
                        )
                      }
                      label={protein.name}
                      description={
                        protein.appliesToCategory
                          ? `${protein.description || "None"} · ${protein.appliesToCategory} only`
                          : protein.description || "Available for all categories"
                      }
                      price={protein.price === 0 ? "Included" : `+${formatNaira(protein.price)}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => set("proteinIds", proteins.map((protein) => protein.id))}
                >
                  <Copy className="size-3.5" aria-hidden /> Select all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => set("proteinIds", [])}>
                  Clear selection
                </Button>
              </div>
            </Card>
          </TabPanel>

          <TabPanel value="extras">
            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <ListChecks className="size-4 text-primary" aria-hidden /> Optional extras for this dish
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Extras are always optional and are charged on top of the dish price.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={extraDialog.onOpen}>
                  <Plus className="size-4" aria-hidden /> New extra
                </Button>
              </div>

              <Field
                label="Maximum selections"
                hint="How many extras a customer may add at once."
                htmlFor="dish-extra-max"
              >
                <Input
                  id="dish-extra-max"
                  type="number"
                  min={0}
                  max={10}
                  value={form.maxExtras}
                  onChange={(event) => set("maxExtras", Number(event.target.value))}
                />
              </Field>

              {extras.length === 0 ? (
                <EmptyState
                  title="No extras available"
                  message="Create one here and it will be attached to this dish immediately."
                  action={
                    <Button onClick={extraDialog.onOpen}>
                      <Plus className="size-4" aria-hidden /> Create an extra
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {extras.map((extra) => (
                    <Checkbox
                      key={extra.id}
                      checked={form.extraIds.includes(extra.id)}
                      onChange={(next) =>
                        set(
                          "extraIds",
                          next ? [...form.extraIds, extra.id] : form.extraIds.filter((id) => id !== extra.id),
                        )
                      }
                      label={extra.name}
                      description={
                        extra.appliesToCategory
                          ? `${extra.description || "None"} · ${extra.appliesToCategory} only`
                          : extra.description || "Available for all categories"
                      }
                      price={`+${formatNaira(extra.price)}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => set("extraIds", extras.map((extra) => extra.id))}
                >
                  <Copy className="size-3.5" aria-hidden /> Select all
                </Button>
                <Button size="sm" variant="ghost" onClick={() => set("extraIds", [])}>
                  Clear selection
                </Button>
              </div>
            </Card>
          </TabPanel>

          <TabPanel value="stock">
            <Card className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Units in stock"
                  hint="Leave empty to stop tracking. Set 0 to mark it sold out."
                  htmlFor="dish-stock"
                >
                  <Input
                    id="dish-stock"
                    type="number"
                    min={0}
                    value={form.stockCount}
                    onChange={(event) => set("stockCount", event.target.value)}
                    placeholder="Untracked"
                  />
                </Field>
                <Field label="Low-stock threshold" htmlFor="dish-threshold">
                  <Input
                    id="dish-threshold"
                    type="number"
                    min={0}
                    value={form.lowStockThreshold}
                    onChange={(event) => set("lowStockThreshold", Number(event.target.value))}
                  />
                </Field>
              </div>

              <hr className="border-border" />

              <Switch
                checked={form.isSeasonalSpecial}
                onChange={(next) => set("isSeasonalSpecial", next)}
                label="Publish as a seasonal special"
                description="Runs a promotional price for a fixed window, applied automatically at checkout."
              />

              {form.isSeasonalSpecial ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Promotional price (₦)" required error={errors.seasonalPrice} htmlFor="dish-special-price">
                    <Input
                      id="dish-special-price"
                      type="number"
                      min={0}
                      step={100}
                      value={form.seasonalPrice}
                      onChange={(event) => set("seasonalPrice", event.target.value)}
                      invalid={Boolean(errors.seasonalPrice)}
                    />
                  </Field>
                  <Field label="Starts" required error={errors.specialStartDate} htmlFor="dish-special-start">
                    <Input
                      id="dish-special-start"
                      type="date"
                      value={form.specialStartDate}
                      onChange={(event) => set("specialStartDate", event.target.value)}
                      invalid={Boolean(errors.specialStartDate)}
                    />
                  </Field>
                  <Field label="Ends" required error={errors.specialEndDate} htmlFor="dish-special-end">
                    <Input
                      id="dish-special-end"
                      type="date"
                      value={form.specialEndDate}
                      onChange={(event) => set("specialEndDate", event.target.value)}
                      invalid={Boolean(errors.specialEndDate)}
                    />
                  </Field>
                </div>
              ) : null}

              <hr className="border-border" />

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">Serving sizes</p>
                    <p className="text-xs text-muted-foreground">
                      Optional. Each size adjusts the price relative to the base price.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      set("sizes", [
                        ...form.sizes,
                        { id: `sz_${slugify(String(Date.now()))}`, label: "", priceDelta: 0 },
                      ])
                    }
                  >
                    <Plus className="size-4" aria-hidden /> Add size
                  </Button>
                </div>
                {errors.sizes ? (
                  <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                    {errors.sizes}
                  </p>
                ) : null}
                {form.sizes.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No sizes, the dish is sold at a single price.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {form.sizes.map((size, index) => (
                      <li key={size.id} className="flex flex-wrap items-center gap-2">
                        <Input
                          value={size.label}
                          aria-label={`Size ${index + 1} label`}
                          onChange={(event) =>
                            set(
                              "sizes",
                              form.sizes.map((item, i) =>
                                i === index ? { ...item, label: event.target.value } : item,
                              ),
                            )
                          }
                          placeholder="Large"
                          className="max-w-40"
                        />
                        <Input
                          type="number"
                          step={100}
                          value={size.priceDelta}
                          aria-label={`Size ${index + 1} price adjustment`}
                          onChange={(event) =>
                            set(
                              "sizes",
                              form.sizes.map((item, i) =>
                                i === index ? { ...item, priceDelta: Number(event.target.value) } : item,
                              ),
                            )
                          }
                          className="max-w-32"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => set("sizes", form.sizes.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="size-3.5" aria-hidden /> Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </TabPanel>
        </Tabs>

        {/* live preview */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Eye className="size-4 text-primary" aria-hidden /> Customer preview
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <img src={form.image} alt="" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="text-sm font-bold">{form.name || "Dish name"}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {form.description || "Your description will appear here."}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" aria-hidden /> {form.prepTimeMinutes} min
                  </span>
                  <span>{form.category}</span>
                  {form.isPopular ? <Badge tone="primary">Popular</Badge> : null}
                </div>
                <p className="text-base font-extrabold">{formatNaira(previewPrice)}</p>
                {form.isSeasonalSpecial && Number(form.seasonalPrice) > 0 ? (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatNaira(Number(form.price))}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {form.proteinIds.length} protein option{form.proteinIds.length === 1 ? "" : "s"} ·{" "}
              {form.extraIds.length} extra{form.extraIds.length === 1 ? "" : "s"}
              {form.proteinSelection === "required" ? " · protein required" : ""}
            </p>
            {previewEntry ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MessageSquare className="size-3" aria-hidden />
                {previewEntry.ratingCount} review{previewEntry.ratingCount === 1 ? "" : "s"} · last
                edited {timeAgo(existing?.updatedAt ?? new Date().toISOString())}
              </p>
            ) : null}
          </GlassCard>

          <GlassCard intensity="card" className="rounded-2xl p-4">
            <h2 className="text-sm font-bold">Checklist</h2>
            <ul className="mt-2 space-y-1.5 text-xs">
              {[
                { label: "Name", done: form.name.trim().length > 0 },
                { label: "Description", done: form.description.trim().length >= 15 },
                { label: "Price", done: form.price > 0 },
                { label: "Photo", done: Boolean(form.image) },
                { label: "Cuisine", done: Boolean(form.cuisineId) },
                { label: "Proteins configured", done: form.proteinIds.length > 0 || form.proteinSelection === "none" },
                { label: "Extras configured", done: form.extraIds.length > 0 || true },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full",
                      item.done ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                    aria-hidden
                  >
                    {item.done ? <BadgeCheck className="size-3" /> : null}
                  </span>
                  <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </aside>
      </div>

      {/* inline protein creation */}
      <Modal
        open={proteinDialog.open}
        onClose={proteinDialog.onClose}
        title="Create a protein option"
        description="It will be attached to this dish and available in your protein list."
        footer={
          <>
            <Button variant="outline" onClick={proteinDialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void createProteinInline()}>
              Create and attach
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required htmlFor="inline-protein-name">
            <Input
              id="inline-protein-name"
              value={newProtein.name}
              onChange={(event) => setNewProtein((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Grilled turkey wings"
            />
          </Field>
          <Field label="Additional price (₦)" hint="Use 0 if it is included." htmlFor="inline-protein-price">
            <Input
              id="inline-protein-price"
              type="number"
              min={0}
              step={50}
              value={newProtein.price}
              onChange={(event) => setNewProtein((prev) => ({ ...prev, price: Number(event.target.value) }))}
            />
          </Field>
        </div>
      </Modal>

      {/* inline extra creation */}
      <Modal
        open={extraDialog.open}
        onClose={extraDialog.onClose}
        title="Create an extra"
        description="It will be attached to this dish and available in your extras list."
        footer={
          <>
            <Button variant="outline" onClick={extraDialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void createExtraInline()}>
              Create and attach
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required htmlFor="inline-extra-name">
            <Input
              id="inline-extra-name"
              value={newExtra.name}
              onChange={(event) => setNewExtra((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Extra pepper sauce"
            />
          </Field>
          <Field label="Price (₦)" required htmlFor="inline-extra-price">
            <Input
              id="inline-extra-price"
              type="number"
              min={0}
              step={50}
              value={newExtra.price}
              onChange={(event) => setNewExtra((prev) => ({ ...prev, price: Number(event.target.value) }))}
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
