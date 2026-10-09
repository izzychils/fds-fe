import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { DashboardHeading } from "@/components/layout/dashboard";
import {
  DishEditor,
  ExtrasManager,
  InventoryManager,
  MenuManager,
  ProteinsManager,
} from "@/features/managers/catalog";
import { useSession } from "@/hooks";

function RequireVendor({ children }: { children: React.ReactNode }) {
  const { vendor } = useSession();
  if (!vendor) {
    return (
      <EmptyState
        title="No kitchen linked to this account"
        message="Register a kitchen to manage dishes, proteins and extras."
        action={
          <Link to="/vendor-signup">
            <Button>Register a kitchen</Button>
          </Link>
        }
      />
    );
  }
  return <>{children}</>;
}

export function VendorMenuPage() {
  const { vendor } = useSession();
  return (
    <RequireVendor>
      <div className="space-y-5">
        <DashboardHeading
          title="Your dishes"
          description="Create, edit, preview, publish and delete your own dishes. Popular status is stored on the dish itself."
          action={
            <Link to="/vendor/menu/new">
              <Button>
                <Plus className="size-4" aria-hidden /> Add a dish
              </Button>
            </Link>
          }
        />
        <MenuManager scope="vendor" vendorId={vendor?.id ?? null} basePath="/vendor/menu" />
      </div>
    </RequireVendor>
  );
}

export function VendorDishEditorPage() {
  const { vendor } = useSession();
  return (
    <RequireVendor>
      <DishEditor scope="vendor" vendorId={vendor?.id ?? null} basePath="/vendor/menu" />
    </RequireVendor>
  );
}

export function VendorInventoryPage() {
  const { vendor } = useSession();
  return (
    <RequireVendor>
      <div className="space-y-5">
        <DashboardHeading
          title="Live inventory"
          description="Stock changes take effect on the marketplace immediately. Setting a dish to 0 marks it sold out."
        />
        <InventoryManager vendorId={vendor?.id ?? null} basePath="/vendor/menu" />
      </div>
    </RequireVendor>
  );
}

export function VendorProteinsPage() {
  const { vendor } = useSession();
  return (
    <RequireVendor>
      <div className="space-y-5">
        <DashboardHeading
          title="Proteins"
          description="The protein options customers choose from when customizing your dishes. Platform-wide options added by the merchant are available to you too."
        />
        <ProteinsManager scope="vendor" vendorId={vendor?.id ?? null} />
      </div>
    </RequireVendor>
  );
}

export function VendorExtrasPage() {
  const { vendor } = useSession();
  return (
    <RequireVendor>
      <div className="space-y-5">
        <DashboardHeading
          title="Extras"
          description="Optional paid add-ons such as extra cheese, bacon or loaded fries."
        />
        <ExtrasManager scope="vendor" vendorId={vendor?.id ?? null} />
      </div>
    </RequireVendor>
  );
}
