import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Ban, Check, Mail, Pencil, Phone, Search, Store, Users, Utensils } from "lucide-react";
import type { VendorStatus } from "@/types";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  StatCard,
  Td,
  Th,
  useDisclosure,
} from "@/components/ui";
import { DashboardHeading } from "@/components/layout/dashboard";
import {
  DishEditor,
  ExtrasManager,
  MenuManager,
  ProteinsManager,
} from "@/features/managers/catalog";
import { useAsyncAction, useDb, useDbMemo } from "@/hooks";
import { authService, foodService, reviewService, vendorService } from "@/services";
import { ROLE_LABEL } from "@/types";
import { formatDate, formatNaira } from "@/lib/utils";

/* -------------------------------------------------------------- vendors */

export function AdminVendorsPage() {
  const { run, pending } = useAsyncAction();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VendorStatus | "all">("all");
  const [managing, setManaging] = useState<string | null>(null);

  const vendors = useDbMemo(() => {
    let list = vendorService.list();
    if (status !== "all") list = list.filter((vendor) => vendor.status === status);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(term) ||
          vendor.city.toLowerCase().includes(term) ||
          vendor.email.toLowerCase().includes(term),
      );
    }
    return list;
  }, [status, search]);

  const selected = managing ? vendorService.get(managing) : null;

  const moderate = async (vendorId: string, next: VendorStatus) => {
    await run(
      () =>
        vendorService.setStatus(vendorId, next, {
          id: "usr_admin",
          fullName: "Merchant console",
          role: "admin",
        }),
      {
        success:
          next === "approved"
            ? "Kitchen approved, it can now go live"
            : next === "suspended"
              ? "Kitchen suspended"
              : "Kitchen moved back to pending",
        silentError: true,
      },
    );
  };

  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Kitchens"
        description="Review applications, approve or suspend vendors, and inspect their menus. A vendor can only ever manage its own business."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered" value={vendors.length} icon={<Store className="size-4" aria-hidden />} />
        <StatCard
          label="Live"
          value={vendors.filter((vendor) => vendor.status === "approved").length}
          tone="success"
        />
        <StatCard
          label="Pending approval"
          value={vendors.filter((vendor) => vendor.status === "pending").length}
          tone="warning"
        />
        <StatCard
          label="Suspended"
          value={vendors.filter((vendor) => vendor.status === "suspended").length}
          tone="destructive"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search kitchens by name, city or email"
            aria-label="Search kitchens"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as VendorStatus | "all")}
          aria-label="Filter by status"
          className="max-w-44"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      {vendors.length === 0 ? (
        <EmptyState icon={<Store className="size-5" aria-hidden />} title="No kitchens match this filter" />
      ) : (
        <Card className="overflow-hidden">
          <DataTable>
            <thead>
              <tr>
                <Th>Kitchen</Th>
                <Th>Location</Th>
                <Th>Contact</Th>
                <Th>Dishes</Th>
                <Th>Rating</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => {
                const dishes = foodService.byVendor(vendor.id);
                const summary = reviewService.summaryForVendor(vendor.id);
                return (
                  <tr key={vendor.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xs font-extrabold text-primary">
                          {vendor.logoText}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{vendor.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            joined {formatDate(vendor.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-xs">
                      {vendor.area}
                      <br />
                      {vendor.city}, {vendor.state}
                    </Td>
                    <Td className="text-xs">
                      <span className="block">{vendor.email}</span>
                      <span className="block text-muted-foreground">{vendor.phone}</span>
                    </Td>
                    <Td>
                      <span className="text-sm">{dishes.length}</span>
                      <span className="block text-xs text-muted-foreground">
                        {dishes.filter((food) => food.isAvailable).length} live
                      </span>
                    </Td>
                    <Td>
                      {summary.count > 0 ? (
                        <span className="text-sm font-semibold">
                          {summary.rating.toFixed(1)}{" "}
                          <span className="text-xs text-muted-foreground">({summary.count})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No reviews</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge
                          tone={
                            vendor.status === "approved"
                              ? "success"
                              : vendor.status === "pending"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {vendor.status}
                        </Badge>
                        {vendor.isOpen ? <Badge tone="primary">Open</Badge> : null}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        {vendor.status === "pending" ? (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => void moderate(vendor.id, "approved")}
                          >
                            <Check className="size-3.5" aria-hidden /> Approve
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => setManaging(vendor.id)}>
                          Inspect
                        </Button>
                        {vendor.status === "approved" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => void moderate(vendor.id, "suspended")}
                          >
                            <Ban className="size-3.5" aria-hidden /> Suspend
                          </Button>
                        ) : vendor.status === "suspended" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => void moderate(vendor.id, "approved")}
                          >
                            Reinstate
                          </Button>
                        ) : null}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </Card>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setManaging(null)}
        title={selected?.name ?? "Kitchen"}
        description="Read-only inspection. The kitchen's own staff manage these records."
        size="lg"
      >
        {selected ? (
          <div className="space-y-4">
            <img src={selected.coverImage} alt="" className="h-40 w-full rounded-2xl object-cover" />
            <p className="text-sm text-muted-foreground">{selected.description}</p>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {[
                ["Address", `${selected.address}, ${selected.area}, ${selected.city}, ${selected.state}`],
                ["Contact", `${selected.email} · ${selected.phone}`],
                ["Hours", `${selected.openTime}–${selected.closeTime}`],
                ["Prep time", `${selected.prepTimeMinutes} minutes`],
                ["Delivery fee", formatNaira(selected.deliveryFee)],
                ["Delivery radius", `${selected.deliveryRadiusKm} km`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border px-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="mb-2 text-sm font-bold">
                Menu ({foodService.byVendor(selected.id).length} dishes)
              </p>
              <ul className="space-y-1.5">
                {foodService
                  .byVendor(selected.id)
                  .slice(0, 8)
                  .map((food) => (
                    <li
                      key={food.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{food.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{formatNaira(food.price)}</span>
                        <Badge tone={food.isAvailable ? "success" : "muted"}>
                          {food.isAvailable ? "Live" : "Hidden"}
                        </Badge>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.status === "pending" ? (
                <Button
                  onClick={() => {
                    void moderate(selected.id, "approved");
                    setManaging(null);
                  }}
                >
                  <BadgeCheck className="size-4" aria-hidden /> Approve this kitchen
                </Button>
              ) : null}
              {selected.status === "approved" ? (
                <Button
                  variant="destructive"
                  onClick={() => {
                    void moderate(selected.id, "suspended");
                    setManaging(null);
                  }}
                >
                  <Ban className="size-4" aria-hidden /> Suspend
                </Button>
              ) : null}
              <Link to="/admin/menu">
                <Button variant="outline">
                  <Utensils className="size-4" aria-hidden /> Inspect dishes
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------ customers */

export function AdminCustomersPage() {
  const db = useDb();
  const { run, pending } = useAsyncAction();
  const roleDialog = useDisclosure();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "vendor" | "admin">("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<"customer" | "vendor" | "admin">("customer");

  const users = useMemo(() => {
    let list = db.users;
    if (roleFilter !== "all") list = list.filter((user) => user.role === roleFilter);
    const term = search.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (user) =>
          user.fullName.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.phone.includes(term),
      );
    }
    return list;
  }, [db, roleFilter, search]);

  const editingUser = editingUserId ? db.users.find((user) => user.id === editingUserId) ?? null : null;

  const actor = { id: "usr_admin", fullName: "Merchant console", role: "admin" as const };

  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Accounts"
        description="Customers, vendor owners and administrators. Merchant access is granted here, never through public sign-up."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Customers"
          value={db.users.filter((user) => user.role === "customer").length}
          icon={<Users className="size-4" aria-hidden />}
        />
        <StatCard
          label="Vendor owners"
          value={db.users.filter((user) => user.role === "vendor").length}
          tone="info"
        />
        <StatCard
          label="Administrators"
          value={db.users.filter((user) => user.role === "admin").length}
          tone="warning"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search accounts"
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
          aria-label="Filter by role"
          className="max-w-44"
        >
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="vendor">Vendor owners</option>
          <option value="admin">Administrators</option>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <DataTable>
          <thead>
            <tr>
              <Th>Account</Th>
              <Th>Role</Th>
              <Th>Kitchen</Th>
              <Th>Orders</Th>
              <Th>Joined</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <Td>
                  <p className="font-semibold">{user.fullName}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" aria-hidden /> {user.email}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" aria-hidden /> {user.phone}
                    </span>
                  </p>
                </Td>
                <Td>
                  <Badge tone={user.role === "admin" ? "primary" : user.role === "vendor" ? "info" : "muted"}>
                    {ROLE_LABEL[user.role]}
                  </Badge>
                </Td>
                <Td className="text-xs">
                  {user.vendorId ? vendorService.get(user.vendorId)?.name ?? "None" : "None"}
                </Td>
                <Td>
                  {db.orders.filter((order) => order.customerId === user.id).length}
                </Td>
                <Td className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</Td>
                <Td>
                  <Badge tone={user.isActive ? "success" : "destructive"}>
                    {user.isActive ? "Active" : "Disabled"}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => void run(() => authService.setActive(user.id, !user.isActive, actor), { silentError: true })}
                    >
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingUserId(user.id);
                        setNewRole(user.role);
                        roleDialog.onOpen();
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden /> Role
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Card>

      <Modal
        open={roleDialog.open}
        onClose={roleDialog.onClose}
        title={`Change role for ${editingUser?.fullName ?? ""}`}
        description="Administrator access grants platform-wide authority. Assign it deliberately."
        footer={
          <>
            <Button variant="outline" onClick={roleDialog.onClose}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() => {
                if (!editingUser) return;
                void run(() => authService.setRole(editingUser.id, newRole, actor), {
                  success: "Role updated, the account must sign in again for it to take effect",
                  onSuccess: () => roleDialog.onClose(),
                  silentError: true,
                });
              }}
            >
              Save role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Role" htmlFor="role-select">
            <Select
              id="role-select"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as typeof newRole)}
            >
              <option value="customer">Customer, can order food</option>
              <option value="vendor">Vendor, manages one kitchen</option>
              <option value="admin">Merchant admin, full platform access</option>
            </Select>
          </Field>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-800">
            A vendor account that is not linked to a kitchen will see an empty dashboard until it is
            attached to one.
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------ menu & catalogue */

export function AdminMenuPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Every dish"
        description="Inspect and moderate every dish across every kitchen. Deleting a dish removes it from the marketplace immediately."
        action={
          <Link to="/admin/menu/new">
            <Button variant="outline">
              <Utensils className="size-4" aria-hidden /> New dish
            </Button>
          </Link>
        }
      />
      <MenuManager scope="platform" basePath="/admin/menu" />
    </div>
  );
}

/**
 * The merchant-side dish editor. It is the same editor vendors use, opened in
 * `platform` scope, so the merchant picks which kitchen the dish belongs to
 * instead of being locked to their own.
 */
export function AdminDishEditorPage() {
  return <DishEditor scope="platform" basePath="/admin/menu" />;
}

export function AdminProteinsPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Proteins"
        description="Platform-wide protein options available to every kitchen, plus any vendor-scoped options vendors have created."
      />
      <ProteinsManager scope="platform" />
    </div>
  );
}

export function AdminExtrasPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Extras"
        description="Platform-wide optional add-ons. Deleting one detaches it from every dish that offers it."
      />
      <ExtrasManager scope="platform" />
    </div>
  );
}

