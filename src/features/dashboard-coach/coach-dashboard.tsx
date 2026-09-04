import { formatDate, isWithinCurrentTrainingWeek } from "@/lib/date"
import {
  Award,
  CalendarClock,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Star,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react"

import { useAuth } from "@/app/auth-context"
import { DashboardLayout, type NavItem } from "@/app/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/design-system/empty-state"
import { LoadingState } from "@/design-system/loading-state"
import { StatCard } from "@/design-system/stat-card"
import { useMatches } from "@/features/matches/matches-api"
import { usePlayers } from "@/features/players/players-api"
import { useTrainingPlans, useTrainingSessions } from "@/features/training/training-api"
import { AttendanceAnalyticsSection } from "@/features/training/attendance-analytics-section"

export const COACH_NAV_ITEMS: NavItem[] = [
  { to: "/coach", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/coach/training-plans", label: "Training Plans", icon: ClipboardList },
  { to: "/coach/training-sessions", label: "Attendance", icon: CalendarCheck },
  { to: "/coach/assessments", label: "Assessments", icon: Star },
  { to: "/coach/player-marks", label: "Player Marks", icon: Award },
  { to: "/coach/matches", label: "Matches", icon: Trophy },
]

function isWithinNextDays(dateStr: string, days: number): boolean {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(startOfToday)
  end.setDate(end.getDate() + days)
  const date = new Date(dateStr)
  return date >= startOfToday && date < end
}

export function CoachDashboard() {
  const { user } = useAuth()
  const sessions = useTrainingSessions()
  const plans = useTrainingPlans()
  const matches = useMatches()
  const players = usePlayers()

  const todaysSessions = (sessions.data ?? []).filter((s) => isWithinCurrentTrainingWeek(s.date))
  const upcomingSessions = (sessions.data ?? []).filter(
    (s) => isWithinNextDays(s.date, 7) && !isWithinCurrentTrainingWeek(s.date)
  )
  const upcomingMatches = (matches.data ?? []).filter((m) => isWithinNextDays(m.matchDate, 7))
  const draftPlans = (plans.data ?? []).filter((p) => p.approvalStatus === "DRAFT").length
  const needsChanges = (plans.data ?? []).filter((p) => p.approvalStatus === "CHANGES_REQUESTED").length
  const presentToday = todaysSessions.reduce(
    (sum, s) => sum + s.attendance.filter((a) => a.status === "PRESENT").length,
    0,
  )
  const registeredPlayers = players.data?.length ?? 0
  const activePlayers = (players.data ?? []).filter((p) => p.status === "ACTIVE").length

  return (
    <DashboardLayout title="Coach Dashboard" navItems={COACH_NAV_ITEMS}>
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with your teams this week — take attendance, rate players, and keep training
            plans moving.
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold tracking-tight">Your roster</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              icon={Users}
              label="Registered players"
              value={registeredPlayers}
              isLoading={players.isLoading}
              iconClassName="bg-chart-3/15 text-chart-3"
            />
            <StatCard
              icon={ShieldCheck}
              label="Active players"
              value={activePlayers}
              isLoading={players.isLoading}
              iconClassName="bg-success/15 text-success"
            />
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold tracking-tight">This week</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              icon={UserCheck}
              label="Players present today"
              value={presentToday}
              isLoading={sessions.isLoading}
              iconClassName="bg-success/15 text-success"
            />
            <StatCard
              icon={ClipboardList}
              label="Draft plans"
              value={draftPlans}
              isLoading={plans.isLoading}
              highlight={draftPlans > 0}
              iconClassName="bg-chart-1/15 text-chart-1"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Need changes"
              value={needsChanges}
              isLoading={plans.isLoading}
              highlight={needsChanges > 0}
              iconClassName="bg-warning/15 text-warning"
            />
            <StatCard
              icon={CalendarClock}
              label="Sessions this week"
              value={upcomingSessions.length + todaysSessions.length}
              isLoading={sessions.isLoading}
              iconClassName="bg-chart-2/15 text-chart-2"
            />
            <StatCard
              icon={Trophy}
              label="Matches this week"
              value={upcomingMatches.length}
              isLoading={matches.isLoading}
              iconClassName="bg-chart-4/15 text-chart-4"
            />
          </div>
        </div>

        <AttendanceAnalyticsSection sessions={sessions.data ?? []} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                <CalendarClock className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Upcoming Sessions</CardTitle>
                <CardDescription>Rest of the week</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {sessions.isLoading ? (
                <LoadingState rows={3} />
              ) : upcomingSessions.length === 0 ? (
                <EmptyState title="Nothing else scheduled" description="No more sessions planned this week." />
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{s.trainingGroup?.name ?? s.team.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {s.location ?? "Location TBC"}
                        </p>
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
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-4/10 text-chart-4">
                <Trophy className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base">Upcoming Matches</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </div>
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
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" /> {m.venue ?? "Venue TBC"}
                        </p>
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
