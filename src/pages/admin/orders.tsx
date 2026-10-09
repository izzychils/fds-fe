import { useParams } from "react-router-dom";
import { DashboardHeading } from "@/components/layout/dashboard";
import { OrderDetailView, OrdersBoard } from "@/features/managers/logistics";
import { EmptyState } from "@/components/ui";

export function AdminOrdersPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="All orders"
        description="Every order across every kitchen, with the same status model the customer and vendor see. Filter by kitchen, status or search by reference, customer or dish."
      />
      <OrdersBoard scope="admin" basePath="/admin/orders" />
    </div>
  );
}

export function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  if (!orderId) {
    return <EmptyState title="Order not found" message="That order reference does not exist." />;
  }
  return <OrderDetailView orderId={orderId} scope="admin" />;
}
