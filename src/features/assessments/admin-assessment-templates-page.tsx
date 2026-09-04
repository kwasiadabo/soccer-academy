import { DashboardLayout } from "@/app/dashboard-layout"
import { AssessmentTemplateSection } from "./assessment-template-section"

export function AdminAssessmentTemplatesPage() {
  return (
    <DashboardLayout title="Assessment Templates">
      <AssessmentTemplateSection />
    </DashboardLayout>
  )
}
