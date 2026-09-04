import { Sparkles } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { EmptyState } from "./empty-state"

export function PlaceholderDashboard({ title, portalName }: { title: string; portalName: string }) {
  return (
    <DashboardLayout title={title}>
      <EmptyState
        icon={Sparkles}
        title={`${portalName} is coming in a later phase`}
        description="This phase built the foundation — authentication, RBAC, and academy structure. The real dashboard for this portal ships in a follow-up phase."
      />
    </DashboardLayout>
  )
}
