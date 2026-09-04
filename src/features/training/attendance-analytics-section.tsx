import { motion } from "framer-motion"
import { TrendingUp } from "lucide-react"
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/design-system/empty-state"
import { ATTENDANCE_STATUS_COLORS, ATTENDANCE_STATUS_LABELS } from "./attendance-constants"
import type { AttendanceStatus, TrainingSession } from "./training-api"

const COLOR_PRIMARY = "var(--primary)"

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

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function shortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { day: "numeric", month: "short" })
}

interface AttendanceAnalyticsSectionProps {
  sessions: TrainingSession[]
  startDelay?: number
  trendCount?: number
}

// Shared by the receptionist, coach, and head coach dashboards — a coach's `sessions` array
// is already scoped server-side to their own team(s)/training group(s), while a head coach's
// spans every team, so this renders correctly for all three audiences with no role-specific
// branching here.
export function AttendanceAnalyticsSection({ sessions, startDelay = 0, trendCount = 8 }: AttendanceAnalyticsSectionProps) {
  const todaysSessions = sessions.filter((s) => isToday(s.date))
  const todaysAttendance = todaysSessions.flatMap((s) => s.attendance)

  // Fall back to the most recent date with any recorded attendance so the breakdown and
  // by-team charts stay useful outside of session hours / on non-training days.
  const mostRecentAttendanceDate = sessions
    .filter((s) => s.attendance.length > 0)
    .reduce<string | null>((latest, s) => (!latest || new Date(s.date) > new Date(latest) ? s.date : latest), null)
  const focusDate = todaysAttendance.length > 0 ? null : mostRecentAttendanceDate
  const focusSessions = sessions.filter((s) => (focusDate ? s.date === focusDate : isToday(s.date)))
  const focusAttendance = focusSessions.flatMap((s) => s.attendance)

  const statusBreakdown = (Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[])
    .map((status) => ({
      status,
      name: ATTENDANCE_STATUS_LABELS[status],
      value: focusAttendance.filter((a) => a.status === status).length,
    }))
    .filter((row) => row.value > 0)

  const presentByTeam = Object.values(
    focusSessions.reduce<Record<string, { teamName: string; present: number; marked: number }>>((acc, s) => {
      const key = s.team.id
      if (!acc[key]) acc[key] = { teamName: s.team.name, present: 0, marked: 0 }
      acc[key].present += s.attendance.filter((a) => a.status === "PRESENT").length
      acc[key].marked += s.attendance.length
      return acc
    }, {}),
  )

  // Attendance rate across the most recent training dates, oldest to newest.
  const sessionsByDate = sessions.reduce<Record<string, { present: number; marked: number }>>((acc, s) => {
    if (s.attendance.length === 0) return acc
    if (!acc[s.date]) acc[s.date] = { present: 0, marked: 0 }
    acc[s.date].present += s.attendance.filter((a) => a.status === "PRESENT").length
    acc[s.date].marked += s.attendance.length
    return acc
  }, {})
  const attendanceTrend = Object.entries(sessionsByDate)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .slice(-trendCount)
    .map(([date, row]) => ({
      date,
      label: shortDate(date),
      rate: row.marked > 0 ? Math.round((row.present / row.marked) * 100) : 0,
    }))

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div {...fadeUp(startDelay)} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Rate Trend</CardTitle>
              <CardDescription>Present vs. marked, across the most recent training dates</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceTrend.length === 0 ? (
                <EmptyState
                  title="No attendance recorded yet"
                  description="This chart fills in once training attendance is marked."
                />
              ) : (
                <motion.div {...chartReveal(startDelay + 0.15)} className="h-64 w-full" style={{ transformOrigin: "bottom" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceTrend} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={axisTick}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--border)" }}
                        contentStyle={tooltipStyle}
                        formatter={(v) => [`${v}%`, "Attendance rate"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="rate"
                        name="Attendance rate"
                        stroke={COLOR_PRIMARY}
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: COLOR_PRIMARY }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp(startDelay + 0.2)}>
          <Card className="h-full">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-accent-foreground">
                <TrendingUp className="size-4.5" aria-hidden />
              </div>
              <div>
                <CardTitle className="text-base">Attendance Breakdown</CardTitle>
                <CardDescription>{focusDate ? `Most recent session — ${shortDate(focusDate)}` : "Today"}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {statusBreakdown.length === 0 ? (
                <EmptyState title="Nothing marked yet" description="Statuses will appear once attendance is recorded." />
              ) : (
                <motion.div {...chartReveal(startDelay + 0.35)} className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={statusBreakdown.length > 1 ? 3 : 0}
                        isAnimationActive={false}
                      >
                        {statusBreakdown.map((row) => (
                          <Cell key={row.status} fill={ATTENDANCE_STATUS_COLORS[row.status]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {presentByTeam.length > 0 ? (
        <motion.div {...fadeUp(startDelay + 0.5)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Present by Team</CardTitle>
              <CardDescription>{focusDate ? `Most recent session — ${shortDate(focusDate)}` : "Today"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {presentByTeam.map((team) => (
                <div
                  key={team.teamName}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30"
                >
                  <span className="font-medium">{team.teamName}</span>
                  <div className="flex items-center gap-4 text-muted-foreground tabular-nums">
                    <span className="text-success">{team.present} present</span>
                    <span>{team.marked} marked</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </>
  )
}
