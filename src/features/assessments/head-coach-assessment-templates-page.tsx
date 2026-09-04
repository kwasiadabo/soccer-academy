import { DashboardLayout } from "@/app/dashboard-layout"
import { HEAD_COACH_NAV_ITEMS } from "@/features/dashboard-head-coach/head-coach-dashboard"
import { AssessmentTemplateSection } from "./assessment-template-section"

export function HeadCoachAssessmentTemplatesPage() {
  return (
    <DashboardLayout title="Assessment Templates" navItems={HEAD_COACH_NAV_ITEMS}>
      <AssessmentTemplateSection />
    </DashboardLayout>
  )
}
