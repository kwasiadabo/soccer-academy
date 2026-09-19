import { DashboardLayout } from "@/app/dashboard-layout"
import { AgeCategorySection } from "@/features/dashboard-admin/age-category-section"
import { useStaffNavItems } from "@/features/issues/staff-issues-page"

export function HeadCoachAgeCategoriesPage() {
  const navItems = useStaffNavItems()
  return (
    <DashboardLayout title="Age Categories" navItems={navItems}>
      <AgeCategorySection />
    </DashboardLayout>
  )
}
