import { DashboardHeading } from "@/components/layout/dashboard";
import { AuditManager, BannersManager, FeesManager, ReviewsManager, SettingsManager } from "@/features/managers/content";
import { RidersManager } from "@/features/managers/logistics";

export function AdminBannersPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Banner carousel"
        description="Everything on the public carousel is editable here: badge, title, subtitle, image, button text and destination, plus ordering and activation."
      />
      <BannersManager />
    </div>
  );
}

export function AdminRidersPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Riders"
        description="The platform fleet plus riders owned by individual kitchens. Add, edit, activate, set availability and remove riders."
      />
      <RidersManager scope="platform" />
    </div>
  );
}

export function AdminReviewsPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Reviews"
        description="Every review across the platform. Verified badges only ever appear on reviews tied to a delivered order."
      />
      <ReviewsManager scope="platform" />
    </div>
  );
}

export function AdminSettingsPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Site settings"
        description="Site name, logo wordmark, contact details, delivery defaults, dish categories, cuisine types and promo codes."
      />
      <SettingsManager />
    </div>
  );
}

export function AdminFeesPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Platform fees"
        description="Configure how the platform charges for every purchased meal, with an explicit calculation basis and an example."
      />
      <FeesManager />
    </div>
  );
}

export function AdminAuditPage() {
  return (
    <div className="space-y-5">
      <DashboardHeading
        title="Activity log"
        description="A record of significant merchant actions so platform changes can be traced back to an account and a time."
      />
      <AuditManager />
    </div>
  );
}
