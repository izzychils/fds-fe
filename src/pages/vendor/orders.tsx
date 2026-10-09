import { useParams } from "react-router-dom";
import { DashboardHeading } from "@/components/layout/dashboard";
import { OrderDetailView, OrdersBoard } from "@/features/managers/logistics";
import { useSession } from "@/hooks";
import { EmptyState } from "@/components/ui";

export function VendorOrdersPage() {
  const { vendor } = useSession();
  if (!vendor) {
    return (
      <EmptyState
        title="No kitchen linked"
        message="Register a kitchen before you can receive orders."
      />
    );
  }
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Orders"
        description="Only orders containing your dishes appear here. Status changes are shared with the customer and the merchant console."
      />
      <OrdersBoard scope="vendor" vendorId={vendor.id} basePath="/vendor/orders" />
    </div>
  );
}

export function VendorOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { vendor } = useSession();
  if (!orderId || !vendor) {
    return <EmptyState title="Order not found" message="That order reference does not exist." />;
  }
  return <OrderDetailView orderId={orderId} scope="vendor" vendorId={vendor.id} />;
}
