import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/dashboard";
import { PublicLayout } from "@/components/layout/public";
import { RedirectIfSignedIn, RequireAuth } from "@/routes/guards";

/* public */
import LandingPage from "@/pages/public/landing";
import BrowseFoodPage from "@/pages/public/browse";
import FoodDetailPage from "@/pages/public/food-detail";
import {
  AboutPage,
  ContactPage,
  HelpPage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from "@/pages/public/static-pages";

/* auth */
import { ForgotPasswordPage, SignInPage, SignUpPage, VendorSignUpPage } from "@/pages/auth";

/* customer */
import CustomerHomePage from "@/pages/customer/home";
import { CartPage, CheckoutPage } from "@/pages/customer/cart";
import { CustomerOrderDetailPage, CustomerOrdersPage } from "@/pages/customer/orders";
import {
  FavoritesPage,
  CustomerProfilePage,
  CustomerReviewsPage,
} from "@/pages/customer/profile";

/* vendor */
import VendorOverviewPage from "@/pages/vendor/overview";
import { VendorOrderDetailPage, VendorOrdersPage } from "@/pages/vendor/orders";
import {
  VendorDishEditorPage,
  VendorExtrasPage,
  VendorInventoryPage,
  VendorMenuPage,
  VendorProteinsPage,
} from "@/pages/vendor/menu";
import {
  VendorDeliveryPage,
  VendorReviewsPage,
  VendorRidersPage,
  VendorSettingsPage,
} from "@/pages/vendor/settings";

/* admin */
import AdminOverviewPage from "@/pages/admin/overview";
import { AdminOrderDetailPage, AdminOrdersPage } from "@/pages/admin/orders";
import {
  AdminCustomersPage,
  AdminExtrasPage,
  AdminDishEditorPage,
  AdminMenuPage,
  AdminProteinsPage,
  AdminVendorsPage,
} from "@/pages/admin/catalog";
import {
  AdminAuditPage,
  AdminBannersPage,
  AdminFeesPage,
  AdminReviewsPage,
  AdminRidersPage,
  AdminSettingsPage,
} from "@/pages/admin/content";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ------------------------------------------------------ public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/foods" element={<BrowseFoodPage />} />
          <Route path="/foods/:foodId" element={<FoodDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* ------------------------------------------------- customer */}
          <Route
            path="/app"
            element={
              <RequireAuth roles={["customer"]}>
                <CustomerHomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/cart"
            element={
              <RequireAuth roles={["customer"]}>
                <CartPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/checkout"
            element={
              <RequireAuth roles={["customer"]}>
                <CheckoutPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/orders"
            element={
              <RequireAuth roles={["customer"]}>
                <CustomerOrdersPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/orders/:orderId"
            element={
              <RequireAuth roles={["customer"]}>
                <CustomerOrderDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/favorites"
            element={
              <RequireAuth roles={["customer"]}>
                <FavoritesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/reviews"
            element={
              <RequireAuth roles={["customer"]}>
                <CustomerReviewsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/app/profile"
            element={
              <RequireAuth roles={["customer"]}>
                <CustomerProfilePage />
              </RequireAuth>
            }
          />
        </Route>

        {/* -------------------------------------------------------- auth */}
        <Route
          path="/sign-in"
          element={
            <RedirectIfSignedIn>
              <SignInPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/sign-up"
          element={
            <RedirectIfSignedIn>
              <SignUpPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/vendor-signup"
          element={
            <RedirectIfSignedIn>
              <VendorSignUpPage />
            </RedirectIfSignedIn>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RedirectIfSignedIn>
              <ForgotPasswordPage />
            </RedirectIfSignedIn>
          }
        />

        {/* ------------------------------------------------------ vendor */}
        <Route
          path="/vendor"
          element={
            <RequireAuth roles={["vendor"]}>
              <DashboardLayout role="vendor" />
            </RequireAuth>
          }
        >
          <Route index element={<VendorOverviewPage />} />
          <Route path="orders" element={<VendorOrdersPage />} />
          <Route path="orders/:orderId" element={<VendorOrderDetailPage />} />
          <Route path="menu" element={<VendorMenuPage />} />
          <Route path="menu/new" element={<VendorDishEditorPage />} />
          <Route path="menu/:foodId/edit" element={<VendorDishEditorPage />} />
          <Route path="inventory" element={<VendorInventoryPage />} />
          <Route path="proteins" element={<VendorProteinsPage />} />
          <Route path="extras" element={<VendorExtrasPage />} />
          <Route path="riders" element={<VendorRidersPage />} />
          <Route path="reviews" element={<VendorReviewsPage />} />
          <Route path="delivery" element={<VendorDeliveryPage />} />
          <Route path="settings" element={<VendorSettingsPage />} />
        </Route>

        {/* ------------------------------------------------------- admin */}
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["admin"]}>
              <DashboardLayout role="admin" />
            </RequireAuth>
          }
        >
          <Route index element={<AdminOverviewPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:orderId" element={<AdminOrderDetailPage />} />
          <Route path="vendors" element={<AdminVendorsPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="menu/new" element={<AdminDishEditorPage />} />
          <Route path="menu/:foodId/edit" element={<AdminDishEditorPage />} />
          <Route path="proteins" element={<AdminProteinsPage />} />
          <Route path="extras" element={<AdminExtrasPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="riders" element={<AdminRidersPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="fees" element={<AdminFeesPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
