import { DashboardLayout } from "@/app/dashboard-layout"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { CoachListSection } from "./coach-list-section"

export function HeadCoachCoachesPage() {
  return (
    <DashboardLayout title="Coaches" navItems={HEAD_COACH_NAV_ITEMS}>
      <CoachListSection basePath="/head-coach/coaches" />
    </DashboardLayout>
  )
}
