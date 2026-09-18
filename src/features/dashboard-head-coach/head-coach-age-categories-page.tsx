import { DashboardLayout } from "@/app/dashboard-layout"
import { AgeCategorySection } from "@/features/dashboard-admin/age-category-section"
import { HEAD_COACH_NAV_ITEMS } from "./head-coach-dashboard"

export function HeadCoachAgeCategoriesPage() {
  return (
    <DashboardLayout title="Age Categories" navItems={HEAD_COACH_NAV_ITEMS}>
      <AgeCategorySection />
    </DashboardLayout>
  )
}
