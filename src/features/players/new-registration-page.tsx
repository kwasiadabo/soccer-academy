import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { RECEPTIONIST_NAV_ITEMS } from "@/features/dashboard-receptionist/receptionist-dashboard"
import { PlayerRegistrationForm } from "./player-registration-form"

export function NewRegistrationPage() {
  const navigate = useNavigate()

  return (
    <DashboardLayout title="New Player Registration" navItems={RECEPTIONIST_NAV_ITEMS}>
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/receptionist")}>
        <ArrowLeft /> Back to players
      </Button>
      <div className="mx-auto max-w-3xl">
        <PlayerRegistrationForm />
      </div>
    </DashboardLayout>
  )
}
