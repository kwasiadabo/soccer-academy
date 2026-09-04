import { AlertTriangle, Banknote, Layers, ShieldCheck, Trophy, UserCheck, Users } from "lucide-react"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/design-system/stat-card"
import { formatCurrency } from "@/lib/currency"
import { usePlayers } from "@/features/players/players-api"
import { useDebtors, usePaymentsReport } from "@/features/finance/finance-api"
import { SeasonSection } from "./season-section"
import { AgeCategorySection } from "./age-category-section"
import { TeamSection } from "./team-section"
import { TrainingGroupSection } from "./training-group-section"
import { useAgeCategories, useSeasons, useTeams, useTrainingGroups } from "./academy-config-api"

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export function AdminDashboard() {
  const seasons = useSeasons()
  const ageCategories = useAgeCategories()
  const teams = useTeams()
  const trainingGroups = useTrainingGroups()
  const activePlayers = usePlayers({ status: "ACTIVE" })
  const debtors = useDebtors()
  const monthlyPayments = usePaymentsReport({ from: startOfMonth() })

  const outstandingTotal = debtors.data?.reduce((sum, row) => sum + row.totalOwed, 0) ?? 0

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-sm font-bold tracking-tight">Academy at a glance</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={UserCheck}
              label="Active players"
              value={activePlayers.data?.length ?? 0}
              isLoading={activePlayers.isLoading}
              highlight
            />
            <StatCard
              icon={Banknote}
              label="Revenue this month"
              value={formatCurrency(monthlyPayments.data?.summary.totalAmount ?? 0)}
              isLoading={monthlyPayments.isLoading}
            />
            <StatCard
              icon={AlertTriangle}
              label="Outstanding payments"
              value={formatCurrency(outstandingTotal)}
              isLoading={debtors.isLoading}
            />
            <StatCard icon={Trophy} label="Seasons" value={seasons.data?.length ?? 0} isLoading={seasons.isLoading} />
            <StatCard
              icon={ShieldCheck}
              label="Age categories"
              value={ageCategories.data?.length ?? 0}
              isLoading={ageCategories.isLoading}
            />
            <StatCard icon={Users} label="Teams" value={teams.data?.length ?? 0} isLoading={teams.isLoading} />
            <StatCard
              icon={Layers}
              label="Training groups"
              value={trainingGroups.data?.length ?? 0}
              isLoading={trainingGroups.isLoading}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academy Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SeasonSection />
            <AgeCategorySection />
            <TeamSection />
            <TrainingGroupSection />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
