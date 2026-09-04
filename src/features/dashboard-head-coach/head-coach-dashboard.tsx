import { formatDate } from "@/lib/date"
import { useNavigate } from "react-router-dom"
import {
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  IdCard,
  Images,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Trophy,
  Users,
} from "lucide-react"

import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { StatCard } from "@/design-system/stat-card"
import { useCoaches } from "@/features/coaches/coaches-api"
import { useMatches } from "@/features/matches/matches-api"
import { usePlayers } from "@/features/players/players-api"
import { useAssessmentOversight } from "@/features/assessments/assessments-api"
import { useTrainingPlans, useTrainingSessions, useTrainingTeams } from "@/features/training/training-api"
import { AttendanceAnalyticsSection } from "@/features/training/attendance-analytics-section"
import { CoachPerformanceSection } from "@/features/coaches/coach-performance-section"

export const HEAD_COACH_NAV_ITEMS: NavItem[] = [
  { to: "/head-coach", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/head-coach/approvals", label: "Approvals", icon: CheckCircle2 },
  { to: "/head-coach/players", label: "Players", icon: IdCard },
  { to: "/receptionist/finance", label: "Payments & Debtors", icon: CreditCard },
  { to: "/head-coach/teams", label: "Teams", icon: Shield },
  { to: "/head-coach/coaches", label: "Coaches", icon: Users },
  { to: "/head-coach/matches", label: "Matches", icon: Trophy },
  { to: "/head-coach/assessments", label: "Player Ratings", icon: ClipboardList },
  { to: "/issues", label: "Issues", icon: LifeBuoy },
  { to: "/merchandise/orders", label: "Orders", icon: ShoppingBag },
  { to: "/merchandise/products", label: "Products", icon: Package },
  { to: "/gallery/manage", label: "Gallery", icon: Images },
]

function isWithinNextDays(dateStr: string, days: number): boolean {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(startOfToday)
  end.setDate(end.getDate() + days)
  const date = new Date(dateStr)
  return date >= startOfToday && date < end
}

function isWithinLastDays(dateStr: string, days: number): boolean {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  const date = new Date(dateStr)
  return date >= start && date <= now
}

export function HeadCoachDashboard() {
  const navigate = useNavigate()
  const teams = useTrainingTeams()
  const coaches = useCoaches()
  const pendingPlans = useTrainingPlans("SUBMITTED")
  const allPlans = useTrainingPlans()
  const sessions = useTrainingSessions()
  const matches = useMatches()
  const oversight = useAssessmentOversight()
  const players = usePlayers()

  const upcomingSessions = (sessions.data ?? []).filter((s) => isWithinNextDays(s.date, 7))
  const upcomingMatches = (matches.data ?? []).filter((m) => isWithinNextDays(m.matchDate, 7))
  const assessmentsThisWeek = (oversight.data ?? []).filter((a) => isWithinLastDays(a.assessmentDate, 7))
  const registeredPlayers = players.data?.length ?? 0
  const activePlayers = (players.data ?? []).filter((p) => p.status === "ACTIVE").length

  return (
    <DashboardLayout title="Head Coach Dashboard" navItems={HEAD_COACH_NAV_ITEMS}>
      <div className="space-y-8">
        <div>
          <h2 className="mb-3 text-sm font-bold tracking-tight">Academy performance at a glance</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              icon={IdCard}
              label="Registered players"
              value={registeredPlayers}
              isLoading={players.isLoading}
            />
            <StatCard
              icon={ShieldCheck}
              label="Active players"
              value={activePlayers}
              isLoading={players.isLoading}
            />
            <StatCard icon={Users} label="Teams" value={teams.data?.length ?? 0} isLoading={teams.isLoading} />
            <StatCard icon={Users} label="Coaches" value={coaches.data?.length ?? 0} isLoading={coaches.isLoading} />
            <StatCard
              icon={CheckCircle2}
              label="Awaiting approval"
              value={pendingPlans.data?.length ?? 0}
              isLoading={pendingPlans.isLoading}
              highlight={(pendingPlans.data?.length ?? 0) > 0}
            />
            <StatCard
              icon={ClipboardList}
              label="Sessions this week"
              value={upcomingSessions.length}
              isLoading={sessions.isLoading}
            />
            <StatCard
              icon={Trophy}
              label="Matches this week"
              value={upcomingMatches.length}
              isLoading={matches.isLoading}
            />
            <StatCard
              icon={ClipboardCheck}
              label="Assessments this week"
              value={assessmentsThisWeek.length}
              isLoading={oversight.isLoading}
            />
          </div>
        </div>

        <AttendanceAnalyticsSection sessions={sessions.data ?? []} trendCount={3} />

        <CoachPerformanceSection
          coaches={coaches.data ?? []}
          sessions={sessions.data ?? []}
          trainingPlans={allPlans.data ?? []}
          oversight={oversight.data ?? []}
          isLoading={coaches.isLoading || sessions.isLoading || allPlans.isLoading || oversight.isLoading}
        />

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <CardDescription>Training plans submitted by coaches, awaiting your decision</CardDescription>
            </div>
            {pendingPlans.data?.length ? (
              <Button size="sm" variant="outline" onClick={() => navigate("/head-coach/approvals")}>
                View all
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {pendingPlans.isLoading ? (
              <LoadingState rows={3} />
            ) : !pendingPlans.data || pendingPlans.data.length === 0 ? (
              <EmptyState title="You're all caught up" description="No training plans are waiting for approval." />
            ) : (
              <div className="space-y-2">
                {pendingPlans.data.slice(0, 5).map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => navigate("/head-coach/approvals")}
                    className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{plan.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.coach.firstName} {plan.coach.lastName} · {plan.team.name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(plan.scheduledDate)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Sessions</CardTitle>
              <CardDescription>Next 7 days across all teams</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.isLoading ? (
                <LoadingState rows={3} />
              ) : upcomingSessions.length === 0 ? (
                <EmptyState title="No sessions scheduled yet" description="Nothing planned in the next 7 days." />
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{s.team.name}</p>
                        <p className="text-xs text-muted-foreground">{s.location ?? "Location TBC"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(s.date)}
                        {s.startTime ? ` · ${s.startTime}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Matches</CardTitle>
              <CardDescription>Next 7 days across all teams</CardDescription>
            </CardHeader>
            <CardContent>
              {matches.isLoading ? (
                <LoadingState rows={3} />
              ) : upcomingMatches.length === 0 ? (
                <EmptyState title="No matches scheduled yet" description="Nothing on the calendar in the next 7 days." />
              ) : (
                <div className="space-y-2">
                  {upcomingMatches.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {m.team.name} vs {m.opponent.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{m.venue ?? "Venue TBC"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(m.matchDate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
