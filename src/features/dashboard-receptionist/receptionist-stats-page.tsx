import { motion } from "framer-motion"
import { Users, UserCheck, AlertTriangle, PieChart as PieChartIcon, CalendarCheck, ClipboardCheck, Percent } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { DashboardLayout } from "@/app/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatCard } from "@/design-system/stat-card"
import { LoadingState } from "@/design-system/loading-state"
import { ErrorState } from "@/design-system/error-state"
import { EmptyState } from "@/design-system/empty-state"
import { useTeamStats } from "@/features/finance/finance-api"
import { useTrainingSessions } from "@/features/training/training-api"
import { AttendanceAnalyticsSection } from "@/features/training/attendance-analytics-section"
import { RECEPTIONIST_NAV_ITEMS } from "./receptionist-dashboard"

const COLOR_PAID = "var(--success)"
const COLOR_OWING = "var(--warning)"
const COLOR_PRIMARY = "var(--primary)"

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
}

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" }

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: "easeOut" as const },
  }
}

// Recharts' own bar/pie animation can't be screenshotted or timed reliably, so charts
// render fully-formed and Framer Motion owns the entire reveal via scale+fade instead.
function chartReveal(delay: number) {
  return {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
  }
}

export function ReceptionistStatsPage() {
  const { data, isLoading, isError, refetch } = useTeamStats()
  const { data: sessions } = useTrainingSessions()

  const todaysSessions = (sessions ?? []).filter((s) => isToday(s.date))
  const todaysAttendance = todaysSessions.flatMap((s) => s.attendance)
  const playersPresentToday = new Set(
    todaysAttendance.filter((a) => a.status === "PRESENT").map((a) => a.player.id),
  ).size
  const attendanceRateToday =
    todaysAttendance.length > 0
      ? Math.round((todaysAttendance.filter((a) => a.status === "PRESENT").length / todaysAttendance.length) * 100)
      : null

  return (
    <DashboardLayout title="Dashboard" navItems={RECEPTIONIST_NAV_ITEMS}>
      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError || !data ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : data.teams.length === 0 ? (
        <EmptyState title="No active players yet" description="Statistics will appear once players are registered." />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Users, label: "Active players", value: data.totals.activePlayers, highlight: false },
              {
                icon: AlertTriangle,
                label: "Owing monthly subscription",
                value: data.totals.owingMonthlySubscription,
                highlight: data.totals.owingMonthlySubscription > 0,
              },
              { icon: UserCheck, label: "Paid up to date", value: data.totals.paidUpToDate, highlight: false },
            ].map((stat, i) => (
              <motion.div key={stat.label} {...fadeUp(0.1 + i * 0.15)} whileHover={{ y: -3 }}>
                <StatCard icon={stat.icon} label={stat.label} value={stat.value} highlight={stat.highlight} />
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: CalendarCheck, label: "Players present today", value: playersPresentToday, highlight: false },
              {
                icon: Percent,
                label: "Attendance rate today",
                value: attendanceRateToday === null ? "—" : `${attendanceRateToday}%`,
                highlight: false,
              },
              { icon: ClipboardCheck, label: "Sessions today", value: todaysSessions.length, highlight: false },
            ].map((stat, i) => (
              <motion.div key={stat.label} {...fadeUp(0.55 + i * 0.15)} whileHover={{ y: -3 }}>
                <StatCard icon={stat.icon} label={stat.label} value={stat.value} highlight={stat.highlight} />
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div {...fadeUp(0.4)} className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Players by Team</CardTitle>
                  <CardDescription>How the current roster is distributed across teams</CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div {...chartReveal(0.55)} className="h-72 w-full" style={{ transformOrigin: "bottom" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.teams} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="teamName" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                        <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                        <Bar
                          dataKey="activePlayers"
                          name="Active players"
                          fill={COLOR_PRIMARY}
                          radius={[6, 6, 0, 0]}
                          isAnimationActive={false}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeUp(0.6)}>
              <Card className="h-full">
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
                    <PieChartIcon className="size-4.5" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-base">Subscription Status</CardTitle>
                    <CardDescription>All active players</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div {...chartReveal(0.75)} className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "Paid up to date", value: data.totals.paidUpToDate },
                            { name: "Owing", value: data.totals.owingMonthlySubscription },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={data.totals.paidUpToDate && data.totals.owingMonthlySubscription ? 3 : 0}
                          isAnimationActive={false}
                        >
                          <Cell fill={COLOR_PAID} />
                          <Cell fill={COLOR_OWING} />
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div {...fadeUp(0.9)}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Status by Team</CardTitle>
                <CardDescription>Paid up to date vs. owing monthly subscription, per team</CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div {...chartReveal(1.05)} className="h-80 w-full" style={{ transformOrigin: "bottom" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.teams} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="teamName" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                      <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="paidUpToDate"
                        name="Paid up to date"
                        stackId="status"
                        fill={COLOR_PAID}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="owingMonthlySubscription"
                        name="Owing"
                        stackId="status"
                        fill={COLOR_OWING}
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp(1.2)}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.teams.map((team) => (
                  <div
                    key={team.teamId ?? "unassigned"}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30"
                  >
                    <span className="font-medium">{team.teamName}</span>
                    <div className="flex items-center gap-4 text-muted-foreground tabular-nums">
                      <span>{team.activePlayers} active</span>
                      <span className="text-success">{team.paidUpToDate} paid up to date</span>
                      <span className="text-warning">{team.owingMonthlySubscription} owing</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <AttendanceAnalyticsSection sessions={sessions ?? []} startDelay={1.5} />
        </div>
      )}
    </DashboardLayout>
  )
}
