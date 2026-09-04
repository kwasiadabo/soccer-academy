import { DashboardLayout } from "@/app/dashboard-layout"
import { CoachListSection } from "@/features/coaches/coach-list-section"
import { GuardianSearchSection } from "@/features/guardians/guardian-search-section"

export function StaffPage() {
  return (
    <DashboardLayout title="Staff & Portal Access">
      <div className="space-y-8">
        <CoachListSection />
        <GuardianSearchSection />
      </div>
    </DashboardLayout>
  )
}
