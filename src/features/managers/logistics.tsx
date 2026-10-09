import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bike,
  Check,
  ClipboardList,
  Filter,
  Pencil,
  Phone,
  Plus,
  Power,
  Search,
  Trash2,
  Truck,
  UserPlus,
} from "lucide-react";
import type { OrderStatus, Rider, Vehicle } from "@/types";
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
  Select,
  StatCard,
  Switch,
  Td,
  Th,
  useDisclosure,
} from "@/components/ui";
import { OrderTotals, StatusActions, StatusProgress, StatusTimeline, TrackingPanel } from "@/components/orders";
import { useAsyncAction, useDb, useSession, useTrackingTicker, useDbMemo } from "@/hooks";
import { orderService, riderService, trackingService, vendorService } from "@/services";
import { STATUS_META, isLive } from "@/lib/orders";
import { ALL_TRANSITIONS_KEYS } from "@/features/managers/status-options";
import { cn, formatDateTime, formatNaira, timeAgo } from "@/lib/utils";
import { toast } from "sonner";

/* ---------------------------------------------------------------- riders */

const VEHICLES: Vehicle[] = ["Bike", "Bicycle", "Car", "Keke"];

export function RidersManager({ scope }: { scope: "vendor" | "platform" }) {
  const db = useDb();
  const { user, vendor } = useSession();
  const { run, pending } = useAsyncAction();
  const dialog = useDisclosure();
  const [editing, setEditing] = useState<Rider | null>(null);
  const [deleting, setDeleting] = useState<Rider | null>(null);
  const [search, setSearch] = useState("");

  const scopedVendorId = scope === "vendor" ? vendor?.id ?? null : null;

  const riders = useDbMemo(() => {
    const base = riderService.listForVendor(scopedVendorId);
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter(
      (rider) =>
        rider.name.toLowerCase().includes(term) ||
        rider.phone.toLowerCase().includes(term) ||
        rider.plateNumber.toLowerCase().includes(term),
    );
  }, [scopedVendorId, search]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle: "Bike" as Vehicle,
    plateNumber: "",
    vendorId: null as string | null,
  });

  const openDialog = (rider: Rider | null) => {
    setEditing(rider);
    setForm(
      rider
        ? {
            name: rider.name,
            phone: rider.phone,
            vehicle: rider.vehicle,
            plateNumber: rider.plateNumber,
            vendorId: rider.vendorId,
          }
        : { name: "", phone: "", vehicle: "Bike", plateNumber: "", vendorId: scopedVendorId },
    );
    dialog.onOpen();
  };

  if (!user) return null;

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("A rider needs a name and a phone number.");
      return;
    }
    const result = await run(
      () =>
        editing
          ? riderService.update(
              editing.id,
              {
                name: form.name,
                phone: form.phone,
                vehicle: form.vehicle,
                plateNumber: form.plateNumber,
                vendorId: form.vendorId,
              },
              user,
            )
          : riderService.create(
              {
                name: form.name,
                phone: form.phone,
                vehicle: form.vehicle,
                plateNumber: form.plateNumber,
                vendorId: form.vendorId,
              },
              user,
            ),
      { success: editing ? "Rider updated" : "Rider added", silentError: true },
    );
    if (result) {
      dialog.onClose();
      setEditing(null);
    }
  };

  const activeCount = riders.filter((rider) => rider.isActive).length;
  const availableCount = riders.filter((rider) => rider.isActive && rider.isAvailable).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Riders" value={riders.length} icon={<Bike className="size-4" aria-hidden />} />
        <StatCard label="Active" value={activeCount} tone="success" />
        <StatCard label="Available now" value={availableCount} tone="warning" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search riders by name, phone or plate"
            aria-label="Search riders"
            className="pl-9"
          />
        </div>
        <Button onClick={() => openDialog(null)}>
          <UserPlus className="size-4" aria-hidden /> Add rider
        </Button>
      </div>

      {riders.length === 0 ? (
        <EmptyState
          icon={<Bike className="size-5" aria-hidden />}
          title="No riders yet"
          message="Add riders so you can assign them to orders and keep customers informed."
          action={
            <Button onClick={() => openDialog(null)}>
              <Plus className="size-4" aria-hidden /> Add the first rider
            </Button>
          }
        />
      ) : (
        <>
          {/* desktop table */}
          <Card className="hidden overflow-hidden lg:block">
            <DataTable>
              <thead>
                <tr>
                  <Th>Rider</Th>
                  <Th>Vehicle</Th>
                  <Th>Fleet</Th>
                  <Th>Deliveries</Th>
                  <Th>Rating</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {riders.map((rider) => (
                  <tr key={rider.id}>
                    <Td>
                      <p className="font-semibold">{rider.name}</p>
                      <p className="text-xs text-muted-foreground">{rider.phone}</p>
                    </Td>
                    <Td>
                      <span className="text-sm">{rider.vehicle}</span>
                      <span className="block text-xs text-muted-foreground">{rider.plateNumber}</span>
                    </Td>
                    <Td>
                      {rider.vendorId ? (
                        <Badge tone="info">
                          {vendorService.get(rider.vendorId)?.name ?? "Kitchen fleet"}
                        </Badge>
                      ) : (
                        <Badge tone="muted">Platform fleet</Badge>
                      )}
                    </Td>
                    <Td>{rider.deliveriesCompleted}</Td>
                    <Td>{rider.rating > 0 ? rider.rating.toFixed(1) : "—"}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={rider.isActive ? "success" : "muted"}>
                          {rider.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {rider.isAvailable ? <Badge tone="primary">Available</Badge> : null}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${rider.name}`}
                          onClick={() => openDialog(rider)}
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={rider.isActive ? `Deactivate ${rider.name}` : `Activate ${rider.name}`}
                          onClick={() =>
                            void run(() => riderService.setActive(rider.id, !rider.isActive, user), {
                              silentError: true,
                              success: rider.isActive ? "Rider deactivated" : "Rider activated",
                            })
                          }
                          className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                        >
                          <Power className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${rider.name}`}
                          onClick={() => setDeleting(rider)}
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

          {/* mobile cards */}
          <div className="grid gap-3 lg:hidden">
            {riders.map((rider) => (
              <Card key={rider.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{rider.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rider.vehicle} · {rider.plateNumber}
                    </p>
                  </div>
                  <Badge tone={rider.isActive ? "success" : "muted"}>
                    {rider.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <a href={`tel:${rider.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Phone className="size-3.5" aria-hidden /> {rider.phone}
                </a>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openDialog(rider)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(() => riderService.setActive(rider.id, !rider.isActive, user), {
                        silentError: true,
                      })
                    }
                  >
                    {rider.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(rider)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        open={dialog.open}
        onClose={dialog.onClose}
        title={editing ? `Edit ${editing.name}` : "Add a rider"}
        description="Rider details appear on the customer's tracking screen while they are assigned to an order."
        footer={
          <>
            <Button variant="outline" onClick={dialog.onClose}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => void save()}>
              {editing ? "Save rider" : "Add rider"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required htmlFor="rider-name">
              <Input
                id="rider-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Chidi Okonkwo"
              />
            </Field>
            <Field label="Phone number" required htmlFor="rider-phone">
              <Input
                id="rider-phone"
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="0803 000 0000"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Vehicle" htmlFor="rider-vehicle">
              <Select
                id="rider-vehicle"
                value={form.vehicle}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vehicle: event.target.value as Vehicle }))
                }
              >
                {VEHICLES.map((vehicle) => (
                  <option key={vehicle} value={vehicle}>
                    {vehicle}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Plate number" hint="Leave blank for bicycles." htmlFor="rider-plate">
              <Input
                id="rider-plate"
                value={form.plateNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, plateNumber: event.target.value }))}
                placeholder="KJA-431-QR"
              />
            </Field>
          </div>
          {scope === "platform" ? (
            <Field
              label="Fleet"
              hint="Platform riders can be assigned by any kitchen. Kitchen riders stay with their own kitchen."
              htmlFor="rider-fleet"
            >
              <Select
                id="rider-fleet"
                value={form.vendorId ?? ""}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendorId: event.target.value || null }))
                }
              >
                <option value="">Platform fleet</option>
                {db.vendors.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              This rider will belong to {vendor?.name ?? "your kitchen"}.
            </p>
          )}
          {editing ? (
            <Switch
              checked={editing.isAvailable}
              onChange={(next) =>
                void run(() => riderService.setAvailable(editing.id, next, user), {
                  silentError: true,
                })
              }
              label="Available for new assignments"
              description="Unavailable riders are hidden from the assignment list."
            />
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          void run(() => riderService.remove(deleting.id, user), { success: "Rider removed" });
          setDeleting(null);
        }}
        title={`Delete ${deleting?.name ?? "rider"}?`}
        message="Riders with live orders cannot be deleted — deactivate them instead."
        confirmLabel="Delete rider"
        pending={pending}
      />
    </div>
  );
}

/* ------------------------------------------------------------- orders */

export function OrdersBoard({
  scope,
  vendorId,
  basePath,
}: {
  scope: "vendor" | "admin";
  vendorId?: string | null;
  basePath: string;
}) {
  const db = useDb();
  const [status, setStatus] = useState<OrderStatus | "all" | "live">("live");
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState<string>("");

  useTrackingTicker(true, 12000, () => trackingService.tick());

  const orders = useDbMemo(() => {
    let list = scope === "vendor" && vendorId ? orderService.listForVendor(vendorId) : orderService.list();
    if (vendorFilter) list = list.filter((order) => order.vendorIds.includes(vendorFilter));
    if (status === "live") list = list.filter((order) => isLive(order.status));
    else if (status !== "all") list = list.filter((order) => order.status === status);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (order) =>
          order.id.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerPhone.toLowerCase().includes(term) ||
          order.items.some((item) => item.name.toLowerCase().includes(term)),
      );
    }
    return list;
  }, [scope, vendorId, status, search, vendorFilter]);

  const stats = useDbMemo(() => orderService.stats(scope === "vendor" && vendorId ? orderService.listForVendor(vendorId) : orderService.list()), [scope, vendorId]);

  const statusOptions = useDbMemo(() => {
    const counts = new Map<OrderStatus, number>();
    const source = scope === "vendor" && vendorId ? orderService.listForVendor(vendorId) : orderService.list();
    for (const order of source) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
    return ALL_TRANSITIONS_KEYS.filter((key) => key !== "all").map((key) => ({
      value: key,
      label: key === "live" ? "Live" : STATUS_META[key as OrderStatus].label,
      count:
        key === "live"
          ? source.filter((order) => isLive(order.status)).length
          : counts.get(key as OrderStatus) ?? 0,
    }));
  }, [scope, vendorId]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live orders"
          value={stats.live}
          icon={<ClipboardList className="size-4" aria-hidden />}
          tone="primary"
        />
        <StatCard label="Awaiting confirmation" value={stats.pending} tone="warning" />
        <StatCard label="Out for delivery" value={stats.outForDelivery} tone="info" />
        <StatCard
          label={scope === "vendor" ? "Food revenue" : "Platform fees"}
          value={formatNaira(scope === "vendor" ? stats.revenue : stats.platformFees)}
          tone="success"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by order id, customer or dish"
              aria-label="Search orders"
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus | "all" | "live")}
            aria-label="Filter by status"
            className="max-w-56"
          >
            <option value="live">Live orders ({stats.live})</option>
            <option value="all">All orders ({stats.total})</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </Select>
          {scope === "admin" ? (
            <Select
              value={vendorFilter}
              onChange={(event) => setVendorFilter(event.target.value)}
              aria-label="Filter by kitchen"
              className="max-w-56"
            >
              <option value="">All kitchens</option>
              {db.vendors.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={<Filter className="size-5" aria-hidden />}
            title="No orders match these filters"
            message="Try a different status, or clear the search."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("all");
                  setSearch("");
                  setVendorFilter("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <Card className="overflow-hidden">
            <DataTable className="hidden lg:block">
              <thead>
                <tr>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  {scope === "admin" ? <Th>Kitchens</Th> : null}
                  <Th>Items</Th>
                  <Th>Total</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Open</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <Td>
                      <p className="font-semibold">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</p>
                    </Td>
                    <Td>
                      <p className="text-sm">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                    </Td>
                    {scope === "admin" ? (
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {order.vendorIds.map((id) => (
                            <Badge key={id} tone="muted">
                              {vendorService.get(id)?.name ?? "Kitchen"}
                            </Badge>
                          ))}
                        </div>
                      </Td>
                    ) : null}
                    <Td>
                      <span className="text-sm">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </span>
                      <span className="block max-w-56 truncate text-xs text-muted-foreground">
                        {order.items.map((item) => item.name).join(", ")}
                      </span>
                    </Td>
                    <Td className="font-semibold">{formatNaira(order.total)}</Td>
                    <Td>
                      <div className="min-w-40 space-y-1.5">
                        <StatusProgress status={order.status} />
                      </div>
                    </Td>
                    <Td className="text-right">
                      <Link to={`${basePath}/${order.id}`}>
                        <Button size="sm" variant="outline">
                          Manage
                        </Button>
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>

            <ul className="divide-y divide-border lg:hidden">
              {orders.map((order) => (
                <li key={order.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold">{order.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerName} · {timeAgo(order.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-extrabold">{formatNaira(order.total)}</span>
                  </div>
                  <StatusProgress status={order.status} />
                  <Link to={`${basePath}/${order.id}`}>
                    <Button size="sm" variant="outline" fullWidth>
                      Manage order
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- order detail */

export function OrderDetailView({
  orderId,
  scope,
  vendorId,
}: {
  orderId: string;
  scope: "vendor" | "admin";
  vendorId?: string | null;
}) {
  const db = useDb();
  const { user } = useSession();
  const { run, pending } = useAsyncAction();
  const [note, setNote] = useState("");
  const [riderId, setRiderId] = useState<string>("");

  const scopedVendorId = scope === "vendor" ? vendorId ?? null : null;

  const order = useDbMemo(() => orderService.get(orderId), [orderId]);
  const rider = useMemo(
    () => (order?.riderId ? db.riders.find((entry) => entry.id === order.riderId) ?? null : null),
    [db, order],
  );

  useEffect(() => {
    if (order && order.trackingPath.length === 0 && isLive(order.status)) {
      trackingService.ensurePath(order.id);
    }
  }, [order]);

  useEffect(() => {
    setNote(order?.vendorNote ?? "");
  }, [order?.id, order?.vendorNote]);

  useTrackingTicker(Boolean(order && order.status === "out_for_delivery"), 10000, () =>
    trackingService.tick(),
  );

  if (!user) return null;

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        message="That reference does not exist."
        action={
          <Link to={scope === "vendor" ? "/vendor/orders" : "/admin/orders"}>
            <Button>Back to orders</Button>
          </Link>
        }
      />
    );
  }

  if (scopedVendorId && !order.vendorIds.includes(scopedVendorId)) {
    return (
      <EmptyState
        title="Not your order"
        message="This order does not include any of your dishes, so you cannot manage it."
        action={
          <Link to="/vendor/orders">
            <Button>Back to your orders</Button>
          </Link>
        }
      />
    );
  }

  const availableRiders = riderService.available(scopedVendorId);
  const canAssign = order.status !== "pending" && order.status !== "confirmed" && isLive(order.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Order {order.id}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName} · {order.customerPhone} · received {formatDateTime(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={scope === "vendor" ? "/vendor/orders" : "/admin/orders"}>
            <Button variant="outline" size="sm">
              All orders
            </Button>
          </Link>
          <a href={`tel:${order.customerPhone.replace(/\s/g, "")}`}>
            <Button size="sm" variant="ghost">
              <Phone className="size-3.5" aria-hidden /> Call customer
            </Button>
          </a>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {isLive(order.status) ? <TrackingPanel order={order} rider={rider} /> : null}

          <Card className="p-4">
            <h2 className="mb-4 text-sm font-bold">Status history</h2>
            <StatusTimeline order={order} />
          </Card>

          <Card className="overflow-hidden">
            <h2 className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-bold">
              Items ({order.items.reduce((sum, item) => sum + item.quantity, 0)})
            </h2>
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 p-4">
                  <img src={item.image} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-bold">
                        {item.quantity}× {item.name}
                      </p>
                      <span className="text-sm font-extrabold">{formatNaira(item.lineTotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.vendorName}</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {item.sizeLabel ? <li>Size: {item.sizeLabel}</li> : null}
                      {item.proteins.length > 0 ? (
                        <li>Protein: {item.proteins.map((p) => p.name).join(", ")}</li>
                      ) : null}
                      {item.extras.length > 0 ? (
                        <li>Extras: {item.extras.map((e) => e.name).join(", ")}</li>
                      ) : null}
                      {item.instructions ? (
                        <li className="font-medium text-amber-700">Note: {item.instructions}</li>
                      ) : null}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-5">
          {isLive(order.status) ? (
            <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
              <h2 className="text-sm font-bold">Advance this order</h2>
              <StatusActions
                order={order}
                vendorId={scopedVendorId}
                pending={pending}
                onTransition={(status, allowed) => {
                  if (!allowed) {
                    toast.error("That status change is not allowed from here.");
                    return;
                  }
                  void run(
                    () =>
                      orderService.transition({
                        orderId: order.id,
                        to: status,
                        actor: user,
                        vendorId: scopedVendorId,
                      }),
                    { success: `Order marked ${STATUS_META[status].label.toLowerCase()}` },
                  );
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                Only valid transitions are offered, and the service rejects anything else — an order
                can never jump from pending straight to delivered.
              </p>
            </GlassCard>
          ) : null}

          <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Truck className="size-4 text-primary" aria-hidden /> Rider assignment
            </h2>
            {order.riderId ? (
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-bold">{rider?.name ?? "Assigned rider"}</p>
                <p className="text-xs text-muted-foreground">
                  {rider?.vehicle} · {rider?.plateNumber} · {rider?.phone}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={pending}
                  onClick={() =>
                    void run(() => orderService.assignRider(order.id, null, user), {
                      success: "Rider unassigned",
                    })
                  }
                >
                  Unassign
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No rider assigned yet.</p>
            )}

            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-48 flex-1">
                <label htmlFor="assign-rider" className="mb-1.5 block text-xs font-semibold">
                  {order.riderId ? "Reassign to" : "Assign a rider"}
                </label>
                <Select
                  id="assign-rider"
                  value={riderId}
                  onChange={(event) => setRiderId(event.target.value)}
                  disabled={!canAssign}
                >
                  <option value="">Choose a rider…</option>
                  {availableRiders.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} · {entry.vehicle}
                      {entry.vendorId ? " (kitchen fleet)" : " (platform)"}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                disabled={!riderId || pending || !canAssign}
                onClick={() =>
                  void run(() => orderService.assignRider(order.id, riderId, user), {
                    success: "Rider assigned",
                    onSuccess: () => setRiderId(""),
                  })
                }
              >
                <Bike className="size-4" aria-hidden /> Assign
              </Button>
            </div>
            {!canAssign ? (
              <p className="text-[11px] text-muted-foreground">
                Confirm the order before assigning a rider.
              </p>
            ) : null}
          </GlassCard>

          <GlassCard intensity="card" className="space-y-3 rounded-2xl p-4">
            <h2 className="text-sm font-bold">Note to the customer</h2>
            <Field label="Visible on their tracking screen" htmlFor="vendor-note">
              <Input
                id="vendor-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. rider is 3 minutes away"
              />
            </Field>
            <Button
              size="sm"
              loading={pending}
              onClick={() =>
                void run(() => orderService.updateVendorNote(order.id, note, user), {
                  success: "Note saved",
                })
              }
            >
              <Check className="size-3.5" aria-hidden /> Save note
            </Button>
          </GlassCard>

          <OrderTotals order={order} />

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">Delivery address</h2>
            <p className="text-sm">
              {order.address.line1}
              <br />
              {order.address.area}, {order.address.city}, {order.address.state}
            </p>
            {order.address.landmark ? (
              <p className="text-xs text-muted-foreground">Landmark: {order.address.landmark}</p>
            ) : null}
            {order.customerNote ? (
              <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs">
                Customer note: {order.customerNote}
              </p>
            ) : null}
          </Card>

          <Card className="space-y-2 p-4">
            <h2 className="text-sm font-bold">Per-kitchen fulfilment</h2>
            <ul className="space-y-2">
              {order.vendorIds.map((id) => (
                <li key={id} className="flex items-center justify-between gap-2 text-sm">
                  <span className={cn(scopedVendorId === id && "font-bold text-primary")}>
                    {vendorService.get(id)?.name ?? "Kitchen"}
                  </span>
                  <Badge tone="muted">{STATUS_META[order.vendorStatus[id] ?? order.status].label}</Badge>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Multi-vendor orders are fulfilled separately; the order-level status follows the least
              advanced live kitchen.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
